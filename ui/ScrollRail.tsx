"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useEditor } from "@/lib/store/editor";

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
  const playing = useEditor((s) => s.mode === "play");
  const live = useExperience((s) => isLive(s.phase)) && playing;

  useEffect(() => {
    // The editor root is fixed and body is overflow:hidden; the game needs a
    // real scrollable page, so lift that explicitly while live.
    document.body.style.overflow = live ? "auto" : "hidden";
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
  // On a phone the pointer barely moves, so device tilt takes over: leaning
  // the phone leans the environment, which is as close to head tracking as a
  // flat screen gets.
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      rail.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      rail.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const onTilt = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return;
      rail.pointerX = Math.max(-1, Math.min(1, event.gamma / 30));
      rail.pointerY = Math.max(-1, Math.min(1, (event.beta - 45) / 30));
    };
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    if (coarse) window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, []);

  if (!live) return null;

  // In flow on the body, not inside the fixed viewport, or nothing scrolls.
  return createPortal(
    <div aria-hidden style={{ height: `${STATIONS.length * 100}vh` }} className="pointer-events-none w-full" />,
    document.body,
  );
}
