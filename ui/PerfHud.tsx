"use client";

import { useEffect, useRef, useState } from "react";

import { perf } from "@/lib/store/perf";
import { isLive, useExperience } from "@/lib/store/experience";

/**
 * The frame-budget HUD.
 *
 * VR development lives inside a fixed frame budget — miss 72/90/120Hz and people
 * feel sick, not merely unimpressed. Showing the number, honestly, is a
 * professional signal rather than decoration.
 *
 * "Honestly" is the operative word. What we can measure in a browser is the
 * frame *interval*, which is pinned to the display's refresh rate: on a 60Hz
 * panel a perfectly idle page reads 16.7ms. Comparing that against an 8ms CPU
 * budget would show a permanent failure and mean nothing. So the HUD infers the
 * display cadence from the fastest frame it has seen and flags only genuine
 * drops below it. That is the question that actually matters: are we holding
 * refresh, or dropping frames?
 *
 * Samples at 5Hz — a HUD re-rendering at 60fps would itself become the problem.
 */
export function PerfHud() {
  const visible = useExperience((s) => s.comfort.perfHud);
  const live = useExperience((s) => isLive(s.phase));
  const [stats, setStats] = useState({ fps: 0, ms: 0, calls: 0, triangles: 0 });

  // Fastest frame interval observed = the display's cadence.
  const cadence = useRef(Infinity);

  useEffect(() => {
    if (!visible) return;

    const id = setInterval(() => {
      if (perf.ms > 1 && perf.ms < cadence.current) cadence.current = perf.ms;
      setStats({ ...perf });
    }, 200);

    return () => clearInterval(id);
  }, [visible]);

  if (!visible || !live) return null;

  const target = Number.isFinite(cadence.current) ? cadence.current : 16.7;
  const refresh = Math.round(1000 / target);
  // 15% of headroom before we call it a dropped frame.
  const dropping = stats.ms > target * 1.15 && stats.fps > 0;

  return (
    <div
      className="panel pointer-events-none fixed bottom-4 left-4 z-30 px-3 py-2 font-mono text-[10px] leading-relaxed tracking-wider tabular-nums"
      // Live region deliberately off: a screen reader announcing fps five times
      // a second would be unusable.
      aria-hidden
    >
      <div className="flex items-center gap-2">
        <span
          className="size-1.5 rounded-full"
          style={{ background: dropping ? "#ffc24b" : "#2e7cf6" }}
        />
        <span className={dropping ? "text-gold" : "text-ink"}>
          {stats.fps.toFixed(0)} fps
        </span>
        <span className="text-ink-faint">{stats.ms.toFixed(1)} ms</span>
      </div>
      <div className="mt-0.5 text-ink-faint">
        {stats.calls} calls · {(stats.triangles / 1000).toFixed(1)}k tris ·{" "}
        {dropping ? "dropping" : `holding ${refresh}Hz`}
      </div>
    </div>
  );
}
