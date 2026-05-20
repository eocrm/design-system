import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Select.module.scss';

/** Trigger height + type-scale step. Mirrors `<Input>`'s `size`. */
export type SelectSize = 'sm' | 'md' | 'lg';

/**
 * How multi-select renders the selected value(s) inside the trigger.
 * - `'chips'` — render one removable chip per value (the default).
 * - `'summary'` — render a single condensed string like "3 selected".
 */
export type SelectTriggerDisplay = 'chips' | 'summary';

/**
 * One row of selectable data.
 *
 * `value` is the identity that `onChange` emits and that `value` /
 * `defaultValue` reference. `label` is what the user sees and what
 * the substring filter searches against. `data` is an opaque payload
 * that flows through to `renderOption`, `renderValue`, and `renderTag`.
 */
export interface SelectOption<T = unknown> {
  /** Unique key. What `onChange` emits. */
  value: string;
  /** Displayed text. Used for substring search when `searchable` is on. */
  label: string;
  /** Optional secondary line shown under the label in default render. */
  description?: string;
  /** When true, the option is dimmed, `aria-disabled`, and skipped in keyboard nav. */
  disabled?: boolean;
  /** Arbitrary payload — surfaces in `renderOption`, `renderValue`, `renderTag`. */
  data?: T;
}

/**
 * A labelled bucket of options. Use grouped input when you want a header
 * row to appear above a chunk of options. Mixing flat options and groups
 * at the same level is not supported — the input must be all-flat or
 * all-grouped.
 */
export interface SelectGroup<T = unknown> {
  /** Header text shown above the group's options. */
  label: string;
  /** Members of the group. */
  options: SelectOption<T>[];
}

/**
 * Either a flat list of options or a list of groups, discriminated at
 * runtime by inspecting whether the first element has an `options` field.
 */
export type SelectOptions<T = unknown> = SelectOption<T>[] | SelectGroup<T>[];

export interface SelectProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Scaffold root for the Select component. Phase 1 only renders an empty
 * forwardRef'd `<div>` so the rest of the foundation work (types, utils,
 * state hook) can land before Trigger / Listbox / Content are wired in
 * Phase 2.
 */
export const Select = forwardRef<HTMLDivElement, SelectProps>(function Select(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-select="" className={clsx(styles.root, className)} {...props} />;
});
