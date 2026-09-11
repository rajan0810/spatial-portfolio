/**
 * What a visitor is allowed to leave in the dig.
 *
 * One emoji from a fixed palette and one short word. The palette is a closed
 * set so the pile stays legible and the sprite cache stays small; the word is
 * letters only, so no links, no markup, no numbers-as-phone-numbers. A small
 * deny list catches the obvious. Anything else is the admin's job later.
 */

export const EMOJI_PALETTE = [
  "🌱", "🌵", "🌸", "🍄", "🌙", "⭐", "🔥", "💧", "⚡", "🌈", "🪨", "🐚",
  "🦴", "🪶", "🧭", "🔑", "🎲", "🎈", "🎧", "📎", "🧩", "🪄", "🕹️", "📡",
  "🛰️", "🚀", "🧪", "🔬", "💡", "🧠", "🫀", "👁️", "🐙", "🦎", "🐌", "🦔",
  "🐝", "🦊", "🐢", "🐋", "🍀", "🍋", "🥑", "☕", "🍩", "🧃", "👋", "❤️",
] as const;

export type PaletteEmoji = (typeof EMOJI_PALETTE)[number];

export const WORD_MAX = 16;
export const WORD_MIN = 1;

const WORD_PATTERN = /^[\p{L}][\p{L}\p{M}'’-]*$/u;

const DENY = new Set([
  // Kept short and obvious. This is a portfolio, not a comment section.
  "fuck", "shit", "cunt", "nigger", "nigga", "faggot", "retard", "bitch", "whore", "slut",
  "nazi", "hitler", "rape", "kys",
]);

export type Validation = { ok: true; emoji: PaletteEmoji; word: string } | { ok: false; reason: string };

export function validateDrop(emojiRaw: unknown, wordRaw: unknown): Validation {
  if (typeof emojiRaw !== "string" || !(EMOJI_PALETTE as readonly string[]).includes(emojiRaw)) {
    return { ok: false, reason: "Pick an emoji from the palette." };
  }
  if (typeof wordRaw !== "string") return { ok: false, reason: "Say a word." };

  const word = wordRaw.trim();
  if (word.length < WORD_MIN) return { ok: false, reason: "Say a word." };
  if (word.length > WORD_MAX) return { ok: false, reason: `Keep it under ${WORD_MAX} characters.` };
  if (!WORD_PATTERN.test(word)) return { ok: false, reason: "Letters only — one word." };

  const folded = word.toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");
  for (const bad of DENY) if (folded.includes(bad)) return { ok: false, reason: "Not that word." };

  return { ok: true, emoji: emojiRaw as PaletteEmoji, word };
}
