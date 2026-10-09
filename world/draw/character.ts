import { groundShadow, roundRect } from "./shapes";

/** Which way the character is facing. */
export type Facing = "down" | "up" | "left" | "right";

const SKIN = "#e8b58c";
const SKIN_DARK = "#d19e77";
const HAIR = "#2f2318";
const SHIRT = "#4a7fc1";
const SHIRT_DARK = "#3c6aa5";
const TROUSERS = "#3c4350";
const SHOE = "#2a2f38";

/**
 * The visitor: a small person assembled from a dozen shapes, with a four-frame
 * walk. Procedural rather than a sprite sheet, so there is no art to load and
 * the whole character costs a handful of path fills.
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: Facing,
  phase: number,
  moving: boolean,
) {
  const swing = moving ? Math.sin(phase) : 0;
  const bob = moving ? Math.abs(Math.sin(phase)) * 1.6 : Math.sin(phase * 0.25) * 0.7;
  const by = y - bob;

  groundShadow(ctx, x, y, 11, 4.5, 0.26);

  // Legs.
  const legOffset = swing * 3.4;
  ctx.fillStyle = TROUSERS;
  roundRect(ctx, x - 6, by - 13, 5, 11 + legOffset * 0.3, 2);
  ctx.fill();
  roundRect(ctx, x + 1, by - 13, 5, 11 - legOffset * 0.3, 2);
  ctx.fill();
  ctx.fillStyle = SHOE;
  roundRect(ctx, x - 6.5, by - 3 + legOffset * 0.3, 6, 3.4, 1.6);
  ctx.fill();
  roundRect(ctx, x + 0.5, by - 3 - legOffset * 0.3, 6, 3.4, 1.6);
  ctx.fill();

  // Arms, behind the body on the far side.
  ctx.fillStyle = SHIRT_DARK;
  if (facing === "down" || facing === "up") {
    roundRect(ctx, x - 10, by - 25 - swing * 1.4, 4, 12, 2);
    ctx.fill();
    roundRect(ctx, x + 6, by - 25 + swing * 1.4, 4, 12, 2);
    ctx.fill();
  } else {
    const dir = facing === "left" ? -1 : 1;
    roundRect(ctx, x - 2 + dir * 5 - swing * 2, by - 25, 4, 12, 2);
    ctx.fill();
  }

  // Torso.
  ctx.fillStyle = SHIRT;
  roundRect(ctx, x - 8, by - 27, 16, 15, 5);
  ctx.fill();
  // A seam on the shaded side keeps the body from reading flat.
  ctx.fillStyle = SHIRT_DARK;
  roundRect(ctx, x + 3, by - 27, 5, 15, 3);
  ctx.fill();

  // Head.
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(x, by - 33, 8, 0, Math.PI * 2);
  ctx.fill();
  if (facing === "left" || facing === "right") {
    ctx.fillStyle = SKIN_DARK;
    ctx.beginPath();
    ctx.arc(x + (facing === "left" ? 2.5 : -2.5), by - 33, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(x + (facing === "left" ? -1.5 : 1.5), by - 33, 7.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hair, shaped by which way we are looking.
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  if (facing === "up") {
    ctx.arc(x, by - 33, 8.2, 0, Math.PI * 2);
  } else if (facing === "down") {
    ctx.arc(x, by - 34.5, 8.2, Math.PI, Math.PI * 2);
    ctx.rect(x - 8.2, by - 35, 16.4, 4);
  } else {
    const dir = facing === "left" ? -1 : 1;
    ctx.arc(x, by - 34, 8.2, Math.PI, Math.PI * 2);
    ctx.rect(x - 8.2, by - 35, 16.4, 4);
    ctx.rect(x + dir * 4, by - 36, 4.4, 8);
  }
  ctx.fill();

  // Eyes, only when we can see the face.
  if (facing !== "up") {
    ctx.fillStyle = "#2b2219";
    if (facing === "down") {
      ctx.beginPath();
      ctx.arc(x - 3, by - 32, 1.3, 0, Math.PI * 2);
      ctx.arc(x + 3, by - 32, 1.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x + (facing === "left" ? -3.5 : 3.5), by - 32, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Puffs of dust kicked up while running. */
export type Dust = { x: number; y: number; life: number; s: number };

export function drawDust(ctx: CanvasRenderingContext2D, dust: Dust[]) {
  for (const d of dust) {
    ctx.fillStyle = `rgba(214, 198, 166, ${d.life * 0.42})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.s * (1.6 - d.life), 0, Math.PI * 2);
    ctx.fill();
  }
}
