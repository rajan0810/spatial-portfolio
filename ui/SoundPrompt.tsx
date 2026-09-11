"use client";

import { useEffect, useState } from "react";

import { sfx } from "@/lib/audio";
import { isLive, useExperience } from "@/lib/store/experience";

/**
 * One question, asked once, the moment you arrive in the environment.
 *
 * Sound is opt-in because autoplay is hostile and browsers block it anyway —
 * but a headset without sound is half a headset, so the ask is made plainly
 * rather than buried in settings.
 */
export function SoundPrompt() {
  const live = useExperience((s) => isLive(s.phase));
  const done = useExperience((s) => s.soundPromptDone);
  const setDone = useExperience((s) => s.setSoundPromptDone);
  const audio = useExperience((s) => s.comfort.audio);
  const setComfort = useExperience((s) => s.setComfort);
  const announce = useExperience((s) => s.announce);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!live || done) return;
    const id = window.setTimeout(() => setShown(true), 1400);
    return () => window.clearTimeout(id);
  }, [live, done]);

  // Keep the room tone in step with the setting, wherever it is changed.
  useEffect(() => {
    sfx.ambient(audio && live);
    return () => sfx.ambient(false);
  }, [audio, live]);

  if (!live || done || !shown) return null;

  const answer = (on: boolean) => {
    setComfort({ audio: on });
    setDone();
    if (on) {
      sfx.boot();
      announce("sound");
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Sound"
      className="panel fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 px-3 py-2"
      style={{ animation: "toast-in 320ms var(--ease-panel)" }}
    >
      <span className="pl-1 text-sm text-ink-dim">Sound?</span>
      <button
        type="button"
        onClick={() => answer(true)}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white transition-colors hover:bg-accent-bright"
      >
        On
      </button>
      <button
        type="button"
        onClick={() => answer(false)}
        className="rounded-lg px-3 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink"
      >
        Off
      </button>
    </div>
  );
}
