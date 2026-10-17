# TopBar.Search combobox mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Additive combobox mode on `<TopBar.Search>` (issue #652): pass `results` and the search input drives a grouped, keyboard-navigable results panel anchored under it.

**Architecture:** `TopBarSearch.tsx` owns state (open, value, active index), the input's combobox ARIA and keyboard handling. A new internal `TopBarSearchPanel.tsx` stays mounted in combobox mode and owns the live region, the Escape listener (overlay registry), Floating UI positioning and the portalled listbox (rendered only while shown). Without `results` the rendered DOM is unchanged.

**Tech Stack:** React 19, TypeScript, SCSS modules + component tokens, `@floating-ui/react-dom`, Vitest + Testing Library (jsdom), npm workspaces.

**Spec:** `docs/superpowers/specs/2026-10-17-topbar-search-combobox-design.md` — read it before starting any task.

**Worktree:** `/home/dpws/projects/design-system-wt-652`, branch `feat/topbar-search-combobox`. All paths below are relative to it. Run vitest from `packages/design-system` (`npx vitest run <file>`).

## Global Constraints

- Tokens only in `.module.scss`; new values are component tokens in `TopBar.tokens.scss` defaulting to primitives (Hard rule 3).
- Layout properties in TopBar SCSS need a `stylelint-disable property-disallowed-list -- <reason>` block, as the existing file does.
- Every user-facing string via `useTranslation()`; new keys in `messages.ts` + `en.ts` + `ru.ts` (Hard rule 9).
- Every exported prop/type has JSDoc (Hard rule 7). Component JSDoc stays one line + `@see docs/components/TopBar.md`.
- No new dependencies. No `react-router` imports in the library.
- No inline `eslint-disable` for `eocrm/*` rules (CI bans them).
- Tests use vitest globals (no `describe`/`it`/`expect`/`vi` imports).
- `onSelect(item, groupIndex)` — item first.
- Commit messages: plain, no Co-Authored-By / Claude-Session trailers.

## Review Focus

1. Consumer passes `results={query ? data : undefined}` — the input must NOT remount (focus and caret survive the toggle). Test in Task 1.
2. Consumer rebuilds `results` inline every render (new array identity, same ids) — the active row must NOT reset to 0 on unrelated re-renders. Test in Task 1.
3. Result set shrinks below the active index (e.g. active = 4, then 2 results arrive) — highlight clamps, Enter never selects `undefined`. Test in Task 1.
4. Escape inside a `<Modal>` — first press closes the panel only, second closes the Modal; the first press must not also clear the input (native search-clear). Test in Task 2.
5. Loading with results already shown — rows stay visible (no flash to "No results") and the live region says "Searching…". Test in Task 3.

---

### Task 1: Combobox state, ARIA, keyboard, selection, rows

**Files:**

- Create: `packages/design-system/src/components/TopBar/TopBarSearchPanel.tsx`
- Modify: `packages/design-system/src/components/TopBar/TopBarSearch.tsx` (full rewrite below)
- Modify: `packages/design-system/src/components/TopBar/index.ts`
- Modify: `packages/design-system/src/index.ts:587-599`
- Create: `packages/design-system/src/components/TopBar/TopBarSearch.test.tsx`

**Interfaces:**

- Produces (exported from `TopBarSearch.tsx`, re-exported via `TopBar/index.ts` and `src/index.ts` as types): `TopBarSearchItem`, `TopBarSearchGroup`, `TopBarSearchFooterAction`, extended `TopBarSearchProps`.
- Produces (internal, `TopBarSearchPanel.tsx`): `SearchOption`, `TopBarSearchPanelProps`, `TopBarSearchPanel`. Tasks 2 and 3 extend `TopBarSearchPanel` in place.
- CSS class names used (styled in Task 2): `results`, `group`, `groupLabel`, `option`, `optionActive`, `optionIcon`, `optionLabel`, `optionMeta`, `footer`, `status`.

- [ ] **Step 1: Write failing tests**

`packages/design-system/src/components/TopBar/TopBarSearch.test.tsx`:

