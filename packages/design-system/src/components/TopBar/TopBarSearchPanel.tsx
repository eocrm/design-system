import { useEffect, useRef, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { LiveRegion } from '../LiveRegion';
import { mergeRefs } from '../_internal/refs';
import { overlayStack, useFloatingSurface, useInOverlay } from '../_internal/overlay';
import type { TopBarSearchFooterAction, TopBarSearchItem } from './TopBarSearch';
import styles from './TopBar.module.scss';

/** A row in the ↑/↓ cycle: a result item or the trailing footer action. */
export type SearchOption =
  | { kind: 'item'; item: TopBarSearchItem; groupIndex: number }
  | { kind: 'footer'; action: TopBarSearchFooterAction };

/** A non-empty group with the flat index of its first option. */
export interface PanelGroup {
  /** Group heading text. */
  label: string;
  /** Index of the group in the consumer's `results`. */
  groupIndex: number;
  /** Flat option index of the group's first item. */
  start: number;
  /** The group's rows. */
  items: TopBarSearchItem[];
}

export interface TopBarSearchPanelProps {
  /** listbox id (input's `aria-controls`); option ids derive from it. */
  id: string;
  /** Render the portalled listbox. The component itself stays mounted in combobox mode. */
  shown: boolean;
  /** The listbox's accessible name (the input's name). */
  label: string;
  /** Non-empty groups to render. */
  groups: PanelGroup[];
  /** Flat ↑/↓ cycle: items, then the footer. */
  options: SearchOption[];
  /** Index of the highlighted option, or -1. */
  activeIndex: number;
  /** Called when hover moves the highlight. */
  onActivate: (index: number) => void;
  /** Called when an option is clicked. */
  onChoose: (option: SearchOption) => void;
  /** The search pill — Floating UI reference and overlay-elevation probe. */
  anchorRef: RefObject<HTMLDivElement | null>;
  /** Close request (Escape). */
  onClose: () => void;
  /** Loading row + `aria-busy`. */
  loading: boolean;
  /** Empty row content, or `null` for no empty row. */
  emptyMessage: ReactNode | null;
  /** Live-region text ('' when the panel is hidden). */
  announcement: string;
}

export const optionId = (listboxId: string, index: number) => `${listboxId}-opt-${index}`;

/** Internal: the combobox results panel of `<TopBar.Search>`. */
export function TopBarSearchPanel({
  id,
  shown,
  label,
  groups,
  options,
  activeIndex,
  onActivate,
  onChoose,
  anchorRef,
  onClose,
  loading,
  emptyMessage,
  announcement,
}: TopBarSearchPanelProps) {
  const t = useTranslation();
  const panelRef = useRef<HTMLDivElement | null>(null);

  // #274/#280: hosts (Modal/Drawer) yield Escape while the panel is shown, and
  // a deeper surface gets the press before us.
  const floatingId = useFloatingSurface(shown);
  const inOverlay = useInOverlay(anchorRef, shown);

  useEffect(() => {
    if (!shown) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !overlayStack.isTopFloating(floatingId)) return;
      e.preventDefault(); // also stops the native <input type="search"> clear
      overlayStack.consumeEscape(e);
      onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [shown, floatingId, onClose]);

  const { refs, floatingStyles, isPositioned } = useFloating({
    open: shown,
    placement: 'bottom-start',
    // fixed + portal: escapes the sticky bar and any overflow/transform ancestor.
    strategy: 'fixed',
    transform: false,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      // Publish geometry as CSS vars; `.results` turns them into min width
      // (never narrower than the pill) and viewport-bounded max width/height.
      size({
        padding: 8,
        apply({ rects, availableWidth, availableHeight, elements }) {
          const s = elements.floating.style;
          s.setProperty('--topbar-results-min-width', `${rects.reference.width}px`);
          s.setProperty('--topbar-results-available-width', `${Math.max(0, availableWidth)}px`);
          s.setProperty('--topbar-results-available-height', `${Math.max(0, availableHeight)}px`);
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
    elements: { reference: anchorRef.current },
  });

  // Focus stays in the input, so keep the keyboard-active row visible by hand.
  useEffect(() => {
    if (!shown || !isPositioned) return;
    panelRef.current?.querySelector('[data-active]')?.scrollIntoView?.({ block: 'nearest' });
  }, [shown, isPositioned, activeIndex]);

  const row = (
    index: number,
    item: { label: ReactNode; meta?: ReactNode; icon?: ReactNode; href?: string },
    className?: string,
  ) => {
    const option = options[index]!;
    const active = index === activeIndex;
    const Tag = item.href ? 'a' : 'div';
    return (
      <Tag
        key={index}
        id={optionId(id, index)}
        role="option"
        aria-selected={active}
        href={item.href}
        // Rows are never tab stops: focus stays in the input (activedescendant).
        tabIndex={item.href ? -1 : undefined}
        data-active={active ? '' : undefined}
        className={clsx(styles.option, active && styles.optionActive, className)}
        // mousemove, not mouseenter: rows scrolling under a resting pointer must not steal the highlight.
        onMouseMove={() => {
          if (!active) onActivate(index);
        }}
        onClick={(e: MouseEvent) => {
          // Cmd/Ctrl/Shift-click on a link opens it the browser's way.
          if (item.href && (e.metaKey || e.ctrlKey || e.shiftKey)) return;
          e.preventDefault();
          onChoose(option);
        }}
      >
        {item.icon != null && (
          <span aria-hidden="true" className={styles.optionIcon}>
            {item.icon}
          </span>
        )}
        <span className={styles.optionLabel}>{item.label}</span>
        {item.meta != null && <span className={styles.optionMeta}>{item.meta}</span>}
      </Tag>
    );
  };

  const footerIndex = options.findIndex((o) => o.kind === 'footer');
  const footer =
    footerIndex >= 0 ? (options[footerIndex] as Extract<SearchOption, { kind: 'footer' }>) : null;

  return (
    <>
      <LiveRegion>{announcement}</LiveRegion>
      {shown &&
        createPortal(
          <div
            ref={mergeRefs<HTMLDivElement>(panelRef, refs.setFloating)}
            style={floatingStyles}
            data-in-overlay={inOverlay ? '' : undefined}
            id={id}
            role="listbox"
            aria-label={label}
            className={styles.results}
            // Keep focus (and the caret) in the input on any press inside the panel.
            onMouseDown={(e) => e.preventDefault()}
            aria-busy={loading || undefined}
          >
            {groups.map((g) => (
              <div
                key={g.groupIndex}
                role="group"
                aria-labelledby={`${id}-g${g.groupIndex}`}
                className={styles.group}
              >
                <div
                  id={`${id}-g${g.groupIndex}`}
                  role="presentation"
                  className={styles.groupLabel}
                >
                  {g.label}
                </div>
                {g.items.map((item, i) => row(g.start + i, item))}
              </div>
            ))}
            {loading && <div className={styles.status}>{t('topBar.searchLoading')}</div>}
            {emptyMessage != null && <div className={styles.status}>{emptyMessage}</div>}
            {footer && row(footerIndex, footer.action, styles.footer)}
          </div>,
          document.body,
        )}
    </>
  );
}
