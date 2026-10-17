import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useHref, useNavigate } from 'react-router';
import { TopBar, type TopBarSearchGroup, type TopBarSearchItem } from '@eocrm/design-system';
import { SEARCH_ITEMS } from './navItems';

/** Imperative handle so AppShell's ⌘K listener can focus the search input. */
export interface CommandSearchHandle {
  focus: () => void;
}

/**
 * Playground component search on <TopBar.Search> combobox mode: filters every
 * navigable destination, grouped by section. Rows carry hrefs so Cmd/Ctrl-click
 * opens a new tab; a plain click or Enter routes in-app.
 */
export const CommandSearch = forwardRef<CommandSearchHandle>(function CommandSearch(_props, ref) {
  const navigate = useNavigate();
  // Router basename (GitHub Pages sub-path) so hrefs work outside the router.
  const base = useHref('/').replace(/\/$/, '');
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }));

  const results = useMemo<TopBarSearchGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const bySection = new Map<string, TopBarSearchItem[]>();
    for (const i of SEARCH_ITEMS) {
      if (!i.label.toLowerCase().includes(q)) continue;
      const Icon = i.icon;
      const items = bySection.get(i.section) ?? [];
      items.push({ id: i.to, label: i.label, icon: <Icon size={16} />, href: base + i.to });
      bySection.set(i.section, items);
    }
    return [...bySection].map(([label, items]) => ({ label, items }));
  }, [query, base]);

  return (
    <TopBar.Search
      ref={inputRef}
      placeholder="Search components & pages…"
      hotkey={['⌘', 'K']}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      results={results}
      onSelect={(item) => {
        navigate(item.id);
        setQuery('');
        inputRef.current?.blur();
      }}
    />
  );
});
