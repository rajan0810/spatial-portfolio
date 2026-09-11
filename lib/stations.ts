/**
 * The rail. Single source of truth shared by the WebGL scene (which places
 * objects in world space) and the DOM overlay (which places typography in
 * scroll space). Keeping one list is what stops the two layers from drifting
 * apart — the classic failure mode of scroll-driven 3D.
 */

export type StationId = "boot" | "home" | "justix" | "outro";

export type Station = {
  id: StationId;
  /** Announced to screen readers and shown in the station indicator. */
  label: string;
  /** World-space depth. The camera travels along -Z. */
  z: number;
};

/** Distance between stations in world units. */
export const STATION_SPACING = 14;

export const STATIONS: Station[] = [
  { id: "boot", label: "Boot", z: 0 },
  { id: "home", label: "Home", z: -STATION_SPACING },
  { id: "justix", label: "JustiX", z: -STATION_SPACING * 2 },
  { id: "outro", label: "Contact", z: -STATION_SPACING * 3 },
];

/** Total rail length in world units, used to map scroll progress → depth. */
export const RAIL_LENGTH = STATION_SPACING * (STATIONS.length - 1);

/** Scroll progress (0–1) at which a given station sits. */
export function stationProgress(index: number) {
  return index / (STATIONS.length - 1);
}

/** Nearest station index for a scroll progress value. */
export function nearestStation(progress: number) {
  const raw = progress * (STATIONS.length - 1);
  return Math.min(STATIONS.length - 1, Math.max(0, Math.round(raw)));
}

/**
 * 1 at the station's centre, falling to 0 by `falloff` stations away. Used to
 * fade panels and copy in and out so only the current station competes for
 * attention.
 */
export function stationWeight(progress: number, index: number, falloff = 0.7) {
  const distance = Math.abs(progress * (STATIONS.length - 1) - index);
  return Math.max(0, 1 - distance / falloff);
}
