# OptionsPicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `OptionsPicker` — a new compound primitive in `@eocrm/design-system` modeling the filter-picker UX (popover panel with search, optional grouping, multi/single-select, draft-then-Apply commit). First consumer: the Audit mockup's `Events ▾` and `Tenant ▾` triggers.

**Architecture:** Single `.tsx` file with a compound API (`OptionsPicker`, `OptionsPicker.Trigger`, `OptionsPicker.Content`). Built on existing `Popover` for positioning + `Input`/`Checkbox`/`Radio`/`Badge`/`Button`/`Text`/`Cluster` for content. Context-based open + draft state. Mode (`multi` | `single`) discriminates the union: multi gets Apply/Cancel footer + group-toggle headers; single auto-commits + auto-closes per click.

**Tech Stack:** React 19, TypeScript, `@dnd-kit/*` already in tree (unused here), Vitest + React Testing Library, SCSS modules. No new deps.

**Spec:** `docs/superpowers/specs/2026-05-26-options-picker-design.md`

**Branch:** `feat/options-picker` (already checked out from spec-commit step)

---

## File Structure

| File | Role |
|---|---|
| `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx` (NEW) | Root + Trigger + Content + helpers; everything in one file |
| `packages/design-system/src/components/OptionsPicker/OptionsPicker.module.scss` (NEW) | Visual styling (search bar, list, group headers, option rows, footer); tokens only |
| `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx` (NEW) | Hard rule 1 minimum + behavior tests |
| `packages/design-system/src/components/OptionsPicker/index.ts` (NEW) | `export { OptionsPicker } from './OptionsPicker'` + type re-exports |
| `packages/design-system/src/index.ts` (MODIFY) | Add OptionsPicker + types to public exports |
| `packages/design-system/AGENTS.md` (MODIFY) | TL;DR + canonical snippet per Hard rule 1 / agent primer |
| `packages/playground/src/pages/components/OptionsPickerDemo.tsx` (NEW) | DemoLayout + 4 Example sections per Hard rule 2 |
| `packages/playground/src/App.tsx` (MODIFY) | `<Route path="/components/options-picker" element={<OptionsPickerDemo/>}/>` + import |
| `packages/playground/src/layout/AppShell/AppShell.tsx` (MODIFY) | Sidebar entry in the components group |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` (MODIFY) | Overview card |
| `packages/playground/src/pages/mockups/registry.ts` (MODIFY) | Add `'OptionsPicker'` to ComponentName union + audit's usesComponents |
| `packages/playground/src/data/audit.ts` (MODIFY) | Add `eventCatalog: OptionsPickerGroup[]` + `tenantOptions: OptionsPickerOption[]` |
| `packages/playground/src/pages/mockups/Audit/Audit.tsx` (MODIFY) | Replace `Events ▾` + `Tenant ▾` Buttons with OptionsPicker |

---

## Task 1: Scaffolding + basic open/close

**Goal:** OptionsPicker renders, Trigger opens the Popover, Content is an empty placeholder. Establishes the file structure and compound API shell.

**Files:**
- Create: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx`
- Create: `packages/design-system/src/components/OptionsPicker/OptionsPicker.module.scss`
- Create: `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx`
- Create: `packages/design-system/src/components/OptionsPicker/index.ts`

- [ ] **Step 1: Create scaffold tsx file**

Write `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx`:

```tsx
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Popover } from '../Popover';
import { Input } from '../Input';
import { Checkbox } from '../Checkbox';
import { Radio } from '../Radio';
import { Badge, type BadgeTone } from '../Badge';
import { Button } from '../Button';
import { Text } from '../Text';
import { Cluster } from '../Cluster';
import { Stack } from '../Stack';
import styles from './OptionsPicker.module.scss';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type OptionsPickerMode = 'multi' | 'single';

export interface OptionsPickerOption {
  /** Unique identifier; persisted as the selected value. */
  value: string;
  /** Displayed text. */
  label: string;
  /** Override what the search filter matches against. Defaults to `label`. */
  searchText?: string;
}

export interface OptionsPickerGroup {
  /** Unique per group; used as React key and ARIA target. */
  id: string;
  /** Header text shown in the group label slot. */
  label: string;
  options: OptionsPickerOption[];
  /** Colored dot tone for the group header. Default `'neutral'`. */
  tone?: BadgeTone;
  /** Right-side hint label (e.g., `"auth.*"`). Omitted → no hint renders. */
  hint?: string;
}

interface MultiProps {
  mode?: 'multi';
  selected: string[];
  onApply: (next: string[]) => void;
  onCancel?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

interface SingleProps {
  mode: 'single';
  selected: string | null;
  onApply: (next: string | null) => void;
  onCancel?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export type OptionsPickerProps = MultiProps | SingleProps;

type FlatContentProps = {
  options: OptionsPickerOption[];
  groups?: never;
};
type GroupedContentProps = {
  groups: OptionsPickerGroup[];
  options?: never;
};
type SharedContentProps = {
  /** Accessible label on the panel (the dialog's `aria-label`). */
  label: string;
  /** Search input placeholder. Default `'Filter…'`. */
  searchPlaceholder?: string;
  /** Footer Apply button text (multi only). Default `'Apply'`. */
  applyLabel?: string;
  /** Footer Cancel button text (multi only). Default `'Cancel'`. */
  cancelLabel?: string;
  /** Rendered when search produces zero matches. Default `'No matches'`. */
  emptyState?: ReactNode;
  /** Footer count formatter (multi only). Default `'${selected} of ${total}'`. */
  footerCount?: (selected: number, total: number) => ReactNode;
  className?: string;
};
export type OptionsPickerContentProps = (FlatContentProps | GroupedContentProps) & SharedContentProps;

// ----------------------------------------------------------------------------
// Context
// ----------------------------------------------------------------------------

interface PickerContextValue {
  mode: OptionsPickerMode;
  /** Always normalized to string[] internally; single mode uses [] or [value]. */
  selected: string[];
  /** Setter the consumer doesn't see; updates committed externally via onApply. */
  open: boolean;
  setOpen: (next: boolean) => void;
  /** Called when Apply (multi) or click (single) commits draft to consumer. */
  commit: (next: string[]) => void;
  /** Called on Cancel/Esc/click-outside. */
  cancel: () => void;
}

const PickerContext = createContext<PickerContextValue | null>(null);

function usePickerContext(label: string): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) {
    throw new Error(`<OptionsPicker.${label}> must be used inside <OptionsPicker>.`);
  }
  return ctx;
}

// ----------------------------------------------------------------------------
// Root
// ----------------------------------------------------------------------------

function OptionsPickerRoot(props: OptionsPickerProps) {
  const mode: OptionsPickerMode = props.mode ?? 'multi';

  // Normalize selected to string[] internally.
  const normalizedSelected = useMemo<string[]>(() => {
    if (mode === 'multi') return (props as MultiProps).selected;
    const sv = (props as SingleProps).selected;
    return sv == null ? [] : [sv];
  }, [mode, props]);

  // Open state — controlled or uncontrolled.
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = props.open !== undefined;
  const open = isControlled ? (props.open as boolean) : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      props.onOpenChange?.(next);
    },
    [isControlled, props],
  );

  const commit = useCallback(
    (next: string[]) => {
      if (mode === 'multi') {
        (props as MultiProps).onApply(next);
      } else {
        (props as SingleProps).onApply(next[0] ?? null);
      }
      setOpen(false);
    },
    [mode, props, setOpen],
  );

  const cancel = useCallback(() => {
    (props as { onCancel?: () => void }).onCancel?.();
    setOpen(false);
  }, [props, setOpen]);

  const ctxValue = useMemo<PickerContextValue>(
    () => ({ mode, selected: normalizedSelected, open, setOpen, commit, cancel }),
    [mode, normalizedSelected, open, setOpen, commit, cancel],
  );

  return (
    <PickerContext.Provider value={ctxValue}>
      <Popover open={open} onOpenChange={setOpen}>
        {props.children}
      </Popover>
    </PickerContext.Provider>
  );
}

// ----------------------------------------------------------------------------
// Trigger
// ----------------------------------------------------------------------------

export interface OptionsPickerTriggerProps {
  children: ReactNode;
}

const OptionsPickerTrigger = forwardRef<HTMLButtonElement, OptionsPickerTriggerProps>(
  function OptionsPickerTrigger({ children }, ref) {
    usePickerContext('Trigger'); // assert inside root
    return <Popover.Trigger ref={ref}>{children}</Popover.Trigger>;
  },
);

// ----------------------------------------------------------------------------
// Content — placeholder (filled in later tasks)
// ----------------------------------------------------------------------------

const OptionsPickerContent = forwardRef<HTMLDivElement, OptionsPickerContentProps>(
  function OptionsPickerContent({ label, className }, ref) {
    usePickerContext('Content');
    return (
      <Popover.Content ref={ref} className={clsx(styles.panel, className)} aria-label={label}>
        <Stack gap="sm">
          <Text size="sm" tone="muted">
            (panel content lands in subsequent tasks)
          </Text>
        </Stack>
      </Popover.Content>
    );
  },
);

// ----------------------------------------------------------------------------
// Compound export
// ----------------------------------------------------------------------------

export const OptionsPicker = Object.assign(OptionsPickerRoot, {
  Trigger: OptionsPickerTrigger,
  Content: OptionsPickerContent,
});
```

