# Component Search (⌘K Typeahead) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the playground's component list searchable — reuse the TopBar search box as a live combobox whose results drop into a panel anchored under it, focused by ⌘K, Enter navigates.

**Architecture:** Extract the rail's nav destinations into a shared `navItems.ts` (single source of truth for the rail + search). A new `CommandSearch` playground component drives `TopBar.Search` as a controlled combobox input with a hand-rolled, absolutely-positioned results listbox beneath it (the DS `Popover` is rejected — it moves focus into the panel, which breaks typeahead). `AppShell` renders `<CommandSearch>` in `TopBar.Start` and binds a global ⌘K/Ctrl+K listener that focuses it.

**Tech Stack:** React + TypeScript, react-router `useNavigate`, the DS `TopBar.Search` (forwardRef → input), CSS modules; Playwright for verification.

**Spec:** `docs/superpowers/specs/2026-06-07-component-search-design.md`

**Branch:** `feat/component-search` (already checked out; spec commit `fbd38f2` is on it).

---

## Notes for the implementer (read first)

- **Playground-only, no library change.** Everything is under `packages/playground/src/layout/AppShell/`. No DS component, no `index.ts`, no manifest, no version bump. Rule 6/7 (mockups) do NOT apply — `AppShell` is tooling.
- **No playground tests exist** (no vitest config in `packages/playground`). Do NOT add a test setup. The functional gate is **Playwright** (Task 4); the build/lint gates catch type/style errors.
- **`TopBar.Search` is `forwardRef<HTMLInputElement>`** and spreads consumer props onto the `<input>` last — so `ref`, `value`, `onChange`, `onKeyDown`, `onFocus`, `role`, `aria-*` all reach the input; `className` goes to its wrapper div.
- **`clsx`** is available in the playground (used by `CodeBlock.tsx`).
- **stylelint runs over playground SCSS** (`packages/**/src/**/*.{css,scss}`): colors/backgrounds must be `var(--…)` tokens (declaration-strict-value); raw px for width/height/z-index is allowed (as in the existing `CodeBlock.module.scss`).
- **Commit through a PR.** Push once, after Task 4.

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `packages/playground/src/layout/AppShell/navItems.ts` | **Create** | The rail's nav data (moved out of AppShell) + the derived flat `SEARCH_ITEMS`. Pure data, no JSX. |
| `packages/playground/src/layout/AppShell/CommandSearch.tsx` | **Create** | The combobox: `TopBar.Search`-driven controlled input + anchored results listbox + keyboard nav + `useNavigate`; exposes a `focus()` handle via `ref`. |
| `packages/playground/src/layout/AppShell/CommandSearch.module.scss` | **Create** | The relative wrapper + absolute results panel + option row styles (tokens for color, raw px for sizing). |
| `packages/playground/src/layout/AppShell/AppShell.tsx` | Modify | Import nav data from `navItems.ts` (remove inline arrays + their now-unused lucide imports); render `<CommandSearch ref>` in `TopBar.Start`; add the global ⌘K/Ctrl+K keydown effect that focuses it. |

---

## Task 1: Extract `navItems.ts` (behavior-neutral refactor)

**Files:**
- Create: `packages/playground/src/layout/AppShell/navItems.ts`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`

Move the rail's data out of `AppShell.tsx` so the rail and the upcoming search share one source of truth. This task changes **no behavior** — the rail must render identically.

- [ ] **Step 1: Create `navItems.ts` with the moved data + `SEARCH_ITEMS`**

Create `packages/playground/src/layout/AppShell/navItems.ts`. Move into it, **verbatim**, these definitions currently in `AppShell.tsx`: the `NavItem` interface, and the consts `mockupItems`, `componentOverview`, `tokensReference`, `architectureReference`, and `componentGroups`. Add `export` to each. Import the lucide icons they reference + the `LucideIcon` type here. Then append the derived flat search list:

```ts
import {
  // …import EXACTLY the lucide icons referenced by the arrays below
  // (the ones moved out of AppShell), plus the type:
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
}

