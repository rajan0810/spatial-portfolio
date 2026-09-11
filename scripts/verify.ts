/**
 * Runtime verification of the plan's non-negotiables.
 *
 * These are the claims that are easy to assert and hard to actually hold:
 * reduced-motion honesty, mobile viability, and the accessibility behaviour of
 * an overlay that keeps four stations in the DOM at once.
 *
 *   npx tsx scripts/verify.ts [baseUrl]
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3000";

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });

  // --- reduced motion: the boot sequence must not run at all ---------------
  {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });
    await page.waitForTimeout(1500);

    const bootVisible = await page
      .locator('[aria-label="Starting the experience"]')
      .count();
    check(
      "reduced motion skips the boot sequence",
      bootVisible === 0,
      `boot overlay elements found: ${bootVisible}`,
    );

    // The experience must still be navigable, not just static.
    const stationButtons = await page.locator('nav[aria-label="Stations"] button').count();
    check(
      "reduced motion keeps station navigation",
      stationButtons > 0,
      `${stationButtons} station buttons`,
    );
    await page.close();
  }

  // --- inert: inactive stations must not be focusable ----------------------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });
    await page.keyboard.press("Space");
    await page.waitForTimeout(1800);

    const inertCount = await page.evaluate(
      () => document.querySelectorAll("section[inert]").length,
    );
    const total = await page.evaluate(
      () => document.querySelectorAll("section[aria-label]").length,
    );
    check(
      "inactive stations are inert",
      inertCount > 0 && inertCount < total,
      `${inertCount} of ${total} sections inert (expected some, not all)`,
    );

    // Tab from the top: focus must land on the skip link first.
    await page.keyboard.press("Tab");
    const firstFocus = await page.evaluate(
      () => document.activeElement?.textContent?.trim() ?? "",
    );
    check(
      "skip link is the first tab stop",
      firstFocus.toLowerCase().includes("flat mode"),
      `first focused element: "${firstFocus}"`,
    );
    await page.close();
  }

  // --- mobile: renders, and never scrolls sideways -------------------------
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });
    await page.waitForTimeout(1500);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    check("no horizontal overflow on mobile", overflow <= 1, `overflow ${overflow}px`);
    await page.close();
  }

  // --- flat mode: indexable, and genuinely WebGL-free ---------------------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE}/flat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const canvases = await page.locator("canvas").count();
    check("flat mode mounts no canvas", canvases === 0, `${canvases} canvas elements`);

    const h1 = await page.locator("h1").first().textContent();
    check("flat mode has an h1", Boolean(h1?.trim()), `h1: "${h1?.trim()}"`);
    await page.close();
  }

  await browser.close();

  console.log("");
  for (const { name, pass, detail } of results) {
    console.log(`${pass ? "✓" : "✗"} ${name}\n    ${detail}`);
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
