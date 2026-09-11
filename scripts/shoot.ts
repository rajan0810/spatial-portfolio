/**
 * Drives the running dev server in a real browser, captures console output, and
 * screenshots each station along the rail.
 *
 * A scroll-driven WebGL scene cannot be verified by a passing build: shader
 * compile failures, texture CORS rejections and NaN transforms all show up only
 * at runtime, in a browser. Uses the locally installed Chrome via playwright-core
 * so no browser download is needed.
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
    args: [
      // Force real GPU-backed WebGL in headless rather than falling back to a
      // software path that would not tell us whether shaders actually compile.
      "--use-gl=angle",
      "--use-angle=default",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
    ],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const problems: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      problems.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => problems.push(`[pageerror] ${err.message}`));
  page.on("requestfailed", (req) =>
    problems.push(`[requestfailed] ${req.url()} — ${req.failure()?.errorText}`),
  );

  // networkidle never settles in dev: the HMR socket stays open. Wait for the
  // canvas to actually exist instead, which is the thing we care about.
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 45_000 });

  // Let the boot overlay run, then skip it the way a visitor would.
  await page.waitForTimeout(2600);
  await page.keyboard.press("Space");
  await page.waitForTimeout(900);

  const height = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );

  for (let i = 0; i < STATIONS.length; i += 1) {
    const top = (i / (STATIONS.length - 1)) * height;
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "auto" }), top);
    // Wait out the damping so the shot shows the settled frame.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${i}-${STATIONS[i]}.png` });
    console.log(`✓ ${STATIONS[i]}`);
  }

  // Report the perf singleton — the HUD's own numbers, read directly.
  const stats = await page.evaluate(() => {
    const w = window as unknown as { __perf?: unknown };
    return w.__perf ?? null;
  });
  if (stats) console.log("perf:", stats);

  // Flat mode, for comparison.
  await page.goto(`${BASE}/flat`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/4-flat.png`, fullPage: true });
  console.log("✓ flat");

  await page.goto(`${BASE}/flat/projects/justix`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/5-flat-justix.png`, fullPage: true });
  console.log("✓ flat/justix");

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