- [ ] **Step 2: Create empty SCSS module**

Write `packages/design-system/src/components/OptionsPicker/OptionsPicker.module.scss`:

```scss
.panel {
  display: flex;
  flex-direction: column;
  min-width: 280px;
  max-width: 360px;
}
```

- [ ] **Step 3: Create index re-exports**

Write `packages/design-system/src/components/OptionsPicker/index.ts`:

```ts
export { OptionsPicker } from './OptionsPicker';
export type {
  OptionsPickerProps,
  OptionsPickerContentProps,
  OptionsPickerTriggerProps,
  OptionsPickerMode,
  OptionsPickerOption,
  OptionsPickerGroup,
} from './OptionsPicker';
```

- [ ] **Step 4: Write smoke test (Hard rule 1 — renders + opens)**

Write `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptionsPicker } from './OptionsPicker';
import { Button } from '../Button';

const flatOptions = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
];

it('renders Trigger only when closed (Popover is collapsed)', () => {
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  // Panel is not visible until opened
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('opens the panel on Trigger click', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByRole('dialog', { name: 'Filter' })).toBeInTheDocument();
});

it('throws when Trigger is used outside the root', () => {
  // Suppress React's expected-error log for this case.
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() =>
    render(
      <OptionsPicker.Trigger>
        <Button>Naked</Button>
      </OptionsPicker.Trigger>,
    ),
  ).toThrow(/inside <OptionsPicker>/);
  err.mockRestore();
});
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 3 tests pass.

If the second test fails because `Popover` doesn't yet render the panel — check the Popover source for how it gates rendering (`packages/design-system/src/components/Popover/Content.tsx`). The current test uses `userEvent.click` which should fire the Popover's open. If Popover requires an explicit `onOpenChange` controller, the Root component already wires that.

- [ ] **Step 6: Typecheck**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
```
Expected: clean.

- [ ] **Step 7: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/OptionsPicker
git commit -m "$(cat <<'EOF'
OptionsPicker: scaffold compound API (Trigger + Content + Root)

Empty Content placeholder; Popover wiring + open state + commit/cancel
hooks established. Tests cover Trigger render, open-on-click, and the
"used outside root" guard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Flat options list + multi-mode checkboxes

**Goal:** Content panel renders a flat list of options as Checkboxes. Clicking toggles a local draft. No search yet, no Apply/Cancel yet (those are Task 3 + Task 4).

**Files:**
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.module.scss`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx`

- [ ] **Step 1: Write the failing test for option rendering**

Append to `OptionsPicker.test.tsx`:

```tsx
it('renders flat options as checkboxes when opened (multi mode)', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={['two']} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const checkboxes = screen.getAllByRole('checkbox');
  expect(checkboxes).toHaveLength(2);
  expect(checkboxes[0]).not.toBeChecked();
  expect(checkboxes[1]).toBeChecked();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: FAIL — no checkboxes rendered.

- [ ] **Step 3: Implement option rendering in Content**

Replace the entire `OptionsPickerContent` definition in `OptionsPicker.tsx` with this expanded version. Look for the comment marker `Content — placeholder (filled in later tasks)` and replace through to the next `// -----` separator:

```tsx
// ----------------------------------------------------------------------------
// Content
// ----------------------------------------------------------------------------

function isGrouped(props: OptionsPickerContentProps): props is GroupedContentProps & SharedContentProps {
  return 'groups' in props && props.groups !== undefined;
}

function getAllOptions(props: OptionsPickerContentProps): OptionsPickerOption[] {
  if (isGrouped(props)) return props.groups.flatMap((g) => g.options);
  return props.options ?? [];
}

const OptionsPickerContent = forwardRef<HTMLDivElement, OptionsPickerContentProps>(
  function OptionsPickerContent(props, ref) {
    const { label, className } = props;
    const ctx = usePickerContext('Content');

    // Draft state — initialized from committed selected on every open.
    const [draft, setDraft] = useState<string[]>(ctx.selected);
    useEffect(() => {
      if (ctx.open) setDraft(ctx.selected);
    }, [ctx.open, ctx.selected]);

    const allOptions = useMemo(() => getAllOptions(props), [props]);

    const toggle = useCallback(
      (value: string) => {
        if (ctx.mode === 'multi') {
          setDraft((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
          );
        } else {
          // Single mode commits immediately + closes.
          ctx.commit([value]);
        }
      },
      [ctx],
    );

    return (
      <Popover.Content ref={ref} className={clsx(styles.panel, className)} aria-label={label}>
        <Stack gap="2xs">
          <div className={styles.list} role="listbox" aria-multiselectable={ctx.mode === 'multi'}>
            {isGrouped(props)
              ? null /* grouped rendering ships in Task 6 */
              : (props.options ?? []).map((opt) => (
                  <OptionRow key={opt.value} option={opt} checked={draft.includes(opt.value)} onToggle={toggle} />
                ))}
          </div>
        </Stack>
      </Popover.Content>
    );
  },
);

interface OptionRowProps {
  option: OptionsPickerOption;
  checked: boolean;
  onToggle: (value: string) => void;
}

function OptionRow({ option, checked, onToggle }: OptionRowProps) {
  const handleClick = useCallback(() => onToggle(option.value), [onToggle, option.value]);
  return (
    <label className={clsx(styles.row, checked && styles.rowSelected)}>
      <Checkbox checked={checked} onChange={handleClick} aria-label={option.label} />
      <Text size="sm">{option.label}</Text>
    </label>
  );
}
```

- [ ] **Step 4: Add list + row styles**

Append to `OptionsPicker.module.scss`:

```scss
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-height: 320px;
  overflow-y: auto;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;

  &:hover {
    background: var(--color-bg-muted);
  }
}

.rowSelected {
  background: var(--color-bg-info-subtle);
}
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 4 tests pass (3 prior + new one).

- [ ] **Step 6: Add a toggle test**

Append to `OptionsPicker.test.tsx`:

```tsx
it('multi mode: clicking a checkbox updates the draft (does not commit yet)', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={[]} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const [first] = screen.getAllByRole('checkbox');
  await user.click(first);
  expect(first).toBeChecked();
  // onApply should NOT have been called — multi mode waits for Apply.
  expect(onApply).not.toHaveBeenCalled();
});
```

- [ ] **Step 7: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 5 tests pass.

- [ ] **Step 8: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/OptionsPicker
git commit -m "$(cat <<'EOF'
OptionsPicker: flat options list + multi-mode draft toggling

Renders flat options as Checkbox rows; click toggles internal draft.
Draft initializes from committed `selected` on each open. Tests cover
checked initial state + multi-mode click-without-commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Search input + selection count

**Goal:** Add the search bar at the top of the panel (Input with leading icon) and the "N sel" count text with `aria-live="polite"`. Search filters the visible options.

**Files:**
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.module.scss`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx`

- [ ] **Step 1: Write failing test for search filtering**

Append to `OptionsPicker.test.tsx`:

```tsx
it('filters visible options by search text (case-insensitive substring)', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content
        label="Filter"
        options={[
          { value: 'a', label: 'login_succeeded' },
          { value: 'b', label: 'login_failed' },
          { value: 'c', label: 'logout' },
        ]}
      />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  const search = screen.getByRole('textbox');
  await user.type(search, 'failed');
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  expect(screen.getByText('login_failed')).toBeInTheDocument();
});

