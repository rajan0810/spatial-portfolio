"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

import { useEditor } from "@/lib/store/editor";

/**
 * ⏸ and ⏭, done for real.
 *
 * Pause switches the render loop to `never`, so nothing draws and nothing
 * simulates — the frame HUD reads 0 because it is 0. Step calls `advance`
 * once, which runs exactly one frame of every useFrame in the scene and one
 * render, then stops again. The same semantics as the editor this imitates.
 */
export function PauseLoop() {
  const set = useThree((s) => s.set);
  const advance = useThree((s) => s.advance);
  const paused = useEditor((s) => s.paused);
  const stepRequested = useEditor((s) => s.stepRequested);

  useEffect(() => {
    set({ frameloop: paused ? "never" : "always" });
    return () => set({ frameloop: "always" });
  }, [paused, set]);

  useEffect(() => {
    if (stepRequested > 0) advance(performance.now());
  }, [stepRequested, advance]);

  return null;
}
