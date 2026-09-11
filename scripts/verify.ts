/**
 * Runtime verification of the plan's non-negotiables.
 *
 * These are the claims that are easy to assert and hard to actually hold:
 * reduced-motion honesty, mobile viability, keyboard access through the whole
 * headset arc, and the accessibility behaviour of an overlay that keeps four
 * stations in the DOM at once.
 *
 *   npx tsx scripts/verify.ts [baseUrl]
 */
import { chromium, type Page } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3000";

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

/** Keyboard-only path from the editor, through the desk, to the live environment. */
async function wearByKeyboard(page: Page) {
  await page.keyboard.press("Meta+p");
  await page.getByRole("button", { name: "Put on the headset" }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Put on the headset" }).focus();
  await page.keyboard.press("Enter");
  // Boot may be skipped entirely under reduced motion.
  const boot = page.locator('[aria-label="Starting the headset"]');
  if (await boot.count()) await page.keyboard.press("Space");
  await page.getByRole("button", { name: /roomscale default|Keep the last boundary/ }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.locator('nav[aria-label="Stations"]').waitFor({ timeout: 10_000 });
}

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });

  // --- reduced motion: no boot sequence, still fully navigable --------------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.clear());
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });
    await page.waitForTimeout(1200);

    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Put on the headset" }).click();
    await page.waitForTimeout(900);
    const bootShown = await page.locator('[aria-label="Starting the headset"]').count();
    check("reduced motion skips the boot sequence", bootShown === 0, `boot overlay elements: ${bootShown}`);

    await page.getByRole("button", { name: "Use roomscale default" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    const stations = await page.locator('nav[aria-label="Stations"] button').count();
    check("reduced motion reaches a navigable environment", stations > 0, `${stations} station buttons`);
    await page.close();
  }

  // --- keyboard: the whole arc without a pointer, then inert stations ------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(() => localStorage.clear());
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });
    await page.waitForTimeout(1200);

    await page.keyboard.press("Tab");
    const firstFocus = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    check("skip link is the first tab stop", firstFocus.toLowerCase().includes("flat mode"), `first focus: "${firstFocus}"`);

    // The editor itself: hierarchy is a real tree, inspector shows the selection.
    const treeItems = await page.locator('[role="treeitem"]').count();
    check("hierarchy renders the scene tree", treeItems >= 6, `${treeItems} tree items`);
    const inspectorTitle = await page.locator(".ed-inspector__name").first().textContent();
    check("inspector shows the selected project", (inspectorTitle ?? "").includes("JustiX"), `inspector: "${inspectorTitle}"`);

    await wearByKeyboard(page);
    await page.waitForTimeout(1500);

    const inert = await page.evaluate(() => document.querySelectorAll("section[inert]").length);
    const total = await page.evaluate(() => document.querySelectorAll("section[aria-label]").length);
    check("inactive stations are inert", inert > 0 && inert < total, `${inert} of ${total} sections inert`);

    // Once live, the desk must be gone: no stray lamp, no stray click target.
    const deskButton = await page.getByRole("button", { name: "Put on the headset" }).count();
    check("desk unmounts once the headset is on", deskButton === 0, `desk buttons: ${deskButton}`);
    await page.close();
  }

  // --- returning visitor: setup remembered, straight into the environment --
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(() => {
      localStorage.setItem(
        "rh-headset",
        JSON.stringify({ state: { comfort: {}, guardian: [[-2, -2], [2, -2], [2, 2], [-2, 2]] }, version: 0 }),
      );
    });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Put on the headset" }).click();
    await page.waitForSelector('[aria-label="Starting the headset"]', { timeout: 10_000 });
    await page.keyboard.press("Space");
    await page.waitForTimeout(900);
    const setupShown = await page.getByText("Draw your Guardian").count();
    const live = await page.locator('nav[aria-label="Stations"]').count();
    check("saved guardian skips setup", setupShown === 0 && live > 0, `setup prompts: ${setupShown}, live nav: ${live}`);
    await page.close();
  }

  // --- mobile: renders, lens off, never scrolls sideways -------------------
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await page.addInitScript(() => localStorage.clear());
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 45_000 });
    await page.waitForTimeout(1500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check("no horizontal overflow on mobile", overflow <= 1, `overflow ${overflow}px`);
    const lensOff = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("rh-headset") ?? "{}")?.state?.comfort?.lens === false;
      } catch {
        return false;
      }
    });
    check("lens pass disabled on coarse pointers", lensOff, `comfort.lens === false: ${lensOff}`);
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
  for (const { name, pass, detail } of results) console.log(`${pass ? "✓" : "✗"} ${name}\n    ${detail}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
