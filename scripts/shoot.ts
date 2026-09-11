/**
 * Drives the running dev server in a real browser, captures console output, and
 * screenshots the whole arc: desk → headset on → boot → guardian → floor →
 * each station.
 *
 * A scroll-driven WebGL scene cannot be verified by a passing build: shader
 * compile failures, texture CORS rejections and z-index mistakes show up only
 * at runtime, in a browser. Uses locally installed Chrome via playwright-core.
 *
 *   npx tsx scripts/shoot.ts [outDir] [baseUrl]
 */
import { mkdir } from "node:fs/promises";

import { chromium } from "playwright-core";

const OUT = process.argv[2] ?? ".shots";
const BASE = process.argv[3] ?? "http://localhost:3000";
const STATIONS = ["boot", "home", "justix", "outro"];

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--use-gl=angle", "--use-angle=default", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") problems.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`[pageerror] ${err.message}`));
  page.on("requestfailed", (req) => problems.push(`[requestfailed] ${req.url()} — ${req.failure()?.errorText}`));

  // A fresh visitor: no remembered guardian.
  await page.addInitScript(() => localStorage.clear());

  // networkidle never settles in dev (HMR socket); wait for the canvas instead.
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 45_000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/a-desk.png` });
  console.log("✓ desk");

  // Put it on, via the accessible button.
  await page.getByRole("button", { name: "Put on the headset" }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/b-donning.png` });
  console.log("✓ donning");

  // Boot runs; skip it as a visitor would.
  await page.waitForSelector('[aria-label="Starting the headset"]', { timeout: 10_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/c-boot.png` });
  await page.keyboard.press("Space");
  console.log("✓ boot");

  // Guardian: trace a loop on the floor with the mouse.
  await page.getByText("Draw your Guardian").waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  const cx = 720;
  const cy = 690;
  await page.mouse.move(cx - 260, cy);
  await page.mouse.down();
  for (let i = 1; i <= 40; i += 1) {
    const a = (i / 40) * Math.PI * 2;
    await page.mouse.move(cx - 260 * Math.cos(a), cy + 90 * Math.sin(a), { steps: 2 });
  }
  await page.screenshot({ path: `${OUT}/d-guardian.png` });
  await page.mouse.up();
  console.log("✓ guardian");

  // Floor: touch it.
  await page.getByText("Confirm floor level").waitFor({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/e-floor.png` });
  await page.mouse.click(260, 720);
  await page.waitForTimeout(1200);
  console.log("✓ floor");

  // Live: walk the rail.
  const height = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (let i = 0; i < STATIONS.length; i += 1) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "auto" }), (i / (STATIONS.length - 1)) * height);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${i}-${STATIONS[i]}.png` });
    console.log(`✓ ${STATIONS[i]}`);
  }

  // Grab the JustiX centre panel, drag it, and throw it. The panel should follow
  // the hand and spring home; nothing should error.
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "auto" }), (2 / (STATIONS.length - 1)) * height);
  await page.waitForTimeout(1500);
  await page.mouse.move(720, 280);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.move(520, 420, { steps: 12 });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${OUT}/h-grab.png` });
  await page.mouse.move(980, 300, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/i-thrown.png` });
  console.log("✓ grab + throw");

  // Mid-transition: the guardian walls you drew should be showing.
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "auto" }), height * 0.5);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/f-between.png` });
  console.log("✓ between stations");

  await page.goto(`${BASE}/flat`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/g-flat.png`, fullPage: true });
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
