"use client";

import { useEffect, useState } from "react";

import { sfx } from "@/lib/audio";
import { useExperience } from "@/lib/store/experience";
import { STATIONS } from "@/lib/stations";

type Toast = { title: string; detail: string };

/**
 * "Achievement Unlocked", in platform grammar.
 *
 * The right frame for hackathon wins, and also for play: a trophy that slides
 * in as you earn it reads as achievement, where the same text in a list reads
 * as a claim. Anything can `announce(id)`; this shows them one at a time.
 *
 * Copy stays dry. The humour is in the accuracy, not the wording.
 */
const CATALOGUE: Record<string, Toast> = {
  "station-justix": { title: "JustiX inspected", detail: "Headset, phone and server — one project" },
  "station-outro": { title: "Rail complete", detail: "You reached the end of the environment" },
  "guardian-drawn": { title: "Guardian drawn", detail: "Play space: custom" },
  grab: { title: "Panel grabbed", detail: "It springs back. They always do." },
  throw: { title: "Nice throw", detail: "Release velocity over 4 m/s" },
  sound: { title: "Sound on", detail: "Synthesised in WebAudio — no files" },
  hands: { title: "Hand tracking on", detail: "Webcam, in-browser. Nothing uploaded." },
};

const STATION_AWARDS: Record<string, string> = { justix: "station-justix", outro: "station-outro" };

export function AchievementToast() {
  const activeStation = useExperience((s) => s.activeStation);
  const announce = useExperience((s) => s.announce);
  const pending = useExperience((s) => s.pendingToasts);
  const shiftToast = useExperience((s) => s.shiftToast);
  const [current, setCurrent] = useState<Toast | null>(null);

  // Station arrivals award themselves.
  useEffect(() => {
    const id = STATION_AWARDS[STATIONS[activeStation]?.id ?? ""];
    if (id) announce(id);
  }, [activeStation, announce]);

  // Show the head of the queue, one at a time.
  useEffect(() => {
    if (current || pending.length === 0) return;
    const toast = CATALOGUE[pending[0]];
    shiftToast();
    if (!toast) return;
    setCurrent(toast);
    sfx.chime();
    const id = window.setTimeout(() => setCurrent(null), 4000);
    return () => window.clearTimeout(id);
  }, [pending, current, shiftToast]);

  return (
    <div className="pointer-events-none absolute top-4 left-1/2 z-30 -translate-x-1/2" role="status" aria-live="polite">
      {current ? (
        <div
          key={current.title}
          className="panel flex items-center gap-3 px-4 py-2.5"
          style={{
            borderColor: "color-mix(in oklab, var(--color-gold) 40%, transparent)",
            animation: "toast-in 320ms var(--ease-panel)",
          }}
        >
          <span aria-hidden className="text-base text-gold">◆</span>
          <span>
            <span className="block font-mono text-[10px] tracking-[0.22em] text-gold uppercase">Achievement unlocked</span>
            <span className="block text-sm text-ink">{current.title}</span>
            <span className="block text-xs text-ink-faint">{current.detail}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
