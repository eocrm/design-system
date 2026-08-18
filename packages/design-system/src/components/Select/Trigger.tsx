import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type MutableRefObject,
  type PointerEvent,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { useSelectContext } from './context';
import { Chip } from './Chip';
import type { SelectOption } from './Select';
import type { FlatRow } from './utils';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './Select.module.scss';

export interface TriggerProps {
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  /** Select the combobox text on open (single searchable trigger only). */
  selectOnOpen?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-required'?: boolean | 'true' | 'false';
}

// ────────────────────────────────────────────────────────────────────────────
// ClearButton — the trailing ✕ rendered inside the trigger when
// `effectiveClearable` is true AND a value is set. Wired by every variant.
//
// Wired as a real `<button>` so screen readers announce a focusable
// "Clear selection" action. `stopPropagation` on both pointerdown + click
// keeps the parent trigger's own toggle handler from firing (clicking ✕
// must NOT also open or close the listbox), and the explicit
// `setValue('')` / `setValue([])` path bypasses `toggleValue` so a
// multi-select wipe is one event, not N.
//
// `tabIndex={0}` (not `-1`) — the clear button MUST be reachable by
// keyboard for accessibility. The default Tab order takes the user from
// the trigger to ✕ and then on to the next focusable element on the page;
// Enter/Space on the focused ✕ activates the native button's `onClick` so
// no extra keyboard handler is needed.
// ────────────────────────────────────────────────────────────────────────────
function ClearButton({ variant }: { variant: 'overlay' | 'inline' }) {
  const ctx = useSelectContext('Trigger.ClearButton');
  const t = useTranslation();
  return (
    <button
      type="button"
      tabIndex={0}
      className={clsx(styles.clearButton, variant === 'inline' && styles.clearButtonInline)}
      aria-label={t('select.clear')}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (ctx.multiple) {
          ctx.setValue([]);
        } else {
          ctx.setValue('');
        }
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </button>
  );
}

/**
 * Helper: would pressing "clear" change anything?
 *
 * Deliberately value-shaped, not lookup-shaped: clearing resets the Select
 * to the empty value (`''` / `[]`), so the ✕ is only useful when the current
 * value differs from that. A consumer who models "no explicit choice" as a
 * real `value: ''` option (issue #470) is already sitting on the cleared
 * value — there is nothing for ✕ to do, and it stays hidden.
 */
function selectHasValue(value: string | string[], multiple: boolean): boolean {
  return multiple
    ? Array.isArray(value) && value.length > 0
    : typeof value === 'string' && value !== '';
}

/**
 * Resolve the selected option in single mode by looking `value` up in the
 * supplied rows — never by treating `''` as "nothing selected" (issue #470).
 *
 * `''` is a legitimate option value: a common shape is one sentinel row
 * ("Use the default scheme", `value: ''`) plus N real catalog ids. Such a
 * row must render in the closed trigger exactly like any other option.
 * "Nothing selected" is then simply "no row carries this value" — which is
 * what an untouched Select (whose value is `''` with no `''` option in the
 * list) resolves to anyway.
 *
 * Always searches `allRows`, never the query-filtered `rows`: the closed
 * trigger must keep showing the selected label while the user filters the
 * open searchable listbox down to something else.
 *
 * Returns `null` in multi mode, for a non-string value, or when no row
 * matches (e.g. a stale value no longer present in `options`).
 */
function findSelectedOption(
  allRows: readonly FlatRow<unknown>[],
  value: string | string[],
  multiple: boolean,
): SelectOption<unknown> | null {
  if (multiple || typeof value !== 'string') return null;
  const row = allRows.find((r) => r.kind === 'option' && r.option.value === value);
  return row && row.kind === 'option' ? row.option : null;
}

// ────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Computes the `aria-activedescendant` value for whichever trigger is
 * currently mounted. Returns `undefined` when the listbox is closed,
 * when the active row is a group header, or when no row is active —
 * those states must omit the attribute entirely rather than dangling
 * a stale id (screen readers will announce a non-existent element).
 */
function useActiveOptionId(): string | undefined {
  const ctx = useSelectContext('Trigger');
  if (!ctx.open || ctx.activeIndex < 0) return undefined;
  const row = ctx.rows[ctx.activeIndex];
  if (!row || row.kind !== 'option') return undefined;
  return ctx.getOptionId(row.option.value);
}

