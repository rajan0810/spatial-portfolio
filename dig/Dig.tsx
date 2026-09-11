"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { dropToken, settleToken } from "@/lib/actions/drops";
import { setAudioEnabled, sfx } from "@/lib/audio";
import type { DropView } from "@/lib/data/drops";
import type { AchievementView, ProfileView, ProjectView, SkillView, TimelineView } from "@/lib/data/types";

import { computeCamera, pageHeight, toWorld, visibleWorld, type Camera } from "./camera";
import { FLOOR_Y, SURFACE_Y, WORLD_W } from "./constants";
import { connectLive, type PresenceState } from "./live";
import { Presence } from "./Presence";
import { FossilSlab, ProjectSlab, StratumSlab, VeinSlab, layoutSlabs } from "./Slab";
import { strata } from "./strata";
import { Surface, type DropPhase } from "./Surface";
import { tokenSprite } from "./tokens";
import { DigWorld } from "./world";

type Props = {
  profile: ProfileView;
  projects: ProjectView[];
  achievements: AchievementView[];
  skills: SkillView[];
  timeline: TimelineView[];
  initialTokens: DropView[];
  initialTotal: number;
};

const STORAGE_KEY = "dig:left";

/**
 * The Dig.
 *
 * A fixed canvas draws the pile and the headlamp; the page scrolls, and scroll
 * is the camera. Slabs of content are DOM, positioned in page space above the
 * canvas, so they read at any pile height and are indexable. Physics, drawing
 * and the pointer all live outside React; React owns the drop flow and the
 * live counts.
 */
