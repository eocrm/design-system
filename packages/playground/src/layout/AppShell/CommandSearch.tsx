import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { TopBar } from '@eocrm/design-system';
import { SEARCH_ITEMS } from './navItems';
import styles from './CommandSearch.module.scss';

/** Imperative handle so AppShell's ⌘K listener can focus the search input. */
export interface CommandSearchHandle {
  focus: () => void;
}

/**
 * Reusable component search: drives <TopBar.Search> as a combobox and shows a
 * results listbox anchored directly under it. Type to filter every navigable
 * destination (components, reference pages, mockups); ↑/↓ move the active row,
 * Enter navigates, Esc clears, click-outside closes. Focus stays in the input.
 */
export const CommandSearch = forwardRef<CommandSearchHandle>(function CommandSearch(_props, ref) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listboxId = useId();

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_ITEMS.filter((i) => i.label.toLowerCase().includes(q));
  }, [query]);

  // Reset the active row whenever the query changes.
  useEffect(() => {
    setActive(0);
  }, [query]);

  // Close on outside click (mousedown so it beats the option's onClick).
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const showPanel = open && query.trim().length > 0;

  const go = (to: string) => {
    navigate(to);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (results.length) {
        e.preventDefault();
        setActive((a) => (a + 1) % results.length);
      }
    } else if (e.key === 'ArrowUp') {
      if (results.length) {
        e.preventDefault();
        setActive((a) => (a - 1 + results.length) % results.length);
      }
    } else if (e.key === 'Enter') {
      if (showPanel && results[active]) {
        e.preventDefault();
        go(results[active].to);
      }
    } else if (e.key === 'Escape') {
      setQuery('');
      setOpen(false);
    }
  };

  const activeOptionId = showPanel && results[active] ? `${listboxId}-opt-${active}` : undefined;

  return (
    <div ref={containerRef} className={styles.wrap}>
      <TopBar.Search
        ref={inputRef}
        placeholder="Search components & pages…"
        hotkey={['⌘', 'K']}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
      />
      {showPanel && (
        <div className={styles.panel} id={listboxId} role="listbox" aria-label="Search results">
          {results.length === 0 ? (
            <div className={styles.empty} aria-disabled="true">
              No results
            </div>
          ) : (
            results.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.to}
                  type="button"
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={clsx(styles.option, i === active && styles.optionActive)}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(item.to)}
                >
                  <Icon size={16} className={styles.optionIcon} aria-hidden="true" />
                  <span className={styles.optionLabel}>{item.label}</span>
                  <span className={styles.optionSection}>{item.section}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
});
