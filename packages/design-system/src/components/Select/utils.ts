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

/**
 * Returns true if any option in `opts` has a label case-insensitively
 * matching `query` (after trim). Used by the creatable Select to decide
 * whether to render a "+ Create" row — when the typed query already
 * matches an existing label, the create row would be a no-op duplicate.
 *
 * The empty / whitespace-only query case returns `false` so the create
 * row never appears for blank input.
 */
export function hasExactLabelMatch<T>(opts: SelectOptions<T>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return false;
  if (!isGrouped(opts)) {
    return opts.some((o) => o.label.toLowerCase() === q);
  }
  for (const g of opts) {
    if (g.options.some((o) => o.label.toLowerCase() === q)) return true;
  }
  return false;
}

/**
 * Returns true if an option carries the internal `__create` sentinel on
 * its `data` payload. The sentinel is injected by `<Select>` when it
 * synthesises the "+ Create" row, and the listbox + Trigger keyboard
 * handlers branch on it to fire `onCreate` instead of the normal
 * select/toggle flow.
 */
export function isCreateRow<T>(opt: { data?: T }): boolean {
  return (
    typeof opt.data === 'object' &&
    opt.data !== null &&
    Object.prototype.hasOwnProperty.call(opt.data, '__create') &&
    (opt.data as { __create?: boolean }).__create === true
  );
}
