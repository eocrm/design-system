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

// ----------------------------------------------------------------------------
// EmojiPicker
// ----------------------------------------------------------------------------

export interface EmojiPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /**
   * Fired with the chosen emoji character (e.g. `'👍'`) when the user clicks a
   * cell or presses Enter/Space on a focused cell. This is the picker's single
   * output — wire it to insert into an editor, set a reaction, etc.
   */
  onSelect: (emoji: string) => void;
}

/** One visible emoji plus its flat-array index (for roving keyboard nav). */
interface IndexedEmoji {
  emoji: EmojiEntry;
  index: number;
}

/** A category section after filtering, carrying flat indices for its emojis. */
interface VisibleCategory {
  id: EmojiCategoryId;
  items: IndexedEmoji[];
}

/**
 * Searchable emoji grid over a curated, common-first dataset (reactions +
 * everyday input — NOT the full Unicode set). Renders a search box and a
 * category-sectioned 8-column grid; calls `onSelect(char)` on click or
 * Enter/Space. Built on `Input`, `Text`, and a lucide `Search` icon, with
 * roving-tabindex keyboard navigation across the grid.
 *
 * This is the bare picker surface — pair it with a `Popover` (or use the
 * `EmojiPickerPopover` wrapper) to open it from a trigger.
 *
 * @example
 * // Inside a Popover you control:
 * <Popover>
 *   <Popover.Trigger>
 *     <Button variant="secondary" iconOnly aria-label="Add reaction">
 *       <Smile size={16} />
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <EmojiPicker onSelect={(char) => insertAtCaret(char)} />
 *   </Popover.Content>
 * </Popover>
 *
 * @example
 * // The batteries-included wrapper (opens + closes for you):
 * <EmojiPickerPopover
 *   trigger={<Button variant="ghost" iconOnly aria-label="Emoji"><Smile size={16} /></Button>}
 *   onSelect={(char) => appendToMessage(char)}
 * />
 *
 * @example
 * // A reaction toggle on a comment:
 * <EmojiPickerPopover
 *   trigger={<Button size="sm" variant="secondary">React</Button>}
 *   onSelect={(char) => toggleReaction(commentId, char)}
 * />
 *
 * @remarks When NOT to use
 * - A small fixed set of reactions (👍 ❤️ 🎉) — render a `Cluster` of
 *   `Button`s instead; a searchable grid is overkill for 3-6 choices.
 * - Inline emoji autocomplete inside an editor (`:smile` → 😄) — out of scope;
 *   that belongs to the editor's suggestion engine, not this chooser.
 * - Rendering the reactions a message already has (as chips/counts) — the
 *   consumer builds that display; this component only *chooses* an emoji.
 *
 * @remarks Anti-patterns
 * - ❌ Expecting the full ~1900-emoji Unicode set. This is a deliberately
 *   curated common set (see `emojiData.ts`); skin-tone/ZWJ variants are out.
 * - ❌ Using it as the reaction-count display. It is the chooser only — it has
 *   no notion of which emoji are already selected or how many times.
 */
export const EmojiPicker = forwardRef<HTMLDivElement, EmojiPickerProps>(function EmojiPicker(
  { onSelect, className, ...rest },
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
    for (const cat of EMOJI_CATEGORIES) {
      const filtered = cat.emojis.filter(matches);
      if (filtered.length === 0) continue;
      const items = filtered.map<IndexedEmoji>((emoji) => {
        const index = flatList.length;
        flatList.push(emoji);
        return { emoji, index };
      });
      cats.push({ id: cat.id, items });
    }
    return { categories: cats, flat: flatList };
  }, [query]);

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
            return (
              <div
                key={cat.id}
                className={styles.section}
                role="group"
                aria-label={t(`emojiPicker.category.${cat.id}`)}
              >
                <Text as="div" size="xs" tone="muted" id={labelId} className={styles.sectionLabel}>
                  {t(`emojiPicker.category.${cat.id}`)}
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
 * Batteries-included `<EmojiPicker>` in a `Popover`: pass a `trigger` and an
 * `onSelect`, and the wrapper handles opening, closing-on-select, and the
 * controlled/uncontrolled open contract.
 *
 * @example
 * <EmojiPickerPopover
 *   trigger={<Button variant="ghost" iconOnly aria-label="Emoji"><Smile size={16} /></Button>}
 *   onSelect={(char) => appendToMessage(char)}
 * />
 *
 * @example
 * // Controlled:
 * const [open, setOpen] = useState(false);
 * <EmojiPickerPopover
 *   open={open}
 *   onOpenChange={setOpen}
 *   trigger={<Button>Emoji</Button>}
 *   onSelect={setEmoji}
 * />
 */
export function EmojiPickerPopover({
  trigger,
  onSelect,
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
        <EmojiPicker onSelect={handleSelect} />
      </Popover.Content>
    </Popover>
  );
}
