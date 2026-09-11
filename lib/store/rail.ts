/**
 * The scroll rail's position, deliberately kept OUT of React.
 *
 * Scroll updates ~60-120x/second. Putting it in React state (or a Zustand
 * store) would re-render every subscriber on every frame and blow the frame
 * budget on reconciliation alone. Instead this is a plain mutable singleton:
 * the scroll listener writes `target`, and the R3F render loop reads and damps
 * toward it inside useFrame. No renders, no allocation per frame.
 *
 * Discrete state that genuinely should re-render the UI — which station is
 * active, comfort settings, unlocked achievements — lives in
 * lib/store/experience.ts instead.
 */
export type Rail = {
  /** Raw normalized scroll position, 0 → 1 across the whole rail. */
  target: number;
  /** Damped position the camera actually uses. */
  progress: number;
  /** Signed scroll velocity, for motion blur / lean effects. */
  velocity: number;
  /** Pointer position in clip space, -1 → 1, for parallax head-tracking. */
  pointerX: number;
  pointerY: number;
};

export const rail: Rail = {
  target: 0,
  progress: 0,
  velocity: 0,
  pointerX: 0,
  pointerY: 0,
};

/** Frame-rate-independent damping. `lambda` is roughly "how snappy". */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
