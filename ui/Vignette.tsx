"use client";

import { useEffect, useRef } from "react";

import { useExperience } from "@/lib/store/experience";
import { rail } from "@/lib/store/rail";

/**
 * Movement vignette — the genuine Quest comfort feature.
 *
 * Darkening the periphery while the camera moves reduces the vection that causes
 * motion discomfort. Here it tracks scroll velocity, so it only appears while you
 * are actually travelling, and it is a single CSS gradient rather than a
 * post-processing pass: no extra render target, no cost to the frame budget.
 */
export function Vignette() {
  const enabled = useExperience((s) => s.comfort.vignette);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    let shown = 0;

    const tick = () => {
      const target = Math.min(1, Math.abs(rail.velocity) / 24);
      shown += (target - shown) * 0.12;
      if (ref.current) ref.current.style.opacity = (shown * 0.7).toFixed(3);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20"
      style={{
        opacity: 0,
        background:
          "radial-gradient(ellipse 78% 68% at 50% 50%, transparent 45%, rgba(2,3,7,0.92) 100%)",
      }}
    />
  );
}
