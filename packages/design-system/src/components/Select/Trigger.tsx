import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type MutableRefObject,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { useSelectContext } from './context';
import styles from './Select.module.scss';

export interface TriggerProps {
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
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
          if (ctx.multiple) {
            ctx.toggleValue(row.option.value);
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
  // Single: same `allRows` lookup as before — keeps the closed-state label
  // visible while the user is filtering in the open searchable variant
  // (which actually renders the combobox-input trigger, but symmetry here
  // is harmless and keeps the resolution logic in one place).
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
    if (typeof ctx.value !== 'string' || ctx.value === '') return '';
    const selRow = ctx.allRows.find(
      (r) => r.kind === 'option' && r.option.value === (ctx.value as string),
    );
    return selRow && selRow.kind === 'option' ? selRow.option.label : '';
  })();
  const hasValue = label !== '';

  const activeOptionId = useActiveOptionId();

  // When multi-summary text overflows it's truncated with CSS ellipsis,
  // so screen-reader users would miss the tail of the selection. Surface
  // the full comma-joined list via aria-label, but ONLY when the consumer
  // didn't pass their own aria-label — their string is authoritative.
  const computedAriaLabel = (() => {
    if (props['aria-label']) return props['aria-label'];
    if (ctx.multiple && label) return `Selected: ${label}`;
    return undefined;
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

  return (
    <button
      type="button"
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
        <span>{label}</span>
      ) : (
        <span className={styles.placeholder}>{props.placeholder ?? ''}</span>
      )}
    </button>
  );
}

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
  const selectedLabel = useMemo(() => {
    if (ctx.multiple) return '';
    if (typeof ctx.value !== 'string' || ctx.value === '') return '';
    const row = ctx.allRows.find((r) => r.kind === 'option' && r.option.value === ctx.value);
    return row && row.kind === 'option' ? row.option.label : '';
  }, [ctx.multiple, ctx.value, ctx.allRows]);

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

  return (
    <input
      type="text"
      id={ctx.triggerId}
      ref={(node) => {
        inputRefHolder.current = node;
      }}
      className={clsx(styles.trigger, styles.triggerInput, !selectedLabel && styles.placeholder)}
      role="combobox"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      aria-controls={ctx.open ? ctx.listboxId : undefined}
      aria-activedescendant={activeOptionId}
      aria-label={props['aria-label']}
      aria-labelledby={props['aria-labelledby']}
      aria-describedby={props['aria-describedby']}
      aria-invalid={props.invalid || undefined}
      aria-readonly={props.readOnly || undefined}
      autoComplete="off"
      spellCheck={false}
      disabled={props.disabled}
      readOnly={props.readOnly}
      value={displayValue}
      placeholder={selectedLabel === '' ? props.placeholder : undefined}
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
 *  - `single + !searchable` → `ButtonTrigger`
 *  - `single + searchable`  → `ComboboxInputTrigger`
 *  - `multi`                → `ButtonTrigger` for now; replaced by
 *                              `SummaryTrigger` / `ChipsInputTrigger` in
 *                              Phase 5 / 6.
 */
export function Trigger(props: TriggerProps) {
  const ctx = useSelectContext('Trigger');
  if (!ctx.multiple && ctx.searchable) {
    return <ComboboxInputTrigger {...props} />;
  }
  // Multi-chips trigger lands in Phase 6; until then, multi always uses
  // ButtonTrigger which now renders comma-joined summary labels.
  return <ButtonTrigger {...props} />;
}