// … the moved `export const mockupItems`, `componentOverview`,
//     `tokensReference`, `architectureReference`, `componentGroups` …

/** One flat, searchable destination. */
export interface SearchItem {
  to: string;
  label: string;
  section: string;
  icon: LucideIcon;
}

/**
 * Flat jump-to list derived from the same arrays the rail renders, so a newly
 * added component appears in search automatically (no second list to maintain).
 * Order: references, then components (by group), then mockups.
 */
export const SEARCH_ITEMS: SearchItem[] = [
  ...[componentOverview, tokensReference, architectureReference].map((i) => ({
    to: i.to,
    label: i.label,
    section: 'Reference',
    icon: i.icon,
  })),
  ...componentGroups.flatMap(({ heading, items }) =>
    items.map((i) => ({ to: i.to, label: i.label, section: heading, icon: i.icon })),
  ),
  ...mockupItems.map((i) => ({ to: i.to, label: i.label, section: 'Mockups', icon: i.icon })),
];
```

(The `componentGroups` element type is `{ heading: string; items: NavItem[] }` — keep that shape. Copy the array bodies exactly; do not retype the items by hand.)

- [ ] **Step 2: Rewire `AppShell.tsx` to import the data**

In `AppShell.tsx`:
1. Delete the `NavItem` interface and the five moved consts (`mockupItems`, `componentOverview`, `tokensReference`, `architectureReference`, `componentGroups`).
2. Add an import: `import { type NavItem, mockupItems, componentOverview, tokensReference, architectureReference, componentGroups } from './navItems';`
3. Remove every lucide icon from AppShell's `lucide-react` import that is now referenced **only** inside `navItems.ts`. AppShell still imports the icons it uses directly: `Layers`, `Component` (switchLink), `Plus`, `Bell` (TopBar), `Monitor`, `Sun`, `Moon` (theme), and the `LucideIcon` type (used by `THEME_META`). `renderRailItem` and the `NavItem`-typed helpers stay in AppShell (they consume the imported `NavItem`).

- [ ] **Step 3: Typecheck + build — let the compiler enforce the import split**

Run: `make build` (from repo root)
Expected: PASS. tsc errors on any unused import left in `AppShell.tsx` or any missing import in `navItems.ts` — fix each until clean. (This is the safety net for the icon-import move.)

- [ ] **Step 4: Lint + format**

Run: `make lint` → PASS.
Run: `npm run format` then `npm run format:check` → PASS.

- [ ] **Step 5: Quick visual smoke (rail unchanged)**

Run: `make dev` if not running. Load http://localhost:8080/components and http://localhost:8080/mockups — the rail must look exactly as before (same groups, items, icons). This task is behavior-neutral.

- [ ] **Step 6: Commit**

```bash
git add packages/playground/src/layout/AppShell/navItems.ts packages/playground/src/layout/AppShell/AppShell.tsx
git commit -m "refactor(playground): extract AppShell nav data to navItems.ts + SEARCH_ITEMS"
```

---

## Task 2: `CommandSearch` component

**Files:**
- Create: `packages/playground/src/layout/AppShell/CommandSearch.tsx`
- Create: `packages/playground/src/layout/AppShell/CommandSearch.module.scss`

- [ ] **Step 1: Create `CommandSearch.module.scss`**

```scss
.wrap {
  position: relative;
}

.panel {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  z-index: var(--z-popover);
  min-width: 340px;
  max-width: 460px;
  max-height: 360px;
  overflow-y: auto;
  padding: var(--space-1);
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-fg);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.optionActive {
  background: var(--color-bg-muted);
}

.optionIcon {
  flex: none;
  color: var(--color-fg-muted);
}

