import { useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size as floatingSize,
  useFloating,
} from '@floating-ui/react-dom';
import clsx from 'clsx';
import { useSelectContext } from './context';
import { mergeRefs } from '../_internal/refs';
import styles from './Select.module.scss';

/**
 * Portaled listbox panel. Positioned by Floating UI relative to the
 * trigger, dismissed on outside-click and Escape, restores active row
 * to the current selection (or first selectable) on open.
 *
 * Only mounted when `ctx.open` is true — there is no exit animation
 * because the node is unmounted. Click-to-select is wired here; the
 * keyboard handlers live on the Trigger so the trigger keeps focus
 * while the listbox is open (combobox / single-mode-button pattern).
 */
export function Listbox() {
  const ctx = useSelectContext('Listbox');

  const { refs, floatingStyles } = useFloating({
    open: ctx.open,
    placement: 'bottom-start',
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      // Match listbox width to trigger width and clamp height so a long
      // option list scrolls inside the panel instead of pushing the
      // viewport bounds.
      floatingSize({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: '320px',
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
    elements: { reference: ctx.triggerRef.current },
  });

  // Outside-click closes. Capture-phase pointerdown fires before any
  // focused widget's handlers, matching the Popover / DropdownMenu
  // patterns. Clicks on the trigger are excluded so its own toggle
  // handler isn't double-fired; clicks on the panel are excluded so
  // option clicks aren't swallowed (they also preventDefault on
  // pointerdown — belt-and-suspenders).
  useEffect(() => {
    if (!ctx.open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const panel = ctx.listboxRef.current;
      const trigger = ctx.triggerRef.current;
      if (panel && panel.contains(target)) return;
      if (trigger && trigger.contains(target)) return;
      ctx.setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [ctx.open, ctx.listboxRef, ctx.triggerRef, ctx.setOpen]);

  // Escape closes and returns focus to the trigger. Capture-phase so a
  // future in-panel input (Phase 5/6 search input) can't stop the event
  // before we see it.
  useEffect(() => {
    if (!ctx.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        ctx.closeAndFocusTrigger();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [ctx.open, ctx.closeAndFocusTrigger]);

  // On open: pre-highlight the current selection (if any), else the
  // first non-disabled option. Trigger's ArrowUp handler may override
  // this via a queueMicrotask to "last selectable" — that's fine, this
  // layout effect runs first and the microtask wins.
  // Only fires on the `ctx.open` transition; row changes mid-open don't
  // reset the cursor.
  useLayoutEffect(() => {
    if (!ctx.open) return;
    const firstSelectedIdx = ctx.rows.findIndex(
      (r) =>
        r.kind === 'option' &&
        !r.option.disabled &&
        (ctx.multiple
          ? (ctx.value as string[]).includes(r.option.value)
          : ctx.value === r.option.value),
    );
    if (firstSelectedIdx >= 0) {
      ctx.setActiveIndex(firstSelectedIdx);
      return;
    }
    const firstSelectableIdx = ctx.rows.findIndex((r) => r.kind === 'option' && !r.option.disabled);
    ctx.setActiveIndex(firstSelectableIdx >= 0 ? firstSelectableIdx : -1);
    // Intentionally only depends on `ctx.open`: this effect seeds the active
    // row on the open transition, and must NOT re-run when `ctx.rows` or
    // `ctx.value` shift mid-open (that would yank the cursor out from under
    // the user's keyboard / mouse navigation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.open]);

  return createPortal(
    <ul
      ref={mergeRefs<HTMLUListElement>(ctx.listboxRef, refs.setFloating)}
      id={ctx.listboxId}
      role="listbox"
      aria-multiselectable={ctx.multiple || undefined}
      aria-labelledby={ctx.triggerId}
      tabIndex={-1}
      className={clsx(styles.listbox)}
      style={floatingStyles}
    >
      {ctx.rows.map((row, i) => {
        if (row.kind === 'header') {
          return (
            <li
              key={`h-${i}`}
              id={ctx.getGroupHeaderId(row.label)}
              role="presentation"
              className={styles.groupHeader}
            >
              {row.label}
            </li>
          );
        }
        const selected = ctx.multiple
          ? (ctx.value as string[]).includes(row.option.value)
          : ctx.value === row.option.value;
        const active = ctx.activeIndex === i;
        return (
          <li
            key={row.option.value}
            id={ctx.getOptionId(row.option.value)}
            role="option"
            aria-selected={selected}
            aria-disabled={row.option.disabled || undefined}
            className={clsx(
              styles.option,
              active && styles.optionActive,
              selected && styles.optionSelected,
              row.option.disabled && styles.optionDisabled,
            )}
            onPointerDown={(e) => {
              // Stop the document-level outside-click pointerdown handler
              // from closing the listbox before the click resolves. The
              // click handler still fires and commits the selection.
              e.preventDefault();
            }}
            onClick={() => {
              if (row.option.disabled) return;
              if (ctx.multiple) {
                ctx.toggleValue(row.option.value);
              } else {
                ctx.setValue(row.option.value);
                ctx.closeAndFocusTrigger();
              }
            }}
            onMouseEnter={() => {
              if (!row.option.disabled) ctx.setActiveIndex(i);
            }}
          >
            {row.option.label}
          </li>
        );
      })}
    </ul>,
    document.body,
  );
}
