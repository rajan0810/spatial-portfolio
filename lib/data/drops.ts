import { desc, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { drops } from "@/lib/db/schema";

export type DropView = {
  id: string;
  emoji: string;
  word: string;
  x: number;
  y: number;
  angle: number;
  settled: boolean;
  createdAt: string;
};

/** Newest tokens simulated as bodies; older ones are drawn as bedrock. */
export const LIVE_TOKEN_LIMIT = 2000;

/**
 * The initial pile for the page. Not cached: the whole point is that it is
 * different every minute, and Realtime keeps it moving after first paint.
 */
export async function getDrops(): Promise<{ tokens: DropView[]; total: number }> {
  const rows = await db
    .select()
    .from(drops)
    .where(isNull(drops.deletedAt))
    .orderBy(desc(drops.createdAt))
    .limit(LIVE_TOKEN_LIMIT);

  const [{ count }] = await db.execute<{ count: number }>(
    /* sql */ `select count(*)::int as count from drops where deleted_at is null`,
  ).then((r) => r as unknown as { count: number }[]);

  return {
    tokens: rows.map((r) => ({
      id: r.id,
      emoji: r.emoji,
      word: r.word,
      x: r.x,
      y: r.y,
      angle: r.angle,
      settled: r.settled,
      createdAt: r.createdAt.toISOString(),
    })),
    total: count ?? rows.length,
  };
}
