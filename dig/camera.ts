import { PAGE_H, WORLD_W } from "./constants";

/**
 * The world is WORLD_W wide in fixed units; the page scales it to fit. Scroll
 * is the camera. Keeping world units fixed is what makes a rest pose written
 * on one screen correct on every other.
 */
export type Camera = {
  scale: number;
  offsetX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
};

export function computeCamera(viewportW: number, viewportH: number, scrollY: number): Camera {
  const scale = Math.min(1, (viewportW - 16) / WORLD_W);
  const offsetX = (viewportW - WORLD_W * scale) / 2;
  return { scale, offsetX, scrollY, viewportW, viewportH };
}

export const pageHeight = (scale: number) => Math.round(PAGE_H * scale);

export function toScreen(cam: Camera, x: number, y: number) {
  return { x: cam.offsetX + x * cam.scale, y: y * cam.scale - cam.scrollY };
}

export function toWorld(cam: Camera, sx: number, sy: number) {
  return { x: (sx - cam.offsetX) / cam.scale, y: (sy + cam.scrollY) / cam.scale };
}

/** The world-space window currently on screen. */
export function visibleWorld(cam: Camera) {
  return { top: cam.scrollY / cam.scale, bottom: (cam.scrollY + cam.viewportH) / cam.scale };
}
