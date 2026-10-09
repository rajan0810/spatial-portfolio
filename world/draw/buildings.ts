import type { Place } from "../layout";

import { groundShadow, lightPool, poly, roundRect, window$ } from "./shapes";

/**
 * Twelve buildings, one silhouette each.
 *
 * The shape is the label: a courthouse for the courtroom simulator, a fire
 * station for the fire-safety trainer, a playhouse for the exposure-therapy
 * stage. You should be able to guess what a building holds before you read
 * its sign — that is the whole reason the portfolio is a map.
 *
 * Every building is drawn from its bottom-centre, so sorting by that y value
 * puts the player correctly in front of or behind it.
 */
export function drawBuilding(ctx: CanvasRenderingContext2D, p: Place, t: number, night: number, focus: number) {
  ctx.save();
  if (focus > 0.01) {
    // A warm rim while you are standing at the door.
    ctx.shadowColor = `rgba(255, 206, 130, ${0.55 * focus})`;
    ctx.shadowBlur = 26 * focus;
  }
  switch (p.style) {
    case "cottage": cottage(ctx, p, t, night); break;
    case "courthouse": courthouse(ctx, p, night); break;
    case "tower": tower(ctx, p, t, night); break;
    case "amphitheatre": amphitheatre(ctx, p, night); break;
    case "foundry": foundry(ctx, p, t, night); break;
    case "firehouse": firehouse(ctx, p, night); break;
    case "playhouse": playhouse(ctx, p, t, night); break;
    case "schoolhouse": schoolhouse(ctx, p, night); break;
    case "hall": hall(ctx, p, night); break;
    case "forge": forge(ctx, p, t, night); break;
    case "academy": academy(ctx, p, night); break;
    case "lighthouse": lighthouse(ctx, p, t, night); break;
  }
  ctx.restore();
  sign(ctx, p, focus);
}

/** The nameplate every place carries, on a post beside the door. */
function sign(ctx: CanvasRenderingContext2D, p: Place, focus: number) {
  const x = p.x + p.w / 2 + 32;
  const y = p.y - 4;
  ctx.fillStyle = "#6b4a2f";
  roundRect(ctx, x - 2, y - 34, 4, 34, 2);
  ctx.fill();
  ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
  const tw = Math.max(ctx.measureText(p.name).width, ctx.measureText(p.sub).width) + 18;
  ctx.fillStyle = focus > 0.3 ? "#3a2c1c" : "#2f2518";
  roundRect(ctx, x - tw / 2, y - 62, tw, 30, 4);
  ctx.fill();
  ctx.strokeStyle = focus > 0.3 ? "rgba(255,206,130,0.9)" : "rgba(239,230,214,0.25)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#efe6d6";
  ctx.fillText(p.name, x, y - 50);
  ctx.font = "500 10px ui-monospace, monospace";
  ctx.fillStyle = "#b9ac97";
  ctx.fillText(p.sub, x, y - 38);
  ctx.textAlign = "left";
}

