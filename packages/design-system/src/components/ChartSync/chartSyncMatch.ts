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

/** `categoryValues` usable for value matching: one per category. */
const usable = (categories: string[], values?: (number | Date)[]): values is (number | Date)[] =>
  !!values && values.length === categories.length;

/** Bucket `[v_i, v_i+1)` of category `i`; the last reuses the previous step (zero-width for one category). */
function bucket(v: (number | Date)[], i: number) {
  const from = Number(v[i]);
  const to = i + 1 < v.length ? Number(v[i + 1]) : from + (i > 0 ? from - Number(v[i - 1]) : 0);
  return { from, to };
}

/** What a category chart publishes for category `i`: its label and, with `categoryValues`, the bucket `[v_i, v_i+1)`. */
export function categoryPoint(
  i: number,
  categories: string[],
  categoryValues?: (number | Date)[],
): Omit<ChartSyncPoint, 'source'> {
  return usable(categories, categoryValues)
    ? { label: categories[i], ...bucket(categoryValues, i) }
    : { label: categories[i] };
}

/**
 * The category of a receiving chart that `p` points at, or `null`. With `categoryValues` (ascending) it matches by
 * value, the bucket containing `p.from` (binary search); without, by exact label.
 */
export function matchCategory(
  p: ChartSyncPoint,
  categories: string[],
  categoryValues?: (number | Date)[],
): number | null {
  if (!usable(categories, categoryValues)) {
    const i = p.label === undefined ? -1 : categories.indexOf(p.label);
    return i < 0 ? null : i;
  }
  const x = p.from;
  if (x === undefined || categoryValues.length === 0) return null;
  // Last category whose start is <= x.
  let lo = 0;
  let hi = categoryValues.length - 1;
  if (x < Number(categoryValues[0])) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (Number(categoryValues[mid]) <= x) lo = mid;
    else hi = mid - 1;
  }
  const { from, to } = bucket(categoryValues, lo);
  return x < to || x === from ? lo : null;
}
