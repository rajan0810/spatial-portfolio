"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ProfileView, ProjectView } from "@/lib/data/types";
import { isLive, useExperience } from "@/lib/store/experience";

import { AchievementToast } from "./AchievementToast";
import { BootOverlay } from "./BootOverlay";
import { ComfortMenu } from "./ComfortMenu";
import { Overlay } from "./Overlay";
import { PerfHud } from "./PerfHud";
import { ScrollRail } from "./ScrollRail";
import { SetupOverlay } from "./SetupOverlay";
import { SoundPrompt } from "./SoundPrompt";
import { StationIndicator } from "./StationIndicator";
import { Vignette } from "./Vignette";

/**
 * three + R3F + drei's SDF text are ~450KB gzipped — far too much for the
 * initial payload. The whole scene is a deferred chunk; the desk appears the
 * moment it lands, so the first thing anyone sees is the headset, not a
 * loading bar.
 */
const Experience = dynamic(() => import("@/scene/Experience").then((m) => m.Experience), {
  ssr: false,
});

function detectWebgl2() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/**
 * Composes the experience and owns the downgrade decision.
 *
 * If WebGL2 is unavailable we never mount the canvas — a portfolio that
 * renders a black rectangle is worse than one that renders as a document.
 * Flat mode is a genuine equal, so sending someone there is an answer, not
 * an apology.
 */
export function ExperienceShell({
  profile,
  projects,
}: {
  profile: ProfileView;
  projects: ProjectView[];
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const phase = useExperience((s) => s.phase);
  const setPhase = useExperience((s) => s.setPhase);
  const setComfort = useExperience((s) => s.setComfort);
  const router = useRouter();

  useEffect(() => {
    setSupported(detectWebgl2());
    document.body.classList.add("experience");

    // The lens pass is a full extra fragment pass; on a phone's GPU at 3x dpr
    // that is the difference between holding refresh and not.
    if (window.matchMedia("(pointer: coarse)").matches) setComfort({ lens: false });

    // Every visit starts at the desk. Setup is remembered; putting it on is not.
    setPhase("desk");

    return () => document.body.classList.remove("experience");
  }, [setComfort, setPhase]);

  // Once the headset is on, your hand is the cursor. Only with a fine pointer:
  // on touch there is no cursor to replace.
  useEffect(() => {
    const fine = !window.matchMedia("(pointer: coarse)").matches;
    document.body.classList.toggle("hand-cursor", fine && isLive(phase));
    return () => document.body.classList.remove("hand-cursor");
  }, [phase]);

  // Taking the headset off: the lenses close, then flat mode.
  useEffect(() => {
    if (phase !== "doffing") return;
    const id = window.setTimeout(() => router.push("/flat"), 900);
    return () => window.clearTimeout(id);
  }, [phase, router]);

  if (supported === false) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="font-mono text-[11px] tracking-[0.25em] text-ink-faint uppercase">
          WebGL2 unavailable
        </p>
        <h1 className="text-2xl font-medium">This browser can&rsquo;t run the environment</h1>
        <p className="text-sm text-ink-dim">
          Flat mode has all the same content, and it&rsquo;s faster anyway.
        </p>
        <a
          href="/flat"
          className="panel px-5 py-2.5 text-sm transition-colors hover:border-accent-bright hover:text-accent-bright"
        >
          Open flat mode
        </a>
      </main>
    );
  }

  return (
    <>
      <a href="/flat" className="skip-link text-sm">
        Skip the experience — open flat mode
      </a>

      {supported ? (
        <>
          <Experience profile={profile} projects={projects} />
          <Overlay profile={profile} projects={projects} />
          <SetupOverlay />
          <SoundPrompt />
          <Vignette />
          <StationIndicator />
          <ComfortMenu />
          <PerfHud />
          <AchievementToast />
          <BootOverlay />
        </>
      ) : null}

      <ScrollRail />
    </>
  );
}