/** Walls with a light side and a shaded side, so blocks read as volumes. */
function wall(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, light: string, dark: string) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function door(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = "#5a3b24", night = 0) {
  roundRect(ctx, x - w / 2, y - h, w, h, 3);
  ctx.fillStyle = color;
  ctx.fill();
  if (night > 0.1) {
    ctx.fillStyle = `rgba(255, 206, 130, ${night * 0.5})`;
    roundRect(ctx, x - w / 2 + 2, y - h + 2, w - 4, h - 4, 2);
    ctx.fill();
  }
  ctx.fillStyle = "#d9c08a";
  ctx.beginPath();
  ctx.arc(x + w / 2 - 5, y - h / 2, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

// --- about -----------------------------------------------------------------

function cottage(ctx: CanvasRenderingContext2D, p: Place, t: number, night: number) {
  const w = p.w;
  const h = 96;
  const x = p.x - w / 2;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, w * 0.56, 16);
  wall(ctx, x, y, w, h, "#efe0c4", "#d6c3a2");
  // Gable roof.
  ctx.fillStyle = "#a9553f";
  poly(ctx, [[x - 16, y], [p.x, y - 58], [x + w + 16, y]]);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  poly(ctx, [[p.x, y - 58], [x + w + 16, y], [p.x, y]]);
  ctx.fill();
  // Chimney with a thread of smoke.
  ctx.fillStyle = "#8d6a50";
  ctx.fillRect(x + w * 0.72, y - 48, 16, 30);
  ctx.fillStyle = "rgba(230,225,215,0.4)";
  for (let i = 0; i < 4; i += 1) {
    const k = (t * 0.35 + i * 0.25) % 1;
    ctx.beginPath();
    ctx.arc(x + w * 0.72 + 8 + Math.sin(k * 6 + i) * 9, y - 52 - k * 56, 4 + k * 8, 0, Math.PI * 2);
    ctx.globalAlpha = (1 - k) * 0.5;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  window$(ctx, x + 22, y + 26, 34, 28, night);
  window$(ctx, x + w - 56, y + 26, 34, 28, night);
  // Flower boxes under the sills.
  for (const wx of [x + 22, x + w - 56]) {
    ctx.fillStyle = "#7a5436";
    ctx.fillRect(wx - 3, y + 54, 40, 7);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = ["#f2a6c0", "#f6e39a", "#e8a1a1"][i % 3];
      ctx.beginPath();
      ctx.arc(wx + 3 + i * 8, y + 52, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  door(ctx, p.x, p.y, 36, 52, "#7a4a2c", night);
  lightPool(ctx, p.x, p.y + 6, 92, night * 0.8);
}

// --- projects ---------------------------------------------------------------

function courthouse(ctx: CanvasRenderingContext2D, p: Place, night: number) {
  const w = p.w;
  const h = 104;
  const x = p.x - w / 2;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, w * 0.58, 17);
  // Steps.
  ctx.fillStyle = "#cfc6b2";
  ctx.fillRect(x - 14, p.y - 12, w + 28, 12);
  ctx.fillStyle = "#ded5c0";
  ctx.fillRect(x - 7, p.y - 20, w + 14, 9);
  wall(ctx, x, y, w, h - 18, "#eae3d2", "#cdc3ae");
  // Columns.
  for (let i = 0; i < 5; i += 1) {
    const cx = x + 16 + i * ((w - 32) / 4);
    ctx.fillStyle = "#f3eee0";
    ctx.fillRect(cx - 7, y - 4, 14, h - 14);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(cx + 3, y - 4, 4, h - 14);
  }
  // Pediment.
  ctx.fillStyle = "#e3dac7";
  poly(ctx, [[x - 14, y - 4], [p.x, y - 52], [x + w + 14, y - 4]]);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  poly(ctx, [[p.x, y - 52], [x + w + 14, y - 4], [p.x, y - 4]]);
  ctx.fill();
  // Scales of justice on the tympanum.
  ctx.strokeStyle = "#9c8450";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, y - 40);
  ctx.lineTo(p.x, y - 20);
  ctx.moveTo(p.x - 13, y - 33);
  ctx.lineTo(p.x + 13, y - 33);
  ctx.moveTo(p.x - 13, y - 33);
  ctx.lineTo(p.x - 13, y - 26);
  ctx.moveTo(p.x + 13, y - 33);
  ctx.lineTo(p.x + 13, y - 26);
  ctx.stroke();
  door(ctx, p.x, p.y - 20, 40, 56, "#5b4a33", night);
  lightPool(ctx, p.x, p.y, 100, night * 0.7);
}

function tower(ctx: CanvasRenderingContext2D, p: Place, t: number, night: number) {
  const w = p.w;
  const h = 196;
  const x = p.x - w / 2;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, w * 0.6, 14);
  wall(ctx, x, y, w, h, "#4a5a6b", "#334454");
  // Glass bands, each floor lit independently after dark.
  for (let i = 0; i < 6; i += 1) {
    const by = y + 14 + i * 28;
    window$(ctx, x + 12, by, w - 24, 16, i % 3 === 0 ? night : night * 0.6, "#7fa6c4");
  }
  // Flat cap and a blinking aircraft light.
  ctx.fillStyle = "#2a3a48";
  ctx.fillRect(x - 6, y - 10, w + 12, 12);
  ctx.strokeStyle = "#8da3b5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, y - 10);
  ctx.lineTo(p.x, y - 34);
  ctx.stroke();
  const blink = Math.sin(t * 3) > 0.4;
  ctx.fillStyle = blink ? "#ff6b5a" : "#5a2a28";
  ctx.beginPath();
  ctx.arc(p.x, y - 36, 3.4, 0, Math.PI * 2);
  ctx.fill();
  // Two interlocking links on a plaque: a short-link service.
  ctx.strokeStyle = "#8fd0e8";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(p.x - 7, y + h - 44, 8, 5, -0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(p.x + 7, y + h - 36, 8, 5, -0.5, 0, Math.PI * 2);
  ctx.stroke();
  door(ctx, p.x, p.y, 34, 44, "#24323e", night);
  lightPool(ctx, p.x, p.y + 4, 88, night * 0.8, "140,200,230");
}

function amphitheatre(ctx: CanvasRenderingContext2D, p: Place, night: number) {
  const w = p.w;
  groundShadow(ctx, p.x, p.y, w * 0.6, 20);
  // Concentric stone tiers.
  for (let i = 3; i >= 0; i -= 1) {
    const rx = w * 0.5 - i * 18;
    ctx.fillStyle = ["#d9cfb8", "#cec3ab", "#c2b79e", "#b6ab92"][i];
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 14 - i * 11, rx, rx * 0.44, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(p.x - rx, p.y - 14 - i * 11, rx * 2, 11);
  }
  // Stage.
  ctx.fillStyle = "#8a6a46";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - 8, w * 0.22, w * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Microphone on a stand, centre stage.
  ctx.strokeStyle = "#3f4650";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 12);
  ctx.lineTo(p.x, p.y - 44);
  ctx.stroke();
  ctx.fillStyle = "#59616d";
  roundRect(ctx, p.x - 5, p.y - 56, 10, 15, 5);
  ctx.fill();
  if (night > 0.1) {
    ctx.save();
    ctx.globalAlpha = night * 0.5;
    ctx.fillStyle = "#ffd892";
    ctx.filter = "blur(10px)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 20, 46, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  lightPool(ctx, p.x, p.y, 110, night * 0.6);
}

function foundry(ctx: CanvasRenderingContext2D, p: Place, t: number, night: number) {
  const w = p.w;
  const h = 104;
  const x = p.x - w / 2;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, w * 0.58, 17);
  wall(ctx, x, y, w, h, "#9aa0a6", "#767c84");
  // Sawtooth factory roof.
  ctx.fillStyle = "#5e656d";
  for (let i = 0; i < 4; i += 1) {
    const sx = x + i * (w / 4);
    poly(ctx, [[sx, y], [sx + w / 8, y - 24], [sx + w / 4, y - 24], [sx + w / 4, y]]);
    ctx.fill();
  }
  // Smokestack.
  ctx.fillStyle = "#7d5a4a";
  ctx.fillRect(x + w - 40, y - 72, 20, 74);
  ctx.fillStyle = "#67483c";
  ctx.fillRect(x + w - 43, y - 76, 26, 8);
  ctx.fillStyle = "rgba(220,215,208,0.35)";
  for (let i = 0; i < 4; i += 1) {
    const k = (t * 0.3 + i * 0.25) % 1;
    ctx.globalAlpha = (1 - k) * 0.45;
    ctx.beginPath();
    ctx.arc(x + w - 30 + Math.sin(k * 5 + i) * 10, y - 80 - k * 60, 5 + k * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Pipes along the wall.
  ctx.strokeStyle = "#5f666d";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 20);
  ctx.lineTo(x + w - 50, y + 20);
  ctx.stroke();
  window$(ctx, x + 18, y + 40, 28, 22, night, "#8aa2b4");
  window$(ctx, x + 56, y + 40, 28, 22, night, "#8aa2b4");
  // The AR overlay this project is actually about, hovering over the machine.
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(t * 2) * 0.12;
  ctx.strokeStyle = "#7fe3ff";
  ctx.lineWidth = 1.6;
  const hy = y - 46 + Math.sin(t * 1.2) * 3;
  roundRect(ctx, p.x - 34, hy - 20, 68, 34, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x - 34, hy - 20);
  ctx.lineTo(p.x - 52, hy + 26);
  ctx.stroke();
  ctx.fillStyle = "rgba(127,227,255,0.16)";
  roundRect(ctx, p.x - 34, hy - 20, 68, 34, 4);
  ctx.fill();
  ctx.fillStyle = "#bff0ff";
  for (let i = 0; i < 3; i += 1) ctx.fillRect(p.x - 26, hy - 12 + i * 9, 40 - i * 11, 3);
  ctx.restore();
  door(ctx, p.x, p.y, 44, 58, "#4f565d", night);
  lightPool(ctx, p.x, p.y + 4, 96, night * 0.7);
}

function firehouse(ctx: CanvasRenderingContext2D, p: Place, night: number) {
  const w = p.w;
  const h = 102;
  const x = p.x - w / 2;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, w * 0.57, 16);
  wall(ctx, x, y, w, h, "#b0503f", "#8d3e31");
  // Brick courses.
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 7; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x, y + i * 14);
    ctx.lineTo(x + w, y + i * 14);
    ctx.stroke();
  }
  ctx.fillStyle = "#e5dccb";
  ctx.fillRect(x - 8, y - 12, w + 16, 14);
  // Bell tower.
  ctx.fillStyle = "#9c4537";
  ctx.fillRect(x + w - 52, y - 58, 36, 50);
  ctx.fillStyle = "#4f3b30";
  poly(ctx, [[x + w - 58, y - 56], [x + w - 34, y - 80], [x + w - 10, y - 56]]);
  ctx.fill();
  ctx.fillStyle = "#d8b45e";
  ctx.beginPath();
  ctx.arc(x + w - 34, y - 42, 8, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + w - 42, y - 42, 16, 5);
  // The big door the engine comes out of.
  ctx.fillStyle = "#e8e2d4";
  roundRect(ctx, p.x - 48, p.y - 66, 96, 66, 5);
  ctx.fill();
  ctx.fillStyle = "#c9513d";
  roundRect(ctx, p.x - 43, p.y - 61, 86, 61, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.14)";
  for (let i = 1; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(p.x - 43, p.y - 61 + i * 12);
    ctx.lineTo(p.x + 43, p.y - 61 + i * 12);
    ctx.stroke();
  }
  // Hydrant.
  ctx.fillStyle = "#d4453a";
  roundRect(ctx, x - 22, p.y - 22, 11, 22, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 16.5, p.y - 24, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 27, p.y - 16, 21, 4);
  lightPool(ctx, p.x, p.y + 4, 92, night * 0.75, "255,150,110");
}

