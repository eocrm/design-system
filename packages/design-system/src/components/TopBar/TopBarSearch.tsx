import {
  forwardRef,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { Kbd } from '../Kbd';
import { useInOverlay } from '../_internal/overlay';
import {
  TopBarSearchPanel,
  optionId,
  type PanelGroup,
  type SearchOption,
} from './TopBarSearchPanel';
import styles from './TopBar.module.scss';

/** One result row in `<TopBar.Search>` combobox mode. */
export interface TopBarSearchItem {
  /** Unique across ALL groups. Identifies the result set: the highlight resets to the first row when the set of ids changes. */
  id: string;
  /** Primary text. Truncates to one line. */
  label: ReactNode;
  /** Trailing muted text, e.g. the entity type or an email. */
  meta?: ReactNode;
  /** Leading decorative icon (e.g. `<User size={16} />`); hidden from assistive tech. */
  icon?: ReactNode;
  /**
   * Renders the row as a link so Cmd/Ctrl/Shift/middle-click and "copy link"
   * work natively. A plain click or Enter still calls `onSelect` (the library
   * never navigates) — route there.
   */
  href?: string;
}

/** A labelled block of results. Groups with no items are not rendered. */
export interface TopBarSearchGroup {
  /** Visible heading; also the group's accessible name. */
  label: string;
  /** Result rows in this group. */
  items: TopBarSearchItem[];
}

/** Trailing row in the ↑/↓ cycle, e.g. "View all results". */
export interface TopBarSearchFooterAction {
  /** Row content. */
  label: ReactNode;
  /** Called on Enter or click. */
  onSelect: () => void;
  /** Optional link target, same semantics as `TopBarSearchItem.href`. */
  href?: string;
}

/**
 * Props for `<TopBar.Search>` — a styled `<input type="search">` with a
 * leading magnifying-glass icon and an optional trailing `<Kbd>` hotkey
 * hint. Passing `results` turns it into a combobox with a results panel.
 *
 * Inherits the standard `<input>` HTML attribute surface (minus `type`,
 * fixed to `'search'`, the legacy `results` attribute, and the native
 * `onSelect` text-selection event, replaced by the combobox `onSelect`). Spread `value` / `defaultValue` /
 * `onChange` / `name` / `id` through normally — they reach the input.
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
   * Turns on combobox mode: the input gets `role="combobox"` and a results
   * panel opens under it. Presence switches the mode — pass `[]` (not
   * `undefined`) while there are no results yet. You filter or fetch; the
   * library owns keyboard, focus, dismissal, positioning and announcements.
   * The first row is highlighted whenever the set of ids changes, so Enter
   * opens the top hit.
   */
  results?: TopBarSearchGroup[];
  /** Controlled panel visibility. Omit for uncontrolled. */
  open?: boolean;
  /** Uncontrolled initial visibility. Default `false`. */
  defaultOpen?: boolean;
  /** Called when the panel wants to open (focus, typing, ↓) or close (Esc, blur, selection). */
  onOpenChange?: (open: boolean) => void;
  /** Called on Enter or click on a result. The input text is left as is — clear it here if wanted. */
  onSelect?: (item: TopBarSearchItem, groupIndex: number) => void;
  /** Shows a loading row and sets `aria-busy`; existing results stay visible and the live region keeps announcing their count. */
  loading?: boolean;
  /**
   * Row shown for a non-empty query with no results. Default `t('topBar.searchEmpty')`
   * (also used when this is an empty string). A non-string node is rendered but the
   * live region still announces the default text — pass a string to have it announced.
   */
  emptyMessage?: ReactNode;
  /** Trailing row in the ↑/↓ cycle (e.g. "View all results"). Rendered whenever the panel is shown (results, loading row, or empty row), as the last row. */
  footerAction?: TopBarSearchFooterAction;
}

/**
 * Search input for `<TopBar>`: a pill with a leading icon, a native search input, an optional hotkey hint and an optional results combobox.
 * @see docs/components/TopBar.md
 */
