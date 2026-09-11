"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type { ProfileView, ProjectView } from "@/lib/data/types";

import { AchievementToast } from "./AchievementToast";
import { BootOverlay } from "./BootOverlay";
import { ComfortMenu } from "./ComfortMenu";
import { Overlay } from "./Overlay";
import { PerfHud } from "./PerfHud";
import { ScrollRail } from "./ScrollRail";
import { StationIndicator } from "./StationIndicator";
import { Vignette } from "./Vignette";

/**
 * three + R3F + drei's SDF text are ~450KB gzipped — far too much to put in the
 * initial payload. Deferring the whole scene into its own chunk keeps the first
 * load to the DOM shell, and the download happens *behind the boot overlay*,
 * which is the one moment the site has a legitimate reason to be busy.
 *
 * ssr: false because there is nothing meaningful to server-render inside a
 * canvas — the indexable copy lives in the overlay and in flat mode.
 */
const Experience = dynamic(
  () => import("@/scene/Experience").then((m) => m.Experience),
  { ssr: false },
);

/** Cheap one-off probe: can this browser actually run the scene? */
function detectWebgl2() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

/**
 * Composes the experience and owns the downgrade decision.
 *
 * If WebGL2 is unavailable we never mount the canvas at all — a portfolio that
 * renders a black rectangle is worse than one that renders as a document. Flat
 * mode is a genuine equal, so sending someone there is a real answer rather
 * than an apology.
 */
export function ExperienceShell({
  profile,
  projects,
}: {
  profile: ProfileView;
  projects: ProjectView[];
}) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(detectWebgl2());
    document.body.classList.add("experience");
    return () => document.body.classList.remove("experience");
  }, []);

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

      {/* Held back until the probe resolves, so we never flash a dead canvas. */}
      {supported ? (
        <>
          <Experience profile={profile} projects={projects} />
          <Overlay profile={profile} projects={projects} />
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