function playhouse(ctx: CanvasRenderingContext2D, p: Place, t: number, night: number) {
  const w = p.w;
  const h = 108;
  const x = p.x - w / 2;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, w * 0.57, 16);
  wall(ctx, x, y, w, h, "#6d4a74", "#53385c");
  ctx.fillStyle = "#43304d";
  ctx.fillRect(x - 8, y - 14, w + 16, 16);
  // Marquee with chasing bulbs.
  ctx.fillStyle = "#2c2033";
  roundRect(ctx, x + 10, y + 14, w - 20, 34, 5);
  ctx.fill();
  ctx.fillStyle = "#f2d98a";
  ctx.font = "700 15px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("XPOSURE", p.x, y + 36);
  ctx.textAlign = "left";
  for (let i = 0; i < 12; i += 1) {
    const bx = x + 16 + i * ((w - 32) / 11);
    const on = (Math.floor(t * 5) + i) % 3 === 0;
    ctx.fillStyle = on ? "#ffe9a8" : "#6b5a3a";
    ctx.beginPath();
    ctx.arc(bx, y + 52, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Curtained doorway.
  ctx.fillStyle = "#2a1f30";
  roundRect(ctx, p.x - 32, p.y - 56, 64, 56, 4);
  ctx.fill();
  ctx.fillStyle = "#9c3f4e";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(p.x + side * 32, p.y - 56);
    ctx.quadraticCurveTo(p.x + side * 14, p.y - 30, p.x + side * 24, p.y);
    ctx.lineTo(p.x + side * 32, p.y);
    ctx.closePath();
    ctx.fill();
  }
  lightPool(ctx, p.x, p.y + 4, 100, night * 0.85, "255,200,150");
}

