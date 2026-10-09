import { BIOME, CELL, COLS, CX, CY, PALETTE, ROWS, RX, RY, TERRAIN_SCALE, WORLD_H, WORLD_W, type Biome } from "./constants";
import { fbm } from "./noise";

/**
 * The island.
 *
 * Shape comes from a signed distance field — an ellipse pushed around by two
 * octaves of noise — which gives both the painted coastline and the collision
 * data from one source, so they can never disagree.
 */

/** < 0 is land. Normalised, so the thresholds below read as fractions of the radius. */
export function islandField(x: number, y: number) {
  const nx = (x - CX) / RX;
  const ny = (y - CY) / RY;
  let d = Math.hypot(nx, ny) - 1;
  d += (fbm(x * 0.00085, y * 0.00085, 7, 3) - 0.5) * 0.46; // bays and headlands
  d += (fbm(x * 0.0034, y * 0.0034, 11, 2) - 0.5) * 0.09; // crinkle
  return d;
}

export function biomeAtField(d: number, moisture: number): Biome {
  if (d > 0.012) return BIOME.DEEP;
  if (d > -0.03) return BIOME.WATER;
  if (d > -0.085) return BIOME.SAND;
  return moisture > 0.62 ? BIOME.FOREST : BIOME.GRASS;
}

export type Terrain = {
  canvas: HTMLCanvasElement;
  /** One biome byte per grid cell. */
  biome: Uint8Array;
  /** Walkability, filled in by the layout once buildings and props exist. */
  solid: Uint8Array;
  /** Distance-to-path marker, used when scattering props. */
  path: Uint8Array;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Paints the island once into an offscreen canvas and builds the biome grid. */
export function generateTerrain(): Terrain {
  const w = Math.round(WORLD_W * TERRAIN_SCALE);
  const h = Math.round(WORLD_H * TERRAIN_SCALE);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(w, h);
  const data = image.data;

  for (let py = 0; py < h; py += 1) {
    const wy = py / TERRAIN_SCALE;
    for (let px = 0; px < w; px += 1) {
      const wx = px / TERRAIN_SCALE;
      const d = islandField(wx, wy);
      const moisture = fbm(wx * 0.0016, wy * 0.0016, 23, 3);
      const grain = fbm(wx * 0.035, wy * 0.035, 31, 2);

      let r: number;
      let g: number;
      let b: number;

      if (d > 0.012) {
        // Deep water, darkening outward.
        const t = Math.min(1, (d - 0.012) * 7);
        r = lerp(PALETTE.water[0], PALETTE.deep[0], t);
        g = lerp(PALETTE.water[1], PALETTE.deep[1], t);
        b = lerp(PALETTE.water[2], PALETTE.deep[2], t);
      } else if (d > -0.03) {
        // Shallows: a bright band hugging the shore.
        const t = Math.min(1, (d + 0.03) / 0.042);
        r = lerp(PALETTE.shallow[0], PALETTE.water[0], t);
        g = lerp(PALETTE.shallow[1], PALETTE.water[1], t);
        b = lerp(PALETTE.shallow[2], PALETTE.water[2], t);
      } else if (d > -0.085) {
        // Beach, wet at the waterline.
        const t = Math.min(1, (d + 0.085) / 0.055);
        r = lerp(PALETTE.sand[0], PALETTE.sandWet[0], t);
        g = lerp(PALETTE.sand[1], PALETTE.sandWet[1], t);
        b = lerp(PALETTE.sand[2], PALETTE.sandWet[2], t);
      } else {
        const base = moisture > 0.62 ? PALETTE.forest : moisture > 0.45 ? PALETTE.grass2 : PALETTE.grass;
        r = base[0];
        g = base[1];
        b = base[2];
        // A hint of sand just above the beach, so the transition isn't a hard line.
        const near = Math.max(0, 1 - (-d - 0.085) / 0.04);
        if (near > 0) {
          r = lerp(r, PALETTE.sand[0], near * 0.5);
          g = lerp(g, PALETTE.sand[1], near * 0.5);
          b = lerp(b, PALETTE.sand[2], near * 0.5);
        }
      }

      // Per-pixel grain keeps large areas from reading as flat fill.
      const n = (grain - 0.5) * 16;
      const i = (py * w + px) * 4;
      data[i] = Math.max(0, Math.min(255, r + n));
      data[i + 1] = Math.max(0, Math.min(255, g + n));
      data[i + 2] = Math.max(0, Math.min(255, b + n));
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // The coarse grid the game actually reasons about.
  const biome = new Uint8Array(COLS * ROWS);
  const solid = new Uint8Array(COLS * ROWS);
  const path = new Uint8Array(COLS * ROWS);
  for (let cy = 0; cy < ROWS; cy += 1) {
    for (let cx = 0; cx < COLS; cx += 1) {
      const wx = cx * CELL + CELL / 2;
      const wy = cy * CELL + CELL / 2;
      const d = islandField(wx, wy);
      const m = fbm(wx * 0.0016, wy * 0.0016, 23, 3);
      const b = biomeAtField(d, m);
      const idx = cy * COLS + cx;
      biome[idx] = b;
      // Water is the only thing terrain itself blocks.
      solid[idx] = b === BIOME.DEEP || b === BIOME.WATER ? 1 : 0;
    }
  }

  return { canvas, biome, solid, path };
}

export const cellIndex = (x: number, y: number) => {
  const cx = Math.floor(x / CELL);
  const cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return -1;
  return cy * COLS + cx;
};

export function isSolid(t: Terrain, x: number, y: number) {
  const i = cellIndex(x, y);
  return i < 0 || t.solid[i] === 1;
}

export function biomeAt(t: Terrain, x: number, y: number): Biome {
  const i = cellIndex(x, y);
  return i < 0 ? BIOME.DEEP : (t.biome[i] as Biome);
}

/** Stamps a rectangle as blocked — buildings. */
export function blockRect(t: Terrain, x: number, y: number, w: number, h: number) {
  for (let cy = Math.floor(y / CELL); cy <= Math.floor((y + h) / CELL); cy += 1) {
    for (let cx = Math.floor(x / CELL); cx <= Math.floor((x + w) / CELL); cx += 1) {
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
      t.solid[cy * COLS + cx] = 1;
    }
  }
}

/** Stamps a disc as blocked — trees, rocks. */
export function blockCircle(t: Terrain, x: number, y: number, r: number) {
  blockRect(t, x - r, y - r * 0.6, r * 2, r * 1.2);
}
