// RichTextMentionMenu.tsx — the floating @-mention listbox for <RichTextEditor>.
// Presentational: the editor (via useMention) owns all state and passes the
// items + active index + anchor rect; this renders a role="listbox" positioned at
// the caret rect via a Floating UI virtual element (same portal+virtual-anchor
// pattern as RichTextLinkEditor). Not exported from the package.
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, flip, shift, offset } from '@floating-ui/react-dom';
import { Avatar } from '../Avatar';
import { Text } from '../Text';
import type { MentionItem } from './mentions';
import type { Rect } from './selection';
import styles from './RichTextEditor.module.scss';

export interface RichTextMentionMenuProps {
  items: MentionItem[];
  activeIndex: number;
  anchorRect: Rect;
  /**
   * Read the caret rect LIVE on each Floating UI `autoUpdate` (scroll/resize) so the
   * menu tracks the caret. Falls back to the static `anchorRect` when it returns null.
   */
  getAnchorRect?: () => Rect | null;
  listboxId: string;
  getOptionId: (index: number) => string;
  /** Accessible name for the listbox. */
  label: string;
  /** Shown when there are no candidates. */
  emptyLabel: string;
  /** Pick the item at `index`. */
  onSelect: (index: number) => void;
  /** Set the active item (pointer hover). */
  onHover: (index: number) => void;
}

export function RichTextMentionMenu({
  items,
  activeIndex,
  anchorRect,
  getAnchorRect,
  listboxId,
  getOptionId,
  label,
  emptyLabel,
  onSelect,
  onHover,
}: RichTextMentionMenuProps) {
  const virtualRef = useMemo(
    () => ({
      // Re-read the caret rect on every call — Floating UI's autoUpdate invokes this
      // on scroll/resize, so the menu follows the caret (the static `anchorRect` is
      // the fallback for the initial frame / when no live rect is available).
      getBoundingClientRect: () => {
        const r = getAnchorRect?.() ?? anchorRect;
        return {
          x: r.left,
          y: r.top,
          top: r.top,
          left: r.left,
          right: r.left + r.width,
          bottom: r.top + r.height,
          width: r.width,
          height: r.height,
        };
      },
    }),
    [anchorRect, getAnchorRect],
  );

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip(), shift({ padding: 4 })],
    elements: { reference: virtualRef },
  });

  return createPortal(
    <div
      ref={refs.setFloating}
      className={styles.mentionMenu}
      style={floatingStyles}
      role="listbox"
      id={listboxId}
      aria-label={label}
    >
      {items.length === 0 ? (
        <div className={styles.mentionEmpty} aria-disabled="true">
          <Text size="sm" tone="muted">
            {emptyLabel}
          </Text>
        </div>
      ) : (
        items.map((item, i) => (
          <div
            key={item.id}
            id={getOptionId(i)}
            role="option"
            aria-selected={i === activeIndex}
            className={i === activeIndex ? styles.mentionOptionActive : styles.mentionOption}
            // pointerdown (not click) so the editor doesn't lose its selection first
            onPointerDown={(e) => {
              e.preventDefault();
              onSelect(i);
            }}
            onMouseMove={() => onHover(i)}
          >
            <Avatar name={item.label} src={item.avatarUrl} size="sm" />
            <span className={styles.mentionText}>
              <Text size="sm">{item.label}</Text>
              {item.description ? (
                <Text size="xs" tone="muted">
                  {item.description}
                </Text>
              ) : null}
            </span>
          </div>
        ))
      )}
    </div>,
    document.body,
  );
}
