"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type { ProfileView, ProjectView } from "@/lib/data/types";
import { useEditor } from "@/lib/store/editor";
import { isLive, useExperience } from "@/lib/store/experience";
import { rail } from "@/lib/store/rail";

import { AchievementToast } from "../AchievementToast";
import { BootOverlay } from "../BootOverlay";
import { ComfortMenu } from "../ComfortMenu";
import { Overlay } from "../Overlay";
import { PerfHud } from "../PerfHud";
import { ScrollRail } from "../ScrollRail";
import { SetupOverlay } from "../SetupOverlay";
import { SoundPrompt } from "../SoundPrompt";
import { StationIndicator } from "../StationIndicator";
import { Vignette } from "../Vignette";

/**
 * three + R3F + drei's SDF text + the scene are ~290KB gzipped. The editor
 * chrome is the initial payload; the scene arrives into the viewport.
 */
const Experience = dynamic(() => import("@/scene/Experience").then((m) => m.Experience), {
  ssr: false,
  loading: () => (
    <div className="ed-viewport__loading">
      <span className="ed-dim">Compiling shaders…</span>
    </div>
  ),
});

function detectWebgl2() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/**
 * The scene view / game view / fullscreen game.
 *
 * In edit mode the Scene tab is the free editor camera; the Game tab is the
 * rail camera exactly as a player sees it, driven by the wheel. In play mode
 * this element becomes fullscreen and the whole headset arc runs inside it.
 * Everything the game draws over the canvas is positioned relative to this
 * element, so it is correct in both.
 */
export function Viewport({ profile, projects }: { profile: ProfileView; projects: ProjectView[] }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const mode = useEditor((s) => s.mode);
  const viewTab = useEditor((s) => s.viewTab);
  const setViewTab = useEditor((s) => s.setViewTab);
  const stop = useEditor((s) => s.stop);
  const phase = useExperience((s) => s.phase);
  const setPhase = useExperience((s) => s.setPhase);
  const setComfort = useExperience((s) => s.setComfort);

  useEffect(() => {
    setSupported(detectWebgl2());
    if (window.matchMedia("(pointer: coarse)").matches) setComfort({ lens: false });
  }, [setComfort]);

  // Play starts the game from the desk; Stop puts it away.
  useEffect(() => {
    if (mode === "play") setPhase("desk");
  }, [mode, setPhase]);

  // The hand is the cursor only while the game is live and fullscreen.
  useEffect(() => {
    const fine = !window.matchMedia("(pointer: coarse)").matches;
    document.body.classList.toggle("hand-cursor", fine && mode === "play" && isLive(phase));
    return () => document.body.classList.remove("hand-cursor");
  }, [phase, mode]);

  // Taking the headset off inside Play returns to the editor.
  useEffect(() => {
    if (phase !== "doffing") return;
    const id = window.setTimeout(() => stop(), 900);
    return () => window.clearTimeout(id);
  }, [phase, stop]);

  const playing = mode === "play";
  const gameTab = !playing && viewTab === "game";

  if (supported === false) {
    return (
      <div className="ed-viewport ed-viewport--unsupported">
        <p className="font-mono text-[11px] tracking-[0.25em] text-ink-faint uppercase">WebGL2 unavailable</p>
        <p className="text-sm text-ink-dim">This browser can&rsquo;t run the scene. Flat mode has all the same content.</p>
        <a href="/flat" className="ed-btn ed-btn--accent">
          Open flat mode
        </a>
      </div>
    );
  }

  return (
    <div
      className={`ed-viewport ${playing ? "is-playing" : ""}`}
      onWheel={(e) => {
        // In the Game tab the wheel drives the rail directly; there is no page.
        if (!gameTab) return;
        rail.target = Math.max(0, Math.min(1, rail.target + e.deltaY * 0.00045));
        rail.velocity = e.deltaY * 0.05;
      }}
    >
      {!playing ? (
        <div className="ed-viewtabs" role="tablist">
          <button type="button" role="tab" aria-selected={viewTab === "scene"} className={viewTab === "scene" ? "is-on" : ""} onClick={() => setViewTab("scene")}>
            Scene
          </button>
          <button type="button" role="tab" aria-selected={viewTab === "game"} className={viewTab === "game" ? "is-on" : ""} onClick={() => setViewTab("game")}>
            Game
          </button>
          <span className="ed-viewtabs__hint ed-dim">{viewTab === "scene" ? "Drag to orbit · F to frame · wheel to dolly" : "Wheel to travel the rail"}</span>
        </div>
      ) : (
        <div className="ed-playbar">
          <button type="button" className="ed-tbtn is-on" onClick={stop} aria-label="Stop" title="Stop (⌘P)">
            ■
          </button>
          <span className="ed-playbar__label">Playing</span>
        </div>
      )}

      {supported ? (
        <>
          <Experience profile={profile} projects={projects} />
          {playing || gameTab ? <Overlay profile={profile} projects={projects} /> : null}
          {playing ? (
            <>
              <SetupOverlay />
              <SoundPrompt />
              <Vignette />
              <StationIndicator />
              <ComfortMenu />
              <AchievementToast />
              <BootOverlay />
            </>
          ) : null}
          {gameTab ? <StationIndicator /> : null}
          <PerfHud />
        </>
      ) : null}

      <ScrollRail />
    </div>
  );
}
