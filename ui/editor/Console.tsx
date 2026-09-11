"use client";

import { useEffect, useRef, useState } from "react";

import { useEditor, type LogLevel } from "@/lib/store/editor";

const GLYPH: Record<LogLevel, string> = { info: "ℹ", warn: "⚠", error: "✕", ok: "✓" };

/**
 * The console. Selection, transforms, play/stop, achievements — everything the
 * editor does gets a line. Filters by level, auto-scrolls unless you have
 * scrolled up to read something, and clears.
 */
export function Console() {
  const lines = useEditor((s) => s.console);
  const clear = useEditor((s) => s.clearConsole);
  const [filter, setFilter] = useState<Record<LogLevel, boolean>>({ info: true, warn: true, error: true, ok: true });
  const body = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const el = body.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const shown = lines.filter((l) => filter[l.level]);

  return (
    <section className="ed-panel" aria-label="Console">
      <header className="ed-panel__head">
        <span>Console</span>
        <div className="ed-console__tools">
          {(["info", "ok", "warn", "error"] as LogLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              className={`ed-chip ed-level-${level} ${filter[level] ? "is-on" : ""}`}
              onClick={() => setFilter((f) => ({ ...f, [level]: !f[level] }))}
              aria-pressed={filter[level]}
            >
              {GLYPH[level]} {lines.filter((l) => l.level === level).length}
            </button>
          ))}
          <button type="button" className="ed-btn ed-btn--small" onClick={clear}>
            Clear
          </button>
        </div>
      </header>
      <div
        ref={body}
        className="ed-panel__body ed-console"
        role="log"
        aria-live="polite"
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
      >
        {shown.length === 0 ? <div className="ed-dim ed-console__empty">No messages.</div> : null}
        {shown.map((line) => (
          <div key={line.id} className={`ed-console__line ed-level-${line.level}`}>
            <span className="ed-console__time">{time(line.at)}</span>
            <span className="ed-console__glyph" aria-hidden>
              {GLYPH[line.level]}
            </span>
            <span className="ed-console__text">{line.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function time(at: number) {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