```tsx
import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar } from './TopBar';
import type { TopBarSearchGroup, TopBarSearchItem } from './TopBarSearch';

const GROUPS: TopBarSearchGroup[] = [
  { label: 'Contacts', items: [{ id: 'c1', label: 'Ada' }, { id: 'c2', label: 'Alan', meta: 'Lead' }] },
  { label: 'Deals', items: [{ id: 'd1', label: 'Acme renewal', href: '/deals/d1' }] },
];

function Harness(props: Partial<React.ComponentProps<typeof TopBar.Search>>) {
  const [value, setValue] = useState('a');
  return (
    <TopBar.Search
      placeholder="Search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      results={GROUPS}
      {...props}
    />
  );
}

const input = () => screen.getByRole('combobox', { name: 'Search' });
const activeOption = () => {
  const id = input().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

describe('TopBar.Search combobox mode', () => {
  it('stays a plain searchbox without results', () => {
    render(<TopBar.Search placeholder="Search" />);
    expect(screen.getByRole('searchbox', { name: 'Search' })).not.toHaveAttribute('aria-expanded');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('wires combobox ARIA and highlights the first option on open', async () => {
    render(<Harness />);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveAttribute('aria-autocomplete', 'list');
    await userEvent.click(input());
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(input()).toHaveAttribute('aria-controls', listbox.id);
    expect(activeOption()).toHaveTextContent('Ada');
    expect(activeOption()).toHaveAttribute('aria-selected', 'true');
  });

  it('labels each group by its heading', async () => {
    render(<Harness />);
    await userEvent.click(input());
    expect(screen.getByRole('group', { name: 'Contacts' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Deals' })).toBeInTheDocument();
  });

  it('ArrowDown/ArrowUp wrap across groups and the footer', async () => {
    render(<Harness footerAction={{ label: 'View all', onSelect: () => {} }} />);
    await userEvent.click(input());
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Acme renewal');
    await userEvent.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('View all');
    await userEvent.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Ada');
    await userEvent.keyboard('{ArrowUp}');
    expect(activeOption()).toHaveTextContent('View all');
  });

  it('Enter selects the active item with its group index and closes', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await userEvent.click(input());
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(GROUPS[1]!.items[0], 1);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveValue('a'); // library never clears the query
  });

  it('Enter on the footer calls footerAction.onSelect', async () => {
    const footer = vi.fn();
    render(<Harness footerAction={{ label: 'View all', onSelect: footer }} />);
    await userEvent.click(input());
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(footer).toHaveBeenCalledTimes(1);
  });

  it('click selects; focus stays in the input while clicking the panel', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await userEvent.click(input());
    await userEvent.click(screen.getByRole('option', { name: /Alan/ }));
    expect(onSelect).toHaveBeenCalledWith(GROUPS[0]!.items[1], 0);
    expect(input()).toHaveFocus();
  });

  it('renders href rows as links and leaves modifier-clicks to the browser', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await userEvent.click(input());
    const link = screen.getByRole('option', { name: 'Acme renewal' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/deals/d1');
    await userEvent.keyboard('{Control>}');
    await userEvent.click(link);
    await userEvent.keyboard('{/Control}');
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.click(link);
    expect(onSelect).toHaveBeenCalledWith(GROUPS[1]!.items[0], 1);
  });

  it('hover moves the highlight', async () => {
    render(<Harness />);
    await userEvent.click(input());
    await userEvent.hover(screen.getByRole('option', { name: /Alan/ }));
    expect(activeOption()).toHaveTextContent('Alan');
  });

  it('closes on blur and reopens on click', async () => {
    render(
      <>
        <Harness />
        <button type="button">elsewhere</button>
      </>,
    );
    await userEvent.click(input());
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(input());
    expect(input()).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows nothing for an empty query with no results', async () => {
    render(<TopBar.Search placeholder="Search" results={[]} />);
    await userEvent.click(input());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports controlled open', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Harness open={false} onOpenChange={onOpenChange} />);
    await userEvent.click(input());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    rerender(<Harness open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('supports uncontrolled defaultOpen with defaultValue', () => {
    render(<TopBar.Search placeholder="Search" defaultValue="a" defaultOpen results={GROUPS} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  // Review Focus 1
  it('does not remount the input when results toggles between undefined and an array', async () => {
    function Toggle() {
      const [value, setValue] = useState('');
      return (
        <TopBar.Search
          placeholder="Search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          results={value ? GROUPS : undefined}
        />
      );
    }
    render(<Toggle />);
    const before = screen.getByRole('searchbox');
    await userEvent.click(before);
    await userEvent.keyboard('a');
    expect(input()).toBe(before);
    expect(input()).toHaveFocus();
  });

  // Review Focus 2
  it('keeps the highlight when results is rebuilt with the same ids', async () => {
    function Rebuild() {
      const [n, setN] = useState(0);
      return (
        <>
          <TopBar.Search
            placeholder="Search"
            defaultValue="a"
            defaultOpen
            results={GROUPS.map((g) => ({ ...g, items: [...g.items] }))}
          />
          <span data-n={n} />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setN(n + 1)}>
            rerender
          </button>
        </>
      );
    }
    render(<Rebuild />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.click(screen.getByRole('button', { name: 'rerender' }));
    expect(activeOption()).toHaveTextContent('Alan');
  });

  // Review Focus 3
  it('clamps the highlight when results shrink', async () => {
    const many: TopBarSearchItem[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id }));
    const onSelect = vi.fn();
    const { rerender } = render(
      <TopBar.Search placeholder="Search" defaultValue="x" defaultOpen results={[{ label: 'G', items: many }]} onSelect={onSelect} />,
    );
    input().focus();
    await userEvent.keyboard('{ArrowUp}'); // wraps to 'd' (index 3)
    rerender(
      <TopBar.Search placeholder="Search" defaultValue="x" defaultOpen results={[{ label: 'G', items: many.slice(0, 2) }]} onSelect={onSelect} />,
    );
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(many[0], 0); // set changed -> reset to first
  });
});
```