it('shows selection count "N sel" with aria-live=polite', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={['a']} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content
        label="Filter"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const count = screen.getByText('1 sel');
  expect(count).toHaveAttribute('aria-live', 'polite');
  // Toggle B on → count becomes 2 sel
  await user.click(screen.getByRole('checkbox', { name: 'B' }));
  expect(screen.getByText('2 sel')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 2 new tests FAIL.

- [ ] **Step 3: Add search state + selection count to Content**

In `OptionsPicker.tsx`, modify the imports at the top to add `Search` from `lucide-react`:

```tsx
import { Search } from 'lucide-react';
```

Then update the `OptionsPickerContent` body to inject the search bar + count + filter logic. Replace the entire `OptionsPickerContent` block with:

```tsx
const OptionsPickerContent = forwardRef<HTMLDivElement, OptionsPickerContentProps>(
  function OptionsPickerContent(props, ref) {
    const { label, className, searchPlaceholder = 'Filter…' } = props;
    const ctx = usePickerContext('Content');

    const [draft, setDraft] = useState<string[]>(ctx.selected);
    const [filter, setFilter] = useState('');

    useEffect(() => {
      if (ctx.open) {
        setDraft(ctx.selected);
        setFilter('');
      }
    }, [ctx.open, ctx.selected]);

    const matchesFilter = useCallback(
      (opt: OptionsPickerOption): boolean => {
        if (filter === '') return true;
        const haystack = (opt.searchText ?? opt.label).toLowerCase();
        return haystack.includes(filter.toLowerCase());
      },
      [filter],
    );

    const toggle = useCallback(
      (value: string) => {
        if (ctx.mode === 'multi') {
          setDraft((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
          );
        } else {
          ctx.commit([value]);
        }
      },
      [ctx],
    );

    const visibleFlat = useMemo(() => {
      if (isGrouped(props)) return [];
      return (props.options ?? []).filter(matchesFilter);
    }, [props, matchesFilter]);

    return (
      <Popover.Content ref={ref} className={clsx(styles.panel, className)} aria-label={label}>
        <Stack gap="xs">
          <div className={styles.searchBar}>
            <Search size={14} aria-hidden className={styles.searchIcon} />
            <Input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.currentTarget.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoFocus
              className={styles.searchInput}
            />
            {ctx.mode === 'multi' && (
              <Text size="xs" tone="subtle" aria-live="polite" className={styles.count}>
                {draft.length} sel
              </Text>
            )}
            {ctx.mode === 'single' && draft.length > 0 && (
              <Text size="xs" tone="subtle" aria-live="polite" className={styles.count}>
                1 sel
              </Text>
            )}
          </div>

          <div className={styles.list} role="listbox" aria-multiselectable={ctx.mode === 'multi'}>
            {isGrouped(props)
              ? null /* grouped rendering ships in Task 6 */
              : visibleFlat.map((opt) => (
                  <OptionRow key={opt.value} option={opt} checked={draft.includes(opt.value)} onToggle={toggle} />
                ))}
          </div>
        </Stack>
      </Popover.Content>
    );
  },
);
```

- [ ] **Step 4: Add search-bar styles**

Append to `OptionsPicker.module.scss`:

```scss
.searchBar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border-subtle);
}

.searchIcon {
  color: var(--color-text-subtle);
}

.searchInput {
  flex: 1;
  border: none;
  background: transparent;
}

.count {
  flex-shrink: 0;
}
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 7 tests pass (5 prior + 2 new).

If the search test fails because `Input` renders with extra inner wrapping that hides it from the `textbox` role lookup, switch the assertion to `screen.getByPlaceholderText('Filter…')`.

- [ ] **Step 6: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/OptionsPicker
git commit -m "$(cat <<'EOF'
OptionsPicker: search bar + selection count

Free-text substring filter (case-insensitive) on either `label` or
`searchText` per option. "N sel" text in the search-bar row carries
`aria-live="polite"` so screen readers announce toggle changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Footer (Apply/Cancel) + commit/cancel wiring

**Goal:** Multi mode shows the footer with Apply/Cancel buttons + the `N of TOTAL` count text. Apply fires `onApply(draft)` + closes panel. Cancel reverts and closes. Esc/click-outside reverts. Single mode does NOT show the footer (each click commits, see Task 7).

**Files:**
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.module.scss`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `OptionsPicker.test.tsx`:

```tsx
it('multi mode: Apply commits the draft and closes the panel', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={[]} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getAllByRole('checkbox')[0]);
  await user.click(screen.getByRole('button', { name: 'Apply' }));
  expect(onApply).toHaveBeenCalledWith(['one']);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('multi mode: Cancel discards the draft without firing onApply', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  const onCancel = vi.fn();
  render(
    <OptionsPicker selected={['one']} onApply={onApply} onCancel={onCancel}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  // Toggle 'one' off in draft
  await user.click(screen.getAllByRole('checkbox')[0]);
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onApply).not.toHaveBeenCalled();
  expect(onCancel).toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('multi mode: footer shows "N of TOTAL events" with default formatter', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={['one']} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByText('1 of 2')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 3 new tests FAIL.

- [ ] **Step 3: Add footer rendering**

In `OptionsPicker.tsx`, modify the `OptionsPickerContent` return value. Replace the `<Stack gap="xs">…</Stack>` block (everything inside the `<Popover.Content>`) with:

```tsx
        <Stack gap="xs">
          <div className={styles.searchBar}>
            <Search size={14} aria-hidden className={styles.searchIcon} />
            <Input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.currentTarget.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoFocus
              className={styles.searchInput}
            />
            {ctx.mode === 'multi' && (
              <Text size="xs" tone="subtle" aria-live="polite" className={styles.count}>
                {draft.length} sel
              </Text>
            )}
            {ctx.mode === 'single' && draft.length > 0 && (
              <Text size="xs" tone="subtle" aria-live="polite" className={styles.count}>
                1 sel
              </Text>
            )}
          </div>

          <div className={styles.list} role="listbox" aria-multiselectable={ctx.mode === 'multi'}>
            {isGrouped(props)
              ? null /* grouped rendering ships in Task 6 */
              : visibleFlat.map((opt) => (
                  <OptionRow key={opt.value} option={opt} checked={draft.includes(opt.value)} onToggle={toggle} />
                ))}
          </div>

          {ctx.mode === 'multi' && (
            <div className={styles.footer}>
              <Text size="xs" tone="muted">
                {(props.footerCount ?? defaultFooterCount)(draft.length, allOptionsForCount.length)}
              </Text>
              <Cluster gap="sm">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDraft(ctx.selected);
                    ctx.cancel();
                  }}
                >
                  {props.cancelLabel ?? 'Cancel'}
                </Button>
                <Button variant="primary" size="sm" onClick={() => ctx.commit(draft)}>
                  {props.applyLabel ?? 'Apply'}
                </Button>
              </Cluster>
            </div>
          )}
        </Stack>
```

And add this helper + memoized count just before the `return` statement inside `OptionsPickerContent` (after `visibleFlat`):

```tsx
    const allOptionsForCount = useMemo(() => allOptions, [allOptions]);
```

And add this default formatter at module scope (above the `OptionsPickerContent` definition):

```tsx
function defaultFooterCount(selected: number, total: number): string {
  return `${selected} of ${total}`;
}
```

- [ ] **Step 4: Add footer styles**

Append to `OptionsPicker.module.scss`:

```scss
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
}
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 10 tests pass (7 prior + 3 new).

- [ ] **Step 6: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/OptionsPicker
git commit -m "$(cat <<'EOF'
OptionsPicker: footer with Apply/Cancel (multi mode)

Apply commits draft via ctx.commit(draft); Cancel reverts draft to
committed selected and fires onCancel. Footer count text uses an
overridable formatter (defaults to "N of TOTAL").

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Grouped options + section headers (passive)

**Goal:** When `groups` is passed instead of `options`, render section headers with the colored dot + label + `ns.*` hint. Group headers are passive in this task (visual only — group-toggle ships in Task 6). Empty groups (zero matches) hide entirely. Empty state renders when all groups are empty.

**Files:**
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.module.scss`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx`

- [ ] **Step 1: Write failing tests for groups**

Append to `OptionsPicker.test.tsx`:

```tsx
const groupedOptions = [
  {
    id: 'auth',
    label: 'Authentication',
    tone: 'success' as const,
    hint: 'auth.*',
    options: [
      { value: 'auth.login', label: 'login' },
      { value: 'auth.logout', label: 'logout' },
    ],
  },
  {
    id: 'role',
    label: 'Roles',
    tone: 'info' as const,
    hint: 'role.*',
    options: [
      { value: 'role.assigned', label: 'assigned' },
      { value: 'role.revoked', label: 'revoked' },
    ],
  },
];

it('renders groups with section headers + hint labels', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByText('Authentication')).toBeInTheDocument();
  expect(screen.getByText('auth.*')).toBeInTheDocument();
  expect(screen.getByText('Roles')).toBeInTheDocument();
  expect(screen.getByText('role.*')).toBeInTheDocument();
  expect(screen.getAllByRole('checkbox')).toHaveLength(4);
});

it('hides groups whose every option is filtered out', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.type(screen.getByRole('textbox'), 'login');
  expect(screen.getByText('Authentication')).toBeInTheDocument();
  expect(screen.queryByText('Roles')).not.toBeInTheDocument();
});

it('shows emptyState when all groups are filtered to nothing', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content
        label="Filter"
        groups={groupedOptions}
        emptyState="No matches"
      />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.type(screen.getByRole('textbox'), 'zzz');
  expect(screen.getByText('No matches')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 3 new tests FAIL.

- [ ] **Step 3: Implement grouped rendering**

In `OptionsPicker.tsx`, inside `OptionsPickerContent`, add this helper just before the `return` statement (after `visibleFlat`):

```tsx
    const visibleGroups = useMemo(() => {
      if (!isGrouped(props)) return [];
      return props.groups
        .map((g) => ({ ...g, visibleOptions: g.options.filter(matchesFilter) }))
        .filter((g) => g.visibleOptions.length > 0);
    }, [props, matchesFilter]);

    const hasAnyVisible = isGrouped(props) ? visibleGroups.length > 0 : visibleFlat.length > 0;
```

Replace the `<div className={styles.list} …>` block content with:

```tsx
          <div className={styles.list} role="listbox" aria-multiselectable={ctx.mode === 'multi'}>
            {!hasAnyVisible && (
              <Text size="sm" tone="muted" className={styles.empty}>
                {props.emptyState ?? 'No matches'}
              </Text>
            )}
            {hasAnyVisible && isGrouped(props) && visibleGroups.map((g) => (
              <div key={g.id} className={styles.group}>
                <div className={styles.groupHeader} role="presentation">
                  <Badge tone={g.tone ?? 'neutral'} dot="start" size="sm" className={styles.groupDot} />
                  <Text size="xs" weight="semibold" className={styles.groupLabel}>
                    {g.label}
                  </Text>
                  {g.hint && (
                    <Text size="xs" tone="subtle" className={styles.groupHint}>
                      {g.hint}
                    </Text>
                  )}
                </div>
                {g.visibleOptions.map((opt) => (
                  <OptionRow key={opt.value} option={opt} checked={draft.includes(opt.value)} onToggle={toggle} />
                ))}
              </div>
            ))}
            {hasAnyVisible && !isGrouped(props) && visibleFlat.map((opt) => (
              <OptionRow key={opt.value} option={opt} checked={draft.includes(opt.value)} onToggle={toggle} />
            ))}
          </div>
