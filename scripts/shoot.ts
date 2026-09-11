/**
 * Drives the running dev server in a real browser, captures console output,
 * and screenshots the dig: the surface, leaving a token, watching it fall and
 * settle, a slab, the floor, a dig-and-heal, and a second visitor whose drop
 * raises the first visitor's live count.
 *
 * A physics-and-realtime page cannot be verified by a passing build. Uses
 * locally installed Chrome via playwright-core.
 *
 *   npx tsx scripts/shoot.ts [outDir] [baseUrl]
 */
import { mkdir } from "node:fs/promises";

import { chromium, type Browser, type Page } from "playwright-core";

const OUT = process.argv[2] ?? ".shots";
const BASE = process.argv[3] ?? "http://localhost:3000";

async function open(browser: Browser, problems: string[], forwardedFor: string) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    // Each context is a different "visitor" for the per-IP limit.
    extraHTTPHeaders: { "x-forwarded-for": forwardedFor },
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") problems.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`[pageerror] ${err.message}`));
  // A fresh visitor once per context — not on every navigation, or the reload
  // check below would be testing nothing.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("shoot:cleared")) {
      localStorage.clear();
      sessionStorage.setItem("shoot:cleared", "1");
    }
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 45_000 });
  await page.waitForTimeout(1500);
  return page;
}

async function leaveSomething(page: Page, word: string, emojiIndex: number) {
  await page.getByRole("button", { name: "Leave something" }).click();
  await page.getByRole("radio").nth(emojiIndex).click();
  await page.getByLabel("Your word").fill(word);
  await page.getByRole("button", { name: "Pick it up" }).click();
  // Either we are holding the token, or the server said no — say which.
  const holding = page.getByText("Click anywhere over the ground");
  const refused = page.locator("p.text-ember, span.text-ember");
  await Promise.race([holding.waitFor({ timeout: 20_000 }), refused.first().waitFor({ timeout: 20_000 })]);
  if (await refused.count()) throw new Error(`drop refused: ${await refused.first().textContent()}`);
}

const total = (page: Page) =>
  page.evaluate(() => {
    const m = document.body.innerText.match(/([\d,]+) have left something/);
    return m ? Number(m[1].replace(/,/g, "")) : -1;
  });

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const problems: string[] = [];
  // Letters only: the moderation refuses digits, correctly.
  const stamp = Array.from({ length: 4 }, () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]).join("");
  // Fresh IPs per run: the server allows one drop per IP per day.
  const octet = Math.floor(Math.random() * 200) + 1;
  const block = Math.floor(Math.random() * 250) + 1;

  // --- visitor A -------------------------------------------------------------
  const a = await open(browser, problems, `10.${block}.${octet}.${Math.floor(Math.random() * 250) + 1}`);
  await a.screenshot({ path: `${OUT}/00-surface.png` });
  console.log("✓ surface");

  await leaveSomething(a, `hello${stamp}`, 5);
  await a.mouse.move(700, 640);
  await a.waitForTimeout(400);
  await a.screenshot({ path: `${OUT}/01-holding.png` });
  console.log("✓ holding a token");

  await a.mouse.click(700, 640);
  await a.waitForTimeout(450);
  await a.screenshot({ path: `${OUT}/02-falling.png` });
  await a.getByText("It stays.").waitFor({ timeout: 40_000 });
  const totalBefore = await total(a);
  console.log(`✓ token settled and persisted (total ${totalBefore})`);

  // --- visitor B drops; A should see the count rise live ----------------------
  const b = await open(browser, problems, `10.${block}.${octet}.${Math.floor(Math.random() * 250) + 1}`);
  await leaveSomething(b, `there${stamp}`, 12);
  await b.mouse.click(420, 640);
  await b.getByText("It stays.").waitFor({ timeout: 40_000 });
  console.log("✓ second visitor's token settled");

  await a.waitForTimeout(2000);
  const totalAfter = await total(a);
  console.log(`${totalAfter > totalBefore ? "✓" : "✗"} visitor A's live count ${totalBefore} → ${totalAfter}`);

  // --- descend the shaft on A ------------------------------------------------------
  const height = await a.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  await a.evaluate((y) => window.scrollTo({ top: y }), height * 0.2);
  await a.waitForTimeout(700);
  await a.screenshot({ path: `${OUT}/03-slab.png` });
  console.log("✓ a slab");

  await a.evaluate((y) => window.scrollTo({ top: y }), height);
  await a.waitForTimeout(700);
  await a.screenshot({ path: `${OUT}/04-floor.png` });
  console.log("✓ the floor");

  // --- dig: drag our own token and watch it heal --------------------------------------
  // Scroll so our token is mid-screen first: it rests wherever it landed — on
  // the floor, or on top of a slab.
  const probe = () => a.evaluate(() => (window as unknown as { __digPose?: () => { x: number; y: number } | null }).__digPose?.() ?? null);
  const where = await probe();
  if (where) {
    await a.evaluate((dy) => window.scrollBy({ top: dy }), where.y - 450);
    await a.waitForTimeout(600);
  }
  const pose = await probe();
  if (pose && pose.y > 0 && pose.y < 900) {
    await a.mouse.move(pose.x, pose.y);
    await a.mouse.down();
    await a.mouse.move(pose.x + 200, pose.y - 180, { steps: 16 });
    await a.waitForTimeout(150);
    await a.screenshot({ path: `${OUT}/05-digging.png` });
    await a.mouse.up();
    await a.waitForTimeout(9000);
    await a.screenshot({ path: `${OUT}/06-healed.png` });
    const after = await a.evaluate(() => (window as unknown as { __digPose?: () => { x: number; y: number } | null }).__digPose?.() ?? null);
    const healed = after ? Math.hypot(after.x - pose.x, after.y - pose.y) < 12 : false;
    console.log(`${healed ? "✓" : "✗"} dig and heal (drift ${after ? Math.hypot(after.x - pose.x, after.y - pose.y).toFixed(1) : "?"}px)`);
  } else {
    console.log(`· token not on screen for the dig (pose ${JSON.stringify(pose)})`);
  }

  // --- reload: it is still there -----------------------------------------------------
  await a.reload({ waitUntil: "domcontentloaded" });
  await a.waitForSelector("canvas", { timeout: 45_000 });
  await a.waitForTimeout(1500);
  console.log((await a.getByText("It stays.").count()) ? "✓ reload remembers you left something" : "✗ reload forgot");

  await a.goto(`${BASE}/flat`, { waitUntil: "domcontentloaded" });
  await a.waitForTimeout(600);
  await a.screenshot({ path: `${OUT}/07-flat.png`, fullPage: true });
  console.log("✓ flat");

  await browser.close();

  if (problems.length > 0) {
    console.log(`\n--- ${problems.length} console problem(s) ---`);
    for (const problem of [...new Set(problems)]) console.log(problem);
  } else {
    console.log("\nNo console errors or warnings.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