export const TopBarSearch = forwardRef<HTMLInputElement, TopBarSearchProps>(function TopBarSearch(
  {
    hotkey,
    placeholder,
    className,
    'aria-label': ariaLabel,
    results,
    open,
    defaultOpen = false,
    onOpenChange,
    onSelect,
    loading = false,
    emptyMessage,
    footerAction,
    onChange,
    onFocus,
    onBlur,
    onClick,
    onKeyDown,
    ...inputProps
  },
  ref,
) {
  const t = useTranslation();
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const combobox = results !== undefined;
  // `||` on BOTH links, not `??`: an empty string is never a meaningful
  // explicit name, so it must fall through to placeholder, then translation.
  const name = ariaLabel || placeholder || t('topBar.search');

  const [openState, setOpenState] = useState(defaultOpen);
  const isOpen = open ?? openState;
  const setOpen = (next: boolean) => {
    if (next === isOpen) return;
    if (open === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  // Value is needed to decide whether an empty result set shows "No results".
  const [uncontrolledValue, setUncontrolledValue] = useState(String(inputProps.defaultValue ?? ''));
  const value = inputProps.value !== undefined ? String(inputProps.value) : uncontrolledValue;

  const { groups, options } = useMemo(() => {
    const groups: PanelGroup[] = [];
    const options: SearchOption[] = [];
    (results ?? []).forEach((g, groupIndex) => {
      if (g.items.length === 0) return;
      groups.push({ label: g.label, groupIndex, start: options.length, items: g.items });
      for (const item of g.items) options.push({ kind: 'item', item, groupIndex });
    });
    if (footerAction) options.push({ kind: 'footer', action: footerAction });
    return { groups, options };
  }, [results, footerAction]);

  const hasItems = groups.length > 0;
  const shown = combobox && isOpen && (loading || hasItems || value.trim() !== '');
  // Probed here, not in the panel: a child's layout effect runs before this wrapper's ref attaches.
  const inOverlay = useInOverlay(wrapperRef, shown);
  const empty = !loading && !hasItems ? emptyMessage || t('topBar.searchEmpty') : null;
  const announcement = !shown
    ? ''
    : hasItems
      ? t('topBar.searchResults', { count: options.filter((o) => o.kind === 'item').length })
      : loading
        ? t('topBar.searchLoading')
        : typeof empty === 'string'
          ? empty
          : t('topBar.searchEmpty');

  // Reset to the first row when the SET of ids changes — not on every new
  // array identity, so a consumer rebuilding `results` inline keeps the highlight.
  // Item ids only: the footer is always last, so toggling it must not reset the highlight or re-announce.
  const signature = options.flatMap((o) => (o.kind === 'item' ? [o.item.id] : [])).join('\u0000');
  const [active, setActive] = useState(0);
  const [prevSignature, setPrevSignature] = useState(signature);
  // Adjust state while rendering (not in an effect): no painted frame with a stale highlight.
  if (signature !== prevSignature) {
    setPrevSignature(signature);
    setActive(0);
  }
  const activeIndex = options.length === 0 ? -1 : Math.min(active, options.length - 1);

  const choose = (option: SearchOption) => {
    if (option.kind === 'footer') option.action.onSelect();
    else onSelect?.(option.item, option.groupIndex);
    setOpen(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    if (inputProps.value === undefined) setUncontrolledValue(e.target.value);
    if (combobox) setOpen(true);
  };
  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    onFocus?.(e);
    if (combobox && !e.defaultPrevented) setOpen(true);
  };
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    onBlur?.(e);
    // Panel presses are mousedown-prevented, so a blur always means focus left.
    if (combobox) setOpen(false);
  };
  const handleClick = (e: MouseEvent<HTMLInputElement>) => {
    onClick?.(e);
    if (combobox && !e.defaultPrevented) setOpen(true);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (!combobox || e.defaultPrevented) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!shown) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      if (options.length === 0) return;
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + options.length) % options.length);
    } else if (
      e.key === 'Enter' &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229 &&
      shown &&
      activeIndex >= 0
    ) {
      e.preventDefault();
      choose(options[activeIndex]!);
    }
    // Escape: TopBarSearchPanel's document listener (overlay registry).
  };

  return (
    <div ref={wrapperRef} className={clsx(styles.search, className)}>
      <Search aria-hidden className={styles.searchIcon} />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        aria-label={name}
        className={styles.searchInput}
        // Password managers and browser autofill must skip a free-text search box.
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        // {...inputProps} after the defaults so consumer overrides win (Pattern A) ...
        {...inputProps}
        // ... but the combobox ARIA contract is applied after them (Pattern B).
        {...(combobox && {
          role: 'combobox',
          'aria-expanded': shown,
          'aria-controls': shown ? listboxId : undefined,
          'aria-activedescendant':
            shown && activeIndex >= 0 ? optionId(listboxId, activeIndex) : undefined,
          'aria-autocomplete': 'list' as const,
        })}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />
      {hotkey != null && <Kbd keys={Array.isArray(hotkey) ? hotkey : [hotkey]} size="sm" />}
      {combobox && (
        <TopBarSearchPanel
          id={listboxId}
          shown={shown}
          label={name}
          groups={groups}
          options={options}
          activeIndex={activeIndex}
          onActivate={setActive}
          onChoose={choose}
          anchorRef={wrapperRef}
          inOverlay={inOverlay}
          onClose={() => setOpen(false)}
          loading={loading}
          emptyMessage={shown ? empty : null}
          announcement={announcement}
          announceKey={signature}
        />
      )}
    </div>
  );
});
