import type { Prop } from "../layout";

import { groundShadow, lightPool, poly, roundRect } from "./shapes";

/**
 * Trees, rocks, flowers, lamps — all drawn from paths, no images. Each takes a
 * sway phase so a hillside of grass moves like a hillside of grass instead of
 * a single animation playing a thousand times.
 */

/** Four tints, picked per tree, so a hillside is not one colour repeated. */
const FOLIAGE_SETS = [
  ["#55984a", "#4a8a42", "#60a455"],
  ["#4f8f55", "#44824c", "#5c9e63"],
  ["#5f9e44", "#52903c", "#6aab50"],
  ["#4a8a5c", "#3f7d51", "#569868"],
];
const FOLIAGE = FOLIAGE_SETS[0];
const PINE = ["#33664a", "#2b5640", "#3c7355"];

export function drawProp(ctx: CanvasRenderingContext2D, p: Prop, t: number, night: number) {
  const sway = Math.sin(t * 0.9 + p.p) * 1.6;
  switch (p.kind) {
    case "tree":
      return tree(ctx, p, sway);
    case "pine":
      return pine(ctx, p, sway);
    case "rock":
      return rock(ctx, p);
    case "bush":
      return bush(ctx, p, sway);
    case "flower":
      return flower(ctx, p, sway);
    case "tuft":
      return tuft(ctx, p, sway);
    case "reed":
      return reed(ctx, p, sway * 1.8);
    case "lamp":
      return lamp(ctx, p, night);
  }
}

