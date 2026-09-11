"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useEditor, type EditorLayout } from "@/lib/store/editor";

/**
 * The editor's title bar: project name, the transport (play / pause / step),
 * layout, and Build — which is what flat mode is, from here.
 *
 * Ctrl/⌘+P toggles play, as it does in the editor this imitates.
 */
export function TopBar({ unsaved }: { unsaved: boolean }) {
  const mode = useEditor((s) => s.mode);
  const paused = useEditor((s) => s.paused);
  const play = useEditor((s) => s.play);
  const stop = useEditor((s) => s.stop);
  const togglePause = useEditor((s) => s.togglePause);
  const step = useEditor((s) => s.step);
  const layout = useEditor((s) => s.layout);
  const setLayout = useEditor((s) => s.setLayout);
  const revert = useEditor((s) => s.revert);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (mode === "play") stop();
        else play();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, play, stop]);

  return (
    <header className="ed-topbar">
      <div className="ed-topbar__left">
        <span className="ed-logo" aria-hidden>
          ◈
        </span>
        <span className="ed-project">
          rajan-hasija.portfolio
          {unsaved ? <span className="ed-unsaved" title="Runtime changes, not saved"> *</span> : null}
        </span>
        <span className="ed-dim">— Portfolio.scene</span>
      </div>

      <div className="ed-transport" role="group" aria-label="Transport">
        <button
          type="button"
          className={`ed-tbtn ${mode === "play" ? "is-on" : ""}`}
          onClick={mode === "play" ? stop : play}
          aria-pressed={mode === "play"}
          aria-label={mode === "play" ? "Stop" : "Play"}
          title={mode === "play" ? "Stop (⌘P)" : "Play (⌘P)"}
        >
          {mode === "play" ? "■" : "▶"}
        </button>
        <button
          type="button"
          className={`ed-tbtn ${paused ? "is-on" : ""}`}
          onClick={togglePause}
          aria-pressed={paused}
          aria-label="Pause"
          title="Pause"
        >
          ❚❚
        </button>
        <button type="button" className="ed-tbtn" onClick={step} aria-label="Step" title="Step one frame">
          ⏭
        </button>
      </div>

      <div className="ed-topbar__right">
        {unsaved ? (
          <button type="button" className="ed-btn" onClick={() => revert()}>
            Revert all
          </button>
        ) : null}
        <label className="ed-dim">
          Layout{" "}
          <select
            className="ed-select"
            value={layout}
            onChange={(e) => setLayout(e.target.value as EditorLayout)}
          >
            <option value="default">Default</option>
            <option value="tall">Tall</option>
            <option value="wide">Wide</option>
          </select>
        </label>
        <Link href="/flat" className="ed-btn ed-btn--accent">
          Build ↗
        </Link>
      </div>
    </header>
  );
}
