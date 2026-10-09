/**
 * The island runs on the visitor's own clock. Arrive in the evening and the
 * lamps are lit; arrive at midday and they are not. It costs one overlay and
 * makes the place feel like somewhere that exists when you are not looking.
 */
export type Sky = {
  /** 0 by day, 1 at full dark — drives every lamp and window in the world. */
  night: number;
  /** The tint laid over the finished frame. */
  tint: string;
  label: string;
};

const bell = (h: number, centre: number, width: number) => Math.exp(-((h - centre) ** 2) / (2 * width ** 2));

export function skyAt(date = new Date()): Sky {
  const h = date.getHours() + date.getMinutes() / 60;

  // Night ramps down through dawn and back up through dusk.
  let night: number;
  if (h < 5) night = 1;
  else if (h < 7.5) night = 1 - (h - 5) / 2.5;
  else if (h < 17.5) night = 0;
  else if (h < 20.5) night = (h - 17.5) / 3;
  else night = 1;

  const warm = Math.max(bell(h, 6.6, 1.1), bell(h, 18.8, 1.3));

  // Deep blue for the dark, warm amber for the edges of the day.
  const blue = night * 0.64;
  const amber = warm * 0.2;
  const r = Math.round(18 * (1 - amber) + 255 * amber);
  const g = Math.round(26 * (1 - amber) + 150 * amber);
  const b = Math.round(62 * (1 - amber) + 70 * amber);
  const alpha = Math.max(blue, amber);

  const label = night > 0.75 ? "Night" : night > 0.25 ? (h < 12 ? "Dawn" : "Dusk") : warm > 0.3 ? "Golden hour" : "Daytime";

  return { night, tint: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`, label };
}

/**
 * What the server renders. The real sky depends on the visitor's clock, which
 * the server cannot know — so the first paint is always daylight and the
 * client corrects it on mount. Without this the two disagree and React
 * throws a hydration mismatch.
 */
export const DAYLIGHT: Sky = skyAt(new Date(2000, 0, 1, 13, 0, 0));
