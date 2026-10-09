/** The island, in world units (1 unit = 1 pixel at zoom 1). */
export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const CX = WORLD_W / 2;
export const CY = WORLD_H / 2;
/** Island radii before coastline noise. */
export const RX = 1600;
export const RY = 1110;

/** Collision/biome grid resolution. */
export const CELL = 20;
export const COLS = Math.ceil(WORLD_W / CELL);
export const ROWS = Math.ceil(WORLD_H / CELL);

/** The terrain image is generated at half resolution and scaled up: coastlines
 *  want to be a little soft, and it keeps generation under ~100ms. */
export const TERRAIN_SCALE = 0.5;

export const WALK_SPEED = 196;
export const RUN_SPEED = 330;
export const PLAYER_R = 11;

/** Biome flags packed into the grid. */
export const BIOME = { DEEP: 0, WATER: 1, SAND: 2, GRASS: 3, FOREST: 4 } as const;
export type Biome = (typeof BIOME)[keyof typeof BIOME];

export const PALETTE = {
  deep: [38, 86, 120],
  water: [63, 132, 163],
  shallow: [122, 190, 205],
  sandWet: [214, 193, 142],
  sand: [231, 214, 162],
  grass: [110, 169, 90],
  grass2: [96, 154, 79],
  forest: [88, 146, 76],
  path: "#cdb288",
  pathEdge: "#b2946a",
} as const;