/**
 * Shared keyboard navigation hook for both trigger variants.
 *
 * Returns `handleNavKey(e)` which:
 *  - Returns `true` if the key was a navigation key the trigger handled
 *    (caller should NOT continue to its own variant-specific branch).
 *  - Returns `false` for keys this hook doesn't own — Tab, printable
 *    chars, anything not in the WAI-ARIA combobox navigation contract —
 *    so the caller can layer its own behaviour (typeahead for the button
 *    variant, query updates for the combobox-input variant).
 *
 * Tab returns `false` (and does NOT preventDefault) so the browser
 * continues normal tab traversal after the side-effect of closing
 * the popover.
 */
function useTriggerKeyboard(opts: { disabled?: boolean; readOnly?: boolean }) {
  const ctx = useSelectContext('Trigger');

  // Recompute on every render — these are cheap O(n) walks and depending
  // on stable identity here means memoising over `ctx.rows`, which already
  // re-creates per render of `<Select>`.
  const firstSelectableIdx = ctx.rows.findIndex((r) => r.kind === 'option' && !r.option.disabled);
  const lastSelectableIdx = (() => {
    for (let i = ctx.rows.length - 1; i >= 0; i--) {
      const r = ctx.rows[i];
      if (r.kind === 'option' && !r.option.disabled) return i;
    }
    return -1;
  })();

  // Cyclic step through rows skipping headers + disabled options.
  // `delta` of ±1 maps to ArrowDown/Up; PageDown/Up call this 5 times.
  const moveActive = useCallback(
    (delta: number) => {
      const { rows, activeIndex } = ctx;
      if (rows.length === 0) return;
      const len = rows.length;
      let i = activeIndex;
      for (let step = 0; step < len; step++) {
        i = (i + delta + len) % len;
        const r = rows[i];
        if (r.kind === 'option' && !r.option.disabled) {
          ctx.setActiveIndex(i);
          return;
        }
      }
    },
    [ctx],
  );

  // Typeahead state (only used by ButtonTrigger but lives here so the
  // hook owns its own timer cleanup).
  const typeaheadBufferRef = useRef('');
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
    };
  }, []);

  const stepTypeahead = useCallback(
    (char: string) => {
      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
      typeaheadBufferRef.current += char.toLowerCase();
      const buffer = typeaheadBufferRef.current;
      // When activeIndex is -1 (no current cursor — typeahead opening the menu
      // from the closed state), use -1 as the start so the `+1` first-char
      // offset lands on index 0 instead of skipping past it.
      const start = ctx.activeIndex >= 0 ? ctx.activeIndex : -1;
      const len = ctx.rows.length;
      for (let i = 0; i < len; i++) {
        const idx = (start + i + (buffer.length === 1 ? 1 : 0)) % len;
        const r = ctx.rows[idx];
        if (r.kind !== 'option' || r.option.disabled) continue;
        if (r.option.label.toLowerCase().startsWith(buffer)) {
          ctx.setActiveIndex(idx);
          break;
        }
      }
      typeaheadTimerRef.current = setTimeout(() => {
        typeaheadBufferRef.current = '';
      }, 500);
    },
    [ctx],
  );

  const handleNavKey = (e: KeyboardEvent<HTMLElement>): boolean => {
    if (opts.disabled || opts.readOnly) return false;

    if (!ctx.open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        ctx.setOpen(true);
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        ctx.setOpen(true);
        // Override the Listbox open-effect's "first selectable" pick in
        // a microtask so this runs after Listbox mounts and sets it.
        queueMicrotask(() => ctx.setActiveIndex(lastSelectableIdx));
        return true;
      }
      return false;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(+1);
        return true;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        return true;
      case 'Home':
        e.preventDefault();
        if (firstSelectableIdx >= 0) ctx.setActiveIndex(firstSelectableIdx);
        return true;
      case 'End':
        e.preventDefault();
        if (lastSelectableIdx >= 0) ctx.setActiveIndex(lastSelectableIdx);
        return true;
      case 'PageDown':
        e.preventDefault();
        for (let step = 0; step < 5; step++) moveActive(+1);
        return true;
      case 'PageUp':
        e.preventDefault();
        for (let step = 0; step < 5; step++) moveActive(-1);
        return true;
      case 'Enter': {
        e.preventDefault();
        const row = ctx.rows[ctx.activeIndex];
        if (row && row.kind === 'option' && !row.option.disabled) {
          // Creatable: when the active row is the synthetic "+ Create"
          // row, fire `onCreate` and commit the new value. The sentinel
          // is `data.__create === true`; inline-detect it here rather
          // than importing `isCreateRow` to keep the keyboard handler
          // self-contained.
          if (
            typeof row.option.data === 'object' &&
            row.option.data !== null &&
            (row.option.data as { __create?: boolean }).__create
          ) {
            ctx.onCreate?.(row.option.label);
            if (ctx.multiple) {
              const next = [...((ctx.value as string[]) ?? []), row.option.value];
              ctx.setValue(next);
              if (ctx.searchable) ctx.setQuery('');
            } else {
              ctx.setValue(row.option.value);
              ctx.closeAndFocusTrigger();
            }
          } else if (ctx.multiple) {
            ctx.toggleValue(row.option.value);
            if (ctx.searchable) ctx.setQuery('');
          } else {
            ctx.setValue(row.option.value);
            ctx.closeAndFocusTrigger();
          }
        }
        return true;
      }
      case 'Escape':
        e.preventDefault();
        ctx.closeAndFocusTrigger();
        return true;
      case 'Tab':
        // No preventDefault — browser continues Tab traversal from the
        // (now-closed) trigger to the next focusable element. Return
        // false so the caller doesn't think it owns the keystroke.
        ctx.setOpen(false);
        return false;
      default:
        return false;
    }
  };

  return { handleNavKey, stepTypeahead, moveActive };
}

