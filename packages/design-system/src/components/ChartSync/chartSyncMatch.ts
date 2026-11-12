/** One synced moment: the publishing chart's id plus a category label and/or an x range `[from, to)`. */
export interface ChartSyncPoint {
  /** `useId` of the publishing chart; a chart ignores its own points. */
  source: string;
  /** Category label, for charts without `categoryValues`. */
  label?: string;
  /** Start of the x range, epoch ms for dates. */
  from?: number;
  /** End of the x range (exclusive); equal to `from` for a single point. */
  to?: number;
}

/** `categoryValues` as numbers, or `undefined` when absent or not one per category. */
export const valuesOf = (categories: string[], values?: (number | Date)[]) =>
  values && values.length === categories.length ? values.map(Number) : undefined;

/** What a category chart publishes for category `i`: its label and, with `categoryValues`, the bucket `[v_i, v_i+1)`. */
export function categoryPoint(
  i: number,
  categories: string[],
  categoryValues?: (number | Date)[],
): Omit<ChartSyncPoint, 'source'> {
  const v = valuesOf(categories, categoryValues);
  if (!v) return { label: categories[i] };
  // The last bucket reuses the previous step (zero-width for a single category).
  const to = i + 1 < v.length ? v[i + 1] : v[i] + (i > 0 ? v[i] - v[i - 1] : 0);
  return { label: categories[i], from: v[i], to };
}

/**
 * The category of a receiving chart that `p` points at, or `null`. With `categoryValues` it matches by value
 * (the bucket containing `p.from`); without, by exact label.
 */
export function matchCategory(
  p: ChartSyncPoint,
  categories: string[],
  categoryValues?: (number | Date)[],
): number | null {
  const v = valuesOf(categories, categoryValues);
  if (!v) {
    const i = p.label === undefined ? -1 : categories.indexOf(p.label);
    return i < 0 ? null : i;
  }
  if (p.from === undefined) return null;
  for (let i = 0; i < v.length; i++) {
    const { from, to } = categoryPoint(i, categories, v);
    if (p.from >= from! && (p.from < to! || p.from === from)) return i;
  }
  return null;
}
