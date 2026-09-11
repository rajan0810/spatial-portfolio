/**
 * Live render stats, written from inside the R3F loop and read by the DOM HUD.
 *
 * A plain singleton again, for the same reason as the rail: these values change
 * every frame, and the HUD samples them a few times a second instead of
 * re-rendering on each one.
 */
export const perf = {
  fps: 0,
  /** Smoothed CPU frame time in ms. The number that matters for headroom. */
  ms: 0,
  calls: 0,
  triangles: 0,
};
