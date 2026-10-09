import { BIOME, CELL, COLS, PALETTE, ROWS, TERRAIN_SCALE } from "./constants";
import { fbm, rng } from "./noise";
import { biomeAt, blockCircle, blockRect, cellIndex, type Terrain } from "./terrain";

/**
 * Where everything is.
 *
 * Positions are hand-placed rather than generated: a map you walk around wants
 * a composition — a plaza you arrive in, landmarks on the skyline, projects
 * spread so you discover them by wandering rather than by reading a list.
 */

export type LocationKind = "about" | "project" | "achievements" | "skills" | "timeline" | "contact";

export type BuildingStyle =
  | "cottage"
  | "courthouse"
  | "tower"
  | "amphitheatre"
  | "foundry"
  | "firehouse"
  | "playhouse"
  | "schoolhouse"
  | "hall"
  | "forge"
  | "academy"
  | "lighthouse";

export type Place = {
  id: string;
  /** The name on the signpost. */
  name: string;
  /** What it actually is. */
  sub: string;
  kind: LocationKind;
  /** Bottom-centre of the building, in world units. */
  x: number;
  y: number;
  w: number;
  style: BuildingStyle;
};

export const PLAZA = { x: 1800, y: 1340 };

export const PLACES: Place[] = [
  { id: "about", name: "The Cottage", sub: "Who I am", kind: "about", x: 1800, y: 1700, w: 230, style: "cottage" },
  { id: "achievements", name: "Hall of Fame", sub: "Awards & patent", kind: "achievements", x: 1800, y: 690, w: 300, style: "hall" },
  { id: "skills", name: "The Workshop", sub: "Tools of the trade", kind: "skills", x: 820, y: 1420, w: 220, style: "forge" },
  { id: "timeline", name: "The Academy", sub: "Work & study", kind: "timeline", x: 2860, y: 1150, w: 250, style: "academy" },
  { id: "contact", name: "The Beacon", sub: "Get in touch", kind: "contact", x: 1860, y: 2060, w: 150, style: "lighthouse" },

  { id: "justix", name: "The Courthouse", sub: "JustiX", kind: "project", x: 1340, y: 790, w: 250, style: "courthouse" },
  { id: "hatch", name: "The Link Tower", sub: "Hatch", kind: "project", x: 2250, y: 700, w: 170, style: "tower" },
  { id: "edventures", name: "The Schoolhouse", sub: "Edventures", kind: "project", x: 1060, y: 940, w: 220, style: "schoolhouse" },
  { id: "awaaz", name: "The Amphitheatre", sub: "Awaaz", kind: "project", x: 1030, y: 1760, w: 260, style: "amphitheatre" },
  { id: "nova", name: "The Foundry", sub: "NOVA", kind: "project", x: 2700, y: 1700, w: 250, style: "foundry" },
  { id: "inferno", name: "The Fire Station", sub: "INFERNO", kind: "project", x: 1420, y: 2000, w: 230, style: "firehouse" },
  { id: "xposure", name: "The Playhouse", sub: "Xposure", kind: "project", x: 2320, y: 1980, w: 230, style: "playhouse" },
];

/** The footprint the player collides with: a band at the building's base. */
export function footprint(p: Place) {
  return { x: p.x - p.w / 2, y: p.y - 38, w: p.w, h: 46 };
}

/** Where you stand to go in. */
export const doorOf = (p: Place) => ({ x: p.x, y: p.y + 16 });

/** How close you must be for the prompt to appear. */
export const ENTER_RADIUS = 78;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export type Path = { pts: { x: number; y: number }[]; width: number };

/** A gently bowed route between two points, so nothing is a straight line. */
function route(ax: number, ay: number, bx: number, by: number, bow: number, width = 34): Path {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const nx = -(by - ay);
  const ny = bx - ax;
  const len = Math.hypot(nx, ny) || 1;
  const cx = mx + (nx / len) * bow;
  const cy = my + (ny / len) * bow;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 14; i += 1) {
    const t = i / 14;
    const u = 1 - t;
    pts.push({
      x: u * u * ax + 2 * u * t * cx + t * t * bx,
      y: u * u * ay + 2 * u * t * cy + t * t * by,
    });
  }
  return { pts, width };
}

