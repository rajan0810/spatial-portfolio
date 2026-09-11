"use client";

import type { Camera } from "./camera";
import { toScreen } from "./camera";
import type { PresenceState } from "./live";

/**
 * Other people, right now: a dot per visitor at their cursor, carrying their
 * emoji if they have left one. Capped so a crowd stays a crowd, not a swarm.
 */
export function Presence({ others, cam }: { others: PresenceState[]; cam: Camera }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30">
      {others.slice(0, 30).map((o) => {
        const p = toScreen(cam, o.x, o.y);
        if (p.y < -40 || p.y > cam.viewportH + 40) return null;
        return (
          <div
            key={o.key}
            className="absolute flex items-center gap-1 transition-transform duration-150 ease-out"
            style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
          >
            <span className="size-2 rounded-full bg-moss shadow-[0_0_8px_rgba(156,207,154,0.8)]" />
            {o.emoji ? <span className="text-sm">{o.emoji}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
