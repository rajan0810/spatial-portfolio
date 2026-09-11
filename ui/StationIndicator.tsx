"use client";

import { useExperience } from "@/lib/store/experience";
import { STATIONS, stationProgress } from "@/lib/stations";

/**
 * Rail position, and the only explicit navigation control.
 *
 * Real buttons rather than decoration: scroll is the primary input, but a
 * visitor who wants to jump straight to a project — or who is navigating by
 * keyboard — needs a way that does not involve spinning a wheel.
 */
export function StationIndicator() {
  const active = useExperience((s) => s.activeStation);

  const goTo = (index: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: stationProgress(index) * max,
      behavior: "smooth",
    });
  };

  return (
    <nav
      aria-label="Stations"
      className="fixed top-1/2 right-4 z-30 hidden -translate-y-1/2 flex-col items-end gap-3 sm:flex"
    >
      {STATIONS.map((station, index) => {
        const current = index === active;
        return (
          <button
            key={station.id}
            type="button"
            onClick={() => goTo(index)}
            aria-current={current ? "true" : undefined}
            className="group flex items-center gap-2.5"
          >
            <span
              className="font-mono text-[10px] tracking-widest uppercase transition-opacity duration-200"
              style={{ opacity: current ? 1 : 0 }}
              aria-hidden
            >
              {station.label}
            </span>
            <span className="sr-only">{station.label}</span>
            <span
              aria-hidden
              className="h-px transition-all duration-300"
              style={{
                width: current ? 26 : 12,
                background: current ? "var(--color-accent-bright)" : "var(--color-ink-faint)",
              }}
            />
          </button>
        );
      })}
    </nav>
  );
}
