/**
 * The island's non-negotiables, checked in a real browser.
 *
 *   npx tsx scripts/verify.ts [baseUrl]
 */
import { chromium, type Page } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

const BIOME = { DEEP: 0, WATER: 1, SAND: 2, GRASS: 3, FOREST: 4 };

type Probe = { x: number; y: number; biome: number; near: string | null; props: number };
const probe = (page: Page) =>
  page.evaluate(() => (window as unknown as { __island: () => Probe }).__island());

async function ready(page: Page) {
  await page.waitForSelector("canvas", { timeout: 45_000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Drawing the island"), { timeout: 45_000 });
  await page.waitForTimeout(700);
}

async function walk(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(220);
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome" });

  // --- the world builds, and you can walk around it --------------------------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // Clear once per context, not on every navigation — a reload has to be
  // able to read back what the previous page wrote.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("cleared")) {
      localStorage.clear();
      sessionStorage.setItem("cleared", "1");
    }
  });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await ready(page);

    const start = await probe(page);
    check("the island generates", start.props > 1500, `${start.props} props scattered`);

    await walk(page, "ArrowRight", 900);
    const moved = await probe(page);
    check("the character walks", Math.abs(moved.x - start.x) > 60, `moved ${Math.round(moved.x - start.x)}px east`);

    // Head for open sea and keep going: the shore has to stop you.
    await page.getByRole("button", { name: /Map/ }).click();
    await page.getByRole("button", { name: /The Beacon/ }).click();
    await page.waitForTimeout(600);
    await walk(page, "ArrowDown", 5000);
    const shore = await probe(page);
    check(
      "you cannot walk into the sea",
      shore.biome !== BIOME.WATER && shore.biome !== BIOME.DEEP,
      `ended on ${["deep", "water", "sand", "grass", "forest"][shore.biome]}`,
    );
    // Walking one straight line can always be stopped by a tree, so ask the
    // map itself: is the sand between here and the sea actually walkable?
    const beach = await page.evaluate(
      ([px, py]) => {
        const at = (window as unknown as { __islandAt: (x: number, y: number) => { biome: number; solid: boolean } }).__islandAt;
        let sand = 0;
        let walkable = 0;
        for (let dy = 0; dy < 400; dy += 8) {
          const cell = at(px, py + dy);
          if (cell.biome === 2) {
            sand += 1;
            if (!cell.solid) walkable += 1;
          }
        }
        return { sand, walkable };
      },
      [shore.x, shore.y],
    );
    check(
      "the beach below is walkable sand",
      beach.sand > 0 && beach.walkable === beach.sand,
      `${beach.walkable}/${beach.sand} sand samples walkable`,
    );

    // Frame budget, sampled over a second of real rendering.
    // Passed as source, not a function: the bundler rewrites named inner
    // functions with a __name helper that does not exist in the page.
    const fps = (await page.evaluate(`new Promise((resolve) => {
      let frames = 0;
      const t0 = performance.now();
      const tick = () => {
        frames += 1;
        if (performance.now() - t0 < 1000) requestAnimationFrame(tick);
        else resolve(frames);
      };
      requestAnimationFrame(tick);
    })`)) as number;
    check("holds a smooth frame rate", fps >= 50, `${fps} fps`);
    await page.close();
  }

  // --- every place is reachable, and opens real content ----------------------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // Clear once per context, not on every navigation — a reload has to be
  // able to read back what the previous page wrote.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("cleared")) {
      localStorage.clear();
      sessionStorage.setItem("cleared", "1");
    }
  });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await ready(page);

    await page.getByRole("button", { name: /Map/ }).click();
    const entries = await page.locator('[role="dialog"][aria-label="Island map"] button').count();
    check("the map lists every place", entries >= 12, `${entries} destinations`);

    await page.getByRole("button", { name: /The Courthouse/ }).click();
    await page.waitForTimeout(600);
    const atDoor = await probe(page);
    check("travelling puts you at the door", atDoor.near === "justix", `nearest: ${atDoor.near}`);

    await page.keyboard.press("e");
    await page.waitForTimeout(400);
    const body = await page.locator('[role="dialog"]').last().innerText();
    check(
      "the panel carries the real case study",
      body.includes("JustiX") && body.includes("Socket.io") && body.includes("courtroom"),
      `${body.length} characters of content`,
    );

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    check("Escape leaves the building", (await page.locator('[role="dialog"]').count()) === 0, "panel closed");

    // Discovery survives a reload.
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    const found = await page.evaluate(() => JSON.parse(localStorage.getItem("island:found") ?? "[]").length);
    check("discovery persists across a reload", found >= 1, `${found} place(s) remembered`);
    await page.close();
  }

  // --- keyboard only ---------------------------------------------------------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await ready(page);
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => {
      const el = document.activeElement as HTMLAnchorElement | null;
      return { tag: el?.tagName ?? "", href: el?.getAttribute("href") ?? "" };
    });
    check(
      "Tab moves focus to the skip link",
      first.tag === "A" && first.href === "/flat",
      `focused <${first.tag.toLowerCase()} href="${first.href}">`,
    );

    await page.keyboard.press("m");
    await page.waitForTimeout(300);
    check("M opens the map", (await page.locator('[aria-label="Island map"]').count()) === 1, "map opened by keyboard");
    await page.close();
  }

  // --- the page version ------------------------------------------------------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${BASE}/flat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    check("flat mode draws no canvas", (await page.locator("canvas").count()) === 0, "canvas-free");

    const html = await (await fetch(`${BASE}/flat`)).text();
    const projects = ["JustiX", "Awaaz", "Hatch", "NOVA", "INFERNO", "Xposure", "Edventures"];
    const missing = projects.filter((p) => !html.includes(p));
    check("every project is in the server HTML", missing.length === 0, missing.length ? `missing ${missing.join(", ")}` : "all 7 indexable");
    check(
      "the patent and the wins are in the HTML",
      html.includes("IN202641032832") && html.includes("Code2Create"),
      "awards indexable",
    );
    await page.close();
  }

  // --- a phone ---------------------------------------------------------------
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await ready(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check("no horizontal overflow on a phone", overflow <= 1, `overflow ${overflow}px`);
    await page.close();
  }

  await browser.close();

  console.log("");
  for (const { name, pass, detail } of results) console.log(`${pass ? "✓" : "✗"} ${name}\n    ${detail}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