```

- [ ] **Step 4: Add group styles**

Append to `OptionsPicker.module.scss`:

```scss
.group {
  display: flex;
  flex-direction: column;
}

.groupHeader {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2) var(--space-1);
}

.groupDot {
  flex-shrink: 0;
}

.groupLabel {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.groupHint {
  margin-left: auto;
  font-family: var(--font-mono);
}

.empty {
  padding: var(--space-3) var(--space-2);
  text-align: center;
}
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 13 tests pass (10 prior + 3 new).

If the group-header `Badge dot="start"` requires children (it might warn for empty content), add `<span aria-hidden>{' '}</span>` as the Badge's child OR skip the Badge for the dot and render `<span className={styles.dot} />` instead with a `background: var(--color-{tone}-base)` rule. Check the Badge source at `packages/design-system/src/components/Badge/Badge.tsx` to determine which approach is acceptable.

- [ ] **Step 6: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/OptionsPicker
git commit -m "$(cat <<'EOF'
OptionsPicker: grouped options + section headers (passive)

Adds groups={…} content path. Each group renders a passive header
with a tone-colored Badge dot, uppercase label, and optional ns hint.
Empty groups hide; emptyState renders when all groups are empty.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Group-toggle headers + tri-state

**Goal:** In multi mode, group headers become clickable: clicking selects every option in the group; clicking again deselects. Header carries `role="button"` + tri-state `aria-pressed` (`"false" | "mixed" | "true"`). Single mode keeps the passive headers.

**Files:**
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.module.scss`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx`

- [ ] **Step 1: Write failing tests for group toggle**

Append to `OptionsPicker.test.tsx`:

```tsx
it('multi mode: clicking a group header selects all options in that group', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  // The Authentication group header is a button in multi mode
  await user.click(screen.getByRole('button', { name: /Authentication/i }));
  expect(screen.getByRole('checkbox', { name: 'login' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'logout' })).toBeChecked();
});

it('multi mode: clicking a fully-selected group header deselects all', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={['auth.login', 'auth.logout']} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getByRole('button', { name: /Authentication/i }));
  expect(screen.getByRole('checkbox', { name: 'login' })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'logout' })).not.toBeChecked();
});

it('multi mode: group header aria-pressed reflects tri-state', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={['auth.login']} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const authHeader = screen.getByRole('button', { name: /Authentication/i });
  expect(authHeader).toHaveAttribute('aria-pressed', 'mixed');
  // Toggle the un-selected one → all selected → aria-pressed=true
  await user.click(screen.getByRole('checkbox', { name: 'logout' }));
  expect(authHeader).toHaveAttribute('aria-pressed', 'true');
});

it('single mode: group header is presentational (no role=button)', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker mode="single" selected={null} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  // No button with Authentication label in single mode
  expect(screen.queryByRole('button', { name: /Authentication/i })).not.toBeInTheDocument();
  // Text is still present
  expect(screen.getByText('Authentication')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 4 new tests FAIL.

- [ ] **Step 3: Add tri-state + clickable headers**

In `OptionsPicker.tsx`, add this helper at module scope (above `OptionsPickerContent`):

```tsx
type TriState = 'false' | 'mixed' | 'true';

function tristate(groupOptionValues: string[], draft: string[]): TriState {
  const selectedInGroup = groupOptionValues.filter((v) => draft.includes(v)).length;
  if (selectedInGroup === 0) return 'false';
  if (selectedInGroup === groupOptionValues.length) return 'true';
  return 'mixed';
}
```

Inside `OptionsPickerContent`, add a `toggleGroup` callback before the `return`:

```tsx
    const toggleGroup = useCallback(
      (groupOptions: OptionsPickerOption[]) => {
        if (ctx.mode !== 'multi') return;
        setDraft((prev) => {
          const allValues = groupOptions.map((o) => o.value);
          const allSelected = allValues.every((v) => prev.includes(v));
          if (allSelected) return prev.filter((v) => !allValues.includes(v));
          const next = [...prev];
          for (const v of allValues) if (!next.includes(v)) next.push(v);
          return next;
        });
      },
      [ctx.mode],
    );
```

Replace the existing `<div className={styles.groupHeader} role="presentation">…</div>` block inside the grouped-rendering branch with:

```tsx
                {ctx.mode === 'multi' ? (
                  <button
                    type="button"
                    className={styles.groupHeader}
                    aria-pressed={tristate(g.options.map((o) => o.value), draft)}
                    aria-label={`Toggle group ${g.label}`}
                    onClick={() => toggleGroup(g.options)}
                  >
                    <Badge tone={g.tone ?? 'neutral'} dot="start" size="sm" className={styles.groupDot} />
                    <Text size="xs" weight="semibold" className={styles.groupLabel}>
                      {g.label}
                    </Text>
                    {g.hint && (
                      <Text size="xs" tone="subtle" className={styles.groupHint}>
                        {g.hint}
                      </Text>
                    )}
                  </button>
                ) : (
                  <div className={styles.groupHeader} role="presentation">
                    <Badge tone={g.tone ?? 'neutral'} dot="start" size="sm" className={styles.groupDot} />
                    <Text size="xs" weight="semibold" className={styles.groupLabel}>
                      {g.label}
                    </Text>
                    {g.hint && (
                      <Text size="xs" tone="subtle" className={styles.groupHint}>
                        {g.hint}
                      </Text>
                    )}
                  </div>
                )}
```

- [ ] **Step 4: Add button styling for headers**

Append to `OptionsPicker.module.scss`:

```scss
button.groupHeader {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;

  &:hover {
    background: var(--color-bg-muted);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent-base);
    outline-offset: -2px;
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 17 tests pass (13 prior + 4 new).

- [ ] **Step 6: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/OptionsPicker
git commit -m "$(cat <<'EOF'
OptionsPicker: clickable group headers with tri-state aria-pressed

Multi mode group headers become buttons. Click toggles all options in
the namespace (all-selected → none; otherwise → all). aria-pressed
reflects the tri-state. Single mode headers stay role=presentation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Single mode (radio rendering + click-to-commit)

**Goal:** Single mode renders `<Radio>` instead of `<Checkbox>` for each option row. Clicking a row commits the value and closes the panel (no Apply button). Single mode also accepts `selected: null` (nothing selected).

**Files:**
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx`

- [ ] **Step 1: Write failing tests for single mode**

Append to `OptionsPicker.test.tsx`:

```tsx
it('single mode: clicking a row commits via onApply and closes', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker mode="single" selected={null} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getAllByRole('radio')[1]);
  expect(onApply).toHaveBeenCalledWith('two');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('single mode: no Apply/Cancel footer', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker mode="single" selected={null} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
});

it('single mode: pre-selected row reflects in the radio', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker mode="single" selected="two" onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const radios = screen.getAllByRole('radio');
  expect(radios[0]).not.toBeChecked();
  expect(radios[1]).toBeChecked();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 3 new tests FAIL (no radios rendered).

- [ ] **Step 3: Branch the option row by mode**

In `OptionsPicker.tsx`, modify the `OptionRow` component to accept a `mode` prop, OR add a new `SingleOptionRow`. Cleaner: pass mode through. Replace the existing `OptionRow` definition with:

```tsx
interface OptionRowProps {
  option: OptionsPickerOption;
  checked: boolean;
  mode: OptionsPickerMode;
  onToggle: (value: string) => void;
}

function OptionRow({ option, checked, mode, onToggle }: OptionRowProps) {
  const handleClick = useCallback(() => onToggle(option.value), [onToggle, option.value]);
  return (
    <label className={clsx(styles.row, checked && styles.rowSelected)}>
      {mode === 'multi' ? (
        <Checkbox checked={checked} onChange={handleClick} aria-label={option.label} />
      ) : (
        <Radio checked={checked} onChange={handleClick} aria-label={option.label} />
      )}
      <Text size="sm">{option.label}</Text>
    </label>
  );
}
```

Update both `OptionRow` usages inside `OptionsPickerContent` (the flat path and the grouped path) to pass `mode={ctx.mode}`. Replace `<OptionRow key={opt.value} option={opt} checked={draft.includes(opt.value)} onToggle={toggle} />` with:

```tsx
<OptionRow
  key={opt.value}
  option={opt}
  checked={draft.includes(opt.value)}
  mode={ctx.mode}
  onToggle={toggle}
/>
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 20 tests pass (17 prior + 3 new).

- [ ] **Step 5: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/OptionsPicker
git commit -m "$(cat <<'EOF'
OptionsPicker: single mode renders Radio + click-to-commit

Single mode swaps Checkbox for Radio in the row primitive. Click on
a row routes through ctx.commit([value]) which fires onApply(value)
and closes the panel. No Apply/Cancel footer in single mode.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Keyboard navigation (↓↑ Home End Enter Space Esc)

**Goal:** Arrow keys move focus between visible options (skipping group headers). Enter/Space toggles (multi) or commits (single). Esc cancels. Cmd/Ctrl+Enter commits the multi draft. Focus stays in the search input; option focus is managed via `aria-activedescendant` on the listbox.

**Files:**
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx`

- [ ] **Step 1: Write failing tests for keyboard nav**

Append to `OptionsPicker.test.tsx`:

```tsx
it('keyboard: ↓/↑ moves focused option via aria-activedescendant', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const search = screen.getByRole('textbox');
  const listbox = screen.getByRole('listbox');
  // First arrow puts focus on the first option (no initial focused row).
  await user.keyboard('{ArrowDown}');
  expect(listbox.getAttribute('aria-activedescendant')).toMatch(/-opt-one$/);
  await user.keyboard('{ArrowDown}');
  expect(listbox.getAttribute('aria-activedescendant')).toMatch(/-opt-two$/);
  // ArrowUp wraps to last? Spec says wrap at ends — so ArrowUp from first goes to last.
  await user.keyboard('{ArrowUp}');
  expect(listbox.getAttribute('aria-activedescendant')).toMatch(/-opt-one$/);
  expect(search).toHaveFocus();
});

it('keyboard: Enter on focused option toggles (multi)', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.keyboard('{ArrowDown}{Enter}');
  expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
});

it('keyboard: Esc cancels and closes the panel', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={['one']} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  // Toggle one off in draft
  await user.click(screen.getAllByRole('checkbox')[0]);
  await user.keyboard('{Escape}');
  expect(onApply).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 3 new tests FAIL.

- [ ] **Step 3: Add focused-option state + keyboard handler**

In `OptionsPicker.tsx`, modify `OptionsPickerContent`. Add a generated content id near the top of the function body (after the `ctx` line):

```tsx
    const contentId = useId();
```

Add a flattened "visible options in render order" array (the list of options the keyboard nav cycles through). After `visibleGroups`/`visibleFlat`/`hasAnyVisible`, add:

```tsx
    const visibleOptionsInOrder = useMemo<OptionsPickerOption[]>(() => {
      if (isGrouped(props)) return visibleGroups.flatMap((g) => g.visibleOptions);
      return visibleFlat;
    }, [props, visibleGroups, visibleFlat]);

    const [focusedValue, setFocusedValue] = useState<string | null>(null);

    useEffect(() => {
      // Reset focused option on open OR when the visible set changes.
      if (!ctx.open) {
        setFocusedValue(null);
        return;
      }
      if (focusedValue && !visibleOptionsInOrder.some((o) => o.value === focusedValue)) {
        setFocusedValue(null);
      }
    }, [ctx.open, visibleOptionsInOrder, focusedValue]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (visibleOptionsInOrder.length === 0) return;
        const idx = focusedValue
          ? visibleOptionsInOrder.findIndex((o) => o.value === focusedValue)
          : -1;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = idx + 1 >= visibleOptionsInOrder.length ? 0 : idx + 1;
          setFocusedValue(visibleOptionsInOrder[next]!.value);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const next = idx <= 0 ? visibleOptionsInOrder.length - 1 : idx - 1;
          setFocusedValue(visibleOptionsInOrder[next]!.value);
        } else if (e.key === 'Home') {
          e.preventDefault();
          setFocusedValue(visibleOptionsInOrder[0]!.value);
        } else if (e.key === 'End') {
          e.preventDefault();
          setFocusedValue(visibleOptionsInOrder[visibleOptionsInOrder.length - 1]!.value);
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (focusedValue) {
            e.preventDefault();
            toggle(focusedValue);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setDraft(ctx.selected);
          ctx.cancel();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && ctx.mode === 'multi') {
          e.preventDefault();
          ctx.commit(draft);
        }
      },
      [visibleOptionsInOrder, focusedValue, toggle, ctx, draft],
    );
```

Modify the outer `<Stack gap="xs">` to bind the key handler. Wrap it in a `<div>` (since Stack might not accept `onKeyDown`), OR add the handler to `Popover.Content` if it accepts it. The Popover.Content from `packages/design-system/src/components/Popover/Content.tsx` accepts native HTML attributes via spread — so passing `onKeyDown` directly should work. Update the `<Popover.Content>` opening tag to:

```tsx
      <Popover.Content
        ref={ref}
        className={clsx(styles.panel, className)}
        aria-label={label}
        id={contentId}
        onKeyDown={handleKeyDown}
      >
```

Then modify the listbox `<div>` to set `aria-activedescendant`:

```tsx
<div
  className={styles.list}
  role="listbox"
  aria-multiselectable={ctx.mode === 'multi'}
  aria-activedescendant={focusedValue ? `${contentId}-opt-${focusedValue}` : undefined}
>
```

Modify `OptionRow` to accept + render an `id` so `aria-activedescendant` can target it. Update the OptionRow props + usage:

```tsx
interface OptionRowProps {
  option: OptionsPickerOption;
  checked: boolean;
  mode: OptionsPickerMode;
  rowId: string;
  focused: boolean;
  onToggle: (value: string) => void;
}

function OptionRow({ option, checked, mode, rowId, focused, onToggle }: OptionRowProps) {
  const handleClick = useCallback(() => onToggle(option.value), [onToggle, option.value]);
  return (
    <label
      id={rowId}
      className={clsx(styles.row, checked && styles.rowSelected, focused && styles.rowFocused)}
    >
      {mode === 'multi' ? (
        <Checkbox checked={checked} onChange={handleClick} aria-label={option.label} />
      ) : (
        <Radio checked={checked} onChange={handleClick} aria-label={option.label} />
      )}
      <Text size="sm">{option.label}</Text>
    </label>
  );
}
```

And update both `<OptionRow .../>` usages to pass `rowId` + `focused`:

```tsx
<OptionRow
  key={opt.value}
  option={opt}
  checked={draft.includes(opt.value)}
  mode={ctx.mode}
  rowId={`${contentId}-opt-${opt.value}`}
  focused={focusedValue === opt.value}
  onToggle={toggle}
/>
```

- [ ] **Step 4: Add focused-row styling**

Append to `OptionsPicker.module.scss`:

```scss
.rowFocused {
  outline: 2px solid var(--color-accent-base);
  outline-offset: -2px;
}
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 23 tests pass (20 prior + 3 new).

If the focused-aria-activedescendant test fails because `userEvent.keyboard('{ArrowDown}')` doesn't dispatch the event to the right element, focus the listbox first OR put the `onKeyDown` on a wrapper `<div>` inside the Popover that has `tabIndex={-1}` and is focused on open. Check by reading the userEvent docs — `{ArrowDown}` fires against the currently-focused element, which after `autoFocus` on the search input should be the search input. Since `onKeyDown` bubbles up through `Popover.Content`, the handler should still fire. If not, move `onKeyDown` to the search input AND the listbox to cover both focus targets.

- [ ] **Step 6: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/OptionsPicker
git commit -m "$(cat <<'EOF'
OptionsPicker: keyboard navigation (↓↑ Home End Enter Space Esc)

Arrow keys cycle through visible options (skipping group headers) via
aria-activedescendant on the listbox. Enter/Space toggles (multi) or
commits + closes (single). Esc cancels and closes. Cmd/Ctrl+Enter
commits multi draft. Search input retains DOM focus throughout.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: ARIA polish (trigger aria-haspopup/aria-controls, group aria-controls)

**Goal:** Final ARIA pass. Trigger gets `aria-haspopup="listbox"` + `aria-controls={contentId}` + `aria-expanded`. Group headers get `aria-controls` pointing to all their option ids. Confirm `aria-pressed` tri-state values match.

**Files:**
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.test.tsx`

- [ ] **Step 1: Plumb contentId through context**

In `OptionsPicker.tsx`, add `contentId` to `PickerContextValue`:

```tsx
interface PickerContextValue {
  mode: OptionsPickerMode;
  selected: string[];
  open: boolean;
  setOpen: (next: boolean) => void;
  commit: (next: string[]) => void;
  cancel: () => void;
  contentId: string;
}
```

In `OptionsPickerRoot`, generate the id and include it in the context value:

```tsx
  const contentId = useId();

  const ctxValue = useMemo<PickerContextValue>(
    () => ({ mode, selected: normalizedSelected, open, setOpen, commit, cancel, contentId }),
    [mode, normalizedSelected, open, setOpen, commit, cancel, contentId],
  );
```

In `OptionsPickerContent`, remove the local `useId()` line — use `ctx.contentId` everywhere. Replace `const contentId = useId();` with:

```tsx
    const contentId = ctx.contentId;
```

- [ ] **Step 2: Add ARIA attrs to Trigger**

Replace the `OptionsPickerTrigger` body with:

```tsx
const OptionsPickerTrigger = forwardRef<HTMLButtonElement, OptionsPickerTriggerProps>(
  function OptionsPickerTrigger({ children }, ref) {
    const ctx = usePickerContext('Trigger');
    return (
      <Popover.Trigger
        ref={ref}
        aria-haspopup="listbox"
        aria-controls={ctx.contentId}
        aria-expanded={ctx.open}
      >
        {children}
      </Popover.Trigger>
    );
  },
);
```

(Note: if `Popover.Trigger` doesn't forward arbitrary attributes to its underlying button, the `aria-*` props may need to be on the inner children. Check `packages/design-system/src/components/Popover/Trigger.tsx` — if it uses `cloneElement` on its child, the attrs must land on the child; if it wraps with its own button, attrs go on the wrapper.)

- [ ] **Step 3: Add aria-controls to group headers**

In `OptionsPickerContent`, inside the `ctx.mode === 'multi'` branch of the group-header rendering, modify the `<button>` to add `aria-controls`:

```tsx
<button
  type="button"
  className={styles.groupHeader}
  aria-pressed={tristate(g.options.map((o) => o.value), draft)}
  aria-label={`Toggle group ${g.label}`}
  aria-controls={g.options.map((o) => `${contentId}-opt-${o.value}`).join(' ')}
  onClick={() => toggleGroup(g.options)}
>
```

- [ ] **Step 4: Write tests for ARIA wiring**

Append to `OptionsPicker.test.tsx`:

```tsx
it('Trigger carries aria-haspopup, aria-controls, and aria-expanded', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  const trigger = screen.getByRole('button', { name: 'Open' });
  expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger.getAttribute('aria-controls')).toBeTruthy();
  await user.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

it('group headers carry aria-controls listing all option ids', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const header = screen.getByRole('button', { name: /Authentication/i });
  const ids = header.getAttribute('aria-controls')!.split(' ');
  expect(ids).toHaveLength(2);
  expect(ids[0]).toMatch(/-opt-auth\.login$/);
  expect(ids[1]).toMatch(/-opt-auth\.logout$/);
});
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- OptionsPicker 2>&1 | tail -15
```
Expected: 25 tests pass (23 prior + 2 new).

If `Popover.Trigger` doesn't pass-through the `aria-*` attributes, modify the Trigger implementation to spread them onto its rendered children using `cloneElement` (read Popover/Trigger.tsx first to see how it composes).

- [ ] **Step 6: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/OptionsPicker
git commit -m "$(cat <<'EOF'
OptionsPicker: ARIA polish (trigger / group aria-controls / aria-expanded)

Trigger gets aria-haspopup=listbox + aria-controls + aria-expanded.
Group headers get aria-controls listing every option's id. Content
id moved to context so Trigger and Content share it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Public exports + AGENTS.md

**Goal:** Re-export `OptionsPicker` + types from `packages/design-system/src/index.ts`. Add a TL;DR section to `AGENTS.md` per Hard rule 1 / agent primer convention.

**Files:**
- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add to index.ts**

Open `packages/design-system/src/index.ts`. Find the existing alphabetic export block. Add (placed alphabetically — likely between Popover and PageHeader/Pagination, depending on existing order):

```ts
export { OptionsPicker } from './components/OptionsPicker';
export type {
  OptionsPickerProps,
  OptionsPickerContentProps,
  OptionsPickerTriggerProps,
  OptionsPickerMode,
  OptionsPickerOption,
  OptionsPickerGroup,
} from './components/OptionsPicker';
```

- [ ] **Step 2: Add JSDoc to the root**

In `OptionsPicker.tsx`, add a comprehensive JSDoc block immediately above `function OptionsPickerRoot`:

```tsx
/**
 * Compound multi/single-select picker with search, optional grouping, and
 * draft-then-Apply commit semantics. Built on `Popover`, `Input`, `Checkbox`,
 * `Radio`, `Badge`. Use it for filter UX (audit log Events / Tenant, contact
 * list owner picker, deal stage picker) — NOT as a form field (use `Select`
 * for forms).
 *
 * Multi mode (default): draft state until Apply. Cancel/Esc/click-outside
 * revert. Single mode: each click commits via onApply + closes the panel
 * (no Apply/Cancel footer).
 *
 * @example
 * // Multi-select with grouped options + namespace hints
 * <OptionsPicker
 *   selected={selectedEvents}
 *   onApply={(next) => setSelectedEvents(next)}
 * >
 *   <OptionsPicker.Trigger>
 *     <Button variant="secondary">Events <ChevronDown size={14}/></Button>
 *   </OptionsPicker.Trigger>
 *   <OptionsPicker.Content
 *     label="Filter events"
 *     groups={[
 *       { id: 'auth', label: 'Authentication', tone: 'success', hint: 'auth.*',
 *         options: [{ value: 'auth.login_succeeded', label: 'login_succeeded' }] },
 *     ]}
 *   />
 * </OptionsPicker>
 *
 * @example
 * // Single-select flat list (auto-commits on click)
 * <OptionsPicker mode="single" selected={tenantId} onApply={setTenantId}>
 *   <OptionsPicker.Trigger>
 *     <Button variant="secondary">Tenant</Button>
 *   </OptionsPicker.Trigger>
 *   <OptionsPicker.Content
 *     label="Filter tenant"
 *     options={tenants.map((t) => ({ value: t.id, label: t.slug }))}
 *   />
 * </OptionsPicker>
 *
 * @remarks When NOT to use
 * - Form fields with one required selection — use `<Select>` instead. OptionsPicker
 *   has no notion of a `name` attribute, no implicit form association.
 * - Action menus (Edit / Delete / Archive on a row) — use `<DropdownMenu>`. Those
 *   are commands, not filters.
 * - Settings toggles or single-checkbox prompts — use `<Checkbox>` directly.
 *
 * @remarks Anti-patterns
 * - ❌ Passing BOTH `options` and `groups` to Content — TypeScript rejects it. Pick one.
 * - ❌ Calling onApply yourself inside Content's render. The picker owns commit
 *   via Apply/click-on-radio; consumers should treat `onApply(next)` as the
 *   single source of truth and update React state from it.
 * - ❌ Holding open state externally without `open` + `onOpenChange` both being
 *   passed. Partial control breaks invariants.
 */
