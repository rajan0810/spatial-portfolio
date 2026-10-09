import { WORLD_H, WORLD_W } from "./constants";

export type Camera = { x: number; y: number; zoom: number; vw: number; vh: number };

/** Big enough to feel like a world, close enough to see a face. */
export function zoomFor(vw: number) {
  return Math.max(0.72, Math.min(1.36, vw / 1050));
}

/** Eases toward the player and never shows the void past the sea. */
export function follow(cam: Camera, tx: number, ty: number, dt: number) {
  const k = 1 - Math.exp(-7 * dt);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
  const halfW = cam.vw / 2 / cam.zoom;
  const halfH = cam.vh / 2 / cam.zoom;
  cam.x = halfW * 2 >= WORLD_W ? WORLD_W / 2 : Math.max(halfW, Math.min(WORLD_W - halfW, cam.x));
  cam.y = halfH * 2 >= WORLD_H ? WORLD_H / 2 : Math.max(halfH, Math.min(WORLD_H - halfH, cam.y));
}

export const toScreen = (cam: Camera, x: number, y: number) => ({
  x: (x - cam.x) * cam.zoom + cam.vw / 2,
  y: (y - cam.y) * cam.zoom + cam.vh / 2,
});

export const toWorld = (cam: Camera, sx: number, sy: number) => ({
  x: (sx - cam.vw / 2) / cam.zoom + cam.x,
  y: (sy - cam.vh / 2) / cam.zoom + cam.y,
});

/** The slice of world currently on screen, padded so nothing pops at the edge. */
export function viewBounds(cam: Camera, pad = 180) {
  const halfW = cam.vw / 2 / cam.zoom + pad;
  const halfH = cam.vh / 2 / cam.zoom + pad;
  return { x0: cam.x - halfW, x1: cam.x + halfW, y0: cam.y - halfH, y1: cam.y + halfH };
}
