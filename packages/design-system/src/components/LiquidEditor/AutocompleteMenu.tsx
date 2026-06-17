import { useMemo } from 'react';
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
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip(), shift({ padding: 4 })],
    elements: { reference: virtualRef },
  });

  // Render grouped: consecutive items sharing a group get one header.
  let lastGroup: string | undefined;

  return (
    <ul
      ref={refs.setFloating}
      id={listboxId}
      role="listbox"
      aria-label={t('liquidEditor.suggestions')}
      className={styles.menu}
      style={floatingStyles}
    >
      {items.map((item, idx) => {
        const showGroup = item.group !== undefined && item.group !== lastGroup;
        lastGroup = item.group;
        return (
          <li key={`${item.value}-${idx}`} role="presentation">
            {showGroup ? (
              <div className={styles.menuGroupLabel} role="presentation">
                {item.group}
              </div>
            ) : null}
            <div
              id={`${listboxId}-opt-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              className={clsx(styles.menuItem, idx === activeIndex && styles.menuItemActive)}
              // Use onMouseDown (not onClick) so the textarea doesn't blur first.
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item, idx);
              }}
            >
              <span>{item.label}</span>
              {item.type ? <span className={styles.menuItemType}>{item.type}</span> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
