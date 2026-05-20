import type { SelectGroup, SelectOption, SelectOptions } from './Select';

/**
 * Discriminator for `SelectOptions`: returns `true` when the input is a
 * `SelectGroup[]` (i.e. the first element exposes an `options` array),
 * `false` for a flat `SelectOption[]` and for an empty list.
 *
 * Mixing groups and flat options at the same level is not supported;
 * only the first element is inspected.
 */
export function isGrouped<T>(opts: SelectOptions<T>): opts is SelectGroup<T>[] {
  if (opts.length === 0) return false;
  const first = opts[0] as SelectOption<T> | SelectGroup<T>;
  return Array.isArray((first as SelectGroup<T>).options);
}

/**
 * One row in the flattened render list — either a non-selectable group
 * header or a selectable option. `groupLabel` is set on option rows when
 * they belong to a group, so the renderer can group them visually or in
 * `aria-` attributes without re-walking the original tree.
 */
export type FlatRow<T = unknown> =
  | { kind: 'header'; label: string }
  | { kind: 'option'; option: SelectOption<T>; groupLabel?: string };

/**
 * Walk `SelectOptions` into a flat array of render rows.
 *
 * - Flat input → one `'option'` row per option (no `groupLabel`).
 * - Grouped input → for each group: one `'header'` row then one
 *   `'option'` row per member (each tagged with its `groupLabel`).
 */
export function flattenOptions<T>(opts: SelectOptions<T>): FlatRow<T>[] {
  if (!isGrouped(opts)) {
    return (opts as SelectOption<T>[]).map((option) => ({ kind: 'option', option }));
  }
  const rows: FlatRow<T>[] = [];
  for (const group of opts) {
    rows.push({ kind: 'header', label: group.label });
    for (const option of group.options) {
      rows.push({ kind: 'option', option, groupLabel: group.label });
    }
  }
  return rows;
}

/**
 * Find a single option by `value`. Walks groups when the input is
 * grouped. Returns `null` when no match exists.
 */
export function findOption<T>(opts: SelectOptions<T>, value: string): SelectOption<T> | null {
  if (isGrouped(opts)) {
    for (const group of opts) {
      const hit = group.options.find((o) => o.value === value);
      if (hit) return hit;
    }
    return null;
  }
  return (opts as SelectOption<T>[]).find((o) => o.value === value) ?? null;
}

/**
 * Find every option whose `value` appears in `values`. The returned
 * array preserves the order of options in `opts` (NOT the order of the
 * `values` argument), and values with no match are skipped silently —
 * the result contains no nulls and no duplicates beyond what's in `opts`.
 */
export function findOptions<T>(opts: SelectOptions<T>, values: string[]): SelectOption<T>[] {
  if (values.length === 0) return [];
  const wanted = new Set(values);
  const out: SelectOption<T>[] = [];
  if (isGrouped(opts)) {
    for (const group of opts) {
      for (const option of group.options) {
        if (wanted.has(option.value)) out.push(option);
      }
    }
    return out;
  }
  for (const option of opts as SelectOption<T>[]) {
    if (wanted.has(option.value)) out.push(option);
  }
  return out;
}
