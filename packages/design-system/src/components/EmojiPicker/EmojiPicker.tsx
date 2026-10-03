import {
  forwardRef,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { Input } from '../Input';
import { Text } from '../Text';
import { Popover } from '../Popover';
import { useTranslation } from '../../i18n/useTranslation';
import { EMOJI_CATEGORIES, type EmojiCategoryId, type EmojiEntry } from './emojiData';
import styles from './EmojiPicker.module.scss';

// Fixed grid width. The CSS grid uses `repeat(8, 1fr)`, so JS roving nav
// (ArrowDown/Up jumps a whole row) must use the same column count to stay in
// sync with what the user sees.
const COLUMNS = 8;

// char → dataset entry, for resolving a `recent` char's name (accessible label).
// A char not in the curated set falls back to the char itself as its name.
const ENTRY_BY_CHAR = new Map<string, EmojiEntry>(
  EMOJI_CATEGORIES.flatMap((cat) => cat.emojis.map((e) => [e.char, e] as const)),
);

// ----------------------------------------------------------------------------
// EmojiPicker
// ----------------------------------------------------------------------------

export interface EmojiPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /**
   * Consumed so a Field / SettingRow wrapping the picker cannot leak it onto
   * the root div (#568). The picker has no value to validate, so it renders nothing.
   */
  invalid?: boolean;
  /** Consumed for Field / SettingRow composition (#568); the picker has no value, so nothing is forwarded. */
  required?: boolean;
  /**
   * Fired with the chosen emoji character (e.g. `'👍'`) when the user clicks a
   * cell or presses Enter/Space on a focused cell. This is the picker's single
   * output — wire it to insert into an editor, set a reaction, etc.
   */
  onSelect: (emoji: string) => void;
  /**
   * Recently-used emoji characters (e.g. `['👍', '🎉', '❤️']`), most-recent first.
   * When provided, a "Recently used" section renders at the top of the grid (only
   * while not searching). The consumer owns persistence — keep the list yourself
   * (e.g. in localStorage), update it in `onSelect`, and pass it back. Duplicates
   * are de-duped; a char outside the curated set still renders (labelled by the
   * char). Omit or pass `[]` for no recent section.
   */
  recent?: string[];
}

/** One visible emoji plus its flat-array index (for roving keyboard nav). */
interface IndexedEmoji {
  emoji: EmojiEntry;
  index: number;
}

/** A section after filtering, carrying flat indices for its emojis. `'recent'` is
 *  the synthetic recently-used section rendered above the curated categories. */
interface VisibleCategory {
  id: EmojiCategoryId | 'recent';
  items: IndexedEmoji[];
}

/**
 * Searchable emoji grid over a curated, common-first dataset (not the full Unicode set).
 * @see docs/components/EmojiPicker.md
 */
