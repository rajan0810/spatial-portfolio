"use client";

import { useEffect, useState } from "react";

import { useExperience } from "@/lib/store/experience";
import { STATIONS } from "@/lib/stations";

type Toast = { id: string; title: string; detail: string };

/**
 * "Achievement Unlocked", in platform grammar.
 *
 * The cheapest wow-per-line in the whole build, and the right frame for
 * hackathon wins: a trophy that slides in as you earn it reads as achievement,
 * where the same text in a bulleted list reads as a claim.
 *
 * In phase 1 this fires on reaching a station. From phase 3 the trophy shelf
 * feeds it from the achievements table.
 */
const STATION_AWARDS: Record<string, Toast> = {
  justix: {
    id: "station-justix",
    title: "JustiX inspected",
    detail: "Headset, phone and server — one project",
  },
  outro: {
    id: "station-outro",
    title: "Rail complete",
    detail: "You reached the end of the environment",
  },
};

export function AchievementToast() {
  const activeStation = useExperience((s) => s.activeStation);
  const unlocked = useExperience((s) => s.unlocked);
  const unlock = useExperience((s) => s.unlock);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const award = STATION_AWARDS[STATIONS[activeStation]?.id ?? ""];
    if (!award || unlocked.includes(award.id)) return;

    unlock(award.id);
    setToast(award);
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [activeStation, unlocked, unlock]);

  return (
    <div
      className="pointer-events-none fixed top-4 left-1/2 z-30 -translate-x-1/2"
      // Polite, not assertive: an achievement is not an error, and should never
      // interrupt whatever a screen reader is currently saying.
      role="status"
      aria-live="polite"
    >
      {toast ? (
        <div
          className="panel flex items-center gap-3 px-4 py-2.5"
          style={{
            borderColor: "color-mix(in oklab, var(--color-gold) 40%, transparent)",
            animation: "toast-in 320ms var(--ease-panel)",
          }}
        >
          <span aria-hidden className="text-base text-gold">
            ◆
          </span>
          <span>
            <span className="block font-mono text-[10px] tracking-[0.22em] text-gold uppercase">
              Achievement unlocked
            </span>
            <span className="block text-sm text-ink">{toast.title}</span>
            <span className="block text-xs text-ink-faint">{toast.detail}</span>
          </span>
        </div>
      ) : null}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
