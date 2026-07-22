import { useCallback, useMemo, useState } from 'react';
import type { LiquidVariable } from './types';

/** Whether the caret context expects a variable name or a filter name. */
export type AutocompleteKind = 'variable' | 'filter';

export interface AutocompleteContext {
  /** Variable position (value slot) vs filter position (right after a `|`). */
  kind: AutocompleteKind;
  /** The identifier prefix already typed (may be empty). */
  query: string;
  /** Index in the value where the current word starts. */
  wordStart: number;
}

const IDENT_CHAR = /[A-Za-z0-9_]/;
// #304: the QUERY walk includes dots so a dotted code ("event.type") matches
// while the user types past the root. Only the walk-back + validity check
// use it — tokenization/filter detection are unaffected.
const QUERY_CHAR = /[A-Za-z0-9_.]/;

/**
 * Inspect the value + caret and decide if/what to autocomplete. Returns null
 * when the caret is not inside an open `{{ }}` / `{% %}` (no intervening close).
 *
 * @param value The full editor source.
 * @param caret The caret index (`selectionStart`).
 */
export function getAutocompleteContext(value: string, caret: number): AutocompleteContext | null {
  // Find the nearest opener before the caret.
  const open = Math.max(value.lastIndexOf('{{', caret - 1), value.lastIndexOf('{%', caret - 1));
  if (open === -1) return null;
  // If a close occurs between the opener and the caret, we're outside.
  const closeBetween = Math.max(
    value.lastIndexOf('}}', caret - 1),
    value.lastIndexOf('%}', caret - 1),
  );
  if (closeBetween > open) return null;

  // Walk back from the caret over identifier chars to get the current word.
  let wordStart = caret;
  while (wordStart > open + 2 && QUERY_CHAR.test(value[wordStart - 1])) wordStart -= 1;
  const query = value.slice(wordStart, caret);
  if (/[^A-Za-z0-9_.]/.test(query)) return null;

  // Look back (skipping spaces) for a `|` → filter context.
  let j = wordStart - 1;
  while (j > open && value[j] === ' ') j -= 1;
  const kind: AutocompleteKind = value[j] === '|' ? 'filter' : 'variable';

  return { kind, query, wordStart };
}

/**
 * Replace the word at `ctx.wordStart` (up to the caret) with `completion`.
 *
 * @returns The next value and the caret position after the inserted completion.
 */
export function applyCompletion(
  value: string,
  caret: number,
  ctx: { wordStart: number; query: string },
  completion: string,
): { value: string; caret: number } {
  const before = value.slice(0, ctx.wordStart);
  const after = value.slice(caret);
  const next = before + completion + after;
  return { value: next, caret: before.length + completion.length };
}

export interface AutocompleteItem {
  /** The text inserted on accept. */
  value: string;
  /** Display label. */
  label: string;
  /** Optional type tag (variables only). */
  type?: string;
  /** Optional group header (variables only). */
  group?: string;
}

export interface UseLiquidAutocompleteArgs {
  /** Variables offered in value position. */
  variables: LiquidVariable[];
  /** Filter names offered after a `|`. */
  filters: readonly string[];
  /** Gate the menu off entirely (read-only / disabled editors). */
  enabled: boolean;
}

export interface AutocompleteState {
  /** Whether the listbox should be shown. */
  open: boolean;
  /** The filtered suggestions for the current context. */
  items: AutocompleteItem[];
  /** Index of the highlighted suggestion. */
  activeIndex: number;
  /** The caret context that produced `items` (null when closed). */
  context: AutocompleteContext | null;
}

/**
 * Stateful autocomplete controller. `recompute(value, caret)` is called after
 * every edit / caret move; `move`, `close` drive keyboard handling. The
 * orchestrator reads `state.context` to apply a completion via
 * {@link applyCompletion}.
 *
 * @param args Variables, filter names, and an `enabled` gate.
 */
export function useLiquidAutocomplete({ variables, filters, enabled }: UseLiquidAutocompleteArgs) {
  const [state, setState] = useState<AutocompleteState>({
    open: false,
    items: [],
    activeIndex: 0,
    context: null,
  });

  const variableItems = useMemo<AutocompleteItem[]>(
    () =>
      variables.map((v) => ({
        value: v.code,
        label: v.label ?? v.code,
        type: v.type,
        group: v.group,
      })),
    [variables],
  );

  const recompute = useCallback(
    (value: string, caret: number) => {
      if (!enabled) {
        setState((s) => (s.open ? { ...s, open: false } : s));
        return;
      }
      const ctx = getAutocompleteContext(value, caret);
      if (!ctx) {
        setState((s) => (s.open ? { ...s, open: false, context: null } : s));
        return;
      }
      const q = ctx.query.toLowerCase();
      const items =
        ctx.kind === 'filter'
          ? filters
              .filter((f) => f.toLowerCase().startsWith(q))
              .map((f) => ({ value: f, label: f }))
          : variableItems.filter(
              (it) => it.value.toLowerCase().startsWith(q) || it.label.toLowerCase().startsWith(q),
            );
      setState({ open: items.length > 0, items, activeIndex: 0, context: ctx });
    },
    [enabled, filters, variableItems],
  );

  const move = useCallback((delta: number) => {
    setState((s) => {
      if (!s.open || s.items.length === 0) return s;
      const next = (s.activeIndex + delta + s.items.length) % s.items.length;
      return { ...s, activeIndex: next };
    });
  }, []);

  const close = useCallback(() => {
    setState((s) => (s.open ? { ...s, open: false } : s));
  }, []);

  return { state, recompute, move, close };
}