export function Dig({ profile, projects, achievements, skills, timeline, initialTokens, initialTotal }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<DigWorld | null>(null);
  const camRef = useRef<Camera>(computeCamera(1200, 800, 0));
  const pointer = useRef({ x: -9999, y: -9999, inside: false });
  const liveRef = useRef<ReturnType<typeof connectLive>>(null);
  const pendingRelease = useRef(new Map<string, DropView>());
  const mine = useRef<{ id: string; editToken: string } | null>(null);
  const lastClink = useRef(0);

  const [cam, setCam] = useState<Camera>(camRef.current);
  const [phase, setPhase] = useState<DropPhase>({ kind: "idle" });
  const [others, setOthers] = useState<PresenceState[]>([]);
  const [total, setTotal] = useState(initialTotal);
  const [quakeUsed, setQuakeUsed] = useState(false);
  const [tokensForStrata, setTokensForStrata] = useState(initialTokens);
  const [sound, setSound] = useState(false);

  const slabs = useMemo(
    () => layoutSlabs({ projects: projects.length, achievements: achievements.length, skills: skills.length, timeline: timeline.length }),
    [projects.length, achievements.length, skills.length, timeline.length],
  );
  const bands = useMemo(() => strata(tokensForStrata), [tokensForStrata]);

  // A visitor who already left something is done; the server enforces it too.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { emoji, word } = JSON.parse(saved) as { emoji: string; word: string };
        setPhase({ kind: "done", emoji, word });
      }
    } catch {
      /* private mode etc. */
    }
  }, []);

  // --- world + render loop ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const world = new DigWorld();
    worldRef.current = world;
    for (const s of slabs) world.addSlab(s.rect.x, s.rect.y, s.rect.w, s.rect.h);
    for (const t of initialTokens) {
      if (t.settled) world.addToken(t, { rest: { x: t.x, y: t.y, angle: t.angle } });
    }
    world.attachMouse(canvas);
    world.onCollision = (impact) => {
      const now = performance.now();
      if (now - lastClink.current < 60) return;
      lastClink.current = now;
      sfx.tick((pointer.current.x / window.innerWidth) * 2 - 1);
      void impact;
    };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Test probe: where our own token is on screen, so the walkthrough can
    // grab it. Tokens are canvas, not DOM; there is nothing else to query.
    (window as unknown as { __digPose?: () => { x: number; y: number } | null }).__digPose = () => {
      const id = mine.current?.id ?? (() => {
        try {
          return (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { id?: string } | null)?.id;
        } catch {
          return undefined;
        }
      })();
      const pose = id ? world.pose(id) : null;
      if (!pose) return null;
      const c = camRef.current;
      return { x: c.offsetX + pose.x * c.scale, y: pose.y * c.scale - c.scrollY };
    };

    const resize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      const next = computeCamera(vw, vh, window.scrollY);
      camRef.current = next;
      setCam(next);
    };
    resize();
    window.addEventListener("resize", resize);

    const onScroll = () => {
      camRef.current = { ...camRef.current, scrollY: window.scrollY };
      setCam(camRef.current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let frame = 0;
    let last = performance.now();
    let hidden = false;
    const onVisibility = () => {
      hidden = document.hidden;
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (hidden) return;
      const dt = (now - last) / 1000;
      last = now;

      const c = camRef.current;
      world.setView(c.scale, c.offsetX, c.scrollY);
      const settled = world.tick(dt);
      for (const id of settled) onSettled(id);

      draw(ctx, world, c, dpr);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- our own drop settling ----------------------------------------------------
  const onSettled = useCallback((id: string) => {
    const world = worldRef.current;
    if (!world) return;
    const pose = world.pose(id);
    if (!pose) return;
    // Anyone's fall that ends is a good local guess until the truth arrives.
    world.setRest(id, pose);

    if (mine.current?.id !== id) return;
    const { editToken } = mine.current;
    mine.current = null;
    void settleToken(id, editToken, pose.x, pose.y, pose.angle).then(() => {
      setPhase((p) => (p.kind === "falling" ? { kind: "done", emoji: p.emoji, word: p.word } : p));
      setTokensForStrata((t) => [...t, { ...world.tokens.get(id)!, ...pose, settled: true }]);
    });
  }, []);

  // --- live ---------------------------------------------------------------------
  useEffect(() => {
    const live = connectLive({
      onInsert: (drop) => {
        setTotal((n) => n + 1);
        if (drop.settled) worldRef.current?.addToken(drop, { rest: { x: drop.x, y: drop.y, angle: drop.angle } });
        else pendingRelease.current.set(drop.id, drop);
      },
      onUpdate: (drop) => {
        const world = worldRef.current;
        if (!world || !drop.settled) return;
        if (world.tokens.has(drop.id)) world.setRest(drop.id, { x: drop.x, y: drop.y, angle: drop.angle });
        else world.addToken(drop, { rest: { x: drop.x, y: drop.y, angle: drop.angle } });
        pendingRelease.current.delete(drop.id);
        setTokensForStrata((t) => (t.some((x) => x.id === drop.id) ? t : [...t, drop]));
      },
      onRelease: ({ id, x }) => {
        const world = worldRef.current;
        const drop = pendingRelease.current.get(id);
        if (!world || !drop || world.tokens.has(id)) return;
        world.addToken(drop, { dropAt: { x, y: SURFACE_Y - 30 } });
      },
      onPresence: setOthers,
    });
    liveRef.current = live;
    return () => live?.leave();
  }, []);

  // --- pointer: headlamp, presence, releasing a held token ---------------------------
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY, inside: true };
      const w = toWorld(camRef.current, e.clientX, e.clientY);
      liveRef.current?.track({ x: w.x, y: w.y, emoji: phase.kind === "done" ? phase.emoji : null });
    };
    const onLeave = () => {
      pointer.current.inside = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [phase]);

  const release = (clientX: number, clientY: number) => {
    if (phase.kind !== "holding" || !mine.current) return;
    const w = toWorld(camRef.current, clientX, clientY);
    if (w.y < SURFACE_Y - 200) return; // still in the sky: not over the ground
    const x = Math.max(60, Math.min(WORLD_W - 60, w.x));
    worldRef.current?.addToken(
      { id: mine.current.id, emoji: phase.emoji, word: phase.word, createdAt: new Date().toISOString() },
      { dropAt: { x, y: Math.max(SURFACE_Y - 30, Math.min(w.y, FLOOR_Y - 200)) } },
    );
    liveRef.current?.release(mine.current.id, x);
    sfx.release();
    setPhase({ kind: "falling", emoji: phase.emoji, word: phase.word });
  };

  const confirm = async (emoji: string, word: string) => {
    setPhase({ kind: "requesting" });
    const result = await dropToken(emoji, word);
    if (!result.ok) {
      setPhase({ kind: "refused", reason: result.reason });
      return;
    }
    mine.current = { id: result.id, editToken: result.editToken };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ emoji, word, id: result.id }));
    } catch {
      /* ignore */
    }
    sfx.pinch();
    setPhase({ kind: "holding", emoji, word });
  };

  const quake = () => {
    if (quakeUsed) return;
    setQuakeUsed(true);
    worldRef.current?.earthquake(1);
    sfx.whoosh(3);
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setAudioEnabled(next);
    if (next) sfx.tick();
  };

  return (
    <div
      className="relative"
      style={{ height: pageHeight(cam.scale) }}
      onPointerDown={(e) => release(e.clientX, e.clientY)}
      onKeyDown={(e) => {
        // Keyboard release: drop at the centre of the viewport.
        if (phase.kind === "holding" && (e.key === "Enter" || e.key === " ")) release(window.innerWidth / 2, window.innerHeight / 2);
      }}
    >
      <a href="/flat" className="skip-link text-sm">
        Skip the dig — read it flat
      </a>

      {/* The pile and the lamp. Fixed; scroll is the camera. */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0" style={{ touchAction: "pan-y" }} aria-hidden />

      <Surface
        profile={profile}
        cam={cam}
        here={others.length + 1}
        total={total}
        phase={phase}
        onCompose={() => setPhase({ kind: "compose" })}
        onConfirm={confirm}
        onCancel={() => setPhase({ kind: "idle" })}
        onQuake={quake}
        quakeUsed={quakeUsed}
      />

      {/* Content, cut into the rock. Always above the pile. */}
      <div className="absolute inset-x-0 top-0 z-10" style={{ height: pageHeight(cam.scale) }}>
        {slabs.map((s) => {
          if (s.kind === "project" && projects[s.index]) return <ProjectSlab key={`p${s.index}`} project={projects[s.index]} rect={s.rect} cam={cam} />;
          if (s.kind === "achievement" && achievements[s.index]) return <FossilSlab key={`a${s.index}`} achievement={achievements[s.index]} rect={s.rect} cam={cam} />;
          if (s.kind === "skill" && skills[s.index]) return <VeinSlab key={`s${s.index}`} skill={skills[s.index]} rect={s.rect} cam={cam} />;
          if (s.kind === "timeline" && timeline[s.index]) return <StratumSlab key={`t${s.index}`} entry={timeline[s.index]} rect={s.rect} cam={cam} />;
          return null;
        })}

        {/* Strata labels on the shaft wall. */}
        {bands.map((b) => (
          <div
            key={b.label}
            className="ink-label pointer-events-none absolute"
            style={{ left: cam.offsetX + 8, top: b.top * cam.scale - 14 }}
          >
            {b.label} · {b.count}
          </div>
        ))}

        {/* Floor label. */}
        <div className="ink-label pointer-events-none absolute" style={{ left: cam.offsetX + 8, top: FLOOR_Y * cam.scale + 12 }}>
          Bedrock
        </div>
      </div>

      {phase.kind === "holding" ? <HeldToken emoji={phase.emoji} word={phase.word} pointer={pointer} /> : null}

      <Presence others={others} cam={cam} />

      {/* Corner controls. */}
      <div className="fixed right-4 bottom-4 z-30 flex gap-2">
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          className="slab ink-label px-3 py-2 transition-colors hover:text-lamp"
        >
          Sound {sound ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}

/** The token you are carrying, following the pointer until you let go. */
function HeldToken({ emoji, word, pointer }: { emoji: string; word: string; pointer: React.RefObject<{ x: number; y: number }> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (ref.current) ref.current.style.transform = `translate(${pointer.current.x}px, ${pointer.current.y}px) translate(-22px, -20px)`;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pointer]);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed top-0 left-0 z-40 flex items-center gap-2 rounded-full bg-lamp px-3 py-2 font-mono text-sm text-earth shadow-[0_10px_30px_rgba(255,207,153,0.35)]">
      <span className="text-lg">{emoji}</span>
      <span>{word}</span>
    </div>
  );
}