function tree(ctx: CanvasRenderingContext2D, p: Prop, sway: number) {
  const s = p.s;
  const tint = FOLIAGE_SETS[Math.floor(p.p * 163) % FOLIAGE_SETS.length];
  groundShadow(ctx, p.x, p.y, 20 * s, 7 * s);
  ctx.fillStyle = "#6b4a2f";
  roundRect(ctx, p.x - 4 * s, p.y - 34 * s, 8 * s, 34 * s, 3);
  ctx.fill();
  const cx = p.x + sway;
  const cy = p.y - 48 * s;
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = tint[i];
    ctx.beginPath();
    ctx.ellipse(cx + (i - 1) * 11 * s, cy + i * 5 * s, 23 * s, 19 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // A highlight on the sunlit side.
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.ellipse(cx - 8 * s, cy - 8 * s, 11 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function pine(ctx: CanvasRenderingContext2D, p: Prop, sway: number) {
  const s = p.s;
  groundShadow(ctx, p.x, p.y, 16 * s, 6 * s);
  ctx.fillStyle = "#5a3f29";
  roundRect(ctx, p.x - 3 * s, p.y - 20 * s, 6 * s, 20 * s, 2);
  ctx.fill();
  for (let i = 0; i < 3; i += 1) {
    const top = p.y - (76 - i * 18) * s;
    const halfW = (13 + i * 6) * s;
    const bottom = p.y - (44 - i * 16) * s;
    ctx.fillStyle = PINE[i];
    poly(ctx, [
      [p.x + sway * (1 - i * 0.3), top],
      [p.x + halfW, bottom],
      [p.x - halfW, bottom],
    ]);
    ctx.fill();
  }
}

function rock(ctx: CanvasRenderingContext2D, p: Prop) {
  const s = p.s;
  groundShadow(ctx, p.x, p.y, 15 * s, 5 * s);
  ctx.fillStyle = "#86847d";
  poly(ctx, [
    [p.x - 14 * s, p.y],
    [p.x - 10 * s, p.y - 13 * s],
    [p.x + 2 * s, p.y - 17 * s],
    [p.x + 13 * s, p.y - 9 * s],
    [p.x + 15 * s, p.y],
  ]);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  poly(ctx, [
    [p.x - 9 * s, p.y - 12 * s],
    [p.x + 2 * s, p.y - 16 * s],
    [p.x + 4 * s, p.y - 10 * s],
  ]);
  ctx.fill();
}

function bush(ctx: CanvasRenderingContext2D, p: Prop, sway: number) {
  const s = p.s;
  const tint = FOLIAGE_SETS[Math.floor(p.p * 211) % FOLIAGE_SETS.length];
  groundShadow(ctx, p.x, p.y, 15 * s, 5 * s);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = tint[i];
    ctx.beginPath();
    ctx.ellipse(p.x + (i - 1) * 9 * s + sway * 0.4, p.y - 9 * s - (i === 1 ? 5 * s : 0), 11 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const PETALS = ["#f2a6c0", "#f6e39a", "#e8e2ef", "#c5a4e8", "#f3b58a"];

function flower(ctx: CanvasRenderingContext2D, p: Prop, sway: number) {
  const s = p.s;
  const top = p.y - 11 * s;
  ctx.strokeStyle = "#4d8a42";
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo(p.x + sway * 0.5, p.y - 6 * s, p.x + sway, top);
  ctx.stroke();
  ctx.fillStyle = PETALS[Math.floor(p.p * 100) % PETALS.length];
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(p.x + sway + Math.cos(a) * 2.6 * s, top + Math.sin(a) * 2.6 * s, 2.2 * s, 2.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f7d774";
  ctx.beginPath();
  ctx.arc(p.x + sway, top, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();
}

function tuft(ctx: CanvasRenderingContext2D, p: Prop, sway: number) {
  const s = p.s;
  ctx.strokeStyle = "#5e9b4f";
  ctx.lineWidth = 1.6 * s;
  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(p.x + i * 3 * s, p.y);
    ctx.quadraticCurveTo(p.x + i * 4 * s, p.y - 5 * s, p.x + i * 5 * s + sway, p.y - 9 * s);
    ctx.stroke();
  }
}

function reed(ctx: CanvasRenderingContext2D, p: Prop, sway: number) {
  const s = p.s;
  ctx.strokeStyle = "#a9a765";
  ctx.lineWidth = 1.5 * s;
  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(p.x + i * 3 * s, p.y);
    ctx.quadraticCurveTo(p.x + i * 3 * s, p.y - 8 * s, p.x + i * 4 * s + sway, p.y - 15 * s);
    ctx.stroke();
  }
}

function lamp(ctx: CanvasRenderingContext2D, p: Prop, night: number) {
  lightPool(ctx, p.x, p.y, 78, night);
  groundShadow(ctx, p.x, p.y, 8, 3.5);
  ctx.fillStyle = "#3b3a42";
  roundRect(ctx, p.x - 2, p.y - 38, 4, 38, 2);
  ctx.fill();
  roundRect(ctx, p.x - 6, p.y - 3, 12, 4, 2);
  ctx.fill();
  // Lantern.
  ctx.fillStyle = night > 0.05 ? "#ffd892" : "#9fb0bd";
  poly(ctx, [
    [p.x - 5.5, p.y - 38],
    [p.x + 5.5, p.y - 38],
    [p.x + 4, p.y - 48],
    [p.x - 4, p.y - 48],
  ]);
  ctx.fill();
  ctx.fillStyle = "#3b3a42";
  roundRect(ctx, p.x - 6.5, p.y - 51, 13, 3.5, 1.5);
  ctx.fill();
  if (night > 0.05) {
    ctx.save();
    ctx.globalAlpha = night * 0.65;
    ctx.fillStyle = "#ffce84";
    ctx.filter = "blur(7px)";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 43, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** The fountain in the middle of the plaza. */
export function drawFountain(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, night: number) {
  groundShadow(ctx, x, y, 52, 18, 0.18);
  ctx.fillStyle = "#b9b0a0";
  ctx.beginPath();
  ctx.ellipse(x, y - 6, 48, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6fb6c9";
  ctx.beginPath();
  ctx.ellipse(x, y - 8, 40, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ripples.
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 2; i += 1) {
    const r = ((t * 0.5 + i * 0.5) % 1) * 36;
    ctx.globalAlpha = 1 - r / 36;
    ctx.beginPath();
    ctx.ellipse(x, y - 8, r, r * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Plinth and jet.
  ctx.fillStyle = "#c6bdac";
  roundRect(ctx, x - 7, y - 40, 14, 32, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(190, 232, 240, 0.85)";
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2 + t * 0.6;
    const spread = 13 + Math.sin(t * 2 + i) * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * spread, y - 30 + Math.abs(Math.sin(a)) * 5, 2.2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  lightPool(ctx, x, y, 70, night * 0.7, "150,220,235");
}
