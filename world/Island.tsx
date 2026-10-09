"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AchievementView, ProfileView, ProjectView, SkillGroupView, TimelineView } from "@/lib/data/types";

import { HUD } from "./HUD";
import { Panel } from "./Panel";
import { PLAYER_R, RUN_SPEED, TERRAIN_SCALE, WALK_SPEED, WORLD_H, WORLD_W } from "./constants";
import { follow, toWorld, viewBounds, zoomFor, type Camera } from "./camera";
import { drawBuilding } from "./draw/buildings";
import { drawCharacter, drawDust, type Dust, type Facing } from "./draw/character";
import { drawFountain, drawProp } from "./draw/props";
import { lightPool } from "./draw/shapes";
import { createControls, type Controls } from "./input";
import {
  ENTER_RADIUS,
  PLACES,
  PLAZA,
  bucketProps,
  doorOf,
  paintPaths,
  scatterProps,
  type Place,
  type Prop,
} from "./layout";
import { biomeAt, generateTerrain, isSolid, type Terrain } from "./terrain";
import { DAYLIGHT, skyAt, type Sky } from "./sky";

export type IslandContent = {
  profile: ProfileView;
  projects: ProjectView[];
  achievements: AchievementView[];
  skills: SkillGroupView[];
  timeline: TimelineView[];
};

const FOUND_KEY = "island:found";
const START = { x: PLAZA.x, y: PLAZA.y + 110 };

type Game = {
  terrain: Terrain;
  props: Prop[];
  buckets: Map<string, Prop[]>;
  sparkles: { x: number; y: number; p: number }[];
  player: { x: number; y: number; vx: number; vy: number; facing: Facing; phase: number };
  cam: Camera;
  dust: Dust[];
  controls: Controls;
  /** Mirrors of React state the loop needs to read without re-subscribing. */
  paused: boolean;
  nearId: string | null;
  focus: Map<string, number>;
};

/**
 * A small island you walk around, where every place is a piece of the work.
 *
 * One canvas draws the whole thing: a procedurally painted island, props and
 * buildings depth-sorted against the player, and a day/night pass on top. All
 * of the per-frame state lives in a ref — React is only told when something
 * discrete changes, like which door you are standing at.
 */
