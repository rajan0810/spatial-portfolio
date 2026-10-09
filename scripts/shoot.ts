/**
 * Walks the island in a real browser and photographs it.
 *
 * A procedurally drawn, physics-free but fully interactive canvas cannot be
 * checked by a passing build: terrain generation, depth sorting, collision and
 * the day/night pass are all invisible until something renders. Uses the
 * locally installed Chrome through playwright-core.
 *
 *   npx tsx scripts/shoot.ts [outDir] [baseUrl]
 */
import { mkdir } from "node:fs/promises";

import { chromium, type Page } from "playwright-core";

const OUT = process.argv[2] ?? ".shots";
const BASE = process.argv[3] ?? "http://localhost:3000";

async function walk(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(260);
}

async function travel(page: Page, name: string) {
  await page.getByRole("button", { name: /Map/ }).click();
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.waitForTimeout(700);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const problems: string[] = [];

  const open = async (hour: number) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    // Pin the clock so the day/night pass is reproducible between runs.
    await context.clock.setFixedTime(new Date(`2026-06-15T${String(hour).padStart(2, "0")}:40:00`));
    const page = await context.newPage();
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") problems.push(`[${m.type()}] ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));
    // Clear once per context, not on every navigation — a reload has to be
  // able to read back what the previous page wrote.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("cleared")) {
      localStorage.clear();
      sessionStorage.setItem("cleared", "1");
    }
  });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });
    await page.waitForFunction(() => !document.body.innerText.includes("Drawing the island"), { timeout: 45_000 });
    await page.waitForTimeout(900);
    return page;
  };

  // --- daytime tour ----------------------------------------------------------
  const day = await open(13);
  await day.screenshot({ path: `${OUT}/00-plaza.png` });
  console.log("✓ the plaza");

  await walk(day, "ArrowUp", 1700);
  await day.screenshot({ path: `${OUT}/01-north.png` });
  console.log("✓ walked north");

  for (const [file, name] of [
    ["02-courthouse", "The Courthouse"],
    ["03-hall", "Hall of Fame"],
    ["04-lighthouse", "The Beacon"],
    ["05-amphitheatre", "The Amphitheatre"],
    ["06-foundry", "The Foundry"],
  ] as const) {
    await travel(day, name);
    await day.screenshot({ path: `${OUT}/${file}.png` });
    console.log(`✓ ${name}`);
  }

  // The prompt should be showing after a travel; entering opens the panel.
  const prompt = await day.getByRole("button", { name: /^Enter / }).count();
  console.log(prompt ? "✓ door prompt shows after travel" : "✗ no door prompt");
  await day.getByRole("button", { name: /^Enter / }).first().click();
  await day.waitForTimeout(500);
  await day.screenshot({ path: `${OUT}/07-panel.png` });
  const heading = await day.locator('[role="dialog"] h2').first().textContent();
  console.log(`✓ panel opened: ${heading}`);
  await day.keyboard.press("Escape");
  await day.waitForTimeout(300);

  // Discovery should have been recorded.
  const found = await day.evaluate(() => JSON.parse(localStorage.getItem("island:found") ?? "[]").length);
  console.log(`${found > 0 ? "✓" : "✗"} discovery persisted (${found} found)`);

  // Collision: walking into the sea should stop at the sand.
  await travel(day, "The Beacon");
  const before = await day.evaluate(() => JSON.parse(localStorage.getItem("island:found") ?? "[]").length);
  await walk(day, "ArrowDown", 2600);
  await day.screenshot({ path: `${OUT}/08-shoreline.png` });
  console.log(`✓ walked to the shoreline (found ${before})`);

  await day.goto(`${BASE}/flat`, { waitUntil: "domcontentloaded" });
  await day.waitForTimeout(600);
  await day.screenshot({ path: `${OUT}/09-flat.png`, fullPage: true });
  console.log("✓ flat mode");
  await day.context().close();

  // --- night -----------------------------------------------------------------
  const night = await open(22);
  await night.screenshot({ path: `${OUT}/10-night-plaza.png` });
  await travel(night, "The Cottage");
  await night.screenshot({ path: `${OUT}/11-night-cottage.png` });
  await travel(night, "The Beacon");
  await night.screenshot({ path: `${OUT}/12-night-beacon.png` });
  console.log("✓ night");
  await night.context().close();

  await browser.close();
  if (problems.length) {
    console.log(`\n--- ${problems.length} console problem(s) ---`);
    for (const p of [...new Set(problems)]) console.log(p);
  } else {
    console.log("\nNo console errors or warnings.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
