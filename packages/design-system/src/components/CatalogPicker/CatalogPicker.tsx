import {
  forwardRef,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { Input } from '../Input';
import { EmptyState } from '../EmptyState';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './CatalogPicker.module.scss';

/** One selectable entry in a CatalogPicker. */
export interface CatalogPickerItem {
  /** Stable id passed to `onSelect`. Unique within `items`. */
  id: string;
  /** Visible title and the option's accessible name. Searched. */
  title: string;
  /** Optional muted description (clamped to 2 lines). Searched; also the option's description. */
  description?: string;
  /** Category id (matches a `CatalogPickerCategory.id`) used by the pill filter. */
  category?: string;
  /** Extra search terms (not rendered). */
  tags?: string[];
  /** Optional badge node (e.g. `<Badge>New</Badge>`) shown on the card. */
  badge?: ReactNode;
  /** Optional preview node shown at the top of the card — typically `<WidgetPreview variant>`. */
  preview?: ReactNode;
  /**
   * Marks the item unavailable (e.g. "Already on dashboard", "No permission"). It stays
   * visible and focusable but dimmed, `aria-disabled`, and `onSelect` is not called; the
   * reason is shown as text and added to the option's description.
   */
  disabledReason?: string;
}

/** A category pill. */
export interface CatalogPickerCategory {
  /** Matches `CatalogPickerItem.category`. */
  id: string;
  /** Visible pill label. */
  label: string;
}

export interface CatalogPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** The catalog. Rendered in the given order. */
  items: CatalogPickerItem[];
  /** Category pills (after a leading localized "All"). Omit or pass `[]` for no pills. */
  categories?: CatalogPickerCategory[];
  /** Called with the item id when an AVAILABLE item is clicked or activated with Enter/Space. */
  onSelect: (id: string) => void;
  /** Accessible name of the results listbox, e.g. "Widget catalog". Required. */
  label: string;
}

const ALL = '';

function matches(item: CatalogPickerItem, q: string) {
  if (!q) return true;
  return [item.title, item.description ?? '', ...(item.tags ?? [])].some((s) =>
    s.toLocaleLowerCase().includes(q),
  );
}

/**
 * Searchable, category-filterable card grid for picking one item from a catalog (e.g. an "Add widget" drawer).
 * @see docs/components/CatalogPicker.md
 */
// {...rest} last (Pattern A) so the consumer can add data-* / style to the root.
export const CatalogPicker = forwardRef<HTMLDivElement, CatalogPickerProps>(function CatalogPicker(
  { items, categories, onSelect, label, className, ...rest },
  ref,
) {
  const t = useTranslation();
  const id = useId();
  const listboxId = `${id}-listbox`;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const q = query.trim().toLocaleLowerCase();
  const visible = useMemo(
    () => items.filter((it) => (category === ALL || it.category === category) && matches(it, q)),
    [items, category, q],
  );
  // Roving target resets to the first result whenever the filter changes.
  const filterKey = `${category}\u0000${q}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setActive(0);
  }
  const current = Math.min(active, Math.max(visible.length - 1, 0));

  const focusOption = (i: number) => {
    setActive(i);
    optionRefs.current[i]?.focus();
  };

  const columns = () => {
    const el = listRef.current;
    if (!el) return 1;
    const tracks = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
    return Math.max(tracks, 1);
  };

  const select = (item: CatalogPickerItem) => {
    if (!item.disabledReason) onSelect(item.id);
  };

  const onOptionKeyDown = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
    const last = visible.length - 1;
    const rtl = listRef.current ? getComputedStyle(listRef.current).direction === 'rtl' : false;
    const cols = columns();
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
        next = Math.min(i + (rtl ? -1 : 1), last);
        break;
      case 'ArrowLeft':
        next = Math.max(i + (rtl ? 1 : -1), 0);
        break;
      case 'ArrowDown':
        next = Math.min(i + cols, last);
        break;
      case 'ArrowUp':
        if (i - cols < 0) {
          e.preventDefault();
          searchRef.current?.focus();
          return;
        }
        next = i - cols;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        select(visible[i]);
        return;
      default:
        return;
    }
    e.preventDefault();
    focusOption(Math.max(next, 0));
  };

  return (
    <div ref={ref} className={clsx(styles.root, className)} {...rest}>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={16} aria-hidden className={styles.searchIcon} />
          <Input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('catalogPicker.search')}
            aria-label={t('catalogPicker.search')}
            aria-controls={visible.length > 0 ? listboxId : undefined}
            className={styles.searchInput}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && visible.length > 0) {
                e.preventDefault();
                focusOption(0);
              }
            }}
          />
        </div>

        {categories && categories.length > 0 && (
          <div
            role="radiogroup"
            aria-label={t('catalogPicker.categories')}
            className={styles.pills}
          >
            {[{ id: ALL, label: t('catalogPicker.all') }, ...categories].map((c) => (
              <label key={c.id || '__all'} className={styles.pill}>
                <input
                  type="radio"
                  name={`${id}-category`}
                  className={styles.pillInput}
                  checked={category === c.id}
                  onChange={() => setCategory(c.id)}
                />
                <span className={styles.pillLabel}>{c.label}</span>
              </label>
            ))}
          </div>
        )}

        <div role="status" className={styles.count}>
          {t('catalogPicker.resultCount', { count: visible.length })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState size="sm" title={t('catalogPicker.noMatches')} />
      ) : (
        <div ref={listRef} id={listboxId} role="listbox" aria-label={label} className={styles.grid}>
          {visible.map((item, i) => {
            const descId = `${id}-d-${i}`;
            const reasonId = `${id}-r-${i}`;
            const describedBy =
              [item.description && descId, item.disabledReason && reasonId]
                .filter(Boolean)
                .join(' ') || undefined;
            return (
              <div
                key={item.id}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                role="option"
                aria-selected={false}
                aria-disabled={item.disabledReason ? true : undefined}
                aria-labelledby={`${id}-t-${i}`}
                aria-describedby={describedBy}
                tabIndex={i === current ? 0 : -1}
                className={styles.option}
                onClick={() => select(item)}
                onKeyDown={(e) => onOptionKeyDown(e, i)}
                onFocus={() => setActive(i)}
              >
                {item.preview != null && <div className={styles.preview}>{item.preview}</div>}
                <div className={styles.body}>
                  <div className={styles.titleRow}>
                    <span id={`${id}-t-${i}`} className={styles.title}>
                      {item.title}
                    </span>
                    {item.badge != null && <span className={styles.badge}>{item.badge}</span>}
                  </div>
                  {item.description && (
                    <span id={descId} className={styles.description}>
                      {item.description}
                    </span>
                  )}
                  {item.disabledReason && (
                    <span id={reasonId} className={styles.reason}>
                      {item.disabledReason}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