```

- [ ] **Step 3: Add a section to AGENTS.md**

Open `packages/design-system/AGENTS.md`. Find the existing alphabetic-by-name component sections. Add this section (placed alphabetically — probably between an `O` neighbor or at end of the list; use whatever the file's convention is):

```markdown
## OptionsPicker

**Use for filter UX, not form fields.** A compound picker that opens a Popover
with a search input and grouped/flat checkbox (multi) or radio (single) options.
Multi mode buffers a draft until Apply; single mode commits per click.

```tsx
<OptionsPicker selected={events} onApply={setEvents}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">Events <ChevronDown size={14}/></Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content
    label="Filter events"
    groups={catalogGroups}      // OR `options={flatOptions}` — XOR
  />
</OptionsPicker>
```

`mode="single"` for single-select: `selected: string | null`, `onApply(value | null)`, no Apply/Cancel footer.

Don't use for form selects (use `<Select>`), action menus (use `<DropdownMenu>`),
or single boolean toggles (use `<Checkbox>` or `<Switch>`).
```

- [ ] **Step 4: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
cd /Users/dpws/projects/design-system
git add packages/design-system/src/index.ts packages/design-system/AGENTS.md packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx
git commit -m "$(cat <<'EOF'
OptionsPicker: public exports + AGENTS.md TL;DR + JSDoc

Adds OptionsPicker (+ all types) to the library's public surface.
JSDoc with two @example blocks (multi-grouped, single-flat) and
"When NOT to use" + "Anti-patterns" remarks per Hard rule 7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Component demo page

**Goal:** Create `OptionsPickerDemo.tsx` in the playground following `DemoLayout` + `Example` convention. Wire into App routes, AppShell nav, ComponentsIndex grid, and the `ComponentName` union in registry.

**Files:**
- Create: `packages/playground/src/pages/components/OptionsPickerDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Write the demo page**

