/**
 * The shaft, in world units (px at scale 1). Rest poses are stored in these
 * units, so they must never change once tokens exist.
 */
export const WORLD_W = 1000;
/** The ground line. Sky above, earth below. */
export const SURFACE_Y = 460;
/** The floor of the shaft: tokens pile up from here. */
export const FLOOR_Y = 5400;
/** Total page height in world units. */
export const PAGE_H = 5800;

export const TOKEN_H = 40;
export const TOKEN_MIN_W = 56;

/** Seconds a dragged token waits before healing back to its rest pose. */
export const HEAL_DELAY = 6;