// ────────────────────────────────────────────────────────────────────────────
// ButtonTrigger — single, non-searchable; also the fallback for multi-mode
// before Phase 5/6 lands their dedicated triggers.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Button-styled trigger for the single, non-searchable Select mode.
 *
 * Owns the keyboard interaction for the closed-and-open lifecycle:
 *  - Closed: ArrowDown / Enter / Space open with the Listbox's default
 *    "first selectable" active row. ArrowUp opens and overrides the
 *    active row to the last selectable (via a microtask so it runs
 *    AFTER Listbox's open-effect picks the first one).
 *  - Open: ArrowUp/Down step through rows (skipping headers + disabled),
 *    Home/End jump to ends, PageUp/Down move ±5, Enter/Space commit the
 *    active option (single mode → close; multi → toggle), Escape closes
 *    without changing selection, Tab closes (no preventDefault — normal
 *    browser traversal continues).
 *
 * Printable chars (no modifier keys) drive the 500ms typeahead buffer —
 * mirrors the DropdownMenu pattern.
 */
function ButtonTrigger(props: TriggerProps) {
  const ctx = useSelectContext('Trigger');
  const t = useTranslation();
  const { handleNavKey, stepTypeahead } = useTriggerKeyboard({
    disabled: props.disabled,
    readOnly: props.readOnly,
  });

  // Resolve the visible label string for both single and multi modes.
  //
  // Multi: walk `ctx.allRows` (NOT `ctx.rows` which is filtered when
  // searchable) and comma-join the labels of every selected value so chip
  // labels don't drop out of the summary when the user types a filter
  // query that excludes them.
  //
  // Single: `allRows` lookup — keeps the closed-state label visible while
  // the user is filtering in the open searchable variant (which actually
  // renders the combobox-input trigger, but symmetry here is harmless and
  // keeps the resolution logic in one place).
  const selectedOption = findSelectedOption(ctx.allRows, ctx.value, ctx.multiple);
  const label = (() => {
    if (ctx.multiple) {
      const selectedValues = Array.isArray(ctx.value) ? ctx.value : [];
      if (selectedValues.length === 0) return '';
      const labels: string[] = [];
      for (const row of ctx.allRows) {
        if (row.kind === 'option' && selectedValues.includes(row.option.value)) {
          labels.push(row.option.label);
        }
      }
      return labels.join(', ');
    }
    return selectedOption?.label ?? '';
  })();
  // Derived from whether an option MATCHED, not from whether the resolved
  // label happens to be non-empty — a selected `value: ''` row (issue #470)
  // has a real label and must not render placeholder-styled.
  const hasValue = ctx.multiple ? label !== '' : selectedOption !== null;

  const activeOptionId = useActiveOptionId();

  // When multi-summary text overflows it's truncated with CSS ellipsis,
  // so screen-reader users would miss the tail of the selection. Surface
  // the full comma-joined list via aria-label, but ONLY when the consumer
  // didn't pass their own aria-label — their string is authoritative.
  const computedAriaLabel = (() => {
    if (props['aria-label']) return props['aria-label'];
    if (ctx.multiple && label) return t('select.selectedPrefix', { labels: label });
    return label || props.placeholder || undefined;
  })();

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (props.disabled || props.readOnly) return;

    // Nav keys (Arrow/Home/End/Page/Enter/Escape/Tab) — let the shared
    // hook handle. Returns true if it claimed the keystroke.
    if (handleNavKey(e)) return;

    // Space: same semantics as Enter (open-or-commit). The shared hook
    // doesn't claim Space because the combobox-input variant needs it
    // as a literal character in the query string.
    if (e.key === ' ') {
      e.preventDefault();
      if (!ctx.open) {
        ctx.setOpen(true);
        return;
      }
      const row = ctx.rows[ctx.activeIndex];
      if (row && row.kind === 'option' && !row.option.disabled) {
        if (ctx.multiple) {
          ctx.toggleValue(row.option.value);
        } else {
          ctx.setValue(row.option.value);
          ctx.closeAndFocusTrigger();
        }
      }
      return;
    }

    // Printable char (no modifiers) → typeahead. Opens the menu first if
    // closed so the user sees the highlighted option.
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (!ctx.open) ctx.setOpen(true);
      stepTypeahead(e.key);
    }
  };

  // Not `hasValue`: ✕ resets to the empty value, so it's shown when the
  // current value differs from that — including for a value with no
  // matching option (a stale id), which the user must still be able to
  // clear, and excluding a selected `value: ''` option, which already IS
  // the cleared state.
  const showClear = props.clearable && selectHasValue(ctx.value, ctx.multiple);

  // Resolve the visible label node. In single mode, `renderValue` (if
  // supplied) replaces the bare string with whatever the consumer returns.
  // Multi-summary deliberately stays as the comma-joined string — applying
  // `renderValue` to it would mean passing N options, which doesn't fit the
  // single-option signature; for richer multi labels use `renderTag` on
  // chips mode instead.
  //
  // The accessible-name computation falls back to the option label string,
  // not the rendered node, so screen readers still hear "Pending" even if
  // the consumer wraps it in decoration.
  const labelNode: React.ReactNode = (() => {
    // Gated on `hasValue`, not on `label` being truthy: an option may
    // legitimately carry an empty label, and gating the two on different
    // predicates would drop the placeholder styling while still rendering
    // placeholder text.
    if (!hasValue) return null;
    if (!ctx.multiple && ctx.renderValue && selectedOption) {
      return ctx.renderValue(selectedOption as SelectOption);
    }
    return label;
  })();

  return (
    <div ref={ctx.triggerRootRef as Ref<HTMLDivElement>} className={styles.triggerWrap}>
      <button
        type="button"
        role="combobox"
        id={ctx.triggerId}
        ref={ctx.triggerRef as Ref<HTMLButtonElement>}
        className={clsx(styles.trigger, styles.triggerButton, !hasValue && styles.placeholder)}
        aria-haspopup="listbox"
        aria-expanded={ctx.open}
        aria-controls={ctx.open ? ctx.listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-label={computedAriaLabel}
        aria-labelledby={props['aria-labelledby']}
        aria-describedby={props['aria-describedby']}
        aria-required={props['aria-required']}
        aria-invalid={props.invalid || undefined}
        aria-readonly={props.readOnly || undefined}
        disabled={props.disabled}
        onClick={() => {
          if (props.disabled || props.readOnly) return;
          ctx.setOpen(!ctx.open);
        }}
        onKeyDown={handleKeyDown}
      >
        {label ? (
          <span>{labelNode}</span>
        ) : (
          <span className={styles.placeholder}>{props.placeholder ?? ''}</span>
        )}
      </button>
      {showClear && <ClearButton variant="overlay" />}
      <span className={styles.chevron} aria-hidden="true">
        ▾
      </span>
    </div>
  );
}

