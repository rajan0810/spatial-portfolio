import type { DropView } from "@/lib/data/drops";

/**
 * Strata: the pile dated by month.
 *
 * Tokens that landed in the same month rest at roughly the same depth, so a
 * band per month with a label at its upper edge turns the pile into a
 * readable cross-section. Computed from stored rest poses, not from the live
 * simulation, so every visitor sees the same geology.
 */
export type Stratum = { label: string; top: number; bottom: number; count: number };

export function strata(tokens: DropView[]): Stratum[] {
  const byMonth = new Map<string, { top: number; bottom: number; count: number; when: Date }>();
  for (const t of tokens) {
    if (!t.settled) continue;
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const band = byMonth.get(key) ?? { top: Infinity, bottom: -Infinity, count: 0, when: d };
    band.top = Math.min(band.top, t.y);
    band.bottom = Math.max(band.bottom, t.y);
    band.count += 1;
    byMonth.set(key, band);
  }
  return [...byMonth.values()]
    .sort((a, b) => a.top - b.top)
    .map((b) => ({
      label: b.when.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      top: b.top,
      bottom: b.bottom,
      count: b.count,
    }));
}
