import { useCallback, useEffect, useRef, type KeyboardEvent, type Ref } from 'react';
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
 * Phase 4 (searchable) and Phase 6 (chips) will introduce separate
 * trigger variants; this file stays scoped to the button.
 */
export function Trigger(props: TriggerProps) {
  const ctx = useSelectContext('Trigger');

  const selectedRow =
    !ctx.multiple && typeof ctx.value === 'string' && ctx.value !== ''
      ? ctx.allRows.find((r) => r.kind === 'option' && r.option.value === ctx.value)
      : null;
  const hasValue = selectedRow !== null && selectedRow !== undefined;
  const label = hasValue && selectedRow.kind === 'option' ? selectedRow.option.label : '';

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

  // Typeahead: 500ms buffer that resets on idle. Mirrors DropdownMenu's
  // pattern. Walks rows starting from `activeIndex + 1` on the first
  // char (so successive typing of the same letter cycles through
  // matches) and from `activeIndex` thereafter (so 'al' refines 'a'
  // without skipping the current candidate).
  const typeaheadBufferRef = useRef('');
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
    };
  }, []);

  const stepTypeahead = (char: string) => {
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
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (props.disabled || props.readOnly) return;

    if (!ctx.open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ctx.setOpen(true);
        // Listbox's open-effect sets active to first selectable; nothing
        // more to do here.
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        ctx.setOpen(true);
        // Override the open-effect's "first selectable" pick in a
        // microtask so this runs after the Listbox mounts and sets it.
        queueMicrotask(() => ctx.setActiveIndex(lastSelectableIdx));
        return;
      }
      // Typeahead-open: any printable char (no modifiers) opens the
      // listbox and seeds the typeahead buffer with that char.
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        ctx.setOpen(true);
        stepTypeahead(e.key);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(+1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        return;
      case 'Home':
        e.preventDefault();
        if (firstSelectableIdx >= 0) ctx.setActiveIndex(firstSelectableIdx);
        return;
      case 'End':
        e.preventDefault();
        if (lastSelectableIdx >= 0) ctx.setActiveIndex(lastSelectableIdx);
        return;
      case 'PageDown':
        e.preventDefault();
        for (let step = 0; step < 5; step++) moveActive(+1);
        return;
      case 'PageUp':
        e.preventDefault();
        for (let step = 0; step < 5; step++) moveActive(-1);
        return;
      case 'Enter':
      case ' ': {
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
        return;
      }
      case 'Escape':
        e.preventDefault();
        ctx.closeAndFocusTrigger();
        return;
      case 'Tab':
        // No preventDefault — browser continues Tab traversal from the
        // (now-closed) trigger to the next focusable element.
        ctx.setOpen(false);
        return;
      default: {
        // Printable char (single char, no modifier keys) → typeahead.
        // Sits after the explicit cases so Enter/Space/' ' etc. above
        // are handled first.
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          stepTypeahead(e.key);
        }
        return;
      }
    }
  };

  const activeRow = ctx.open && ctx.activeIndex >= 0 ? ctx.rows[ctx.activeIndex] : undefined;
  const activeOptionId =
    activeRow && activeRow.kind === 'option' ? ctx.getOptionId(activeRow.option.value) : undefined;

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
      aria-label={props['aria-label']}
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
      {label || props.placeholder || ''}
    </button>
  );
}