export const EmojiPicker = forwardRef<HTMLDivElement, EmojiPickerProps>(function EmojiPicker(
  // invalid/required consumed for Field composition only (#568).
  { onSelect, recent, className, invalid: _invalid, required: _required, ...rest },
  ref,
) {
  const t = useTranslation();
  const baseId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState('');
  // Roving-tabindex anchor: which flat index is currently the tabbable cell.
  const [activeIndex, setActiveIndex] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter + flatten in one pass so each visible emoji carries a stable flat
  // index (render order) for keyboard navigation. A char can recur across
  // categories, so a char→index map would be ambiguous; a running counter is
  // the correct source of truth.
  const { categories, flat } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (e: EmojiEntry): boolean =>
      q === '' ||
      e.name.toLowerCase().includes(q) ||
      e.keywords.some((k) => k.toLowerCase().includes(q));

    const flatList: EmojiEntry[] = [];
    const cats: VisibleCategory[] = [];
    const pushSection = (id: VisibleCategory['id'], emojis: EmojiEntry[]) => {
      const items = emojis.map<IndexedEmoji>((emoji) => {
        const index = flatList.length;
        flatList.push(emoji);
        return { emoji, index };
      });
      cats.push({ id, items });
    };

    // "Recently used" pins to the top, but only when not searching (search spans
    // the whole set). De-dupe by char, preserving most-recent-first order; a char
    // outside the curated set still renders, labelled by the char.
    if (q === '' && recent && recent.length > 0) {
      const seen = new Set<string>();
      const recentEntries: EmojiEntry[] = [];
      for (const char of recent) {
        if (seen.has(char)) continue;
        seen.add(char);
        recentEntries.push(ENTRY_BY_CHAR.get(char) ?? { char, name: char, keywords: [] });
      }
      if (recentEntries.length > 0) pushSection('recent', recentEntries);
    }

    for (const cat of EMOJI_CATEGORIES) {
      const filtered = cat.emojis.filter(matches);
      if (filtered.length > 0) pushSection(cat.id, filtered);
    }
    return { categories: cats, flat: flatList };
  }, [query, recent]);

  // Clamp the active index to the current result set so the tabbable cell is
  // always valid after the filter shrinks the grid.
  const activeSafe = flat.length === 0 ? -1 : Math.min(activeIndex, flat.length - 1);

  const focusCell = (index: number) => {
    panelRef.current?.querySelector<HTMLButtonElement>(`[data-emoji-index="${index}"]`)?.focus();
  };

  const onSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flat.length === 0) return;
      const target = activeSafe < 0 ? 0 : activeSafe;
      setActiveIndex(target);
      focusCell(target);
    }
  };

  const onGridKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const total = flat.length;
    if (total === 0) return;
    // The focused cell is the source of truth for "where am I" — read its own
    // flat index rather than relying on a possibly-stale closure.
    const current = Number(e.currentTarget.dataset.emojiIndex);

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(flat[current]!.char);
      return;
    }

    let next: number;
    switch (e.key) {
      case 'ArrowRight':
        next = current + 1;
        break;
      case 'ArrowLeft':
        next = current - 1;
        break;
      case 'ArrowDown':
        next = current + COLUMNS;
        break;
      case 'ArrowUp':
        if (current < COLUMNS) {
          // First row → escape back up to the search input.
          e.preventDefault();
          searchInputRef.current?.focus();
          return;
        }
        next = current - COLUMNS;
        break;
      case 'Home':
        next = current - (current % COLUMNS);
        break;
      case 'End':
        next = Math.min(current - (current % COLUMNS) + COLUMNS - 1, total - 1);
        break;
      default:
        return;
    }

    e.preventDefault();
    next = Math.max(0, Math.min(next, total - 1));
    setActiveIndex(next);
    focusCell(next);
  };

  return (
    // Pattern A (props last) — EmojiPicker is a plain surface; let consumers
    // override anything on the root.
    <div ref={ref} className={clsx(styles.root, className)} {...rest}>
      <div className={styles.search}>
        <Search size={14} aria-hidden className={styles.searchIcon} />
        <Input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          placeholder={t('emojiPicker.search')}
          aria-label={t('emojiPicker.search')}
          aria-controls={listboxId}
          onKeyDown={onSearchKeyDown}
          className={styles.searchInput}
        />
      </div>

      <div
        ref={panelRef}
        id={listboxId}
        className={styles.panel}
        role="listbox"
        aria-label={t('emojiPicker.label')}
      >
        {flat.length === 0 ? (
          <Text size="sm" tone="muted" className={styles.noResults}>
            {t('emojiPicker.noResults')}
          </Text>
        ) : (
          categories.map((cat) => {
            const labelId = `${baseId}-${cat.id}`;
            const label =
              cat.id === 'recent' ? t('emojiPicker.recent') : t(`emojiPicker.category.${cat.id}`);
            return (
              <div key={cat.id} className={styles.section} role="group" aria-label={label}>
                <Text as="div" size="xs" tone="muted" id={labelId} className={styles.sectionLabel}>
                  {label}
                </Text>
                <div className={styles.grid}>
                  {cat.items.map(({ emoji, index }) => (
                    <button
                      key={emoji.char}
                      type="button"
                      role="option"
                      aria-selected={false}
                      data-emoji-index={index}
                      className={styles.cell}
                      tabIndex={index === activeSafe ? 0 : -1}
                      aria-label={emoji.name}
                      onClick={() => onSelect(emoji.char)}
                      onKeyDown={onGridKeyDown}
                      onFocus={() => setActiveIndex(index)}
                    >
                      <span aria-hidden="true">{emoji.char}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

// ----------------------------------------------------------------------------
// EmojiPickerPopover
// ----------------------------------------------------------------------------

export interface EmojiPickerPopoverProps {
  /**
   * The element that opens the picker. Must be a single element that accepts a
   * ref (this library's `<Button>` or a raw `<button>`); the open/close +
   * ARIA wiring is injected by `Popover.Trigger`.
   */
  trigger: ReactNode;
  /**
   * Fired with the chosen emoji character. Selecting always closes the popover
   * (both controlled and uncontrolled).
   */
  onSelect: (emoji: string) => void;
  /** Recently-used emoji chars shown in a top "Recently used" section — see `EmojiPicker`. */
  recent?: string[];
  /**
   * Controlled open state. Provide alongside `onOpenChange` to drive open
   * externally. Omit both to let the wrapper own its state (the common case).
   */
  open?: boolean;
  /** Fired whenever the popover wants to change open state. Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;
  /** Initial open state for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
}

/**
 * Batteries-included `<EmojiPicker>` in a `Popover`: pass a `trigger` and an `onSelect`.
 * @see docs/components/EmojiPicker.md
 */
export function EmojiPickerPopover({
  trigger,
  onSelect,
  recent,
  open,
  onOpenChange,
  defaultOpen = false,
}: EmojiPickerPopoverProps) {
  // Controlled-or-uncontrolled open: keep internal state when `open` is not
  // provided so selecting can still close the popover.
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const actualOpen = isControlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={actualOpen} onOpenChange={setOpen}>
      {/* Popover.Trigger wants a single ReactElement; it runtime-validates via
          isValidElement and throws on anything else, so the cast is safe. */}
      <Popover.Trigger>{trigger as ReactElement}</Popover.Trigger>
      <Popover.Content>
        <EmojiPicker onSelect={handleSelect} recent={recent} />
      </Popover.Content>
    </Popover>
  );
}
