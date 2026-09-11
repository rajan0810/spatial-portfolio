"use server";

import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/lib/db";
import { dropSecrets, drops } from "@/lib/db/schema";
import { validateDrop } from "@/lib/moderation";

/**
 * The only way a token enters the dig.
 *
 * Runs on the privileged connection, so this is where every rule lives:
 * moderation, the one-per-day-per-IP limit, and the single write of the rest
 * pose. The browser never touches these tables except to read.
 */

/** How long one IP must wait between drops. */
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** World bounds the rest pose must fall inside — anything else is a lie. */
const WORLD = { minX: 0, maxX: 1000, minY: 0, maxY: 6000 };

async function ipHash() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  const salt = process.env.DROP_SALT ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export type DropResult =
  | { ok: true; id: string; editToken: string; createdAt: string }
  | { ok: false; reason: string };

export async function dropToken(emoji: unknown, word: unknown): Promise<DropResult> {
  const valid = validateDrop(emoji, word);
  if (!valid.ok) return valid;

  const hash = await ipHash();
  const since = new Date(Date.now() - COOLDOWN_MS);
  const [recent] = await db
    .select({ id: dropSecrets.dropId })
    .from(dropSecrets)
    .where(and(eq(dropSecrets.ipHash, hash), gt(dropSecrets.createdAt, since)))
    .limit(1);
  if (recent) return { ok: false, reason: "One token per person per day. Come back tomorrow." };

  const editToken = randomBytes(24).toString("hex");

  const [row] = await db
    .insert(drops)
    .values({ emoji: valid.emoji, word: valid.word })
    .returning({ id: drops.id, createdAt: drops.createdAt });

  await db.insert(dropSecrets).values({ dropId: row.id, ipHash: hash, editToken });

  return { ok: true, id: row.id, editToken, createdAt: row.createdAt.toISOString() };
}

export async function settleToken(
  id: unknown,
  editToken: unknown,
  x: unknown,
  y: unknown,
  angle: unknown,
): Promise<{ ok: boolean }> {
  if (typeof id !== "string" || typeof editToken !== "string") return { ok: false };
  if (![x, y, angle].every((n) => typeof n === "number" && Number.isFinite(n))) return { ok: false };
  const px = x as number;
  const py = y as number;
  if (px < WORLD.minX || px > WORLD.maxX || py < WORLD.minY || py > WORLD.maxY) return { ok: false };

  const [secret] = await db
    .select({ token: dropSecrets.editToken })
    .from(dropSecrets)
    .where(eq(dropSecrets.dropId, id))
    .limit(1);
  if (!secret || secret.token !== editToken) return { ok: false };

  // Exactly once: the pose is only accepted while unsettled.
  const updated = await db
    .update(drops)
    .set({ x: px, y: py, angle: angle as number, settled: true })
    .where(and(eq(drops.id, id), eq(drops.settled, false)))
    .returning({ id: drops.id });

  return { ok: updated.length === 1 };
}
