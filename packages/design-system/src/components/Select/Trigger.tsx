import { useCallback, type KeyboardEvent, type Ref } from 'react';
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
      default:
        return;
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
