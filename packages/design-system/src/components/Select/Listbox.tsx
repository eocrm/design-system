import { useEffect, useLayoutEffect, type ReactNode } from 'react';
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
import { useSelectContext, type SelectContextValue } from './context';
import { mergeRefs } from '../_internal/refs';
import type { SelectOption } from './utils-types';
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
      {(() => {
        // Walk the flat rows array, wrapping each header + its following
        // option rows in `<li role="group" aria-labelledby={headerId}>` so
        // the listbox exposes proper grouping semantics. The flat index
        // `i` is preserved across the wrapping — Trigger's keyboard logic
        // computes `aria-activedescendant` from it, so option rows inside
        // groups MUST keep the same index they would have had in the flat
        // map.
        const nodes: ReactNode[] = [];
        let i = 0;
        while (i < ctx.rows.length) {
          const row = ctx.rows[i];
          if (row.kind === 'header') {
            const headerLabel = row.label;
            const headerId = ctx.getGroupHeaderId(headerLabel);
            const groupChildren: ReactNode[] = [];
            // Non-focusable header row; `data-group-header` is the hook
            // grouped-options tests query against (avoids relying on the
            // hashed CSS-module class name).
            groupChildren.push(
              <li
                key={`h-${i}`}
                id={headerId}
                data-group-header=""
                className={styles.groupHeader}
              >
                {headerLabel}
              </li>,
            );
            let j = i + 1;
            while (j < ctx.rows.length && ctx.rows[j].kind === 'option') {
              const optRow = ctx.rows[j] as Extract<(typeof ctx.rows)[number], { kind: 'option' }>;
              const selected = ctx.multiple
                ? (ctx.value as string[]).includes(optRow.option.value)
                : ctx.value === optRow.option.value;
              const active = ctx.activeIndex === j;
              groupChildren.push(renderOptionRow(optRow.option, j, selected, active, ctx));
              j++;
            }
            nodes.push(
              <li role="group" key={`g-${i}`} aria-labelledby={headerId}>
                <ul role="none" className={styles.groupList}>
                  {groupChildren}
                </ul>
              </li>,
            );
            i = j;
            continue;
          }
          // Ungrouped (flat) option row.
          const optRow = row;
          const selected = ctx.multiple
            ? (ctx.value as string[]).includes(optRow.option.value)
            : ctx.value === optRow.option.value;
          const active = ctx.activeIndex === i;
          nodes.push(renderOptionRow(optRow.option, i, selected, active, ctx));
          i++;
        }
        return nodes;
      })()}
    </ul>,
    document.body,
  );
}

/**
 * Render one `<li role="option">` row. Extracted as a module-local helper
 * so the listbox loop can call it from two call sites — the in-group path
 * and the flat-options path — without duplicating the JSX.
 *
 * `i` is the flat index into `ctx.rows`; it MUST match the index Trigger's
 * keyboard handlers compute against, since `aria-activedescendant` and
 * `ctx.setActiveIndex` both key off it.
 */
function renderOptionRow<T>(
  opt: SelectOption<T>,
  i: number,
  selected: boolean,
  active: boolean,
  ctx: SelectContextValue<T>,
): ReactNode {
  return (
    <li
      key={opt.value}
      id={ctx.getOptionId(opt.value)}
      role="option"
      aria-selected={selected}
      aria-disabled={opt.disabled || undefined}
      className={clsx(
        styles.option,
        active && styles.optionActive,
        selected && styles.optionSelected,
        opt.disabled && styles.optionDisabled,
      )}
      onPointerDown={(e) => {
        // Stop the document-level outside-click pointerdown handler from
        // closing the listbox before the click resolves. The click handler
        // still fires and commits the selection.
        e.preventDefault();
      }}
      onClick={() => {
        if (opt.disabled) return;
        if (ctx.multiple) {
          ctx.toggleValue(opt.value);
        } else {
          ctx.setValue(opt.value);
          ctx.closeAndFocusTrigger();
        }
      }}
      onMouseEnter={() => {
        if (!opt.disabled) ctx.setActiveIndex(i);
      }}
    >
      {opt.label}
    </li>
  );
}
