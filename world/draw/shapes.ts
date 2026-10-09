/** Small drawing helpers shared by the props and the buildings. */

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** The soft ellipse every object sits on; it is what grounds them. */
export function groundShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry = rx * 0.38, alpha = 0.22) {
  ctx.fillStyle = `rgba(22, 16, 10, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function poly(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/** A window that turns warm after dark. */
export function window$(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  night: number,
  cold = "#8ea7b8",
) {
  roundRect(ctx, x, y, w, h, Math.min(3, w / 4));
  ctx.fillStyle = night > 0.05 ? mix(cold, "#ffd38a", night) : cold;
  ctx.fill();
  if (night > 0.2) {
    ctx.save();
    ctx.globalAlpha = night * 0.5;
    ctx.fillStyle = "#ffcf86";
    ctx.filter = "blur(5px)";
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 4);
    ctx.fill();
    ctx.restore();
  }
}

export function mix(a: string, b: string, t: number) {
  const pa = hex(a);
  const pb = hex(b);
  return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(pa[1] + (pb[1] - pa[1]) * t)},${Math.round(
    pa[2] + (pb[2] - pa[2]) * t,
  )})`;
}

function hex(c: string): [number, number, number] {
  const v = c.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

/** A pool of lamplight on the ground. */
export function lightPool(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, strength: number, color = "255,206,130") {
  if (strength <= 0.02) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${0.34 * strength})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}
