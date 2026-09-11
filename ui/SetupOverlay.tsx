"use client";

import { useEffect, useState } from "react";

import { useExperience } from "@/lib/store/experience";

/**
 * The DOM half of the arc: the prompt on the desk, the black-out while the
 * headset comes on, and the two first-time setup steps. Played completely
 * straight — the copy is the copy a headset would use.
 *
 * Keyboard users get a real button to put the headset on and real buttons to
 * skip each step; the 3D click targets are the pleasant path, never the only
 * one.
 */
export function SetupOverlay() {
  const phase = useExperience((s) => s.phase);
  const setPhase = useExperience((s) => s.setPhase);
  const guardian = useExperience((s) => s.guardian);

  // The black-out lags the phase so the visor is over your eyes before the
  // screen goes dark, and lifts once boot has begun.
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (phase === "donning") {
      const id = window.setTimeout(() => setDark(true), 900);
      return () => window.clearTimeout(id);
    }
    if (phase === "boot") {
      const id = window.setTimeout(() => setDark(false), 350);
      return () => window.clearTimeout(id);
    }
    setDark(false);
  }, [phase]);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[45] bg-black transition-opacity duration-500"
        style={{ opacity: dark ? 1 : 0 }}
      />

      {phase === "desk" ? (
        <Prompt>
          <p className="font-mono text-[11px] tracking-[0.3em] text-ink-faint uppercase">
            Rajan Hasija
          </p>
          <button
            type="button"
            onClick={() => setPhase("donning")}
            className="panel mt-4 px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent-bright hover:text-accent-bright"
          >
            Put on the headset
          </button>
          <a href="/flat" className="mt-3 text-xs text-ink-faint underline-offset-4 hover:underline">
            or read it flat
          </a>
        </Prompt>
      ) : null}

      {phase === "guardian" ? (
        <Prompt>
          <Step n={1} of={2} />
          <h2 className="mt-2 text-2xl font-medium tracking-tight">Draw your Guardian</h2>
          <p className="mt-2 max-w-sm text-sm text-ink-dim">
            Press and trace a boundary on the floor around you. Your play space is
            wherever you are.
          </p>
          <button
            type="button"
            onClick={() => setPhase("floor")}
            className="mt-4 text-xs text-ink-faint underline-offset-4 hover:underline"
          >
            {guardian ? "Keep the last boundary" : "Use roomscale default"}
          </button>
        </Prompt>
      ) : null}

      {phase === "floor" ? (
        <Prompt>
          <Step n={2} of={2} />
          <h2 className="mt-2 text-2xl font-medium tracking-tight">Confirm floor level</h2>
          <p className="mt-2 max-w-sm text-sm text-ink-dim">
            Touch the floor to confirm its height.
          </p>
          <button
            type="button"
            onClick={() => setPhase("live")}
            className="panel mt-4 px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent-bright hover:text-accent-bright"
          >
            Confirm
          </button>
        </Prompt>
      ) : null}
    </>
  );
}

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-6 pb-16 sm:pb-20">
      <div className="flex flex-col items-center text-center [&_a]:pointer-events-auto [&_button]:pointer-events-auto">{children}</div>
    </div>
  );
}

function Step({ n, of }: { n: number; of: number }) {
  return (
    <p className="font-mono text-[10px] tracking-[0.3em] text-accent-bright uppercase">
      Setup · {n} of {of}
    </p>
  );
}
