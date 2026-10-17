import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { Kbd } from '../Kbd';
import { LiveRegion } from '../LiveRegion';
import { ScrollArea } from '../ScrollArea';
import { mergeRefs, sanitizeId } from '../_internal/refs';
import { useControllableState } from '../_internal/useControllableState';
import { overlayStack, useFloatingSurface, useInOverlay } from '../_internal/overlay';
import styles from './TopBar.module.scss';

/** One result row in `<TopBar.Search>` combobox mode. */
export interface TopBarSearchItem {
  /** Stable id, unique across all groups. Used as the React key. */
  id: string;
  /** Primary text of the row; part of the option's accessible name. */
  label: string;
  /** Secondary text shown muted at the row's trailing edge (a type, an email, a section). */
  meta?: ReactNode;
  /** Leading decorative icon (e.g. `<Users size={16} />`); rendered `aria-hidden`. */
  icon?: ReactNode;
}

/** A labelled group of result rows in `<TopBar.Search>` combobox mode. */
export interface TopBarSearchGroup {
  /** Visible group heading; also the `role="group"`'s accessible name. */
  label: string;
  /** Rows in this group. A group with no items is not rendered. */
  items: TopBarSearchItem[];
}

/** The trailing action row of the results panel (e.g. "View all results"). */
export interface TopBarSearchFooterAction {
  /** Row text. */
  label: string;
  /** Called when the row is chosen with Enter or a click. */
  onSelect: () => void;
}

/**
 * Props for `<TopBar.Search>` — a styled `<input type="search">` with a
 * leading magnifying-glass icon and an optional trailing `<Kbd>` hotkey
 * hint. Passing `results` turns it into a combobox with a results panel.
 *
 * Inherits the standard `<input>` attributes except `type` (fixed to
 * `'search'`) and the native `onSelect` / WebKit `results`, which this
 * component's props of the same names replace. Spread your `value` /
 * `defaultValue` / `onChange` / `name` / `id` props through normally — they
 * reach the underlying input.
 */
export interface TopBarSearchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onSelect' | 'results'
> {
  /**
   * Optional hotkey hint shown after the input. Rendered internally via
   * `<Kbd size="sm">`. Pass an **array** of key labels for a multi-key
   * combo (`['⌘', 'K']` → two chips joined with `+`) or a single string
   * for a one-chip hint (`'Esc'` → one chip). Note: `'⌘K'` is treated as
   * a single chip — use the array form for multi-key combos.
   *
   * The hint is **visual only**; the library does not bind any keyboard
   * shortcut to it. Omit for no hint.
   */
  hotkey?: string | string[];
  /**
   * `className` for the wrapping `<div>` (the search surface itself).
   * The input's own className lives on the underlying `<input>` via the
   * spread input-props (use the standard `inputClassName` pattern if you
   * need to target the inner element specifically — not exposed in v1).
   */
  className?: string;
  /**
   * Grouped results. Passing it (even `[]`) enables **combobox mode**: the
   * input becomes `role="combobox"` and a results panel opens under it.
   * Omit for a plain search input. The consumer filters; the component only
   * renders, navigates and selects.
   */
  results?: TopBarSearchGroup[];
  /**
   * Controlled panel visibility (combobox mode). Omit to let the component
   * open the panel while the input has text and close it on Escape, blur,
   * selection or clearing the input.
   */
  open?: boolean;
  /** Fired whenever the component wants to open or close the panel. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Fired when a result row is chosen with Enter or a click, with the index
   * of its group in `results` and the item. The panel closes first.
   */
  onSelect?: (groupIndex: number, item: TopBarSearchItem) => void;
  /**
   * Results are being fetched: shows a loading row above any (stale) rows,
   * sets `aria-busy` on the list and announces it. Default `false`.
   */
  loading?: boolean;
  /**
   * Row shown when no group has items and `loading` is false. Defaults to
   * `t('topBar.noResults')`.
   */
  emptyMessage?: string;
  /**
   * Trailing row after every group, reachable with ↑/↓ like a result
   * (e.g. "View all results"). Omit for no footer.
   */
  footerAction?: TopBarSearchFooterAction;
}

type Entry = { groupIndex: number; item: TopBarSearchItem } | null;

/**
 * Search input for `<TopBar>`: a pill with a leading icon, a native search input and an optional hotkey hint; with `results`, a combobox with an anchored results panel.
 * @see docs/components/TopBar.md
 */
