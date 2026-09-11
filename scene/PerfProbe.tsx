"use client";

import { useFrame } from "@react-three/fiber";

import { perf } from "@/lib/store/perf";

/**
 * Reads real numbers out of the renderer for the HUD.
 *
 * Draw calls and triangle counts come from WebGLRenderer.info, so the HUD shows
 * what the GPU was actually asked to do rather than an estimate. A perf overlay
 * that lies is worse than none, especially on a site arguing that its author
 * understands frame budgets.
 */
export function PerfProbe() {
  useFrame(({ gl }, delta) => {
    // Exponential smoothing; raw per-frame values are too noisy to read.
    perf.ms = perf.ms === 0 ? delta * 1000 : perf.ms * 0.9 + delta * 1000 * 0.1;
    perf.fps = 1000 / Math.max(perf.ms, 0.0001);
    perf.calls = gl.info.render.calls;
    perf.triangles = gl.info.render.triangles;
  }, 2); // after LensPass (priority 1), so the counters cover the whole frame

  return null;
}
