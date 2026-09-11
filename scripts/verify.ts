/**
 * Runtime verification of the dig's non-negotiables.
 *
 *   npx tsx scripts/verify.ts [baseUrl]
 *
 * Needs the dev server running and .env.local for the PostgREST checks.
 */
import { config } from "dotenv";
import { chromium } from "playwright-core";

config({ path: ".env.local", quiet: true });

const BASE = process.argv[2] ?? "http://localhost:3000";
const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

async function rest(path: string, init: RequestInit = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

async function main() {
  // --- the public door: PostgREST with the anon key -----------------------------
  {
    const read = await rest("drops?select=*&limit=1");
    const rows = (await read.json()) as Record<string, unknown>[];
    check("anon can read drops", read.ok, `http ${read.status}, ${rows.length} row(s)`);
    const leaked = rows[0] ? Object.keys(rows[0]).filter((k) => /token|ip/.test(k)) : [];
    check("no secret columns in drops", leaked.length === 0, leaked.length ? `leaked: ${leaked.join(", ")}` : "clean");

    const secrets = await rest("drop_secrets?select=*&limit=1");
    check("drop_secrets invisible to anon", !secrets.ok, `http ${secrets.status}`);

    const insert = await rest("drops", { method: "POST", body: JSON.stringify({ emoji: "🔥", word: "pwned" }) });
    check("anon cannot insert a drop", !insert.ok, `http ${insert.status}`);

    const update = await rest("drops?settled=eq.true&limit=1", {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ word: "pwned" }),
    });
    const changed = update.ok ? ((await update.json()) as unknown[]).length : 0;
    check("anon cannot update a drop", changed === 0, `${changed} row(s) changed`);

    const del = await rest("drops?word=eq.pwned", { method: "DELETE", headers: { Prefer: "return=representation" } });
    const deleted = del.ok ? ((await del.json()) as unknown[]).length : 0;
    check("anon cannot delete a drop", deleted === 0, `${deleted} row(s) deleted`);
  }

  const browser = await chromium.launch({ channel: "chrome" });

  // --- moderation + rate limit, through the real UI ----------------------------------
  {
    const ip = `192.0.2.${(Date.now() % 250) + 1}`;
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, extraHTTPHeaders: { "x-forwarded-for": ip } });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.clear());
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });

    await page.getByRole("button", { name: "Leave something" }).click();
    await page.getByLabel("Your word").fill("shit");
    await page.getByRole("button", { name: "Pick it up" }).click();
    check("deny-listed word is refused", (await page.getByText("Not that word.").count()) > 0, "refusal shown");

    await page.getByLabel("Your word").fill("http://x");
    await page.getByRole("button", { name: "Pick it up" }).click();
    check("non-letters are refused", (await page.getByText("Letters only").count()) > 0, "pattern enforced");

    await page.getByLabel("Your word").fill("verify");
    await page.getByRole("button", { name: "Pick it up" }).click();
    await page.getByText("Click anywhere over the ground").waitFor({ timeout: 15_000 });
    await page.mouse.click(640, 560);
    await page.getByText("It stays.").waitFor({ timeout: 40_000 });

    // Same IP, fresh browser state: the server must refuse a second drop.
    const again = await context.newPage();
    await again.addInitScript(() => localStorage.clear());
    await again.goto(BASE, { waitUntil: "domcontentloaded" });
    await again.waitForSelector("canvas", { timeout: 45_000 });
    await again.getByRole("button", { name: "Leave something" }).click();
    await again.getByLabel("Your word").fill("twice");
    await again.getByRole("button", { name: "Pick it up" }).click();
    const limited = await again.getByText("One token per person per day").waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
    check("second drop from the same IP is refused", limited, limited ? "rate limit held" : "no refusal shown");
    await context.close();
  }

  // --- keyboard, indexability, mobile, flat ----------------------------------------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    check("skip link is the first tab stop", first.toLowerCase().includes("flat"), `first focus: "${first}"`);
    const html = await (await fetch(BASE)).text();
    check("project copy is in the server HTML", html.includes("JustiX") && html.includes("adversarial"), "indexable");
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check("no horizontal overflow on mobile", overflow <= 1, `overflow ${overflow}px`);
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE}/flat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    check("flat mode mounts no canvas", (await page.locator("canvas").count()) === 0, "canvas-free");
    check("flat mode has an h1", Boolean((await page.locator("h1").first().textContent())?.trim()), "h1 present");
    await page.close();
  }

  await browser.close();

  console.log("");
  for (const { name, pass, detail } of results) console.log(`${pass ? "✓" : "✗"} ${name}\n    ${detail}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
