import * as THREE from "three";

import { rail } from "@/lib/store/rail";
import { STATIONS } from "@/lib/stations";

/**
 * Each station has its own weather. The sky, the floor grid and the dust all
 * read from here, so the whole environment changes together as you travel —
 * a courtroom should not feel like a lobby.
 *
 * Indexed by station. Boot and home share the cold Quest-blue; JustiX turns
 * courtroom amber; the outro is a violet night.
 */
type Mood = { low: THREE.Color; high: THREE.Color; accent: THREE.Color };

const make = (low: string, high: string, accent: string): Mood => ({
  low: new THREE.Color(low),
  high: new THREE.Color(high),
  accent: new THREE.Color(accent),
});

export const MOODS: Mood[] = [
  make("#05070c", "#0b1226", "#2e7cf6"), // boot
  make("#060a16", "#0f2a44", "#3b8cff"), // home — indigo toward teal dawn
  make("#0d0707", "#3a1a12", "#f2a557"), // justix — courtroom amber
  make("#07050f", "#1e1140", "#9a7bff"), // outro — violet night
];

/** The blended mood at the current rail position. Writes into `out`. */
export function currentMood(out: Mood): Mood {
  const t = rail.progress * (STATIONS.length - 1);
  const i = Math.min(MOODS.length - 2, Math.max(0, Math.floor(t)));
  // Smoothstep so the change happens between stations, not on top of them.
  const f = t - i;
  const k = f * f * (3 - 2 * f);
  out.low.copy(MOODS[i].low).lerp(MOODS[i + 1].low, k);
  out.high.copy(MOODS[i].high).lerp(MOODS[i + 1].high, k);
  out.accent.copy(MOODS[i].accent).lerp(MOODS[i + 1].accent, k);
  return out;
}

export const makeMood = () => make("#000000", "#000000", "#000000");
