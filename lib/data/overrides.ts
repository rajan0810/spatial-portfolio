/**
 * Applies the inspector's runtime edits on top of a data record.
 *
 * Overrides are shallow: a field edited in the inspector replaces the whole
 * field (a tech group array, a links array, a string). Nothing is validated
 * beyond type, because nothing is saved — this is the editor's scratch state,
 * and it disappears on reload exactly as unsaved changes should.
 */
export function withOverrides<T extends object>(base: T, overrides?: Record<string, unknown>): T {
  if (!overrides) return base;
  const next = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overrides)) {
    if (key in next && value !== undefined) next[key] = value;
  }
  return next as T;
}