(`act` is imported for Task 3's additions; remove the import if unused at the end of Task 1 to keep lint green.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/design-system && npx vitest run src/components/TopBar/TopBarSearch.test.tsx`
Expected: FAIL — no `combobox` role / `results` prop is not a known prop (TS) / options missing.

- [ ] **Step 3: Create `TopBarSearchPanel.tsx` (rendering only; positioning, Escape and live region come in Tasks 2–3)**

```tsx
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
  label: string;
  groupIndex: number;
  start: number;
  items: TopBarSearchItem[];
}

export interface TopBarSearchPanelProps {
  /** listbox id (input's `aria-controls`); option ids derive from it. */
  id: string;
  /** Render the portalled listbox. The component itself stays mounted in combobox mode. */
  shown: boolean;
  /** The listbox's accessible name (the input's name). */
  label: string;
  groups: PanelGroup[];
  options: SearchOption[];
  activeIndex: number;
  onActivate: (index: number) => void;
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

  const row = (index: number, item: { label: ReactNode; meta?: ReactNode; icon?: ReactNode; href?: string }, className?: string) => {
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
  const footer = footerIndex >= 0 ? (options[footerIndex] as Extract<SearchOption, { kind: 'footer' }>) : null;

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
        <div key={g.groupIndex} role="group" aria-labelledby={`${id}-g${g.groupIndex}`} className={styles.group}>
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
```

- [ ] **Step 4: Rewrite `TopBarSearch.tsx`**

```tsx
import {
  forwardRef,
  useEffect,
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
import { mergeRefs } from '../_internal/refs';
import { TopBarSearchPanel, optionId, type PanelGroup, type SearchOption } from './TopBarSearchPanel';
import styles from './TopBar.module.scss';

/** One result row in `<TopBar.Search>` combobox mode. */
export interface TopBarSearchItem {
  /** Unique across ALL groups — used as the React key. */
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
  items: TopBarSearchItem[];
}

/** Trailing row in the ↑/↓ cycle, e.g. "View all results". */
export interface TopBarSearchFooterAction {
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
 * fixed to `'search'`, and the native `onSelect` text-selection event,
 * replaced by the combobox `onSelect`). Spread `value` / `defaultValue` /
 * `onChange` / `name` / `id` through normally — they reach the input.
 */
export interface TopBarSearchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onSelect'> {
  /** (existing JSDoc — keep verbatim) */
  hotkey?: string | string[];
  /** (existing JSDoc — keep verbatim) */
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
  /** Shows a loading row and sets `aria-busy`; existing results stay visible. */
  loading?: boolean;
  /** Row shown for a non-empty query with no results. Default `t('topBar.searchEmpty')`. */
  emptyMessage?: ReactNode;
  /** Trailing row in the ↑/↓ cycle (e.g. "View all results"). Shown only alongside other panel content. */
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

  // Reset to the first row when the SET of ids changes — not on every new
  // array identity, so a consumer rebuilding `results` inline keeps the highlight.
  const signature = options.map((o) => (o.kind === 'item' ? o.item.id : '\u0000footer')).join('\u0000');
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [signature]);
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
    } else if (e.key === 'Enter' && shown && activeIndex >= 0) {
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
          'aria-activedescendant': shown && activeIndex >= 0 ? optionId(listboxId, activeIndex) : undefined,
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
        />
      )}
    </div>
  );
});
```

Notes for the implementer:

- `ref` is the consumer's ref; nothing internal needs the input element, so no `mergeRefs` is required — drop the `mergeRefs` import if lint flags it unused. `wrapperRef` is used by Task 2 (Floating UI reference + `useInOverlay`); pass it to the panel then.
- Keep the two original JSDoc blocks for `hotkey` and `className` verbatim (replace the "(existing JSDoc — keep verbatim)" markers with the current text from `main`).
- `defaultValue` stays in `inputProps` and still reaches the input.

- [ ] **Step 5: Export the new types**

`packages/design-system/src/components/TopBar/index.ts`:

```ts
export type {
  TopBarSearchProps,
  TopBarSearchGroup,
  TopBarSearchItem,
  TopBarSearchFooterAction,
} from './TopBarSearch';
```

(replacing the single `export type { TopBarSearchProps } from './TopBarSearch';` line). In `packages/design-system/src/index.ts` add `TopBarSearchGroup`, `TopBarSearchItem`, `TopBarSearchFooterAction` to the TopBar type export list after `TopBarSearchProps`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/design-system && npx vitest run src/components/TopBar/ src/publicApi.test.ts`
Expected: PASS (existing `TopBar.test.tsx` included — plain mode unchanged).

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/TopBar packages/design-system/src/index.ts
git commit -m "feat(TopBar): combobox state, keyboard and result rows for TopBar.Search (#652)"
```

---

### Task 2: Positioning, Escape via the overlay registry, styles + tokens

**Files:**

- Modify: `packages/design-system/src/components/TopBar/TopBarSearchPanel.tsx`
- Modify: `packages/design-system/src/components/TopBar/TopBarSearch.tsx` (pass `anchorRef={wrapperRef}`)
- Modify: `packages/design-system/src/components/TopBar/TopBar.tokens.scss`
- Modify: `packages/design-system/src/components/TopBar/TopBar.module.scss`
- Modify: `packages/design-system/src/components/_internal/overlay/escapeYield.test.tsx`
- Test: `packages/design-system/src/components/TopBar/TopBarSearch.test.tsx`

**Interfaces:**

- Consumes: `TopBarSearchPanelProps` from Task 1; `useFloatingSurface`, `overlayStack`, `useInOverlay` from `../_internal/overlay`.
- Produces: new prop `anchorRef: RefObject<HTMLDivElement | null>` on `TopBarSearchPanelProps`; `onClose: () => void` on `TopBarSearchPanelProps` (TopBarSearch passes `() => setOpen(false)`).

- [ ] **Step 1: Write failing tests**

Append to `TopBarSearch.test.tsx` (inside the `describe`):

```tsx
  it('Escape closes the panel and prevents the native search clear', async () => {
    render(<Harness />);
    await userEvent.click(input());
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      input().dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(true);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveValue('a');
  });

  it('Escape with the panel closed is left to the browser', async () => {
    render(<Harness />);
    await userEvent.click(input());
    await userEvent.keyboard('{Escape}');
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      input().dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(false);
  });
```

Append a case to `escapeYield.test.tsx` following that file's existing per-surface case style (Host wraps children in an open Modal; the first Escape closes only the surface, the second closes the Modal). Add `import { TopBar } from '../../TopBar';` and:

```tsx
  it('TopBar.Search results panel: first Escape closes the panel, second the Modal', async () => {
    render(
      <Host>
        <TopBar.Search
          placeholder="Search"
          defaultValue="a"
          results={[{ label: 'G', items: [{ id: '1', label: 'One' }] }]}
        />
      </Host>,
    );
    const input = screen.getByRole('combobox', { name: 'Search' });
    await userEvent.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Host' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Host' })).not.toBeInTheDocument();
  });
```

(Adapt `screen.getByRole('dialog', …)` / waiting to whatever the neighbouring cases in that file use to assert the Modal closed — copy their pattern exactly.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/design-system && npx vitest run src/components/TopBar/TopBarSearch.test.tsx src/components/_internal/overlay/escapeYield.test.tsx`
Expected: the three new cases FAIL (Escape does nothing yet; Modal closes on the first press).

- [ ] **Step 3: Add Escape handling, floating registration and positioning to the panel**

In `TopBarSearchPanel.tsx` add imports:

```tsx
import { useEffect, useRef, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';
import { mergeRefs } from '../_internal/refs';
import { overlayStack, useFloatingSurface, useInOverlay } from '../_internal/overlay';
```

Add to `TopBarSearchPanelProps`:

```tsx
  /** The search pill — Floating UI reference and overlay-elevation probe. */
  anchorRef: RefObject<HTMLDivElement | null>;
  /** Close request (Escape). */
  onClose: () => void;
```

At the top of the component body:

```tsx
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

  const { refs, floatingStyles } = useFloating({
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
```

On the listbox `<div>`: `ref={mergeRefs<HTMLDivElement>(panelRef, refs.setFloating)}`, `style={floatingStyles}`, `data-in-overlay={inOverlay ? '' : undefined}`.

`onClose` must be stable enough not to churn the listener; in `TopBarSearch.tsx` pass `onClose={() => setOpen(false)}` and `anchorRef={wrapperRef}` — re-subscribing per render is acceptable (cheap, same pattern as Popover's closeAll dep).

- [ ] **Step 4: Tokens**

In `TopBar.tokens.scss`, after the `// ─── Search` block add:

```scss
  // ─── Search results panel (combobox mode) ─────────────────────────────
  --topbar-results-max-width: 460px;
  --topbar-results-max-height: 360px;
  --topbar-results-bg: var(--color-bg);
  --topbar-results-border-color: var(--color-border);
  --topbar-results-radius: var(--radius-md);
  --topbar-results-shadow: var(--shadow-lg);
  --topbar-results-padding: var(--space-1);
  --topbar-results-z: var(--z-popover);
  --topbar-results-group-label-padding: var(--space-2);
  --topbar-results-group-label-font-size: var(--font-size-xs);
  --topbar-results-group-label-fg: var(--color-fg-muted);
  --topbar-results-option-gap: var(--space-2);
  --topbar-results-option-padding: var(--space-2);
  --topbar-results-option-radius: var(--radius-sm);
  --topbar-results-option-fg: var(--color-fg);
  --topbar-results-option-bg-active: var(--color-bg-muted);
  --topbar-results-icon-fg: var(--color-fg-muted);
  --topbar-results-meta-fg: var(--color-fg-muted);
  --topbar-results-meta-font-size: var(--font-size-xs);
  --topbar-results-status-fg: var(--color-fg-muted);
  --topbar-results-status-font-size: var(--font-size-sm);
  --topbar-results-footer-border-color: var(--color-border);
```

- [ ] **Step 5: Styles**

Append to `TopBar.module.scss` (before the IconButton section):

```scss
// ─── Search results panel (combobox mode) ──────────────────────────────
// stylelint-disable property-disallowed-list -- portalled floating surface:
// Floating UI positions it; z-index and viewport-bounded geometry are its
// job, exactly like Select's `.listbox`. The geometry vars are written by
// TopBarSearchPanel's size middleware; fallbacks cover the first frame.
.results {
  z-index: var(--topbar-results-z);
  box-sizing: border-box;
  min-width: min(
    var(--topbar-results-min-width, 0px),
    var(--topbar-results-available-width, 100vw)
  );
  max-width: min(var(--topbar-results-max-width), var(--topbar-results-available-width, 100vw));
  max-height: min(var(--topbar-results-max-height), var(--topbar-results-available-height, 100vh));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--topbar-results-padding);
  background: var(--topbar-results-bg);
  border: var(--border-width) solid var(--topbar-results-border-color);
  border-radius: var(--topbar-results-radius);
  box-shadow: var(--topbar-results-shadow);
}
// stylelint-enable property-disallowed-list

.results[data-in-overlay] {
  z-index: var(--z-overlay-floating);
}

.groupLabel {
  padding: var(--topbar-results-group-label-padding);
  color: var(--topbar-results-group-label-fg);
  font-size: var(--topbar-results-group-label-font-size);
}

.option {
  display: flex;
  align-items: center;
  gap: var(--topbar-results-option-gap);
  padding: var(--topbar-results-option-padding);
  border-radius: var(--topbar-results-option-radius);
  color: var(--topbar-results-option-fg);
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- link rows look like the div rows
  text-decoration: none;
  cursor: pointer;
}

.optionActive {
  background: var(--topbar-results-option-bg-active);
}

// stylelint-disable property-disallowed-list -- row internals: the label
// takes the remaining width so it truncates; icon and meta keep their size.
.optionIcon {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--topbar-results-icon-fg);
}

.optionLabel {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.optionMeta {
  flex-shrink: 0;
  color: var(--topbar-results-meta-fg);
  font-size: var(--topbar-results-meta-font-size);
}
// stylelint-enable property-disallowed-list

.footer {
  border-top: var(--border-width) solid var(--topbar-results-footer-border-color);
}

.status {
  padding: var(--topbar-results-option-padding);
  color: var(--topbar-results-status-fg);
  font-size: var(--topbar-results-status-font-size);
}
```

If stylelint rejects a fallback literal (`0px`, `100vw`, `100vh`), copy the exact disable comment Select.module.scss uses for the same construct. The `.footer` top border sits flush against the previous row — acceptable; do not add margins.

- [ ] **Step 6: Run tests + style lint**

Run: `cd packages/design-system && npx vitest run src/components/TopBar/ src/components/_internal/overlay/ && cd ../.. && npx stylelint "packages/design-system/src/components/TopBar/*.scss"`
Expected: PASS, no stylelint errors.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/TopBar packages/design-system/src/components/_internal/overlay/escapeYield.test.tsx
git commit -m "feat(TopBar): position results panel, Escape via overlay registry, panel styles (#652)"
```

---

### Task 3: Loading, empty row and announcements (Hard rule 10)

Read `.claude/skills/transient-state-a11y/SKILL.md` first.

**Files:**

- Modify: `packages/design-system/src/i18n/messages.ts` (topBar block ~line 896)
- Modify: `packages/design-system/src/i18n/en.ts` (topBar block ~line 426)
- Modify: `packages/design-system/src/i18n/ru.ts` (topBar block ~line 433)
- Modify: `packages/design-system/src/components/TopBar/TopBarSearchPanel.tsx`
- Modify: `packages/design-system/src/components/TopBar/TopBarSearch.tsx`
- Modify: `tools/eslint-plugin-eocrm/rules/aria-busy-needs-announcement.mjs`, `tools/eslint-plugin-eocrm/rules.test.mjs`
- Test: `packages/design-system/src/components/TopBar/TopBarSearch.test.tsx`

**Interfaces:**

- Consumes: Task 2's panel.
- Produces: panel props `loading: boolean`, `emptyMessage: ReactNode | null` (null = no empty row), `announcement: string`.

- [ ] **Step 1: Write failing tests**

Append inside the `describe`:

```tsx
  it('shows the empty row for a non-empty query and announces it', async () => {
    render(<Harness results={[]} />);
    await userEvent.click(input());
    expect(screen.getByRole('listbox')).toHaveTextContent('No results');
    expect(await screen.findByRole('status')).toHaveTextContent('No results');
  });

  it('uses a custom emptyMessage', async () => {
    render(<Harness results={[]} emptyMessage="Nothing for that" />);
    await userEvent.click(input());
    expect(screen.getByRole('listbox')).toHaveTextContent('Nothing for that');
  });

  it('announces the result count', async () => {
    render(<Harness />);
    await userEvent.click(input());
    expect(await screen.findByRole('status')).toHaveTextContent('3 results');
  });

  // Review Focus 5
  it('keeps rows visible while loading, marks busy and announces loading', async () => {
    render(<Harness loading />);
    await userEvent.click(input());
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('option', { name: 'Ada' })).toBeInTheDocument();
    expect(listbox).toHaveTextContent('Searching…');
    expect(listbox).not.toHaveTextContent('No results');
    expect(await screen.findByRole('status')).toHaveTextContent('Searching…');
  });

  it('shows the panel while loading even for an empty query', async () => {
    render(<TopBar.Search placeholder="Search" results={[]} loading />);
    await userEvent.click(input());
    expect(screen.getByRole('listbox')).toHaveTextContent('Searching…');
  });
```

Add a ru test in `TopBarSearch.test.tsx` (import `I18nProvider` from `'../../i18n/I18nProvider'`):

```tsx
  it('pluralises the count in Russian', async () => {
    render(
      <I18nProvider locale="ru">
        <TopBar.Search placeholder="Поиск" defaultValue="a" defaultOpen results={GROUPS} />
      </I18nProvider>,
    );
    expect(await screen.findByRole('status')).toHaveTextContent('3 результата');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/design-system && npx vitest run src/components/TopBar/TopBarSearch.test.tsx`
Expected: new cases FAIL (no status region, no empty/loading rows).

- [ ] **Step 3: i18n keys**

`messages.ts`, inside `topBar: { … }` after `search`:

```ts
    /** Default `emptyMessage` of the `<TopBar.Search>` results panel; also announced. */
    searchEmpty: string;
    /** Loading row of the `<TopBar.Search>` results panel; also announced. */
    searchLoading: string;
    /** Live-region result count of the `<TopBar.Search>` results panel. */
    searchResults: (params: { count: number }) => string;
```

`en.ts`:

```ts
    searchEmpty: 'No results',
    searchLoading: 'Searching…',
    searchResults: ({ count }) =>
      `${count as number} ${(count as number) === 1 ? 'result' : 'results'}`,
```

`ru.ts` (uses the file's existing `ruPlural`):

```ts
    searchEmpty: 'Ничего не найдено',
    searchLoading: 'Поиск…',
    searchResults: ({ count }) =>
      `${count as number} ${ruPlural(count as number, ['результат', 'результата', 'результатов'])}`,
```

- [ ] **Step 4: Panel — loading/empty rows, aria-busy, live region**

In `TopBarSearchPanel.tsx` add `import { LiveRegion } from '../LiveRegion';` and props:

```tsx
  /** Loading row + `aria-busy`. */
  loading: boolean;
  /** Empty row content, or `null` for no empty row. */
  emptyMessage: ReactNode | null;
  /** Live-region text ('' when the panel is hidden). */
  announcement: string;
```

Change the render so the component returns the always-mounted live region plus the conditional portal:

```tsx
  return (
    <>
      <LiveRegion>{announcement}</LiveRegion>
      {shown &&
        createPortal(
          <div
            /* …existing listbox attributes… */
            aria-busy={loading || undefined}
          >
            {/* …existing groups… */}
            {loading && <div className={styles.status}>{t('topBar.searchLoading')}</div>}
            {emptyMessage != null && <div className={styles.status}>{emptyMessage}</div>}
            {/* …existing footer… */}
          </div>,
          document.body,
        )}
    </>
  );
```

(remove the earlier `if (!shown) return null;`; add `const t = useTranslation();` with `import { useTranslation } from '../../i18n';`.)

- [ ] **Step 5: TopBarSearch — compute and pass the new props**

```tsx
  const empty = !loading && !hasItems ? (emptyMessage ?? t('topBar.searchEmpty')) : null;
  const announcement = !shown
    ? ''
    : loading
      ? t('topBar.searchLoading')
      : hasItems
        ? t('topBar.searchResults', { count: options.filter((o) => o.kind === 'item').length })
        : typeof empty === 'string'
          ? empty
          : t('topBar.searchEmpty');
```

Pass `loading={loading}`, `emptyMessage={shown ? empty : null}`, `announcement={announcement}`.

- [ ] **Step 6: Lint rule counts `<LiveRegion>`**

The `eocrm/aria-busy-needs-announcement` rule is per-file and does not yet recognise `<LiveRegion>` (which always renders `role="status"`/`"alert"`). In `tools/eslint-plugin-eocrm/rules/aria-busy-needs-announcement.mjs`, at the top of the `JSXOpeningElement(node)` visitor add:

```js
        // <LiveRegion> always renders role="status"/"alert".
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'LiveRegion') announced = true;
```

In `tools/eslint-plugin-eocrm/rules.test.mjs`, add to the rule's `valid` list (next to the `VisuallyHidden` case):

```js
    `const A = () => <><div aria-busy={b} /><LiveRegion>{status}</LiveRegion></>;`,
```

Run: `node --test tools/eslint-plugin-eocrm/rules.test.mjs` (or the command in the root `package.json` that runs it) — expect PASS.

- [ ] **Step 7: Run tests + lint**

Run: `cd packages/design-system && npx vitest run src/components/TopBar/ src/i18n && cd ../.. && make lint`
Expected: PASS. If an i18n parity test exists (en/ru key sets), it passes because both locales got all three keys.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src tools/eslint-plugin-eocrm
git commit -m "feat(TopBar): loading/empty rows and live-region announcements for search results (#652)"
```

---

### Task 4: Playground — CommandSearch on combobox mode + TopBar demo

**Files:**

- Modify: `packages/playground/src/layout/AppShell/CommandSearch.tsx` (full rewrite)
- Delete: `packages/playground/src/layout/AppShell/CommandSearch.module.scss`
- Modify: `packages/playground/src/pages/components/TopBarDemo.tsx`

**Interfaces:**

- Consumes: `TopBar`, `TopBarSearchGroup`, `TopBarSearchItem` from `@eocrm/design-system`; `SEARCH_ITEMS` (`{ to, label, section, icon }[]`) from `./navItems`.
- Produces: unchanged `CommandSearch` + `CommandSearchHandle` exports (AppShell untouched).

- [ ] **Step 1: Rewrite `CommandSearch.tsx`**

```tsx
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
```

Delete `CommandSearch.module.scss` (`git rm`).

- [ ] **Step 2: TopBar demo example**

In `TopBarDemo.tsx` add a new `<Example>` (match the file's existing `Example` usage — title, description, `code` string) titled "Combobox search (`results`)". Example component:

```tsx
const PEOPLE = ['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Katherine Johnson'];
const DEALS = ['Acme renewal', 'Globex expansion', 'Initech pilot'];

function ComboboxSearchExample() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const match = (list: string[]) =>
    q ? list.filter((s) => s.toLowerCase().includes(q)) : [];
  const results = [
    { label: 'Contacts', items: match(PEOPLE).map((s) => ({ id: `c:${s}`, label: s, meta: 'Contact', icon: <User size={16} /> })) },
    { label: 'Deals', items: match(DEALS).map((s) => ({ id: `d:${s}`, label: s, meta: 'Deal', icon: <Briefcase size={16} /> })) },
  ];
  return (
    <Stack gap="3">
      <TopBarStage height={320}>
        <TopBar>
          <TopBar.Start>
            <TopBar.Search
              placeholder="Search contacts, deals…"
              hotkey={['⌘', 'K']}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              results={results}
              loading={loading}
              onSelect={(item) => setPicked(String(item.label))}
              footerAction={{ label: `View all results for “${query}”`, onSelect: () => setPicked(`all: ${query}`) }}
            />
          </TopBar.Start>
        </TopBar>
      </TopBarStage>
      <Cluster gap="3">
        <Switch checked={loading} onCheckedChange={setLoading} label="Loading" />
        <Text tone="muted">Selected: {picked ?? '—'}</Text>
      </Cluster>
    </Stack>
  );
}
```

Add `Briefcase, User` to the lucide import and `Cluster, Stack, Switch` to the `@eocrm/design-system` import. Check `Switch`'s actual prop names (`checked` / `onCheckedChange` / `label`) in `packages/design-system/src/components/Switch/Switch.tsx` and adapt; same for `Stack`/`Cluster` `gap` values.

- [ ] **Step 3: Typecheck + lint the playground**

Run: `npm run typecheck --workspaces --if-present && make lint` (or the root typecheck script — check root `package.json`)
Expected: PASS.

- [ ] **Step 4: Visual check (port 8090+, never the default)**

Run the playground on port 8091 (`npm run dev --workspace playground -- --port 8091`, background), open with Playwright: type "but" in the shell search → grouped panel under the pill, first row highlighted, ↓/↑ wrap, Enter navigates, Esc closes; on `/components/topbar` the combobox example shows groups, footer, loading toggle. Screenshot both. Kill the dev server and the Playwright Chrome afterwards.

- [ ] **Step 5: Commit**

```bash
git add -A packages/playground
git commit -m "feat(playground): CommandSearch on TopBar.Search combobox mode; TopBar demo example (#652)"
```

---

### Task 5: Docs, primer, manifest, full gates

**Files:**

- Modify: `packages/design-system/docs/components/TopBar.md`
- Modify: `packages/design-system/AI-PRIMER.md:216`
- Regenerate: `packages/design-system/src/components.manifest.json` (if `build:manifest` changes it)

- [ ] **Step 1: Docs prose**

In `docs/components/TopBar.md`:

- Replace the "❌ Command-palette experience — `<TopBar.Search>` is a plain text input. Compose `<Popover>` + `<OptionsPicker>`…" bullet with: "❌ Wrapping `<TopBar.Search>` in `<Popover>` to show results — use combobox mode (`results`)."
- Add an i18n line entry for `topBar.searchEmpty`, `topBar.searchLoading`, `topBar.searchResults`.
- After the bullet list that follows `<!-- props:end -->`, add a `### Combobox mode (\`results\`)` section with: a TL;DR snippet (controlled `value`, fetched `results`, `loading`, `onSelect` routing via `item.href`/id, `footerAction`); behaviour bullets (first row highlighted on every new id set; ↑/↓ wrap incl. footer; Enter/click → `onSelect(item, groupIndex)`, panel closes, text kept; Esc closes innermost-first and does not clear; blur closes; `href` rows open natively on Cmd/Ctrl/Shift/middle-click; panel at least as wide as the pill, height capped, scrolls; count/loading/empty announced); "When NOT to use" (picking a form value → `Select`; filter chips → `OptionsPicker`; a command palette in a modal → not covered); anti-patterns (toggling `results` between `undefined` and an array is fine but don't key/remount the search; ids must be unique across groups; don't clear the input inside `onChange`; don't navigate in both `onSelect` and via the `<a>` default — the library already prevents the default on plain clicks).

- [ ] **Step 2: Generated props table + primer**

Run: `cd packages/design-system && npm run build:docs`
Expected: the `TopBarSearchProps` table gains `results`, `open`, `defaultOpen`, `onOpenChange`, `onSelect`, `loading`, `emptyMessage`, `footerAction` (and tables for the new interfaces if the generator emits them).

`AI-PRIMER.md:216` → ``- [`TopBar`](docs/components/TopBar.md) — sticky application top bar; `TopBar.Search` with `results` is the global-search combobox``

- [ ] **Step 3: Manifest**

Run: `cd packages/design-system && npm run build:manifest`
(TopBar now imports `LiveRegion`; the import graph changes `composes`/`composedBy`. No `CLUSTERS` edit — not a new component.)

- [ ] **Step 4: Full gates**

```bash
cd /home/dpws/projects/design-system-wt-652
make test; echo "test=$?"
make build-lib; echo "build=$?"
make lint; echo "lint=$?"
npm run format:check; echo "format=$?"
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'
```

Expected: every exit code `0`; the pack grep prints `0`. Fix and re-run on any failure (`npx prettier --write` on touched files for format).

- [ ] **Step 5: Commit**

```bash
git add -A packages/design-system
git commit -m "docs(TopBar): combobox mode docs, props table, primer line, manifest (#652)"
```