export const PATHS: Path[] = [
  // Spokes from the plaza to the five landmarks.
  route(PLAZA.x, PLAZA.y, 1800, 740, 0, 44),
  route(PLAZA.x, PLAZA.y, 1800, 1716, 0, 40),
  route(PLAZA.x, PLAZA.y, 860, 1430, 90, 36),
  route(PLAZA.x, PLAZA.y, 2820, 1165, -90, 36),
  route(1800, 1716, 1860, 2070, 40, 30),
  // Branches out to the projects.
  route(1800, 900, 1360, 806, 60, 28),
  route(1800, 900, 2230, 716, -60, 28),
  route(1180, 1390, 1080, 956, 70, 26),
  route(1180, 1390, 1050, 1770, -60, 26),
  route(2560, 1250, 2690, 1712, -70, 26),
  route(1800, 1716, 1430, 2010, 50, 26),
  route(1800, 1716, 2310, 1992, -50, 26),
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PropKind = "tree" | "pine" | "rock" | "bush" | "flower" | "tuft" | "lamp" | "reed";

export type Prop = {
  kind: PropKind;
  x: number;
  y: number;
  /** Size jitter, 0.8–1.2. */
  s: number;
  /** Per-prop phase so a field of grass doesn't sway in lockstep. */
  p: number;
};

/** Paints the paths onto the terrain image and marks them in the grid. */
export function paintPaths(terrain: Terrain) {
  const ctx = terrain.canvas.getContext("2d")!;
  ctx.save();
  ctx.scale(TERRAIN_SCALE, TERRAIN_SCALE);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const pass of [
    { color: PALETTE.pathEdge, pad: 7, alpha: 0.9 },
    { color: PALETTE.path, pad: 0, alpha: 1 },
  ]) {
    ctx.globalAlpha = pass.alpha;
    ctx.strokeStyle = pass.color;
    for (const path of PATHS) {
      ctx.lineWidth = path.width + pass.pad;
      ctx.beginPath();
      ctx.moveTo(path.pts[0].x, path.pts[0].y);
      for (const pt of path.pts.slice(1)) ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  }

  // The plaza itself.
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.pathEdge;
  ctx.beginPath();
  ctx.ellipse(PLAZA.x, PLAZA.y, 210, 160, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.path;
  ctx.beginPath();
  ctx.ellipse(PLAZA.x, PLAZA.y, 198, 150, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Mark path cells so props keep off the road.
  const mark = (x: number, y: number, r: number) => {
    for (let cy = Math.floor((y - r) / CELL); cy <= Math.floor((y + r) / CELL); cy += 1) {
      for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx += 1) {
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
        terrain.path[cy * COLS + cx] = 1;
      }
    }
  };
  for (const path of PATHS) for (const pt of path.pts) mark(pt.x, pt.y, path.width * 0.7);
  mark(PLAZA.x, PLAZA.y, 215);
}

/** Scatters the island with trees, rocks, flowers and lamps. */
export function scatterProps(terrain: Terrain): Prop[] {
  const random = rng(20260214);
  const props: Prop[] = [];
  const taken = new Map<number, Prop[]>();
  const bucket = (x: number, y: number) => Math.floor(x / 90) * 10000 + Math.floor(y / 90);

  const fits = (x: number, y: number, r: number) => {
    for (let bx = -1; bx <= 1; bx += 1) {
      for (let by = -1; by <= 1; by += 1) {
        const list = taken.get(bucket(x + bx * 90, y + by * 90));
        if (!list) continue;
        for (const o of list) if (Math.hypot(o.x - x, o.y - y) < r) return false;
      }
    }
    return true;
  };

  const place = (kind: PropKind, x: number, y: number, s: number) => {
    const prop: Prop = { kind, x, y, s, p: random() * Math.PI * 2 };
    props.push(prop);
    const key = bucket(x, y);
    const list = taken.get(key);
    if (list) list.push(prop);
    else taken.set(key, [prop]);
    return prop;
  };

  const onPath = (x: number, y: number) => {
    const i = cellIndex(x, y);
    return i < 0 || terrain.path[i] === 1;
  };
  const nearBuilding = (x: number, y: number) =>
    PLACES.some((p) => Math.abs(p.x - x) < p.w / 2 + 70 && Math.abs(p.y - y) < 130);

  // Trees and pines, denser where the terrain is already forest.
  for (let i = 0; i < 4200; i += 1) {
    const x = random() * 3600;
    const y = random() * 2600;
    const b = biomeAt(terrain, x, y);
    if (b !== BIOME.GRASS && b !== BIOME.FOREST) continue;
    if (onPath(x, y) || nearBuilding(x, y)) continue;
    const density = fbm(x * 0.0018, y * 0.0018, 51, 2);
    const want = b === BIOME.FOREST ? 0.34 : 0.78;
    if (density < want) continue;
    if (!fits(x, y, 58)) continue;
    place(random() < 0.42 ? "pine" : "tree", x, y, 0.82 + random() * 0.4);
  }

  // Bushes and rocks in the gaps.
  for (let i = 0; i < 2600; i += 1) {
    const x = random() * 3600;
    const y = random() * 2600;
    const b = biomeAt(terrain, x, y);
    if (b !== BIOME.GRASS && b !== BIOME.FOREST) continue;
    if (onPath(x, y) || nearBuilding(x, y) || !fits(x, y, 40)) continue;
    place(random() < 0.6 ? "bush" : "rock", x, y, 0.8 + random() * 0.4);
  }

  // Reeds on the sand, at the waterline.
  for (let i = 0; i < 1800; i += 1) {
    const x = random() * 3600;
    const y = random() * 2600;
    if (biomeAt(terrain, x, y) !== BIOME.SAND) continue;
    if (onPath(x, y) || !fits(x, y, 34)) continue;
    place("reed", x, y, 0.8 + random() * 0.4);
  }

  // Flowers and grass tufts: decoration only, never solid.
  for (let i = 0; i < 5200; i += 1) {
    const x = random() * 3600;
    const y = random() * 2600;
    const b = biomeAt(terrain, x, y);
    if (b !== BIOME.GRASS && b !== BIOME.FOREST) continue;
    if (onPath(x, y) || !fits(x, y, 16)) continue;
    place(random() < 0.3 ? "flower" : "tuft", x, y, 0.8 + random() * 0.45);
  }

  // Lamp posts down the main spokes — the island's night lighting.
  for (const path of PATHS.slice(0, 5)) {
    for (let i = 2; i < path.pts.length - 1; i += 3) {
      const a = path.pts[i];
      const b = path.pts[i + 1] ?? path.pts[i - 1];
      const nx = -(b.y - a.y);
      const ny = b.x - a.x;
      const len = Math.hypot(nx, ny) || 1;
      const off = path.width * 0.72;
      const side = i % 6 === 2 ? 1 : -1;
      place("lamp", a.x + (nx / len) * off * side, a.y + (ny / len) * off * side, 1);
    }
  }

  // Collision: buildings block, and so does anything with a trunk.
  for (const p of PLACES) {
    const f = footprint(p);
    blockRect(terrain, f.x, f.y, f.w, f.h);
  }
  for (const prop of props) {
    if (prop.kind === "tree" || prop.kind === "pine") blockCircle(terrain, prop.x, prop.y, 15 * prop.s);
    else if (prop.kind === "rock") blockCircle(terrain, prop.x, prop.y, 13 * prop.s);
    else if (prop.kind === "lamp") blockCircle(terrain, prop.x, prop.y, 7);
  }
  // The fountain in the middle of the plaza.
  blockCircle(terrain, PLAZA.x, PLAZA.y, 46);

  return props;
}

/** Props bucketed by a coarse grid, so drawing only touches what's on screen. */
export function bucketProps(props: Prop[]) {
  const map = new Map<string, Prop[]>();
  for (const p of props) {
    const key = `${Math.floor(p.x / 240)}:${Math.floor(p.y / 240)}`;
    const list = map.get(key);
    if (list) list.push(p);
    else map.set(key, [p]);
  }
  return map;
}
