"use client";

import { useState } from "react";

import type { ProfileView } from "@/lib/data/types";
import { EMOJI_PALETTE, WORD_MAX, validateDrop } from "@/lib/moderation";

import type { Camera } from "./camera";
import { SURFACE_Y } from "./constants";

export type DropPhase =
  | { kind: "idle" }
  | { kind: "compose" }
  | { kind: "requesting" }
  | { kind: "holding"; emoji: string; word: string }
  | { kind: "falling"; emoji: string; word: string }
  | { kind: "done"; emoji: string; word: string }
  | { kind: "refused"; reason: string };

/**
 * The surface: sky, the marker stone, the signpost, the live count, and the
 * one thing a visitor can do here — leave something.
 */
export function Surface({
  profile,
  cam,
  here,
  total,
  phase,
  onCompose,
  onConfirm,
  onCancel,
  onQuake,
  quakeUsed,
}: {
  profile: ProfileView;
  cam: Camera;
  here: number;
  total: number;
  phase: DropPhase;
  onCompose: () => void;
  onConfirm: (emoji: string, word: string) => void;
  onCancel: () => void;
  onQuake: () => void;
  quakeUsed: boolean;
}) {
  const height = SURFACE_Y * cam.scale;

  return (
    <header
      className="absolute inset-x-0 top-0 z-20"
      style={{ height, background: "linear-gradient(180deg, var(--color-sky) 0%, var(--color-sky-2) 78%, transparent 100%)" }}
    >
      {/* Stars: cheap, static, and they sell the night. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden opacity-70" style={{ backgroundImage: STARS, backgroundSize: "260px 260px" }} />

      <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-end px-6 pb-8 sm:px-10">
        <p className="ink-label">Cross-section · surface</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h1 className="text-4xl font-medium tracking-tight sm:text-6xl">{profile.name}</h1>
            <p className="mt-2 max-w-xl text-balance text-base text-ink-dim sm:text-lg">{profile.headline}</p>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="Signpost">
            {profile.githubUrl ? <Sign href={profile.githubUrl}>GitHub</Sign> : null}
            {profile.linkedinUrl ? <Sign href={profile.linkedinUrl}>LinkedIn</Sign> : null}
            {profile.email ? <Sign href={`mailto:${profile.email}`}>Email</Sign> : null}
            <Sign href="/flat">Read it flat</Sign>
          </nav>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <p className="font-mono text-xs text-ink-dim" aria-live="polite">
            <span className="text-moss">●</span> {here} here now · {total.toLocaleString()} have left something
          </p>
          <LeaveSomething phase={phase} onCompose={onCompose} onConfirm={onConfirm} onCancel={onCancel} />
          <button
            type="button"
            onClick={onQuake}
            disabled={quakeUsed}
            className="ink-label rounded-md border border-ink/15 px-3 py-1.5 transition-colors hover:border-ember hover:text-ember disabled:opacity-40"
            title="Once per visit"
          >
            {quakeUsed ? "Earthquake spent" : "Earthquake"}
          </button>
        </div>
      </div>

      {/* Ground line, and the one instruction the page needs. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-ink/25" />
      <p aria-hidden className="ink-label absolute right-6 bottom-2 sm:right-10" style={{ animation: "rise 600ms var(--ease-out) 900ms both" }}>
        ↓ scroll to dig
      </p>
    </header>
  );
}

function Sign({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="rounded-md border border-ink/20 px-3 py-1.5 text-sm transition-colors hover:border-lamp hover:text-lamp"
    >
      {children}
    </a>
  );
}

function LeaveSomething({
  phase,
  onCompose,
  onConfirm,
  onCancel,
}: {
  phase: DropPhase;
  onCompose: () => void;
  onConfirm: (emoji: string, word: string) => void;
  onCancel: () => void;
}) {
  const [emoji, setEmoji] = useState<string>(EMOJI_PALETTE[0]);
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (phase.kind === "done") {
    return (
      <p className="font-mono text-xs text-ink-dim">
        You left <span className="text-ink">{phase.emoji} {phase.word}</span>. It stays.
      </p>
    );
  }
  if (phase.kind === "refused") return <p className="font-mono text-xs text-ember">{phase.reason}</p>;
  if (phase.kind === "holding") return <p className="font-mono text-xs text-lamp">Click anywhere over the ground to let go.</p>;
  if (phase.kind === "falling") return <p className="font-mono text-xs text-ink-dim">Falling…</p>;
  if (phase.kind === "requesting") return <p className="font-mono text-xs text-ink-dim">One moment…</p>;

  if (phase.kind === "idle") {
    return (
      <button
        type="button"
        onClick={onCompose}
        className="rounded-md bg-lamp px-4 py-2 text-sm font-medium text-earth transition-colors hover:bg-lamp-2"
      >
        Leave something
      </button>
    );
  }

  // compose
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateDrop(emoji, word);
    if (!v.ok) {
      setError(v.reason);
      return;
    }
    setError(null);
    onConfirm(v.emoji, v.word);
  };

  return (
    <form onSubmit={submit} className="slab w-full max-w-xl p-4" style={{ animation: "rise 240ms var(--ease-out)" }} aria-label="Leave something">
      <p className="ink-label">One emoji, one word. It stays here for everyone who comes after.</p>
      <div className="mt-3 grid grid-cols-8 gap-1 sm:grid-cols-12" role="radiogroup" aria-label="Emoji">
        {EMOJI_PALETTE.map((e) => (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={emoji === e}
            onClick={() => setEmoji(e)}
            className={`grid aspect-square place-items-center rounded-md text-xl transition-colors ${emoji === e ? "bg-lamp/25 ring-1 ring-lamp" : "hover:bg-ink/10"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>{emoji}</span>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            maxLength={WORD_MAX}
            placeholder="a word"
            autoFocus
            className="w-40 rounded-md border border-ink/20 bg-earth px-3 py-1.5 font-mono text-sm text-ink outline-none focus:border-lamp"
            aria-label="Your word"
          />
        </label>
        <button type="submit" className="rounded-md bg-lamp px-4 py-1.5 text-sm font-medium text-earth transition-colors hover:bg-lamp-2">
          Pick it up
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-ink-dim hover:text-ink">
          Never mind
        </button>
        {error ? <span className="font-mono text-xs text-ember">{error}</span> : null}
      </div>
    </form>
  );
}

const STARS =
  "radial-gradient(1px 1px at 20px 30px, rgba(239,230,214,0.9), transparent 60%)," +
  "radial-gradient(1px 1px at 120px 90px, rgba(239,230,214,0.6), transparent 60%)," +
  "radial-gradient(1.5px 1.5px at 200px 40px, rgba(239,230,214,0.8), transparent 60%)," +
  "radial-gradient(1px 1px at 60px 180px, rgba(239,230,214,0.5), transparent 60%)," +
  "radial-gradient(1px 1px at 230px 210px, rgba(239,230,214,0.7), transparent 60%)," +
  "radial-gradient(1px 1px at 160px 150px, rgba(239,230,214,0.4), transparent 60%)";
