"use client";

import { useEffect } from "react";

import { useExperience, type ComfortSettings } from "@/lib/store/experience";

const TOGGLES: { key: keyof ComfortSettings; label: string; hint: string }[] = [
  {
    key: "reduceMotion",
    label: "Reduce motion",
    hint: "Removes camera travel, parallax and the boot sequence",
  },
  {
    key: "snapTransitions",
    label: "Snap transitions",
    hint: "Jump between stations instead of gliding",
  },
  { key: "vignette", label: "Movement vignette", hint: "Darkens edges while moving" },
  { key: "perfHud", label: "Performance HUD", hint: "Live frame time and draw calls" },
];

/**
 * The comfort menu, in the grammar of the headset's own settings panel.
 *
 * On a Quest these controls exist because motion discomfort is real. Here they
 * double as the accessibility surface — reduce-motion is a first-class control
 * rather than something buried in a media query. Treating accessibility as part
 * of the theme is the point: it belongs in a portfolio about spatial UX.
 */
export function ComfortMenu() {
  const open = useExperience((s) => s.comfortMenuOpen);
  const toggle = useExperience((s) => s.toggleComfortMenu);
  const comfort = useExperience((s) => s.comfort);
  const setComfort = useExperience((s) => s.setComfort);

  // Adopt the OS preference on first load, so the default is correct before
  // anyone touches this panel.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) setComfort({ reduceMotion: true });
  }, [setComfort]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle]);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="panel fixed top-4 right-4 z-30 px-3 py-2 font-mono text-[11px] tracking-widest text-ink-dim uppercase transition-colors hover:text-ink"
      >
        Comfort
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Comfort settings"
          className="panel fixed top-16 right-4 z-30 w-[min(20rem,88vw)] p-4"
        >
          <ul className="grid gap-1">
            {TOGGLES.map(({ key, label, hint }) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setComfort({ [key]: !comfort[key] })}
                  aria-pressed={comfort[key]}
                  className="group flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent/10"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-full border border-accent/40 px-0.5 transition-colors"
                    style={{
                      background: comfort[key] ? "var(--color-accent)" : "transparent",
                    }}
                  >
                    <span
                      className="size-2.5 rounded-full bg-ink transition-transform"
                      style={{
                        transform: comfort[key] ? "translateX(11px)" : "translateX(0)",
                      }}
                    />
                  </span>
                  <span>
                    <span className="block text-sm text-ink">{label}</span>
                    <span className="block text-xs text-ink-faint">{hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <a
            href="/flat"
            className="mt-3 block rounded-lg border border-accent/30 px-3 py-2 text-center text-sm text-ink-dim transition-colors hover:border-accent-bright hover:text-accent-bright"
          >
            Switch to flat mode
          </a>
        </div>
      ) : null}
    </>
  );
}
