import { TOKEN_H, TOKEN_MIN_W } from "./constants";

/**
 * Token sprites.
 *
 * Emoji are expensive to rasterise, so every distinct token is drawn once to
 * an offscreen canvas and blitted from then on. Two thousand tokens at 60fps
 * is fine as blits; it is not fine as text draws.
 */

const PASTELS = [
  "#f5c6a5", "#f7d9a0", "#e9e6a8", "#c9e6b3", "#b6e3d4", "#b9dcf2", "#c9c6f0", "#e6c1e6",
  "#f4bfc9", "#d9d3c2", "#cfe0d2", "#e5d1b8",
];

const WORD_FONT = "500 13px var(--font-geist-mono), ui-monospace, monospace";
const EMOJI_FONT = "22px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";

let measurer: CanvasRenderingContext2D | null = null;
const sizeCache = new Map<string, number>();
const spriteCache = new Map<string, HTMLCanvasElement>();

function measure(word: string) {
  if (sizeCache.has(word)) return sizeCache.get(word)!;
  if (!measurer) measurer = document.createElement("canvas").getContext("2d");
  if (!measurer) return word.length * 8;
  measurer.font = WORD_FONT;
  const w = measurer.measureText(word).width;
  sizeCache.set(word, w);
  return w;
}

/** A token's body size in world units, from its word. */
export function tokenSize(word: string) {
  const text = measure(word);
  return { w: Math.max(TOKEN_MIN_W, Math.round(40 + text + 14)), h: TOKEN_H };
}

export function tokenColor(emoji: string, word: string) {
  let h = 0;
  for (const ch of emoji + word) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return PASTELS[h % PASTELS.length];
}

/** The cached sprite for a token, at the given device pixel ratio. */
export function tokenSprite(emoji: string, word: string, dpr: number) {
  const key = `${emoji}|${word}|${dpr}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;

  const { w, h } = tokenSize(word);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Pill.
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(r, h);
  ctx.arc(r, r, r, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.closePath();
  ctx.fillStyle = tokenColor(emoji, word);
  ctx.fill();
  // A darker rim so tokens separate from each other in a pile.
  ctx.strokeStyle = "rgba(20, 12, 6, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // A soft highlight along the top edge: a little self-light.
  const gloss = ctx.createLinearGradient(0, 0, 0, h);
  gloss.addColorStop(0, "rgba(255,255,255,0.28)");
  gloss.addColorStop(0.5, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fill();

  ctx.font = EMOJI_FONT;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(emoji, 22, h / 2 + 1);

  ctx.font = WORD_FONT;
  ctx.textAlign = "left";
  ctx.fillStyle = "#1a1208";
  ctx.fillText(word, 42, h / 2 + 1);

  spriteCache.set(key, canvas);
  return canvas;
}