Write `packages/playground/src/pages/components/OptionsPickerDemo.tsx`:

```tsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, OptionsPicker, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/OptionsPicker/OptionsPicker.tsx?raw';
import scssSource from '@lib-source/components/OptionsPicker/OptionsPicker.module.scss?raw';

const flatOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const groupedOptions = [
  {
    id: 'auth',
    label: 'Authentication',
    tone: 'success' as const,
    hint: 'auth.*',
    options: [
      { value: 'auth.login_succeeded', label: 'login_succeeded' },
      { value: 'auth.login_failed', label: 'login_failed' },
      { value: 'auth.logout', label: 'logout' },
      { value: 'auth.mfa_enabled', label: 'mfa_enabled' },
    ],
  },
  {
    id: 'role',
    label: 'Roles',
    tone: 'info' as const,
    hint: 'role.*',
    options: [
      { value: 'role.assigned', label: 'assigned' },
      { value: 'role.updated', label: 'updated' },
      { value: 'role.revoked', label: 'revoked' },
    ],
  },
  {
    id: 'invitation',
    label: 'Invitations',
    tone: 'warning' as const,
    hint: 'invitation.*',
    options: [
      { value: 'invitation.sent', label: 'sent' },
      { value: 'invitation.accepted', label: 'accepted' },
      { value: 'invitation.expired', label: 'expired' },
    ],
  },
];

export function OptionsPickerDemo() {
  const [multiFlat, setMultiFlat] = useState<string[]>(['lead']);
  const [multiGrouped, setMultiGrouped] = useState<string[]>([
    'auth.login_succeeded',
    'role.assigned',
  ]);
  const [single, setSingle] = useState<string | null>('qualified');
  const [controlledOpen, setControlledOpen] = useState(false);
  const [controlledValue, setControlledValue] = useState<string[]>([]);

  return (
    <DemoLayout
      name="OptionsPicker"
      componentName="OptionsPicker"
      description="Filter-picker UX: popover with search, optional grouping, multi/single select, draft-then-Apply commit."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="OptionsPicker.tsx"
      scssFilename="OptionsPicker.module.scss"
    >
      <Example
        title="Multi-select, flat options"
        description="Default mode. Draft state buffered until Apply."
        code={`<OptionsPicker selected={selected} onApply={setSelected}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">
      Stage <ChevronDown size={14} />
    </Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content label="Filter stage" options={flatOptions} />
