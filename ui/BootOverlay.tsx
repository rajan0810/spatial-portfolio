"use client";

import { useEffect, useRef, useState } from "react";

import { sfx } from "@/lib/audio";
import { useExperience } from "@/lib/store/experience";

const LINES = [
  "display  · 2064×2208 per eye",
  "tracking · inside-out, 6DoF",
  "hands    · pinch gesture ready",
  "loading  · home environment",
];

const STEP_MS = 340;

/**
 * The headset starts. Runs only in the `boot` phase — after the visor is on
 * and the screen has gone dark — and covers the moment the WebGL scene is
 * compiling shaders. Always skippable. Under reduced motion it does not run
 * at all: a sequence of flashing lines is exactly what that preference asks
 * us not to do.
 *
 * Where it goes next depends on whether this headset has been set up before:
 * a saved guardian means straight into the environment.
 */
export function BootOverlay() {
  const phase = useExperience((s) => s.phase);
  const setPhase = useExperience((s) => s.setPhase);
  const guardian = useExperience((s) => s.guardian);
  const reduceMotion = useExperience((s) => s.comfort.reduceMotion);

  const [step, setStep] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const finish = useRef(() => {});

  finish.current = () => {
    if (dismissing) return;
    setDismissing(true);
    window.setTimeout(() => setPhase(guardian ? "live" : "guardian"), 420);
  };

  useEffect(() => {
    if (phase !== "boot") {
      setStep(0);
      setDismissing(false);
      return;
    }
    if (reduceMotion) {
      setPhase(guardian ? "live" : "guardian");
      return;
    }

    sfx.boot();
    const timers = LINES.map((_, i) =>
      window.setTimeout(() => setStep(i + 1), STEP_MS * (i + 1)),
    );
    const done = window.setTimeout(() => finish.current(), STEP_MS * (LINES.length + 1.6));
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(done);
    };
  }, [phase, reduceMotion, guardian, setPhase]);

  useEffect(() => {
    if (phase !== "boot") return;
    const skip = () => finish.current();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [phase]);

  if (phase !== "boot") return null;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-void transition-opacity duration-400"
      style={{ opacity: dismissing ? 0 : 1 }}
      role="status"
      aria-label="Starting the headset"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 45%, rgba(46,124,246,0.18), transparent 70%)",
        }}
      />

      <div className="relative w-[min(26rem,84vw)] font-mono text-[11px] leading-relaxed tracking-wide">
        {LINES.map((line, i) => (
          <div
            key={line}
            className="flex items-center gap-3 transition-all duration-300"
            style={{ opacity: i < step ? 1 : 0, transform: `translateY(${i < step ? 0 : 6}px)` }}
          >
            <span className="text-accent">✓</span>
            <span className="text-ink-dim">{line}</span>
          </div>
        ))}

        <div className="mt-6 h-px w-full overflow-hidden bg-surface">
          <div
            className="h-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${(step / LINES.length) * 100}%` }}
          />
        </div>

        <p className="mt-4 text-center text-[10px] tracking-[0.25em] text-ink-faint uppercase">
          press any key to skip
        </p>
      </div>
    </div>
  );
}
