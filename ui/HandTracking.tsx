"use client";

import { useEffect, useRef, useState } from "react";

import { sfx } from "@/lib/audio";
import type { HandFrame, HandTracker } from "@/lib/hands/tracker";
import { useEditor } from "@/lib/store/editor";
import { isLive, useExperience } from "@/lib/store/experience";

/**
 * "Use your hands?"
 *
 * Asked once, after sound, once the environment is live. On yes, the webcam
 * hand tracker starts and your index finger becomes the pointer: it drives
 * the same pointer events the mouse does, so the hand cursor, the panels you
 * can grab, the buttons and the rail all work without knowing. Raise your hand
 * to the top of the frame to travel forward; lower it to go back.
 *
 * A small mirrored preview stays on screen while tracking so you can see what
 * the camera sees — trust, and a way to find the frame. Nothing is uploaded;
 * the model runs in the page.
 */
export function HandTracking() {
  const live = useExperience((s) => isLive(s.phase));
  const enabled = useExperience((s) => s.comfort.handTracking);
  const setComfort = useExperience((s) => s.setComfort);
  const promptDone = useExperience((s) => s.handsPromptDone);
  const setPromptDone = useExperience((s) => s.setHandsPromptDone);
  const soundPromptDone = useExperience((s) => s.soundPromptDone);
  const announce = useExperience((s) => s.announce);
  const log = useEditor((s) => s.log);

  const [status, setStatus] = useState<"off" | "starting" | "on" | "error">("off");
  const [present, setPresent] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const tracker = useRef<HandTracker | null>(null);
  const previewHost = useRef<HTMLDivElement>(null);
  const wasPinching = useRef(false);

  const supported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  // The prompt follows the sound prompt, once, on capable devices.
  useEffect(() => {
    if (!live || promptDone || !soundPromptDone || !supported) return;
    const id = window.setTimeout(() => setShowPrompt(true), 1200);
    return () => window.clearTimeout(id);
  }, [live, promptDone, soundPromptDone, supported]);

  // Start / stop the tracker with the setting, only while live.
  useEffect(() => {
    if (!enabled || !live || !supported) {
      tracker.current?.stop();
      tracker.current = null;
      setStatus("off");
      return;
    }

    let cancelled = false;
    setStatus("starting");

    (async () => {
      const { HandTracker } = await import("@/lib/hands/tracker");
      const t = new HandTracker();
      try {
        await t.start();
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setComfort({ handTracking: false });
        log("warn", `Hand tracking unavailable: ${(error as Error).message}`);
        return;
      }
      if (cancelled) {
        t.stop();
        return;
      }
      tracker.current = t;
      setStatus("on");
      log("ok", "Hand tracking on — webcam, in-browser");
      announce("hands");

      if (previewHost.current && t.preview) {
        previewHost.current.replaceChildren(t.preview);
      }

      t.subscribe((frame) => {
        setPresent(Boolean(frame));
        if (frame) drive(frame);
        else if (wasPinching.current) {
          wasPinching.current = false;
          dispatch("pointerup", lastPoint.current);
        }
      });
    })();

    return () => {
      cancelled = true;
      tracker.current?.stop();
      tracker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, live, supported]);

  const lastPoint = useRef({ x: 0, y: 0 });

  /** Turn a hand frame into the pointer events everything else listens to. */
  const drive = (frame: HandFrame) => {
    const x = ((frame.x + 1) / 2) * window.innerWidth;
    const y = ((frame.y + 1) / 2) * window.innerHeight;
    lastPoint.current = { x, y };
    dispatch("pointermove", { x, y }, frame.pinching);

    if (frame.pinching && !wasPinching.current) {
      wasPinching.current = true;
      dispatch("pointerdown", { x, y }, true);
    } else if (!frame.pinching && wasPinching.current) {
      wasPinching.current = false;
      dispatch("pointerup", { x, y });
      // A pinch over a DOM control is a click on it.
      const el = document.elementFromPoint(x, y);
      if (el instanceof HTMLElement && el.closest("button, a")) (el.closest("button, a") as HTMLElement).click();
    }

    // Edge travel: hand near the top of the frame moves forward, bottom moves back.
    const edge = frame.y < -0.8 ? 1 : frame.y > 0.8 ? -1 : 0;
    if (edge) window.scrollBy({ top: edge * 6, behavior: "auto" });
  };

  const dispatch = (type: "pointermove" | "pointerdown" | "pointerup", point: { x: number; y: number }, pressed = false) => {
    const target = document.querySelector("canvas") ?? document.body;
    const init: PointerEventInit = {
      clientX: point.x,
      clientY: point.y,
      bubbles: true,
      cancelable: true,
      pointerId: 7,
      pointerType: "pen", // not "mouse": lets hover/pinch differ from a real mouse if ever needed
      isPrimary: true,
      button: 0,
      buttons: pressed ? 1 : 0,
    };
    target.dispatchEvent(new PointerEvent(type, init));
    // R3F listens for pointermove on its own root; window listeners (parallax,
    // hand state) hear it through bubbling.
  };

  const answer = (on: boolean) => {
    setShowPrompt(false);
    setPromptDone();
    if (on) {
      sfx.pinch();
      setComfort({ handTracking: true });
    }
  };

  if (!live) return null;

  return (
    <>
      {showPrompt ? (
        <div
          role="dialog"
          aria-label="Hand tracking"
          className="panel absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 px-3 py-2"
          style={{ animation: "toast-in 320ms var(--ease-panel)" }}
        >
          <span className="pl-1 text-sm text-ink-dim">
            Use your hands? <span className="text-ink-faint">Webcam, in-browser, nothing uploaded.</span>
          </span>
          <button type="button" onClick={() => answer(true)} className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white transition-colors hover:bg-accent-bright">
            Enable
          </button>
          <button type="button" onClick={() => answer(false)} className="rounded-lg px-3 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
            Not now
          </button>
        </div>
      ) : null}

      {enabled && status !== "off" ? (
        <div className="panel absolute top-16 left-4 z-30 flex items-center gap-3 p-2" aria-live="polite">
          <div ref={previewHost} className="hand-preview" aria-hidden />
          <div className="pr-1 font-mono text-[10px] leading-relaxed tracking-wider">
            <div className="text-ink">
              {status === "starting" ? "Loading hand model…" : status === "error" ? "Camera unavailable" : present ? "Hand tracked" : "Show your hand"}
            </div>
            <div className="text-ink-faint">{status === "on" ? "pinch to press · raise to travel" : " "}</div>
          </div>
          <button
            type="button"
            onClick={() => setComfort({ handTracking: false })}
            className="rounded-md px-2 py-1 font-mono text-[10px] tracking-widest text-ink-faint uppercase transition-colors hover:text-ink"
            aria-label="Stop hand tracking"
          >
            Off
          </button>
        </div>
      ) : null}
    </>
  );
}
