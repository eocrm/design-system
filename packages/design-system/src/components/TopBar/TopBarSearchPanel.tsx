import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
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
}: TopBarSearchPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Focus stays in the input, so keep the keyboard-active row visible by hand.
  useEffect(() => {
    if (!shown) return;
    panelRef.current?.querySelector('[data-active]')?.scrollIntoView?.({ block: 'nearest' });
  }, [shown, activeIndex]);

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
        onMouseEnter={() => onActivate(index)}
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

  if (!shown) return null;
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="listbox"
      aria-label={label}
      className={styles.results}
      // Keep focus (and the caret) in the input on any press inside the panel.
      onMouseDown={(e) => e.preventDefault()}
    >
      {groups.map((g) => (
        <div
          key={g.groupIndex}
          role="group"
          aria-labelledby={`${id}-g${g.groupIndex}`}
          className={styles.group}
        >
          <div id={`${id}-g${g.groupIndex}`} role="presentation" className={styles.groupLabel}>
            {g.label}
          </div>
          {g.items.map((item, i) => row(g.start + i, item))}
        </div>
      ))}
      {footer && row(footerIndex, footer.action, styles.footer)}
    </div>,
    document.body,
  );
}
