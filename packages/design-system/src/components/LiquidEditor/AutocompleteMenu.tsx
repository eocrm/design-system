import { useEffect, useMemo, useRef } from 'react';
import { useFloatingSurface } from '../_internal/overlay';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, flip, shift, offset } from '@floating-ui/react-dom';
import clsx from 'clsx';
import type { AutocompleteItem } from './useLiquidAutocomplete';
import { useTranslation } from '../../i18n';
import styles from './LiquidEditor.module.scss';

export interface AutocompleteMenuProps {
  /** Suggestions to render. */
  items: AutocompleteItem[];
  /** Index of the highlighted suggestion (driven by the textarea's keyboard handling). */
  activeIndex: number;
  /** Caret rect (viewport coords) the menu anchors to. */
  anchorRect: { top: number; left: number; height: number; width: number };
  /** Id shared with the textarea's `aria-controls` / `aria-activedescendant`. */
  listboxId: string;
  /** Called when a suggestion is picked with the mouse. */
  onSelect: (item: AutocompleteItem, index: number) => void;
}

/**
 * The floating combobox listbox. Anchored to a virtual element built from the
 * caret rect. Mouse interactions select; keyboard is handled by the textarea
 * (which owns focus) via `aria-activedescendant`.
 */
export function AutocompleteMenu({
  items,
  activeIndex,
  anchorRect,
  listboxId,
  onSelect,
}: AutocompleteMenuProps) {
  // #274: mounted only while open — register as a floating surface so
  // Modal/Drawer/Lightbox yield Escape to us (our own Escape handling closes
  // us; without registration one press would close the host too).
  useFloatingSurface(true);
  const t = useTranslation();

  // A Floating UI virtual element: only `getBoundingClientRect` is required.
  const virtualRef = useMemo(
    () => ({
      getBoundingClientRect: () => ({
        x: anchorRect.left,
        y: anchorRect.top,
        top: anchorRect.top,
        left: anchorRect.left,
        right: anchorRect.left + anchorRect.width,
        bottom: anchorRect.top + anchorRect.height,
        width: anchorRect.width,
        height: anchorRect.height,
      }),
    }),
    [anchorRect],
  );

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    // `fixed` + viewport-coord anchor + portal to <body> so the menu escapes the
    // editor's `overflow: hidden` and any positioned/scrolled ancestor (Drawer,
    // Modal). Mirrors how DropdownMenu / Popover / Tooltip position themselves.
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip(), shift({ padding: 4 })],
    elements: { reference: virtualRef },
  });

  // Keep the keyboard-active option scrolled into view inside the menu's
  // (max-height, overflow-y:auto) box — arrow-key nav must not move the
  // highlight off-screen. Focus stays on the textarea, so we scroll manually.
  const activeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  // Precompute group-header flags before render (no mutation during the map —
  // keeps the render pure under StrictMode double-invocation). A header shows
  // when an item's group differs from the previous item's.
  const showGroupAt = items.map(
    (item, idx) => item.group !== undefined && item.group !== items[idx - 1]?.group,
  );

  return createPortal(
    <ul
      ref={refs.setFloating}
      id={listboxId}
      role="listbox"
      aria-label={t('liquidEditor.suggestions')}
      className={styles.menu}
      style={floatingStyles}
    >
      {items.map((item, idx) => {
        const showGroup = showGroupAt[idx];
        return (
          <li key={`${item.value}-${idx}`} role="presentation">
            {showGroup ? (
              <div className={styles.menuGroupLabel} role="presentation">
                {item.group}
              </div>
            ) : null}
            <div
              id={`${listboxId}-opt-${idx}`}
              ref={idx === activeIndex ? activeRef : undefined}
              role="option"
              aria-selected={idx === activeIndex}
              className={clsx(styles.menuItem, idx === activeIndex && styles.menuItemActive)}
              // Use onMouseDown (not onClick) so the textarea doesn't blur first.
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item, idx);
              }}
            >
              <span className={styles.menuItemMain}>
                <span>{item.label}</span>
                {item.description ? (
                  <span className={styles.menuItemDesc}>{item.description}</span>
                ) : null}
              </span>
              <span className={styles.menuItemTags}>
                {item.collection ? (
                  <span className={styles.menuItemType}>{t('liquidEditor.collectionTag')}</span>
                ) : null}
                {item.type ? <span className={styles.menuItemType}>{item.type}</span> : null}
              </span>
            </div>
          </li>
        );
      })}
    </ul>,
    document.body,
  );
}