export const TopBarSearch = forwardRef<HTMLInputElement, TopBarSearchProps>(function TopBarSearch(
  {
    hotkey,
    placeholder,
    className,
    'aria-label': ariaLabel,
    results,
    open: openProp,
    onOpenChange,
    onSelect,
    loading = false,
    emptyMessage,
    footerAction,
    onKeyDown,
    onChange,
    onFocus,
    onBlur,
    ...inputProps
  },
  ref,
) {
  const t = useTranslation();
  const combobox = results !== undefined;
  const [openState, setOpenState] = useControllableState({
    value: openProp,
    defaultValue: false,
    onChange: onOpenChange,
  });
  const open = combobox && openState;
  const setOpen = (next: boolean) => {
    if (next !== open) setOpenState(next);
  };

  // `null` is the footer row.
  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = (results ?? []).flatMap((g, groupIndex) =>
      g.items.map((item) => ({ groupIndex, item })),
    );
    if (footerAction) list.push(null);
    return list;
  }, [results, footerAction]);
  const itemCount = entries.length - (footerAction ? 1 : 0);
  const [active, setActive] = useState(0);
  const entriesKey = entries.map((e) => e?.item.id ?? '').join('\u0000');
  useEffect(() => setActive(0), [entriesKey, open]);

  const listboxId = `topbar-search-${sanitizeId(useId())}`;
  const optionId = (i: number) => `${listboxId}-${i}`;
  const activeId = open && active < entries.length ? optionId(active) : undefined;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inOverlay = useInOverlay(wrapperRef, open);
  const floatingId = useFloatingSurface(open);
  const { refs, floatingStyles, isPositioned } = useFloating({
    open,
    placement: 'bottom-start',
    transform: false,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          elements.floating.style.setProperty(
            '--topbar-results-anchor-width',
            `${rects.reference.width}px`,
          );
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const wrapperRefs = useMemo(
    () => mergeRefs<HTMLDivElement>(wrapperRef, refs.setReference),
    [refs.setReference],
  );

  const choose = (entry: Entry) => {
    setOpen(false);
    if (entry) onSelect?.(entry.groupIndex, entry.item);
    else footerAction?.onSelect();
  };

  useEffect(() => {
    if (!open) return;
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !overlayStack.isTopFloating(floatingId)) return;
      e.preventDefault();
      overlayStack.consumeEscape(e);
      setOpenState(false);
    };
    document.addEventListener('keydown', onDocKeyDown, true);
    return () => document.removeEventListener('keydown', onDocKeyDown, true);
  }, [open, floatingId, setOpenState]);

  // Focus never enters the list (aria-activedescendant), so keep the active row in view.
  useEffect(() => {
    if (activeId && isPositioned) {
      document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [activeId, isPositioned]);

  const emptyText = emptyMessage || t('topBar.noResults');
  const status = !open
    ? ''
    : loading
      ? t('topBar.loading')
      : itemCount === 0
        ? emptyText
        : t('topBar.resultCount', { count: itemCount });

  const comboboxProps: InputHTMLAttributes<HTMLInputElement> = combobox
    ? {
        role: 'combobox',
        'aria-expanded': open,
        'aria-controls': open ? listboxId : undefined,
        'aria-activedescendant': activeId,
        'aria-autocomplete': 'list',
        onChange: (e) => {
          onChange?.(e);
          if (openProp === undefined) setOpen(e.target.value !== '');
        },
        onFocus: (e) => {
          onFocus?.(e);
          if (openProp === undefined && e.target.value !== '') setOpen(true);
        },
        onBlur: (e) => {
          onBlur?.(e);
          setOpen(false);
        },
        onKeyDown: (e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          const n = entries.length;
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) setOpen(true);
            else if (n) setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
          } else if (e.key === 'Enter' && open && active < n) {
            e.preventDefault();
            choose(entries[active]!);
          }
        },
      }
    : {};

  let index = 0;
  const renderOption = (entry: Entry, content: ReactNode, extraClass?: string) => {
    const i = index++;
    return (
      <div
        key={entry ? entry.item.id : '__footer'}
        id={optionId(i)}
        role="option"
        aria-selected={i === active}
        className={clsx(styles.resultOption, extraClass, i === active && styles.resultOptionActive)}
        onMouseMove={() => i !== active && setActive(i)}
        onClick={() => choose(entry)}
      >
        {content}
      </div>
    );
  };

  return (
    <div ref={wrapperRefs} className={clsx(styles.search, className)}>
      <Search aria-hidden className={styles.searchIcon} />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        // `||` on BOTH links, not `??`: an empty string is never a meaningful
        // explicit name — it contributes nothing and lets the computation fall
        // through — so an empty `aria-label` must reach `placeholder`, and an
        // empty `placeholder` must reach the translation.
        aria-label={ariaLabel || placeholder || t('topBar.search')}
        className={styles.searchInput}
        // Password managers (1Password, Bitwarden) and browser autofill
        // shouldn't try to fill a free-text search box. The data attrs
        // cover 1P and LP; `autoComplete="off"` covers Chrome / Safari.
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        onKeyDown={onKeyDown}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        // Consumer props win in plain mode (Pattern A); the combobox
        // contract wins in combobox mode.
        {...inputProps}
        {...comboboxProps}
      />
      {hotkey != null && <Kbd keys={Array.isArray(hotkey) ? hotkey : [hotkey]} size="sm" />}
      {combobox && <LiveRegion>{status}</LiveRegion>}
      {open &&
        createPortal(
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={styles.results}
            data-in-overlay={inOverlay ? '' : undefined}
            // Keeps focus (and the caret) in the input on any click in the panel.
            onMouseDown={(e) => e.preventDefault()}
          >
            {loading ? (
              <div className={styles.resultsStatus}>{t('topBar.loading')}</div>
            ) : (
              itemCount === 0 && <div className={styles.resultsStatus}>{emptyText}</div>
            )}
            <ScrollArea
              maxHeight="md"
              id={listboxId}
              role="listbox"
              aria-label={t('topBar.results')}
              aria-busy={loading || undefined}
              tabIndex={-1}
            >
              {results!.map((group, gi) => {
                if (group.items.length === 0) return null;
                const headingId = `${listboxId}-g${gi}`;
                return (
                  <div key={gi} role="group" aria-labelledby={headingId}>
                    <div id={headingId} role="presentation" className={styles.resultsGroupLabel}>
                      {group.label}
                    </div>
                    {group.items.map((item) =>
                      renderOption(
                        { groupIndex: gi, item },
                        <>
                          {item.icon != null && (
                            <span aria-hidden className={styles.resultIcon}>
                              {item.icon}
                            </span>
                          )}
                          <span className={styles.resultLabel}>{item.label}</span>
                          {item.meta != null && (
                            <span className={styles.resultMeta}>{item.meta}</span>
                          )}
                        </>,
                      ),
                    )}
                  </div>
                );
              })}
              {footerAction && renderOption(null, footerAction.label, styles.resultFooter)}
            </ScrollArea>
          </div>,
          document.body,
        )}
    </div>
  );
});
