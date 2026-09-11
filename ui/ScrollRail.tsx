"use client";

import Lenis from "lenis";
import { useEffect } from "react";

import { isLive, useExperience } from "@/lib/store/experience";
import { rail } from "@/lib/store/rail";
import { STATIONS } from "@/lib/stations";

/**
 * Turns native scrolling into the single input the environment runs on.
 *
 * Writes straight into the `rail` singleton rather than React state — see the
 * note in lib/store/rail.ts. The tall spacer gives the page something to
 * scroll; every visible layer is fixed-position on top of it.
 *
 * The spacer exists only once the headset is on and set up. Until then there
 * is nothing to scroll to, and the desk and setup steps must not be scrolled
 * past.
 */
export function ScrollRail() {
  const reduceMotion = useExperience((s) => s.comfort.reduceMotion);
  const live = useExperience((s) => isLive(s.phase));

  useEffect(() => {
    document.body.style.overflow = live ? "" : "hidden";
    if (!live) {
      window.scrollTo(0, 0);
      rail.target = 0;
      rail.velocity = 0;
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [live]);

  useEffect(() => {
    if (!live) return;

    const readProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? window.scrollY / max : 0;
    };

    // With reduced motion we skip Lenis entirely: smoothing *is* the motion
    // some people are asking us to remove.
    if (reduceMotion) {
      const onScroll = () => {
        rail.target = readProgress();
        rail.velocity = 0;
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const lenis = new Lenis({ duration: 1.1, syncTouch: false });
    lenis.on("scroll", ({ progress, velocity }: { progress: number; velocity: number }) => {
      rail.target = progress;
      rail.velocity = velocity;
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduceMotion, live]);

  // Pointer drives the fake head-tracking parallax. Also written outside React.
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      rail.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      rail.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  if (!live) return null;

  return (
    <div
      aria-hidden
      style={{ height: `${STATIONS.length * 100}vh` }}
      className="pointer-events-none w-full"
    />
  );
}
