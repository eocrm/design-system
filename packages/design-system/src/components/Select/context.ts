import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import type { SelectOption, FlatRow } from './utils-types';

/**
 * Internal context published by `<Select>` to its subcomponents (Trigger,
 * Listbox, future ChipsInputTrigger, etc.). Not part of the public API —
 * all consumer-facing customization happens through `SelectProps`.
 *
 * The shape includes fields that some phases don't yet populate (e.g.
 * `loading`, `error`, render escape hatches, `onCreate`). Those are wired
 * in later phases; right now they're declared so subcomponents written
 * against the full interface don't need to grow new optional reads later.
 */
export interface SelectContextValue<T = unknown> {
  // ─── mode flags ───────────────────────────────────────────────────────────
  multiple: boolean;
  searchable: boolean;
  creatable: boolean;
  triggerDisplay: 'chips' | 'summary';

  // ─── data ─────────────────────────────────────────────────────────────────
  /**
   * Currently-rendered rows. When `searchable`, this is the filtered set;
   * otherwise identical to `allRows`. Phase 2 has no filter yet, so the
   * two are the same.
   */
  rows: FlatRow<T>[];
  /**
   * The full flattened option list, independent of any active query. Used
   * by chip-mode renderers to resolve labels for selected values that have
   * been filtered out of the visible list.
   */
  allRows: FlatRow<T>[];
  loading: boolean;
  error: Error | null;

  // ─── value ────────────────────────────────────────────────────────────────
  value: string | string[];
  setValue: (next: string | string[]) => void;
  toggleValue: (v: string) => void;

  // ─── open ─────────────────────────────────────────────────────────────────
  open: boolean;
  setOpen: (next: boolean) => void;

  // ─── active (keyboard cursor) ─────────────────────────────────────────────
  activeIndex: number;
  setActiveIndex: (i: number) => void;

  // ─── search (only meaningful when `searchable`) ───────────────────────────
  query: string;
  setQuery: (q: string) => void;

  // ─── ids ──────────────────────────────────────────────────────────────────
  listboxId: string;
  triggerId: string;
  getOptionId: (value: string) => string;
  getGroupHeaderId: (label: string) => string;

  // ─── refs ─────────────────────────────────────────────────────────────────
  triggerRef: RefObject<HTMLElement | null>;
  listboxRef: RefObject<HTMLDivElement | null>;

  // ─── imperative ───────────────────────────────────────────────────────────
  closeAndFocusTrigger: () => void;
  retry: () => void;

  // ─── render overrides + onCreate (populated in later phases) ──────────────
  onCreate?: (label: string) => void;
  renderOption?: (opt: SelectOption<T>, state: { active: boolean; selected: boolean }) => ReactNode;
  renderValue?: (opt: SelectOption<T>) => ReactNode;
  renderTag?: (opt: SelectOption<T>, remove: () => void) => ReactNode;
  renderEmpty?: (query: string) => ReactNode;
  renderLoading?: () => ReactNode;
  renderError?: (err: Error, retry: () => void) => ReactNode;
}

export const SelectContext = createContext<SelectContextValue | null>(null);

/**
 * Read the SelectContext. Throws when called outside a `<Select>` so a
 * misuse (e.g. rendering `<Trigger>` directly) fails loudly during dev.
 */
export function useSelectContext<T = unknown>(componentName: string): SelectContextValue<T> {
  const ctx = useContext(SelectContext);
  if (!ctx) {
    throw new Error(`<Select> internals (${componentName}) must be rendered inside <Select>.`);
  }
  return ctx as SelectContextValue<T>;
}