export function Island(content: IslandContent) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [ready, setReady] = useState(false);
  const [near, setNear] = useState<Place | null>(null);
  const [open, setOpen] = useState<Place | null>(null);
  const [menu, setMenu] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [sky, setSky] = useState<Sky>(DAYLIGHT);
  const [toast, setToast] = useState<Place | null>(null);
  const [moved, setMoved] = useState(false);

  const openRef = useRef<Place | null>(null);
  const nearRef = useRef<Place | null>(null);
  openRef.current = open;
  nearRef.current = near;

  const byId = useMemo(() => new Map(PLACES.map((p) => [p.id, p])), []);

  // --- discovery ------------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FOUND_KEY);
      if (raw) setFound(JSON.parse(raw) as string[]);
    } catch {
      /* private mode */
    }
  }, []);

  const discover = useCallback((place: Place) => {
    setFound((prev) => {
      if (prev.includes(place.id)) return prev;
      const next = [...prev, place.id];
      try {
        localStorage.setItem(FOUND_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
    setToast(place);
    window.setTimeout(() => setToast((t) => (t === place ? null : t)), 3200);
  }, []);

  const enter = useCallback(
    (place: Place) => {
      setMenu(false);
      setOpen(place);
      discover(place);
    },
    [discover],
  );

  /** Walk straight to a place's door. Used by the map menu and keyboard. */
  const travel = useCallback((place: Place) => {
    const g = gameRef.current;
    if (!g) return;
    const d = doorOf(place);
    g.player.x = d.x;
    g.player.y = d.y + 26;
    g.player.vx = 0;
    g.player.vy = 0;
    g.player.facing = "up";
    g.cam.x = g.player.x;
    g.cam.y = g.player.y;
    setMenu(false);
    setMoved(true);
  }, []);

  // --- world + loop ---------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const terrain = generateTerrain();
    paintPaths(terrain);
    const props = scatterProps(terrain);

    // A handful of glints on the shallows, so the sea is never still.
    const sparkles: { x: number; y: number; p: number }[] = [];
    for (let i = 0; i < 260; i += 1) {
      const a = (i / 260) * Math.PI * 2;
      const r = 0.92 + (i % 7) * 0.035;
      sparkles.push({
        x: WORLD_W / 2 + Math.cos(a) * 1620 * r,
        y: WORLD_H / 2 + Math.sin(a) * 1130 * r,
        p: (i * 2.39) % (Math.PI * 2),
      });
    }

    const input = createControls({
      onInteract: () => {
        if (openRef.current) setOpen(null);
        else if (nearRef.current) enter(nearRef.current);
      },
      onMenu: () => setMenu((m) => !m),
      onClose: () => {
        setOpen(null);
        setMenu(false);
      },
    });

    const game: Game = {
      terrain,
      props,
      buckets: bucketProps(props),
      sparkles,
      player: { x: START.x, y: START.y, vx: 0, vy: 0, facing: "down", phase: 0 },
      cam: { x: START.x, y: START.y, zoom: 1, vw: 0, vh: 0 },
      dust: [],
      controls: input.controls,
      paused: false,
      nearId: null,
      focus: new Map(PLACES.map((p) => [p.id, 0])),
    };
    gameRef.current = game;
    setReady(true);

    /**
     * A window onto the simulation for the verification script. The world is
     * a canvas: there is no DOM to assert against, so this is how the tests
     * see where the player is standing and what they are standing on.
     */
    (window as unknown as { __islandAt?: unknown }).__islandAt = (x: number, y: number) => ({
      biome: biomeAt(terrain, x, y),
      solid: isSolid(terrain, x, y),
    });
    (window as unknown as { __island?: unknown }).__island = () => ({
      x: game.player.x,
      y: game.player.y,
      biome: biomeAt(terrain, game.player.x, game.player.y),
      near: game.nearId,
      props: props.length,
    });

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      game.cam.vw = vw;
      game.cam.vh = vh;
      game.cam.zoom = zoomFor(vw);
    };
    resize();
    window.addEventListener("resize", resize);

    // Click or tap the ground to walk there.
    const onPointerDown = (e: PointerEvent) => {
      if (openRef.current || (e.target as HTMLElement).closest("[data-ui]")) return;
      const w = toWorld(game.cam, e.clientX, e.clientY);
      game.controls.target = { x: w.x, y: w.y };
    };
    canvas.addEventListener("pointerdown", onPointerDown);

    let raf = 0;
    let last = performance.now();
    let stalled = 0;
    let skyTick = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;

      // The sky only needs checking every few seconds.
      skyTick += dt;
      if (skyTick > 5) {
        skyTick = 0;
        setSky(skyAt());
      }

      step(game, dt, openRef.current !== null);
      detectNear(game, (place) => {
        if (place?.id !== nearRef.current?.id) setNear(place);
      });
      render(ctx, game, now / 1000, skyRef.current, dpr);

      // Give up on a click destination we are clearly not reaching.
      if (game.controls.target) {
        const p = game.player;
        const d = Math.hypot(game.controls.target.x - p.x, game.controls.target.y - p.y);
        stalled = Math.hypot(p.vx, p.vy) < 14 ? stalled + dt : 0;
        if (d < 18 || stalled > 0.45) {
          game.controls.target = null;
          stalled = 0;
        }
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      input.destroy();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The loop reads the sky without re-subscribing.
  const skyRef = useRef(sky);
  skyRef.current = sky;

  // The visitor's own clock, once we are on the client.
  useEffect(() => setSky(skyAt()), []);

  // Hide the "move" hint once they actually have.
  useEffect(() => {
    if (moved) return;
    const check = window.setInterval(() => {
      const g = gameRef.current;
      if (g && Math.hypot(g.player.x - START.x, g.player.y - START.y) > 70) setMoved(true);
    }, 400);
    return () => window.clearInterval(check);
  }, [moved]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#2b6484]">
      <a href="/flat" className="skip-link text-sm">
        Skip the island — read it as a page
      </a>

      <canvas ref={canvasRef} className="block h-full w-full touch-none" aria-hidden />

      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-[#12202c]">
          <p className="ink-label animate-pulse">Drawing the island…</p>
        </div>
      ) : null}

      <HUD
        places={PLACES}
        found={found}
        near={near}
        open={Boolean(open)}
        menu={menu}
        toast={toast}
        sky={sky}
        moved={moved}
        profile={content.profile}
        onToggleMenu={() => setMenu((m) => !m)}
        onTravel={travel}
        onEnter={enter}
        playerRef={gameRef}
      />

      {open ? <Panel place={open} content={content} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

function step(g: Game, dt: number, paused: boolean) {
  const p = g.player;
  const c = g.controls;

  let ix = paused ? 0 : c.x;
  let iy = paused ? 0 : c.y;

  // A click destination acts like a held stick pointed at it.
  if (!paused && c.target && ix === 0 && iy === 0) {
    const dx = c.target.x - p.x;
    const dy = c.target.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    ix = dx / len;
    iy = dy / len;
  }

  const speed = c.run ? RUN_SPEED : WALK_SPEED;
  const accel = 2400;
  p.vx += (ix * speed - p.vx) * Math.min(1, (accel / speed) * dt);
  p.vy += (iy * speed - p.vy) * Math.min(1, (accel / speed) * dt);
  if (Math.abs(p.vx) < 2) p.vx = 0;
  if (Math.abs(p.vy) < 2) p.vy = 0;

  // Axis-separated collision gives free sliding along walls.
  const nx = p.x + p.vx * dt;
  if (!blockedAt(g.terrain, nx, p.y)) p.x = nx;
  else p.vx = 0;
  const ny = p.y + p.vy * dt;
  if (!blockedAt(g.terrain, p.x, ny)) p.y = ny;
  else p.vy = 0;

  p.x = Math.max(20, Math.min(WORLD_W - 20, p.x));
  p.y = Math.max(20, Math.min(WORLD_H - 20, p.y));

  const moving = Math.hypot(p.vx, p.vy) > 12;
  if (moving) {
    p.phase += dt * (c.run ? 15 : 10);
    if (Math.abs(p.vx) > Math.abs(p.vy)) p.facing = p.vx < 0 ? "left" : "right";
    else p.facing = p.vy < 0 ? "up" : "down";
    if (c.run && Math.random() < dt * 22) {
      g.dust.push({ x: p.x + (Math.random() - 0.5) * 8, y: p.y, life: 1, s: 2 + Math.random() * 2 });
    }
  } else {
    p.phase += dt * 2;
  }

  for (let i = g.dust.length - 1; i >= 0; i -= 1) {
    const d = g.dust[i];
    d.life -= dt * 1.9;
    d.y -= dt * 7;
    if (d.life <= 0) g.dust.splice(i, 1);
  }

  follow(g.cam, p.x, p.y - 20, dt);

  // Ease each building's highlight toward whether we are at its door.
  for (const place of PLACES) {
    const want = place.id === g.nearId ? 1 : 0;
    const cur = g.focus.get(place.id) ?? 0;
    g.focus.set(place.id, cur + (want - cur) * Math.min(1, dt * 9));
  }
}

/** The player is a disc; sample its edges rather than its centre. */
function blockedAt(t: Terrain, x: number, y: number) {
  const r = PLAYER_R;
  return (
    isSolid(t, x - r, y) ||
    isSolid(t, x + r, y) ||
    isSolid(t, x, y - r * 0.5) ||
    isSolid(t, x, y + r * 0.5)
  );
}

function detectNear(g: Game, onChange: (p: Place | null) => void) {
  let best: Place | null = null;
  let bestDist = ENTER_RADIUS;
  for (const place of PLACES) {
    const d = doorOf(place);
    const dist = Math.hypot(d.x - g.player.x, d.y - g.player.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = place;
    }
  }
  if (best?.id !== g.nearId) {
    g.nearId = best?.id ?? null;
    onChange(best);
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

type Entry = { y: number; kind: 0 | 1 | 2 | 3; prop?: Prop; place?: Place };

function render(ctx: CanvasRenderingContext2D, g: Game, time: number, sky: Sky, dpr: number) {
  const { cam } = g;
  const vw = cam.vw;
  const vh = cam.vh;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // The sea, which is also what you see past the edge of the island.
  ctx.fillStyle = "#2b6484";
  ctx.fillRect(0, 0, vw, vh);

  // The painted island, blitted from its offscreen canvas.
  const wx0 = cam.x - vw / 2 / cam.zoom;
  const wy0 = cam.y - vh / 2 / cam.zoom;
  const cx0 = Math.max(0, wx0);
  const cy0 = Math.max(0, wy0);
  const cx1 = Math.min(WORLD_W, wx0 + vw / cam.zoom);
  const cy1 = Math.min(WORLD_H, wy0 + vh / cam.zoom);
  if (cx1 > cx0 && cy1 > cy0) {
    ctx.drawImage(
      g.terrain.canvas,
      cx0 * TERRAIN_SCALE,
      cy0 * TERRAIN_SCALE,
      (cx1 - cx0) * TERRAIN_SCALE,
      (cy1 - cy0) * TERRAIN_SCALE,
      (cx0 - wx0) * cam.zoom,
      (cy0 - wy0) * cam.zoom,
      (cx1 - cx0) * cam.zoom,
      (cy1 - cy0) * cam.zoom,
    );
  }

  // Everything from here on is drawn in world coordinates.
  ctx.save();
  ctx.translate(vw / 2, vh / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const view = viewBounds(cam);

  // Glints on the water.
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (const s of g.sparkles) {
    if (s.x < view.x0 || s.x > view.x1 || s.y < view.y0 || s.y > view.y1) continue;
    const a = 0.25 + Math.sin(time * 1.6 + s.p) * 0.25;
    if (a <= 0.03) continue;
    ctx.globalAlpha = a;
    ctx.fillRect(s.x, s.y, 4, 1.6);
  }
  ctx.globalAlpha = 1;

  // Depth sort: props, buildings, the fountain and the player all share one
  // list, ordered by the y of whatever they stand on.
  const entries: Entry[] = [];
  const bx0 = Math.floor(view.x0 / 240);
  const bx1 = Math.floor(view.x1 / 240);
  const by0 = Math.floor(view.y0 / 240);
  const by1 = Math.floor(view.y1 / 240);
  for (let bx = bx0; bx <= bx1; bx += 1) {
    for (let by = by0; by <= by1; by += 1) {
      const list = g.buckets.get(`${bx}:${by}`);
      if (!list) continue;
      for (const prop of list) entries.push({ y: prop.y, kind: 0, prop });
    }
  }
  for (const place of PLACES) {
    if (place.x < view.x0 - 200 || place.x > view.x1 + 200) continue;
    if (place.y < view.y0 - 260 || place.y > view.y1 + 260) continue;
    entries.push({ y: place.y, kind: 1, place });
  }
  entries.push({ y: PLAZA.y, kind: 3 });
  entries.push({ y: g.player.y, kind: 2 });
  entries.sort((a, b) => a.y - b.y);

  for (const e of entries) {
    if (e.kind === 0 && e.prop) drawProp(ctx, e.prop, time, sky.night);
    else if (e.kind === 1 && e.place) drawBuilding(ctx, e.place, time, sky.night, g.focus.get(e.place.id) ?? 0);
    else if (e.kind === 3) drawFountain(ctx, PLAZA.x, PLAZA.y, time, sky.night);
    else {
      drawDust(ctx, g.dust);
      drawCharacter(ctx, g.player.x, g.player.y, g.player.facing, g.player.phase, Math.hypot(g.player.vx, g.player.vy) > 12);
    }
  }
  ctx.restore();

  // Night falls over the finished frame.
  if (sky.tint !== "rgba(26, 34, 68, 0.000)") {
    ctx.fillStyle = sky.tint;
    ctx.fillRect(0, 0, vw, vh);
  }

  // …and then the lights are punched back through it.
  if (sky.night > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(vw / 2, vh / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    for (const prop of g.props) {
      if (prop.kind !== "lamp") continue;
      if (prop.x < view.x0 || prop.x > view.x1 || prop.y < view.y0 || prop.y > view.y1) continue;
      lightPool(ctx, prop.x, prop.y - 4, 96, sky.night * 0.75);
    }
    for (const place of PLACES) {
      if (place.x < view.x0 || place.x > view.x1 || place.y < view.y0 || place.y > view.y1) continue;
      lightPool(ctx, place.x, place.y + 8, 130, sky.night * 0.55);
    }
    ctx.restore();
  }

  // A soft vignette, so the eye stays on the character.
  const vig = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.78);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(8, 14, 20, 0.42)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vw, vh);
}