</OptionsPicker>`}
      >
        <Stack gap="sm">
          <OptionsPicker selected={multiFlat} onApply={setMultiFlat}>
            <OptionsPicker.Trigger>
              <Button variant="secondary">
                Stage ({multiFlat.length}) <ChevronDown size={14} />
              </Button>
            </OptionsPicker.Trigger>
            <OptionsPicker.Content label="Filter stage" options={flatOptions} />
          </OptionsPicker>
        </Stack>
      </Example>

      <Example
        title="Multi-select, grouped with namespace hints"
        description="Each group has a colored dot, label, and a right-side hint label (e.g., auth.*). Clicking the group header toggles all options in the namespace."
        code={`<OptionsPicker selected={selected} onApply={setSelected}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">Events <ChevronDown size={14}/></Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content label="Filter events" groups={groupedOptions} />
</OptionsPicker>`}
      >
        <OptionsPicker selected={multiGrouped} onApply={setMultiGrouped}>
          <OptionsPicker.Trigger>
            <Button variant="secondary">
              Events ({multiGrouped.length}) <ChevronDown size={14} />
            </Button>
          </OptionsPicker.Trigger>
          <OptionsPicker.Content label="Filter events" groups={groupedOptions} />
        </OptionsPicker>
      </Example>

      <Example
        title="Single-select (auto-commits on click)"
        description="No Apply/Cancel footer. Each click fires onApply(value) and closes the panel. Use for single-choice filter UX (Tenant, status, etc.)."
        code={`<OptionsPicker mode="single" selected={value} onApply={setValue}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">Stage <ChevronDown size={14}/></Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content label="Filter stage" options={flatOptions} />
</OptionsPicker>`}
      >
        <OptionsPicker mode="single" selected={single} onApply={setSingle}>
          <OptionsPicker.Trigger>
            <Button variant="secondary">
              Stage: {single ?? '—'} <ChevronDown size={14} />
            </Button>
          </OptionsPicker.Trigger>
          <OptionsPicker.Content label="Filter stage" options={flatOptions} />
        </OptionsPicker>
      </Example>

      <Example
        title="Controlled open state"
        description="Pass open + onOpenChange to drive the panel externally. Useful when one filter chip needs to reopen the picker from elsewhere on the page."
        code={`<OptionsPicker
  open={open}
  onOpenChange={setOpen}
  selected={selected}
  onApply={setSelected}
>
  <OptionsPicker.Trigger><Button>Filter</Button></OptionsPicker.Trigger>
  <OptionsPicker.Content label="Filter" options={flatOptions} />
</OptionsPicker>`}
      >
        <Stack gap="sm">
          <OptionsPicker
            open={controlledOpen}
            onOpenChange={setControlledOpen}
            selected={controlledValue}
            onApply={setControlledValue}
          >
            <OptionsPicker.Trigger>
              <Button variant="secondary">
                Filter ({controlledValue.length}) <ChevronDown size={14} />
              </Button>
            </OptionsPicker.Trigger>
            <OptionsPicker.Content label="Filter stage" options={flatOptions} />
          </OptionsPicker>
          <Button variant="ghost" size="sm" onClick={() => setControlledOpen((o) => !o)}>
            Toggle externally (currently {controlledOpen ? 'open' : 'closed'})
          </Button>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**

Open `packages/playground/src/App.tsx`. Find the existing component routes (search for `/components/`). Add (alphabetically positioned):

```tsx
<Route path="/components/options-picker" element={<OptionsPickerDemo />} />
```

Add the import at the top:

```tsx
import { OptionsPickerDemo } from './pages/components/OptionsPickerDemo';
```

- [ ] **Step 3: Add nav entry to AppShell**

Open `packages/playground/src/layout/AppShell/AppShell.tsx`. Find the `componentGroups` map. The OptionsPicker fits semantically in the "Forms" group (next to Select, Checkbox, Radio). Add to that array:

```tsx
{ to: '/components/options-picker', label: 'OptionsPicker' },
```

- [ ] **Step 4: Add card to ComponentsIndex**

Open `packages/playground/src/pages/components/ComponentsIndex.tsx`. If it iterates over a constant array, add a new entry. If it's manually written, add a card following the existing pattern. Use the OptionsPicker preview:

```tsx
{
  name: 'OptionsPicker',
  path: '/components/options-picker',
  description: 'Popover-based filter picker — multi/single select, grouped, search.',
  preview: (
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button variant="secondary" size="sm">Filter</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={[]} />
    </OptionsPicker>
  ),
},
```

Read the existing `ComponentsIndex.tsx` first to match the actual shape (each card may use a slightly different structure).

- [ ] **Step 5: Add to ComponentName union**

Open `packages/playground/src/pages/mockups/registry.ts`. Add `'OptionsPicker'` to the `ComponentName` union (alphabetically):

```ts
  | 'OptionsPicker'
```

- [ ] **Step 6: Run gates**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```
Expected: clean exit on each.

- [ ] **Step 7: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground packages/design-system/src/index.ts
git commit -m "$(cat <<'EOF'
OptionsPicker: playground demo + nav + registry wiring

Four examples: multi-flat, multi-grouped, single-flat (auto-commit),
and controlled-open. Wired into routes / sidebar / ComponentsIndex.
ComponentName union extended.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Audit mockup integration

**Goal:** Replace the static `Events ▾` and `Tenant ▾` buttons in `packages/playground/src/pages/mockups/Audit/Audit.tsx` with real `<OptionsPicker>` instances. Add catalog + tenant data to `audit.ts`. Update `usesComponents` for the audit registry entry.

**Files:**
- Modify: `packages/playground/src/data/audit.ts`
- Modify: `packages/playground/src/pages/mockups/Audit/Audit.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Add catalog + tenant data to audit.ts**

Open `packages/playground/src/data/audit.ts`. Append at the end of the file:

```ts
import type { OptionsPickerGroup, OptionsPickerOption } from '@eocrm/design-system';

/**
 * Hand-rolled audit event catalog for the mockup's Event picker. Covers the
 * namespaces present in `auditEntries` plus a couple of common siblings to
 * make the picker feel populated.
 */
export const eventCatalog: OptionsPickerGroup[] = [
  {
    id: 'auth',
    label: 'Authentication',
    tone: 'success',
    hint: 'auth.*',
    options: [
      { value: 'auth.login_succeeded', label: 'login_succeeded' },
      { value: 'auth.login_failed', label: 'login_failed' },
      { value: 'auth.logout', label: 'logout' },
      { value: 'auth.mfa_enabled', label: 'mfa_enabled' },
      { value: 'auth.mfa_disabled', label: 'mfa_disabled' },
      { value: 'auth.password_reset_requested', label: 'password_reset_requested' },
      { value: 'auth.password_reset_completed', label: 'password_reset_completed' },
    ],
  },
  {
    id: 'role',
    label: 'Roles',
    tone: 'info',
    hint: 'role.*',
    options: [
      { value: 'role.assigned', label: 'assigned' },
      { value: 'role.updated', label: 'updated' },
      { value: 'role.revoked', label: 'revoked' },
    ],
  },
  {
    id: 'user',
    label: 'Users',
    tone: 'info',
    hint: 'user.*',
    options: [
      { value: 'user.created', label: 'created' },
      { value: 'user.updated', label: 'updated' },
      { value: 'user.deleted', label: 'deleted' },
    ],
  },
  {
    id: 'invitation',
    label: 'Invitations',
    tone: 'warning',
    hint: 'invitation.*',
    options: [
      { value: 'invitation.sent', label: 'sent' },
      { value: 'invitation.accepted', label: 'accepted' },
      { value: 'invitation.expired', label: 'expired' },
    ],
  },
  {
    id: 'contact',
    label: 'Contacts',
    tone: 'neutral',
    hint: 'contact.*',
    options: [
      { value: 'contact.created', label: 'created' },
      { value: 'contact.updated', label: 'updated' },
      { value: 'contact.deleted', label: 'deleted' },
    ],
  },
  {
    id: 'deal',
    label: 'Deals',
    tone: 'neutral',
    hint: 'deal.*',
    options: [
      { value: 'deal.created', label: 'created' },
      { value: 'deal.stage_changed', label: 'stage_changed' },
      { value: 'deal.won', label: 'won' },
      { value: 'deal.lost', label: 'lost' },
    ],
  },
  {
    id: 'system_setting',
    label: 'System settings',
    tone: 'warning',
    hint: 'system_setting.*',
    options: [
      { value: 'system_setting.updated', label: 'updated' },
    ],
  },
];

export const tenantOptions: OptionsPickerOption[] = [
  { value: 'acme', label: 'acme' },
  { value: 'beta', label: 'beta' },
  { value: 'hooli', label: 'hooli' },
  { value: 'stark', label: 'stark' },
];
```

- [ ] **Step 2: Update Audit.tsx to use OptionsPicker**

Open `packages/playground/src/pages/mockups/Audit/Audit.tsx`. Update the imports — replace the existing design-system import block with:

```tsx
import {
  Avatar,
  Badge,
  Button,
  Cluster,
  Code,
  DataTable,
  DefinitionList,
  Divider,
  OptionsPicker,
  PageHeader,
  Stack,
  Text,
  Tooltip,
  useDataTable,
  type BadgeTone,
  type ColumnDef,
} from '@eocrm/design-system';
```

And the data import:

```tsx
import { auditEntries, eventCatalog, eventTone, tenantOptions, type AuditEntry } from '../../../data/audit';
```

Inside the `Audit` function, just above the existing `function removeChip(...)` declaration, add the picker state:

```tsx
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['role.assigned']);
  const [selectedTenant, setSelectedTenant] = useState<string | null>('acme');
