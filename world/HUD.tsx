"use client";

import { useEffect, useRef, useState } from "react";

import type { ProfileView } from "@/lib/data/types";

import type { Place } from "./layout";
import type { Sky } from "./sky";

type Props = {
  places: Place[];
  found: string[];
  near: Place | null;
  open: boolean;
  menu: boolean;
  toast: Place | null;
  sky: Sky;
  moved: boolean;
  profile: ProfileView;
  onToggleMenu: () => void;
  onTravel: (p: Place) => void;
  onEnter: (p: Place) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playerRef: React.RefObject<any>;
};

/**
 * Everything drawn over the island: where you are, what you have found, and
 * the two ways in — walk to a door, or pick a place off the map.
 *
 * The map is not a convenience. It is the keyboard and screen-reader route to
 * every piece of content on the site, which is what lets the world be a world
 * rather than an obstacle.
 */
export function HUD({
  places,
  found,
  near,
  open,
  menu,
  toast,
  sky,
  moved,
  profile,
  onToggleMenu,
  onTravel,
  onEnter,
  playerRef,
}: Props) {
  const total = places.length;
  const coarse = useCoarsePointer();

  return (
    <div className="pointer-events-none absolute inset-0 select-none" data-ui>
      {/* Who, and how much of the island you have seen. */}
      <header className="absolute top-0 left-0 p-4 sm:p-5">
        <div className="pointer-events-auto inline-block rounded-xl bg-[#17212bcc] px-4 py-3 backdrop-blur-sm ring-1 ring-white/10">
          <h1 className="text-lg font-semibold tracking-tight text-[#f2ead9] sm:text-xl">{profile.name}</h1>
          <p className="mt-0.5 max-w-xs text-xs text-[#b9ac97] sm:text-sm">{profile.headline}</p>
          <p className="ink-label mt-2">
            <span className="text-[#ffce82]">{found.length}</span> / {total} places found · {sky.label}
          </p>
        </div>
      </header>

      {/* Map. */}
      <div className="absolute top-0 right-0 p-4 sm:p-5">
        <button
          type="button"
          data-ui
          onClick={onToggleMenu}
          aria-expanded={menu}
          className="pointer-events-auto rounded-xl bg-[#17212bcc] px-3.5 py-2.5 text-sm text-[#f2ead9] ring-1 ring-white/10 backdrop-blur-sm transition hover:ring-[#ffce82]/60"
        >
          🧭 Map <span className="ink-label ml-1">M</span>
        </button>
      </div>

      {menu ? (
        <div
          data-ui
          role="dialog"
          aria-label="Island map"
          className="pointer-events-auto absolute top-16 right-4 z-20 w-[min(23rem,calc(100vw-2rem))] rounded-2xl bg-[#17212bf2] p-3 ring-1 ring-white/10 backdrop-blur"
          style={{ animation: "rise 180ms ease-out" }}
        >
          <p className="ink-label px-2 pb-2">Travel anywhere · {found.length}/{total} found</p>
          <ul className="grid max-h-[60vh] gap-1 overflow-auto">
            {places.map((p) => {
              const seen = found.includes(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onTravel(p)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/10"
                  >
                    <span aria-hidden className={`size-2 shrink-0 rounded-full ${seen ? "bg-[#ffce82]" : "bg-white/25"}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-[#f2ead9]">{p.name}</span>
                      <span className="block truncate text-xs text-[#8d8273]">{p.sub}</span>
                    </span>
                    <span className="ink-label ml-auto shrink-0">{seen ? "visited" : "go"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="ink-label px-2 pt-2">
            Or open any place directly:{" "}
            <button type="button" onClick={() => near && onEnter(near)} className="underline disabled:no-underline disabled:opacity-40" disabled={!near}>
              {near ? `enter ${near.name}` : "walk to a door"}
            </button>
          </p>
        </div>
      ) : null}

      {/* The prompt at a door. */}
      {near && !open && !menu ? (
        <div
          className="pointer-events-auto absolute bottom-28 left-1/2 -translate-x-1/2 sm:bottom-24"
          style={{ animation: "rise 160ms ease-out" }}
        >
          <button
            type="button"
            data-ui
            onClick={() => onEnter(near)}
            className="rounded-full bg-[#ffce82] px-5 py-2.5 text-sm font-semibold text-[#2a1f12] shadow-lg shadow-black/40 transition hover:bg-[#ffd99b]"
          >
            Enter {near.name} <span className="ml-1 rounded bg-black/15 px-1.5 py-0.5 font-mono text-[11px]">E</span>
          </button>
        </div>
      ) : null}

      {/* Discovery. */}
      {toast ? (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#17212bee] px-6 py-4 text-center ring-1 ring-[#ffce82]/50"
          style={{ animation: "rise 300ms ease-out" }}
          role="status"
        >
          <p className="ink-label text-[#ffce82]">Discovered</p>
          <p className="mt-1 text-lg font-semibold text-[#f2ead9]">{toast.name}</p>
          <p className="text-xs text-[#b9ac97]">{toast.sub}</p>
        </div>
      ) : null}

      {/* How to move, until they have. */}
      {!moved && !open ? (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-[#17212bcc] px-4 py-2 backdrop-blur-sm ring-1 ring-white/10">
          <p className="ink-label">
            {coarse ? "Drag the stick to walk · tap the ground to go there" : "WASD or arrows to walk · shift to run · click the ground to go there"}
          </p>
        </div>
      ) : null}

      <a
        href="/flat"
        data-ui
        className="pointer-events-auto absolute bottom-4 right-4 rounded-lg bg-[#17212bcc] px-3 py-2 text-xs text-[#b9ac97] ring-1 ring-white/10 backdrop-blur-sm transition hover:text-[#f2ead9]"
      >
        Read it as a page ↗
      </a>

      {coarse ? <Thumbstick playerRef={playerRef} /> : null}
    </div>
  );
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => setCoarse(window.matchMedia("(pointer: coarse)").matches), []);
  return coarse;
}

/** A thumbstick for touch, writing straight into the control state. */
function Thumbstick({ playerRef }: { playerRef: React.RefObject<{ controls: { x: number; y: number } } | null> }) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);

  useEffect(() => {
    const el = base.current;
    if (!el) return;
    const R = 46;

    const set = (dx: number, dy: number) => {
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, R);
      const nx = len > 0 ? (dx / len) * (clamped / R) : 0;
      const ny = len > 0 ? (dy / len) * (clamped / R) : 0;
      const controls = playerRef.current?.controls;
      if (controls) {
        // A short deadzone, then full speed — a stick that creeps is worse than none.
        const mag = Math.hypot(nx, ny);
        const scaled = mag < 0.18 ? 0 : 1;
        controls.x = mag > 0 ? (nx / mag) * scaled : 0;
        controls.y = mag > 0 ? (ny / mag) * scaled : 0;
      }
      if (knob.current) knob.current.style.transform = `translate(${nx * R}px, ${ny * R}px)`;
    };

    const rect = () => el.getBoundingClientRect();
    const down = (e: PointerEvent) => {
      active.current = e.pointerId;
      el.setPointerCapture(e.pointerId);
      const r = rect();
      set(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    };
    const move = (e: PointerEvent) => {
      if (active.current !== e.pointerId) return;
      const r = rect();
      set(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    };
    const up = (e: PointerEvent) => {
      if (active.current !== e.pointerId) return;
      active.current = null;
      set(0, 0);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [playerRef]);

  return (
    <div
      ref={base}
      data-ui
      aria-hidden
      className="pointer-events-auto absolute bottom-6 left-6 size-32 touch-none rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-sm"
    >
      <div
        ref={knob}
        className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffce82]/80 shadow-lg"
      />
    </div>
  );
}