// `renderValue` deliberately does NOT apply to the ComboboxInputTrigger
// variant: the input's `value` prop must be a string, but `renderValue`
// returns a ReactNode. Consumers using `searchable` who want decorated
// labels should look at non-searchable mode or compose at the option level.

// ────────────────────────────────────────────────────────────────────────────
// ComboboxInputTrigger — single + searchable (WAI-ARIA combobox 1.2
// "input as trigger" pattern). Headless UI Combobox shape: focusing the
// input does NOT auto-open; clicking the input opens; typing opens and
// filters; Escape reverts the query to the selected label.
// ────────────────────────────────────────────────────────────────────────────

function ComboboxInputTrigger(props: TriggerProps) {
  const ctx = useSelectContext('Trigger');
  const { handleNavKey } = useTriggerKeyboard({
    disabled: props.disabled,
    readOnly: props.readOnly,
  });

  // Resolve the selected label from `allRows` (NOT `rows`). When the user
  // types "arc" and the selected option "Pending" filters out of `rows`,
  // we still need its label as the closed-state display + Escape fallback.
  //
  // Lookup-driven, never `value === ''`-driven: a consumer's sentinel
  // `value: ''` option is a real selection and must display its label
  // (issue #470).
  const selectedOption = useMemo(
    () => findSelectedOption(ctx.allRows, ctx.value, ctx.multiple),
    [ctx.allRows, ctx.value, ctx.multiple],
  );
  const selectedLabel = selectedOption?.label ?? '';
  const hasSelection = selectedOption !== null;

  // Reset the query to '' whenever the listbox closes, so the next open
  // shows the full option list (instead of the stale filter) and the
  // input falls back to displaying the selected label.
  //
  // Depends only on `ctx.open` (not query / setQuery) — the goal is to
  // run exactly once per close transition; including `ctx.query` in the
  // deps would re-fire on every keystroke and wipe the user's input.
  useEffect(() => {
    if (!ctx.open) {
      ctx.setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.open]);

  // Display rules:
  //  - closed → always show the selected label (query is reset to '' by
  //    the effect below when `ctx.open` flips false).
  //  - open & query is empty → show the selected label as a "ghost"
  //    starting value. The first onChange will detect the user typing
  //    "over" this label and strip the prefix.
  //  - open & query is non-empty → show the live query.
  //
  // This mirrors Headless UI's Combobox where the selected label sits
  // in the input until the user starts editing, then is replaced.
  const displayValue = ctx.open && ctx.query !== '' ? ctx.query : selectedLabel;

  const activeOptionId = useActiveOptionId();

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (props.disabled || props.readOnly) return;
    // Nav keys (Arrow/Home/End/Page/Enter/Escape/Tab). Crucially we do
    // NOT layer typeahead on top — typing IS the filter mechanism here,
    // handled by `onChange` below. Space is a literal char in the query
    // and must reach the input's default `change` event, so the shared
    // hook deliberately doesn't claim it.
    handleNavKey(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (props.disabled || props.readOnly) return;
    let next = e.target.value;
    // When the input was sitting on the selected label (closed, or open
    // with an empty query), the browser's native key handling appends
    // the typed char — producing `"<selectedLabel><typed>"`. Strip the
    // prefix so the user's *intent* (replace, not append) wins.
    if (ctx.query === '' && selectedLabel !== '' && next.startsWith(selectedLabel)) {
      next = next.slice(selectedLabel.length);
    }
    if (!ctx.open) ctx.setOpen(true);
    ctx.setQuery(next);
  };

  // `ctx.triggerRef` is typed as `RefObject<HTMLElement | null>`. Cast at
  // the assignment site rather than widening the context shape; both
  // <button> and <input> are HTMLElement and the callers that read this
  // ref only need `.focus()` / `.contains()` which are on HTMLElement.
  const inputRefHolder = ctx.triggerRef as MutableRefObject<HTMLInputElement | null>;

  // On open, optionally select the visible text so the user can immediately
  // type to replace the selected label (type-to-search). Gated on an empty
  // query so opening BY TYPING (handleChange sets the query then opens) doesn't
  // re-select + clobber that first character — only the label-showing open
  // (click / keyboard) selects. Runs once per open transition.
  useEffect(() => {
    if (ctx.open && props.selectOnOpen && ctx.query === '') inputRefHolder.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.open]);

  const showClear = props.clearable && selectHasValue(ctx.value, ctx.multiple);

  return (
    <div ref={ctx.triggerRootRef as Ref<HTMLDivElement>} className={styles.triggerWrap}>
      <input
        type="text"
        id={ctx.triggerId}
        ref={(node) => {
          inputRefHolder.current = node;
        }}
        className={clsx(styles.trigger, styles.triggerInput, !hasSelection && styles.placeholder)}
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={ctx.open}
        aria-controls={ctx.open ? ctx.listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-label={props['aria-label']}
        aria-labelledby={props['aria-labelledby']}
        aria-describedby={props['aria-describedby']}
        aria-required={props['aria-required']}
        aria-invalid={props.invalid || undefined}
        aria-readonly={props.readOnly || undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={props.disabled}
        readOnly={props.readOnly}
        value={displayValue}
        placeholder={hasSelection ? undefined : props.placeholder}
        onClick={() => {
          if (props.disabled || props.readOnly) return;
          // Click opens but does NOT toggle — matches Headless UI Combobox
          // and avoids the surprising "click the focused input to close
          // it" behaviour.
          if (!ctx.open) ctx.setOpen(true);
        }}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {showClear && <ClearButton variant="overlay" />}
      <span className={styles.chevron} aria-hidden="true">
        ▾
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ChipsInputTrigger — multi + chips + searchable. Selected options render as
// removable chips alongside an inline `<input role="combobox">` that owns
// the live filter query. Backspace on an empty input removes the trailing
// chip (matches GitHub label picker, Material UI Autocomplete multiple,
// Headless UI tag inputs). Pattern reference: WAI-ARIA APG combobox + the
// de-facto tag-input convention.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Chips trigger with an inline `role="combobox"` input. Wrapper is a plain
 * `<div>` (no role) because the input IS the WAI-ARIA combobox; assigning
 * `role="button"` to the wrapper would create two competing focus targets.
 * The visual wrapper owns positioning and outside-click containment while
 * the input remains the semantic combobox and focus-restoration target.
 *
 * Backspace behaviour: removes the trailing chip ONLY when `ctx.query === ''`.
 * On non-empty input it falls through to the browser's native text-deletion.
 *
 * Enter behaviour: `useTriggerKeyboard.handleNavKey` toggles the active
 * option in multi mode but does NOT clear the query — we clear it here in
 * a microtask so the input is empty for the next pick. Listbox's option
 * click handler also clears the query for multi+searchable so mouse
 * selection follows the same UX.
 */
function ChipsInputTrigger(props: TriggerProps) {
  const ctx = useSelectContext('Trigger');
  const { handleNavKey } = useTriggerKeyboard({
    disabled: props.disabled,
    readOnly: props.readOnly,
  });
  const activeOptionId = useActiveOptionId();
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedValues = Array.isArray(ctx.value) ? (ctx.value as string[]) : [];
  // Walk `selectedValues` (selection order — `ctx.value` appends new picks
  // to the end via `useSelectState.toggleValue`) so the latest selected chip
  // renders last. Look options up from `allRows` so labels persist while
  // typing filters `rows` down. Synthetic `{value, label: value}` fallback
  // covers creatable values not yet in `allRows`.
  const optionByValue = new Map<string, SelectOption>();
  for (const row of ctx.allRows) {
    if (row.kind === 'option') optionByValue.set(row.option.value, row.option as SelectOption);
  }
  const selectedOptions: SelectOption[] = selectedValues.map(
    (v) => optionByValue.get(v) ?? { value: v, label: v },
  );

  const handleWrapperPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (props.disabled || props.readOnly) return;
    // Redirect any pointer landing on the wrapper itself (gap between
    // chips, padding area) into the input so the caret position stays
    // predictable. Don't steal events that already target the input —
    // the browser owns selection/caret placement there.
    if (e.target !== inputRef.current) {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  const handleWrapperClick = () => {
    if (props.disabled || props.readOnly) return;
    inputRef.current?.focus();
    if (!ctx.open) ctx.setOpen(true);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (props.disabled || props.readOnly) return;
    // Enter handling is layered: handleNavKey toggles in multi mode but
    // doesn't clear the query. Schedule the clear AFTER the toggle so the
    // input is empty for the next selection. Microtask + open-guard so we
    // don't blow away a query if the user pressed Enter while closed.
    if (e.key === 'Enter' && ctx.open) {
      queueMicrotask(() => ctx.setQuery(''));
    }
    if (handleNavKey(e)) return;
    // Backspace on empty input removes the trailing chip. On non-empty
    // input we DO NOT preventDefault — the browser handles char deletion.
    if (e.key === 'Backspace' && ctx.query === '' && selectedOptions.length > 0) {
      e.preventDefault();
      const last = selectedOptions[selectedOptions.length - 1];
      ctx.toggleValue(last.value);
    }
  };

  const inputRefHolder = ctx.triggerRef as MutableRefObject<HTMLInputElement | null>;

  return (
    <div
      ref={ctx.triggerRootRef as Ref<HTMLDivElement>}
      className={clsx(styles.trigger, styles.triggerChips, styles.triggerChipsInput)}
      onClick={handleWrapperClick}
      onPointerDown={handleWrapperPointerDown}
    >
      {selectedOptions.map((o) => {
        const remove = () => {
          if (props.disabled || props.readOnly) return;
          ctx.toggleValue(o.value);
          inputRef.current?.focus();
        };
        if (ctx.renderTag) {
          // Wrap in a keyed Fragment so React can track ordering. The
          // consumer owns the inner markup (click handlers, styling, etc.).
          return <span key={o.value}>{ctx.renderTag(o, remove)}</span>;
        }
        return <Chip key={o.value} label={o.label} disabled={props.disabled} onRemove={remove} />;
      })}
      <input
        ref={(node) => {
          inputRef.current = node;
          inputRefHolder.current = node;
        }}
        type="text"
        id={ctx.triggerId}
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={ctx.open}
        aria-controls={ctx.open ? ctx.listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-label={props['aria-label']}
        aria-labelledby={props['aria-labelledby']}
        aria-describedby={props['aria-describedby']}
        aria-required={props['aria-required']}
        aria-invalid={props.invalid || undefined}
        disabled={props.disabled}
        readOnly={props.readOnly}
        autoComplete="off"
        spellCheck={false}
        className={styles.chipsInput}
        placeholder={selectedOptions.length === 0 ? props.placeholder : undefined}
        value={ctx.query}
        onChange={(e) => {
          if (!ctx.open) ctx.setOpen(true);
          ctx.setQuery(e.target.value);
        }}
        onKeyDown={handleInputKeyDown}
      />
      {props.clearable && selectedOptions.length > 0 && <ClearButton variant="inline" />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ChipsButtonTrigger — multi + chips + !searchable. Renders selected options
// as removable inline chips around a read-only combobox input. The visual
// wrapper is also the floating anchor and outside-click boundary.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Chips trigger for multi-select without inline search. A dedicated read-only
 * input owns combobox semantics and keyboard focus so chip remove buttons are
 * siblings rather than descendants of the combobox. Chip resolution walks
 * `ctx.allRows`, not `ctx.rows`, so the
 * chip list stays stable even if a future hover-search filters the
 * popover — unselected options never show as chips, but selected ones
 * never disappear.
 *
 * Keyboard:
 *  - Closed: ArrowDown/Up/Enter open via the shared hook; printable chars
 *    open + start typeahead; Space opens.
 *  - Open: shared hook owns Arrow/Home/End/PageUp/Down/Enter/Escape/Tab.
 *    Enter toggles the active option without closing (multi semantics).
 *  - Backspace is NOT bound here (no input to detect emptiness against);
 *    the searchable variant handles it.
 */
function ChipsButtonTrigger(props: TriggerProps) {
  const ctx = useSelectContext('Trigger');
  const { handleNavKey, stepTypeahead } = useTriggerKeyboard({
    disabled: props.disabled,
    readOnly: props.readOnly,
  });
  const t = useTranslation();
  const activeOptionId = useActiveOptionId();

  const selectedValues = Array.isArray(ctx.value) ? (ctx.value as string[]) : [];
  // Walk `selectedValues` (selection order — `ctx.value` appends new picks
  // to the end via `useSelectState.toggleValue`) so the latest selected chip
  // renders last. Look options up from `allRows` so labels persist while
  // searching. Synthetic `{value, label: value}` fallback covers creatable
  // values not yet in `allRows`.
  const optionByValue = new Map<string, SelectOption>();
  for (const row of ctx.allRows) {
    if (row.kind === 'option') optionByValue.set(row.option.value, row.option as SelectOption);
  }
  const selectedOptions: SelectOption[] = selectedValues.map(
    (v) => optionByValue.get(v) ?? { value: v, label: v },
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (props.disabled || props.readOnly) return;
    if (handleNavKey(e)) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (!ctx.open) ctx.setOpen(true);
      return;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (!ctx.open) ctx.setOpen(true);
      stepTypeahead(e.key);
    }
  };

  // Mirrors ButtonTrigger's computedAriaLabel pattern: consumer's
  // aria-label wins; otherwise synthesize from selections so screen
  // readers hear the full list even when chips overflow visually.
  const labelForAria = selectedOptions.map((o) => o.label).join(', ');
  const computedAriaLabel =
    props['aria-label'] ??
    (selectedOptions.length > 0
      ? t('select.selectedPrefix', { labels: labelForAria })
      : t('select.openSelect'));

  const handleWrapperClick = () => {
    if (props.disabled || props.readOnly) return;
    ctx.triggerRef.current?.focus();
    ctx.setOpen(!ctx.open);
  };

  return (
    <div
      ref={ctx.triggerRootRef as Ref<HTMLDivElement>}
      className={clsx(styles.trigger, styles.triggerChips)}
      onClick={handleWrapperClick}
    >
      {selectedOptions.map((o) => {
        const remove = () => {
          if (props.disabled || props.readOnly) return;
          ctx.toggleValue(o.value);
        };
        if (ctx.renderTag) {
          return <span key={o.value}>{ctx.renderTag(o, remove)}</span>;
        }
        return <Chip key={o.value} label={o.label} disabled={props.disabled} onRemove={remove} />;
      })}
      {selectedOptions.length === 0 && (
        <span aria-hidden="true" className={styles.placeholder}>
          {props.placeholder ?? ''}
        </span>
      )}
      <input
        ref={ctx.triggerRef as Ref<HTMLInputElement>}
        id={ctx.triggerId}
        type="text"
        role="combobox"
        readOnly
        tabIndex={props.disabled ? -1 : 0}
        className={styles.chipsInput}
        aria-haspopup="listbox"
        aria-expanded={ctx.open}
        aria-controls={ctx.open ? ctx.listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-label={computedAriaLabel}
        aria-labelledby={props['aria-labelledby']}
        aria-describedby={props['aria-describedby']}
        aria-required={props['aria-required']}
        aria-invalid={props.invalid || undefined}
        aria-readonly={props.readOnly || undefined}
        aria-disabled={props.disabled || undefined}
        value=""
        onChange={() => undefined}
        onKeyDown={handleKeyDown}
      />
      {props.clearable && selectedOptions.length > 0 && <ClearButton variant="inline" />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Dispatcher — picks the variant based on context flags. The public
// `Trigger` export is what `<Select>` renders; the variants stay module-
// local so the future Phase 5/6 multi-mode variants slot in here too.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Internal dispatcher rendered by `<Select>`. Routes to the appropriate
 * trigger variant based on mode flags from context.
 *
 *  - `single + !searchable`            → `ButtonTrigger`
 *  - `single + searchable`             → `ComboboxInputTrigger`
 *  - `multi + chips + !searchable`     → `ChipsButtonTrigger`
 *  - `multi + chips + searchable`      → `ChipsInputTrigger` (Phase 6 task 15)
 *  - `multi + summary` (both forms)    → `ButtonTrigger` w/ comma-joined labels
 */
export function Trigger(props: TriggerProps) {
  const ctx = useSelectContext('Trigger');
  if (!ctx.multiple && ctx.searchable) {
    return <ComboboxInputTrigger {...props} />;
  }
  if (ctx.multiple && ctx.triggerDisplay === 'chips') {
    return ctx.searchable ? <ChipsInputTrigger {...props} /> : <ChipsButtonTrigger {...props} />;
  }
  // Multi-summary (both searchable + non-searchable) renders as the
  // comma-joined select-only combobox trigger.
  return <ButtonTrigger {...props} />;
}