```

Find the existing `<Cluster gap="sm" wrap>` block that holds the three trigger Buttons (Events / Tenant / Last 7 days). Replace it with:

```tsx
      <Cluster gap="sm" wrap>
        <OptionsPicker selected={selectedEvents} onApply={setSelectedEvents}>
          <OptionsPicker.Trigger>
            <Button variant="secondary" size="sm">
              <Badge tone="info" dot="start" size="sm" />
              Event ({selectedEvents.length})
              <ChevronDown size={14} />
            </Button>
          </OptionsPicker.Trigger>
          <OptionsPicker.Content label="Filter events" groups={eventCatalog} />
        </OptionsPicker>

        <OptionsPicker mode="single" selected={selectedTenant} onApply={setSelectedTenant}>
          <OptionsPicker.Trigger>
            <Button variant="secondary" size="sm">
              <Badge tone="info" dot="start" size="sm" />
              Tenant{selectedTenant ? `: ${selectedTenant}` : ''}
              <ChevronDown size={14} />
            </Button>
          </OptionsPicker.Trigger>
          <OptionsPicker.Content label="Filter tenant" options={tenantOptions} />
        </OptionsPicker>

        <Button variant="secondary" size="sm">
          Last 7 days <ChevronDown size={14} />
        </Button>
      </Cluster>
```

- [ ] **Step 3: Update the audit registry entry**

Open `packages/playground/src/pages/mockups/registry.ts`. Find the `audit` mockup entry and add `'OptionsPicker'` to its `usesComponents` array (alphabetically — between PageHeader and Stack):

```ts
      'OptionsPicker',
```

- [ ] **Step 4: Run gates**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```
Expected: all green.

- [ ] **Step 5: Manual verification in browser**

If the dev server is running on http://localhost:8080, navigate to `/mockups/audit`. If not, ask the user to run `make up` in their terminal and confirm when ready (do NOT start it from the agent).

Confirm:
1. Clicking the "Event (N)" trigger opens a popover with grouped event options + namespace hints.
2. Selecting/deselecting checkboxes updates the draft; clicking Apply commits and closes; Cancel reverts.
3. Clicking a group header toggles all options in that namespace.
4. Search filter narrows visible options; empty groups disappear.
5. Clicking the "Tenant" trigger opens a popover with 4 radio options; selecting one commits immediately and closes.

- [ ] **Step 6: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/data/audit.ts packages/playground/src/pages/mockups/Audit/Audit.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
Audit mockup: wire OptionsPicker for Event + Tenant filters

Replaces the static Events ▾ and Tenant ▾ trigger Buttons with real
OptionsPicker instances. Multi-mode grouped Event picker (7 groups,
~25 events) and single-mode flat Tenant picker (4 tenants).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Hard rule 8 review-fix cycle (library changes)

**Goal:** Per `packages/design-system/CLAUDE.md` Hard rule 8, library changes go through a fresh-context review-fix loop until verdict is `clean enough to stop`.

**Files:** depends on review findings.

- [ ] **Step 1: Run gates one more time**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "\.(test|spec)\.tsx?$" | head -3
```

All four gates must be green. The npm pack grep must produce zero output (no test files in the tarball).

- [ ] **Step 2: Spawn the review agent**

Use the `Agent` tool (`subagent_type: general-purpose`) with a prompt covering the 10 Hard rule 8 categories from `packages/design-system/CLAUDE.md`. Brief the agent on:

- Files changed: read `git diff main..HEAD --stat` first.
- Required reading: `packages/design-system/CLAUDE.md`, `packages/design-system/AGENTS.md`, `packages/design-system/README.md`, the OptionsPicker source + tests, the demo page, and the audit mockup integration.
- 10 categories: bugs, a11y, API inconsistencies, type safety, rule violations (Rules 1–7), test coverage, token discipline, SCSS, cross-package leakage, package/distribution.
- Output format: Critical / Important / Nice-to-have / Regression-watch + final verdict (`clean enough to stop` or `keep iterating`).

- [ ] **Step 3: Address Critical + Important findings**

For each Critical and Important finding, fix in the relevant file. Skipped findings get a one-line explanation in your response (don't silently ignore).

- [ ] **Step 4: Re-run gates**

```bash
cd /Users/dpws/projects/design-system && npm test && make lint && make build 2>&1 | tail -5
```

Expected: green across the board.

- [ ] **Step 5: Spawn another review agent**

Same prompt as Step 2. Repeat Steps 3–5 until verdict is `clean enough to stop` AND there are zero unresolved Critical / Important findings.

- [ ] **Step 6: Commit review-fix changes**

If any of the review-fix steps produced commits, push them as you go (one commit per fix round is fine). If you've been committing as you fix, this step is a no-op.

---

## Task 14: Push branch + open PR

**Files:** (no code changes)

- [ ] **Step 1: Push the branch**

```bash
cd /Users/dpws/projects/design-system && git push -u origin feat/options-picker 2>&1 | tail -10
```

Expected: pre-push hook (prettier + stylelint + typecheck) passes; branch pushed.

If prettier fails on any file, run `npx prettier --write <files>`, commit as a separate `chore: prettier` commit, and re-push.

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "OptionsPicker: multi/single-select picker with search" --body "$(cat <<'EOF'
## Summary

New compound primitive in `@eocrm/design-system` — `OptionsPicker` — modeling the filter-picker UX (popover panel with search, optional grouped checkboxes / radios, draft-then-Apply commit in multi mode, click-to-commit in single mode). Built from existing Popover / Input / Checkbox / Radio / Badge / Button / Text / Cluster primitives.

First consumer: the Audit mockup's Events ▾ and Tenant ▾ filter triggers now open real pickers instead of being visual-only Buttons.

Spec: `docs/superpowers/specs/2026-05-26-options-picker-design.md`
Plan: `docs/superpowers/plans/2026-05-26-options-picker.md`

## Test plan

- [x] Unit tests (Vitest) — 25+ tests covering render, multi/single behavior, search filtering, group toggle + tri-state, keyboard nav, ARIA wiring.
- [x] `make build`, `make lint`, `npm run typecheck` — all green
- [x] `npm pack --dry-run` — no test files in the tarball
- [x] Hard rule 8 review-fix cycle — final verdict `clean enough to stop`
- [x] Manual verification on `/mockups/audit`: Event picker opens, search filters, group toggle works, Apply/Cancel commits/reverts. Tenant picker (single mode) auto-commits on click.
- [x] Component demo at `/components/options-picker` with 4 examples (multi-flat, multi-grouped, single-flat, controlled-open)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | tail -3
```

- [ ] **Step 3: Capture the PR URL**

The `gh pr create` command outputs the PR URL on success. Report it back to the user.

---

## Self-Review

**1. Spec coverage:**
- API shape (compound, mode union, XOR options/groups) — Task 1 (scaffold) + Task 5 (groups) ✓
- Types (Option, Group, Props discriminated by mode, ContentProps with XOR) — Task 1 ✓
- Panel anatomy (search + count, list, footer) — Tasks 3 + 4 ✓
- Internal state (draft, filter, focusedValue) — Tasks 2, 3, 8 ✓
- Mode-specific behavior table (multi vs single) — Tasks 2, 4, 7 ✓
- Keyboard navigation table — Task 8 ✓
- Accessibility (roles, aria-pressed tri-state, aria-controls, aria-live, aria-activedescendant) — Tasks 6 + 8 + 9 ✓
- File layout (single .tsx + module.scss + test.tsx + index.ts) — Task 1 ✓
- Composition table (built from existing primitives) — implicit throughout ✓
- Public exports — Task 10 ✓
- Tests (render + behavior) — Tasks 1–9 (TDD per task) ✓
- Demo + cross-link wiring — Task 11 ✓
- Audit mockup integration — Task 12 ✓
- Out-of-scope items — covered by not appearing in any task ✓

**2. Placeholder scan:** no "TBD", "TODO", "fill in later", "similar to Task N", or "add appropriate error handling". Every step has code or commands.

**3. Type consistency:**
- `OptionsPickerOption.value: string` used consistently across tasks.
- `OptionsPickerGroup.id: string` used both as React key and `aria-controls` id source.
- `PickerContextValue` defined in Task 1 and extended in Task 9 (added `contentId`) — Task 9's diff shows the extension.
- `MultiProps.selected: string[]` vs `SingleProps.selected: string | null` discriminated consistently.
- Mode-conditional `onApply(string[] | null)` signature matches in commit handler.
- `OptionRow` props evolve: Task 2 introduces it with `option/checked/onToggle`; Task 7 adds `mode`; Task 8 adds `rowId/focused`. Each task explicitly shows the full replacement signature.

One known risk: `Popover.Trigger` may not forward arbitrary aria-* attributes — Task 9 Step 2 notes this and instructs to check + adapt.

One coverage gap: Task 8 cmd/ctrl+Enter "commit multi draft" keyboard shortcut is implemented in the keyboard handler but doesn't have an explicit test. The arrow/Enter/Esc tests cover the core paths. Acceptable Nice-to-have — the implementation includes the branch and the spec lists it as an option, but skipping the test isn't a Critical gap.
