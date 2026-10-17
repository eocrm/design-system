import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { TopBar, type TopBarSearchGroup } from '@eocrm/design-system';
import { SEARCH_ITEMS } from './navItems';

/** Imperative handle so AppShell's ⌘K listener can focus the search input. */
export interface CommandSearchHandle {
  focus: () => void;
}

/** Playground component search: `<TopBar.Search>` in combobox mode over every navigable destination. */
export const CommandSearch = forwardRef<CommandSearchHandle>(function CommandSearch(_props, ref) {
  const navigate = useNavigate();
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
    const groups = new Map<string, TopBarSearchGroup>();
    for (const i of SEARCH_ITEMS) {
      if (!i.label.toLowerCase().includes(q)) continue;
      const group = groups.get(i.section) ?? { label: i.section, items: [] };
      group.items.push({ id: i.to, label: i.label, icon: <i.icon size={16} /> });
      groups.set(i.section, group);
    }
    return [...groups.values()];
  }, [query]);

  return (
    <TopBar.Search
      ref={inputRef}
      placeholder="Search components & pages…"
      hotkey={['⌘', 'K']}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      results={results}
      onSelect={(_group, item) => {
        navigate(item.id);
        setQuery('');
        inputRef.current?.blur();
      }}
    />
  );
});