.optionLabel {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.optionSection {
  flex: none;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.empty {
  padding: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
```

- [ ] **Step 2: Create `CommandSearch.tsx`**

```tsx
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
                  // Keep focus in the input so blur/outside-click doesn't fire first.
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
```

- [ ] **Step 3: Typecheck + lint + format**

Run: `make build` → PASS (the component typechecks; not yet rendered anywhere — that's Task 3).
Run: `make lint` → PASS (panel colors are tokens).
Run: `npm run format:check` → PASS (run `npm run format` first if needed).

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/layout/AppShell/CommandSearch.tsx packages/playground/src/layout/AppShell/CommandSearch.module.scss
git commit -m "feat(playground): CommandSearch combobox (anchored typeahead over SEARCH_ITEMS)"
```

---

## Task 3: Wire `CommandSearch` + ⌘K into `AppShell`

**Files:**
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`

- [ ] **Step 1: Import CommandSearch + its handle type**

Add to `AppShell.tsx` imports:

```tsx
import { CommandSearch, type CommandSearchHandle } from './CommandSearch';
```

- [ ] **Step 2: Add the search ref + global ⌘K listener inside the component**

Inside `AppShell`, after the theme `useEffect`/`cycleTheme`/`ThemeIcon` block and BEFORE the `if (FULL_BLEED_PATHS.has(pathname))` early return (hooks must run unconditionally), add:

```tsx
  // ⌘K / Ctrl+K focuses the component search (the TopBar hotkey hint, made real).
  const searchRef = useRef<CommandSearchHandle>(null);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
```

(`useRef` and `useEffect` are already imported in AppShell. The `globalThis.KeyboardEvent` qualifier avoids colliding with the React `KeyboardEvent` type if it's ever imported.)

- [ ] **Step 3: Render `<CommandSearch>` in `TopBar.Start`**

Replace the existing TopBar.Start content:

```tsx
          <TopBar.Start>
            <TopBar.Search placeholder="Search contacts, deals…" hotkey={['⌘', 'K']} />
          </TopBar.Start>
```

with:

```tsx
          <TopBar.Start>
            <CommandSearch ref={searchRef} />
          </TopBar.Start>
```

- [ ] **Step 4: Typecheck + lint + format**

Run: `make build` → PASS.
Run: `make lint` → PASS.
Run: `npm run format:check` → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/layout/AppShell/AppShell.tsx
git commit -m "feat(playground): wire CommandSearch into TopBar + global ⌘K focus"
```

---

## Task 4: Verification — Playwright + gates

**Files:** none (verification + any fixes get their own commits).

- [ ] **Step 1: Gates**

From repo root: `make build`, `make lint`, `npm run format:check` — all PASS. (`make test` is library-only; the playground has no tests — do not add any.)

- [ ] **Step 2: Playwright functional sweep**

Dev server at http://localhost:8080 (`make dev` if needed). Drive:
- Navigate to `/components`. Press **Meta+K** → assert `document.activeElement` is the search input (`input[type="search"]`).
- Type `tooltip` → assert a panel (`[role="listbox"]`) appears with a `[role="option"]` whose text contains "Tooltip"; assert the panel's top ≈ the input's bottom (anchored under the box: `panel.getBoundingClientRect().top` within ~8px of `input.getBoundingClientRect().bottom`).
- Press **ArrowDown** then **Enter** → assert URL is `http://localhost:8080/components/tooltip` and the panel is gone, input value cleared.
- Focus the search, type `dash` → assert an option "Dashboard" with section tag "Mockups"; click it → URL `/mockups/dashboard`.
- Type `zzzznotacomponent` → assert the "No results" row.
- Type `card`, press **Escape** → panel closed, query cleared, focus still on input.
- Type `card`, click elsewhere (e.g. the page `<main>`) → panel closes.
- Toggle dark (the theme button) and repeat one search → panel is legible on dark (computed `background-color` of the panel is the dark surface, option text light).

- [ ] **Step 3: Fix-and-recommit any issues** (focused commits; re-run gates + re-verify).

---

## Task 5: Open the PR

**Files:** none.

- [ ] **Step 1: Push + open PR**

```bash
git push -u origin feat/component-search
gh pr create --repo eocrm/design-system --base main \
  --title "feat(playground): ⌘K component search (anchored typeahead)" \
  --body "$(cat <<'EOF'
## Summary
- The TopBar search box is now a live combobox: type to filter every navigable destination (components, reference pages, mockups); results drop into a panel anchored directly under it. ⌘K / Ctrl+K focuses it; ↑/↓ + Enter navigate; Esc/click-outside close.
- Extracted the rail's nav data into a shared `navItems.ts` (+ derived `SEARCH_ITEMS`), so the rail and search share one source of truth — new components appear in search automatically.
- Hand-rolled anchored panel (the DS `Popover` moves focus into the panel, which would break typeahead). Playground tooling only.

## Test plan
- ✅ `make build`, `make lint`, `npm run format:check`
- ✅ Playwright: ⌘K focuses the box; `tooltip` → filtered list anchored under the box; ↓+Enter → `/components/tooltip`; `dash` → Dashboard (Mockups); no-match row; Esc + click-outside close; legible in dark
- Playground has no unit tests (no vitest config); Playwright is the functional gate

## Notes
- **No library change → no version bump.** The Release run's `publish` job is skipped; `deploy-playground` ships it to the live playground.
EOF
)"
```

- [ ] **Step 2: Watch the gate, merge**

```bash
PR=$(gh pr view --repo eocrm/design-system --json number -q .number)
gh pr checks "$PR" --repo eocrm/design-system --watch
# if BEHIND: gh pr update-branch --repo eocrm/design-system "$PR" && re-watch
gh pr merge "$PR" --repo eocrm/design-system --squash --delete-branch
```

- [ ] **Step 3: Confirm playground redeploy (no publish)**

```bash
MERGE_SHA=$(gh pr view "$PR" --repo eocrm/design-system --json mergeCommit -q .mergeCommit.oid)
RUN_ID=$(gh run list --repo eocrm/design-system --workflow=Release --commit "$MERGE_SHA" --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --repo eocrm/design-system --exit-status
gh run view "$RUN_ID" --repo eocrm/design-system --json jobs --jq '.jobs[]|"\(.name): \(.conclusion)"'
```
Expected: `publish: skipped` (no `packages/design-system` change), `deploy-playground / deploy: success`. No new `v*` tag.

- [ ] **Step 4: Realign local main**

```bash
git checkout main && git fetch origin && git reset --hard origin/main
```

---

## Self-Review (completed by plan author)

**1. Spec coverage:**
- Anchored typeahead reusing TopBar.Search → Task 2 (`CommandSearch` drives `TopBar.Search`, panel under it). ✅
- ⌘K focuses + selects → Task 2 `focus()` handle + Task 3 global listener. ✅
- Global jump-to contents (components + references + mockups) → Task 1 `SEARCH_ITEMS`. ✅
- Hand-rolled panel (Popover steals focus) → Task 2 (no DS Popover). ✅
- Shared data source / no drift → Task 1 `navItems.ts`. ✅
- Combobox a11y (role/aria-expanded/controls/activedescendant/autocomplete; listbox/option; focus stays in input) → Task 2. ✅
- Behavior: substring filter, empty→closed, no-match row, ↑/↓ wrap, Enter navigate+clear, Esc close+clear, click-outside, navigate clears → Task 2. ✅
- Placeholder "Search components & pages…" → Task 2. ✅
- Verification (Playwright + gates; no playground tests) → Task 4. ✅
- Delivery (PR → publish skipped + playground redeploy) → Task 5. ✅
- Non-goals respected (no modal, no command executor, no fuzzy, no library change). ✅

**2. Placeholder scan:** The only non-verbatim spot is Task 1 Step 1's lucide import list ("import EXACTLY the icons referenced by the arrays") — intentional: the array bodies are moved verbatim and tsc (Step 3) enforces the exact import set; enumerating ~50 icons in the plan would be more error-prone than the compiler. No TBD/TODO elsewhere; CommandSearch + SCSS are complete.

**3. Type/name consistency:** `CommandSearch` / `CommandSearchHandle` / `SEARCH_ITEMS` / `SearchItem` / `NavItem` / `navItems.ts` and the `focus()` handle + `searchRef` are used identically across Tasks 1–3. `TopBar.Search` ref→input and prop-spread confirmed against source. The `globalThis.KeyboardEvent` (Task 3 listener) vs React `KeyboardEvent` (Task 2 onKeyDown) distinction is explicit. ✅