function schoolhouse(ctx: CanvasRenderingContext2D, p: Place, night: number) {
  const w = p.w;
  const h = 94;
  const x = p.x - w / 2;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, w * 0.55, 15);
  wall(ctx, x, y, w, h, "#e8d4b0", "#cdb892");
  ctx.fillStyle = "#7d6a52";
  poly(ctx, [[x - 12, y], [p.x, y - 44], [x + w + 12, y]]);
  ctx.fill();
  // Bell cupola.
  ctx.fillStyle = "#e8d4b0";
  ctx.fillRect(p.x - 13, y - 68, 26, 26);
  ctx.fillStyle = "#7d6a52";
  poly(ctx, [[p.x - 18, y - 66], [p.x, y - 88], [p.x + 18, y - 66]]);
  ctx.fill();
  ctx.fillStyle = "#c8a24e";
  ctx.beginPath();
  ctx.arc(p.x, y - 54, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  window$(ctx, x + 20, y + 26, 30, 32, night);
  window$(ctx, x + w - 50, y + 26, 30, 32, night);
  door(ctx, p.x, p.y, 36, 52, "#8a5f38", night);
  lightPool(ctx, p.x, p.y + 4, 88, night * 0.7);
}

// --- landmarks ---------------------------------------------------------------

function hall(ctx: CanvasRenderingContext2D, p: Place, night: number) {
  const w = p.w;
  const h = 126;
  const x = p.x - w / 2;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, w * 0.58, 20);
  // Steps.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = ["#c9c0ab", "#d6cdb8", "#e2d9c4"][i];
    ctx.fillRect(x - 18 + i * 6, p.y - 8 - i * 7, w + 36 - i * 12, 8);
  }
  wall(ctx, x, y, w, h - 24, "#ede7d8", "#d2cab6");
  for (let i = 0; i < 6; i += 1) {
    const cx = x + 18 + i * ((w - 36) / 5);
    ctx.fillStyle = "#f7f3e8";
    ctx.fillRect(cx - 8, y - 6, 16, h - 18);
    ctx.fillStyle = "rgba(0,0,0,0.09)";
    ctx.fillRect(cx + 3, y - 6, 5, h - 18);
  }
  ctx.fillStyle = "#e6dfcd";
  poly(ctx, [[x - 18, y - 6], [p.x, y - 54], [x + w + 18, y - 6]]);
  ctx.fill();
  // Dome.
  ctx.fillStyle = "#c8a24e";
  ctx.beginPath();
  ctx.ellipse(p.x, y - 52, 42, 36, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.ellipse(p.x - 12, y - 62, 13, 11, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9c8450";
  ctx.fillRect(p.x - 2, y - 104, 4, 16);
  ctx.beginPath();
  ctx.arc(p.x, y - 106, 5, 0, Math.PI * 2);
  ctx.fill();
  // Trophies on plinths out front — the awards, standing outside.
  for (let i = 0; i < 3; i += 1) {
    const tx = x + 30 + i * ((w - 60) / 2);
    ctx.fillStyle = "#cfc6b2";
    ctx.fillRect(tx - 11, p.y + 6, 22, 20);
    ctx.fillStyle = ["#e5c45f", "#cfd3d6", "#c98f55"][i];
    ctx.beginPath();
    ctx.ellipse(tx, p.y + 2, 9, 11, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(tx - 2.5, p.y - 2, 5, 8);
    ctx.fillRect(tx - 7, p.y + 4, 14, 3);
  }
  door(ctx, p.x, p.y - 8, 44, 62, "#6a5a3c", night);
  lightPool(ctx, p.x, p.y + 10, 120, night * 0.8, "255,220,150");
}

function forge(ctx: CanvasRenderingContext2D, p: Place, t: number, night: number) {
  const w = p.w;
  const h = 96;
  const x = p.x - w / 2;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, w * 0.56, 16);
  ctx.fillStyle = "#8d8276";
  ctx.fillRect(x, y + h - 36, w, 36);
  wall(ctx, x, y, w, h - 36, "#a07a52", "#845f3e");
  ctx.fillStyle = "#5c4433";
  poly(ctx, [[x - 14, y], [p.x, y - 46], [x + w + 14, y]]);
  ctx.fill();
  // Chimney, glowing from the fire inside.
  ctx.fillStyle = "#6e6358";
  ctx.fillRect(x + 16, y - 56, 22, 44);
  const ember = 0.5 + Math.sin(t * 3) * 0.2;
  ctx.save();
  ctx.globalAlpha = 0.45 + ember * 0.3;
  ctx.fillStyle = "#ff8a3c";
  ctx.filter = "blur(6px)";
  ctx.beginPath();
  ctx.arc(x + 27, y - 58, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The forge mouth.
  ctx.fillStyle = "#2a1c12";
  roundRect(ctx, x + w - 78, y + h - 62, 44, 34, 4);
  ctx.fill();
  ctx.fillStyle = `rgba(255, ${120 + ember * 70}, 50, ${0.75 + ember * 0.2})`;
  roundRect(ctx, x + w - 74, y + h - 58, 36, 26, 3);
  ctx.fill();
  // Anvil outside.
  ctx.fillStyle = "#4a4a52";
  ctx.fillRect(x - 30, p.y - 10, 24, 7);
  ctx.fillRect(x - 24, p.y - 18, 12, 9);
  ctx.fillRect(x - 33, p.y - 3, 30, 4);
  door(ctx, p.x - 20, p.y, 36, 50, "#5c4433", night);
  lightPool(ctx, p.x, p.y + 4, 100, Math.max(night, 0.35) * 0.8, "255,150,70");
}

function academy(ctx: CanvasRenderingContext2D, p: Place, night: number) {
  const w = p.w;
  const h = 128;
  const x = p.x - w / 2;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, w * 0.57, 18);
  wall(ctx, x, y, w, h, "#9c5d50", "#7d473d");
  ctx.strokeStyle = "rgba(0,0,0,0.07)";
  for (let i = 1; i < 9; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x, y + i * 14);
    ctx.lineTo(x + w, y + i * 14);
    ctx.stroke();
  }
  ctx.fillStyle = "#e2d9c6";
  ctx.fillRect(x - 10, y - 12, w + 20, 14);
  // Arched windows.
  for (let i = 0; i < 3; i += 1) {
    const wx = x + 22 + i * ((w - 44) / 2) - 14;
    ctx.beginPath();
    ctx.moveTo(wx, y + 72);
    ctx.lineTo(wx, y + 40);
    ctx.arc(wx + 14, y + 40, 14, Math.PI, 0);
    ctx.lineTo(wx + 28, y + 72);
    ctx.closePath();
    ctx.fillStyle = night > 0.05 ? "#ffd38a" : "#8ea7b8";
    ctx.fill();
  }
  // Clock tower, showing the visitor's actual local time.
  const tx = p.x;
  ctx.fillStyle = "#8d5146";
  ctx.fillRect(tx - 28, y - 86, 56, 80);
  ctx.fillStyle = "#4a3a33";
  poly(ctx, [[tx - 34, y - 84], [tx, y - 122], [tx + 34, y - 84]]);
  ctx.fill();
  ctx.fillStyle = "#f2ead6";
  ctx.beginPath();
  ctx.arc(tx, y - 54, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2e26";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tx, y - 54, 19, 0, Math.PI * 2);
  ctx.stroke();
  const now = new Date();
  const hourAngle = ((now.getHours() % 12) + now.getMinutes() / 60) * (Math.PI / 6) - Math.PI / 2;
  const minuteAngle = now.getMinutes() * (Math.PI / 30) - Math.PI / 2;
  ctx.lineCap = "round";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(tx, y - 54);
  ctx.lineTo(tx + Math.cos(hourAngle) * 9, y - 54 + Math.sin(hourAngle) * 9);
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(tx, y - 54);
  ctx.lineTo(tx + Math.cos(minuteAngle) * 13, y - 54 + Math.sin(minuteAngle) * 13);
  ctx.stroke();
  door(ctx, p.x, p.y, 40, 58, "#5e4038", night);
  lightPool(ctx, p.x, p.y + 4, 100, night * 0.75);
}

function lighthouse(ctx: CanvasRenderingContext2D, p: Place, t: number, night: number) {
  const h = 188;
  const y = p.y - h;
  groundShadow(ctx, p.x, p.y, 48, 16);
  // Rock base.
  ctx.fillStyle = "#8d8b85";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 54, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tapered tower in bands.
  for (let i = 0; i < 7; i += 1) {
    const topW = 20 + i * 3.4;
    const botW = 20 + (i + 1) * 3.4;
    const ty = y + 16 + i * 23;
    ctx.fillStyle = i % 2 === 0 ? "#efe6d6" : "#c0453a";
    poly(ctx, [
      [p.x - topW, ty],
      [p.x + topW, ty],
      [p.x + botW, ty + 23],
      [p.x - botW, ty + 23],
    ]);
    ctx.fill();
  }
  // Lantern room.
  ctx.fillStyle = "#3b4652";
  ctx.fillRect(p.x - 26, y + 2, 52, 8);
  ctx.fillStyle = night > 0.05 ? "#ffe6a8" : "#9fb6c4";
  ctx.fillRect(p.x - 19, y - 24, 38, 26);
  ctx.fillStyle = "#3b4652";
  poly(ctx, [[p.x - 26, y - 24], [p.x, y - 48], [p.x + 26, y - 24]]);
  ctx.fill();
  // The sweeping beam — the reason to put a lighthouse on a portfolio.
  const beam = t * 0.55;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.1 + night * 0.4;
  const grad = ctx.createRadialGradient(p.x, y - 11, 0, p.x, y - 11, 420);
  grad.addColorStop(0, "rgba(255,236,180,0.85)");
  grad.addColorStop(1, "rgba(255,236,180,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(p.x, y - 11);
  ctx.arc(p.x, y - 11, 420, beam - 0.16, beam + 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Mailbox at the foot.
  ctx.fillStyle = "#4a5a6b";
  ctx.fillRect(p.x + 36, p.y - 26, 4, 26);
  ctx.fillStyle = "#3f7a8c";
  roundRect(ctx, p.x + 26, p.y - 42, 24, 17, 4);
  ctx.fill();
  ctx.fillStyle = "#d4453a";
  ctx.fillRect(p.x + 50, p.y - 42, 3, 12);
  lightPool(ctx, p.x, p.y + 4, 110, night * 0.6, "255,236,180");
}