// --- drawing --------------------------------------------------------------------

const LAMP_RADIUS = 380;

function draw(ctx: CanvasRenderingContext2D, world: DigWorld, cam: Camera, dpr: number) {
  const { viewportW: vw, viewportH: vh } = cam;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, vw, vh);

  // Earth: darker with depth.
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  const depth = cam.scrollY / (FLOOR_Y * cam.scale);
  g.addColorStop(0, depth < 0.05 ? "#1a1410" : "#161009");
  g.addColorStop(1, "#0b0806");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);

  // Shaft walls.
  ctx.strokeStyle = "rgba(239,230,214,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cam.offsetX, 0);
  ctx.lineTo(cam.offsetX, vh);
  ctx.moveTo(cam.offsetX + WORLD_W * cam.scale, 0);
  ctx.lineTo(cam.offsetX + WORLD_W * cam.scale, vh);
  ctx.stroke();

  // Floor.
  const floorY = FLOOR_Y * cam.scale - cam.scrollY;
  if (floorY < vh + 10 && floorY > -10) {
    ctx.fillStyle = "#07050380";
    ctx.fillRect(0, floorY, vw, vh - floorY);
    ctx.strokeStyle = "rgba(239,230,214,0.2)";
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(vw, floorY);
    ctx.stroke();
  }

  // Tokens.
  const win = visibleWorld(cam);
  ctx.save();
  ctx.translate(cam.offsetX, -cam.scrollY);
  ctx.scale(cam.scale, cam.scale);
  for (const t of world.visible(win.top, win.bottom)) {
    const sprite = tokenSprite(t.emoji, t.word, dpr);
    const { x, y } = t.body.position;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t.body.angle);
    ctx.drawImage(sprite, -t.w / 2, -t.h / 2, t.w, t.h);
    ctx.restore();
  }
  ctx.restore();

  // Headlamp: everything outside the beam falls into darkness.
  const p = pointerScreen;
  const lamp = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, LAMP_RADIUS);
  lamp.addColorStop(0, "rgba(13,10,8,0)");
  lamp.addColorStop(0.45, "rgba(13,10,8,0.18)");
  lamp.addColorStop(1, "rgba(13,10,8,0.82)");
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, vw, vh);
  // A warm core.
  const warm = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, LAMP_RADIUS * 0.6);
  warm.addColorStop(0, "rgba(255,207,153,0.14)");
  warm.addColorStop(1, "rgba(255,207,153,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, vw, vh);
}

/** The lamp follows the last known pointer, in screen space. */
const pointerScreen = { x: 600, y: 400 };
if (typeof window !== "undefined") {
  window.addEventListener("pointermove", (e) => {
    pointerScreen.x = e.clientX;
    pointerScreen.y = e.clientY;
  }, { passive: true });
}
