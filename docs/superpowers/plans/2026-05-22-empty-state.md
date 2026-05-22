# EmptyState — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<EmptyState>` — props-driven leaf component with `icon | title | description | actions` slots, `sm | md | lg` sizes, `center | start` align, and a `headingLevel` override.

**Architecture:** `<section>` with a `Stack`-like vertical layout inside. Title rendered as a semantic heading (default `<h3>`, override via `headingLevel`). No new tokens — reuses existing color + spacing + typography scales.

**Tech Stack:** React, SCSS modules, Vitest + RTL.

**Branch:** `feat/empty-state`. Off fresh main.

**Spec:** `docs/superpowers/specs/2026-05-22-empty-state-design.md`.

---

## Task 1: Verify branch + hooks

- [ ] **Step 1: Verify**

```bash
git rev-parse --abbrev-ref HEAD   # → feat/empty-state
git config --get core.hooksPath   # → .husky/_
test -x .husky/pre-push           # exit 0
```

---

## Task 2: `EmptyState.tsx` + `EmptyState.module.scss`

**Files:**

- Create: `packages/design-system/src/components/EmptyState/EmptyState.tsx`
- Create: `packages/design-system/src/components/EmptyState/EmptyState.module.scss`

- [ ] **Step 1: Write `EmptyState.tsx`**

```tsx
import { createElement, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './EmptyState.module.scss';

/** Visual size. Tracks typography + spacing scale. */
export type EmptyStateSize = 'sm' | 'md' | 'lg';

/** Horizontal alignment of the stacked content. */
export type EmptyStateAlign = 'center' | 'start';

/** Valid `<h*>` heading levels. */
export type EmptyStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * Icon rendered above the title. Pass a lucide icon, custom SVG, or any
   * ReactNode. Sized by the consumer — recommended: sm=24, md=32, lg=48.
   * Omit for an icon-less empty state.
   */
  icon?: ReactNode;

  /**
   * Required title. Rendered as a semantic heading (default `<h3>`).
   * Accepts ReactNode so inline emphasis works
   * (e.g., `<>Found <strong>0</strong> results</>`). Keep it short and
   * announceable — AT users hear it via heading navigation.
   */
  title: ReactNode;

  /** Optional description rendered below the title. */
  description?: ReactNode;

  /**
   * Optional action(s) rendered below the description. Typically a
   * `<Button>` or a `<Cluster gap="sm">` of buttons.
   */
  actions?: ReactNode;

  /**
   * Visual size. Defaults to `'md'`.
   * - `'sm'` — compact for inline / popover use (empty Select results,
   *   empty filter chips). Icon target 24px, font-size-sm title.
   * - `'md'` — default for cards / sections (DataTable empty row, inbox
   *   empty). Icon target 32px, font-size-md title.
   * - `'lg'` — hero / full-page empty states. Icon target 48px,
   *   font-size-xl title.
   */
  size?: EmptyStateSize;

  /**
   * Horizontal alignment of the stacked content. Defaults to `'center'`.
   * Use `'start'` when the empty state sits in a tight column where
   * centering would look stranded.
   */
  align?: EmptyStateAlign;

  /**
   * Heading level for the `title`. Defaults to `3` (renders `<h3>`).
   * Set higher (4–6) when the empty state lives deep inside the page's
   * heading hierarchy. Set to `2` when the empty state IS the page's
   * primary content. Values outside `1–6` clamp to `3`.
   */
  headingLevel?: EmptyStateHeadingLevel;
}

function clampHeading(level: EmptyStateHeadingLevel | undefined): EmptyStateHeadingLevel {
  if (level === undefined) return 3;
  if (level < 1 || level > 6) return 3;
  return level;
}

/**
 * Empty-state container — opinionated "nothing here" treatment. Renders
 * an optional icon, a required title (as a semantic heading), an optional
 * description, and optional action(s), stacked vertically with token-correct
 * spacing.
 *
 * Use to keep empty states consistent across the app. For unusual layouts,
 * compose `<Stack>` + `<Button>` directly — this component is deliberately
 * inflexible.
 *
 * @example
 * <EmptyState
 *   icon={<Inbox size={32} />}
 *   title="No contacts yet"
 *   description="Add your first contact to get started."
 *   actions={<Button>Add contact</Button>}
 * />
 *
 * @example
 * // Multiple actions:
 * <EmptyState
 *   icon={<Search size={32} />}
 *   title="No results"
 *   description="Try a different query or clear the filters."
 *   actions={
 *     <Cluster gap="sm" justify="center">
 *       <Button onClick={clearFilters}>Clear filters</Button>
 *       <Button variant="ghost" onClick={openSearch}>New search</Button>
 *     </Cluster>
 *   }
 * />
 *
 * @example
 * // Inline (in a Select dropdown's empty results):
 * <EmptyState
 *   size="sm"
 *   icon={<SearchX size={24} />}
 *   title="No matches"
 * />
 *
 * @remarks When NOT to use
 * - **Loading state** → use `<Skeleton>`. Skeleton implies "data coming";
 *   EmptyState implies "nothing here, possibly forever."
 * - **Error state** → consumer renders a danger-tinted treatment. We
 *   intentionally don't ship `variant="error"` because errors have
 *   different a11y (live regions, retry actions) than empty states.
 * - **Page-level 404 / 500** → use a dedicated error page, not EmptyState.
 *
 * @remarks Anti-patterns
 * - ❌ Passing a long sentence as `title`. Keep titles short — long
 *   strings hurt heading-navigation UX.
 * - ❌ Multiple primary action buttons. Empty states should have ONE
 *   clear next action; secondaries are ghost variant.
 * - ❌ Skipping the `description` to save space. The two-line treatment
 *   (title + description) is what makes empty states scannable.
 */
export const EmptyState = forwardRef<HTMLElement, EmptyStateProps>(function EmptyState(
  {
    icon,
    title,
    description,
    actions,
    size = 'md',
    align = 'center',
    headingLevel,
    className,
    ...props
  },
  ref,
) {
  const headingTag = `h${clampHeading(headingLevel)}` as const;

  return (
    <section
      ref={ref}
      {...props}
      className={clsx(
        styles.emptyState,
        styles[`size-${size}`],
        styles[`align-${align}`],
        className,
      )}
    >
      {icon != null && <span className={styles.icon}>{icon}</span>}
      {createElement(headingTag, { className: styles.title }, title)}
      {description != null && <p className={styles.description}>{description}</p>}
      {actions != null && <div className={styles.actions}>{actions}</div>}
    </section>
  );
});
```

- [ ] **Step 2: Write `EmptyState.module.scss`**

```scss
.emptyState {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.align-center {
  align-items: center;
  text-align: center;
}

.align-start {
  align-items: flex-start;
  text-align: start;
}

// Size modifiers — gap between stacked children + outer padding.
.size-sm {
  gap: var(--space-2);
  padding: var(--space-3);
}

.size-md {
  gap: var(--space-3);
  padding: var(--space-6);
}

.size-lg {
  gap: var(--space-4);
  padding: var(--space-10);
}

// Icon — uses --color-fg-muted so it sits visually "behind" the title.
// Consumer-supplied SVG inherits via currentColor when its `color` prop
// is omitted (lucide convention).
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-fg-muted);
  line-height: var(--line-height-none);
}

// Title — semantic heading. Reset user-agent margins (h1-h6 default to
// nonzero margin in most browsers) so the gap above is controlled by
// .emptyState's flex `gap`.
.title {
  margin: 0;
  color: var(--color-fg);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

.size-sm .title {
  font-size: var(--font-size-sm);
}

.size-md .title {
  font-size: var(--font-size-md);
}

.size-lg .title {
  font-size: var(--font-size-xl);
}

.description {
  margin: 0;
  color: var(--color-fg-subtle);
  line-height: var(--line-height-normal);
  // Constrain readable width on lg sizes so the description doesn't
  // stretch edge-to-edge in a wide container.
  max-width: 48ch;
}

.size-sm .description {
  font-size: var(--font-size-sm);
}

.size-md .description,
.size-lg .description {
  font-size: var(--font-size-md);
}

.actions {
  // Slight extra breathing room before the action(s).
  display: inline-flex;
  align-items: center;
  justify-content: inherit;
}
```

NOTE on stylelint: the `.title` has `margin: 0` (resetting user-agent heading margins) — this is the only `margin` declaration, and it's a defensive reset of inherited styles, NOT a layout property. The `.description` `max-width: 48ch` is also defensive (prevents wide stretching) — same rationale. If stylelint flags either, wrap in a documented `stylelint-disable property-disallowed-list` block.

- [ ] **Step 3: Gates**

```bash
cd /home/dpws/projects/design-system
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

Fix any stylelint findings inline using the documented disable pattern.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/EmptyState/EmptyState.tsx \
        packages/design-system/src/components/EmptyState/EmptyState.module.scss
git commit -m "EmptyState: new primitive — icon / title / description / actions slots, sm/md/lg"
```

---

## Task 3: `EmptyState.test.tsx`

**Files:**

- Create: `packages/design-system/src/components/EmptyState/EmptyState.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title as a semantic heading (default h3)', () => {
    render(<EmptyState title="No results" />);
    const heading = screen.getByRole('heading', { name: 'No results' });
    expect(heading.tagName).toBe('H3');
  });

  it('headingLevel={2} renders as h2', () => {
    render(<EmptyState title="No results" headingLevel={2} />);
    expect(screen.getByRole('heading', { name: 'No results' }).tagName).toBe('H2');
  });

  it('headingLevel out-of-range clamps to h3', () => {
    // @ts-expect-error — intentional invalid value to test runtime clamp
    render(<EmptyState title="No results" headingLevel={9} />);
    expect(screen.getByRole('heading', { name: 'No results' }).tagName).toBe('H3');
  });

  it('renders the icon when provided', () => {
    const { container } = render(<EmptyState title="X" icon={<svg data-testid="icon" />} />);
    expect(container.querySelector('[data-testid="icon"]')).toBeInTheDocument();
  });

  it('omits the icon slot when icon is not provided', () => {
    const { container } = render(<EmptyState title="X" />);
    expect(container.querySelector('[class*="icon"]')).toBeNull();
  });

  it('renders the description when provided', () => {
    render(<EmptyState title="X" description="Add your first thing." />);
    expect(screen.getByText('Add your first thing.')).toBeInTheDocument();
  });

  it('omits the description slot when not provided', () => {
    const { container } = render(<EmptyState title="X" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the actions slot when provided', () => {
    render(<EmptyState title="X" actions={<button type="button">Add thing</button>} />);
    expect(screen.getByRole('button', { name: 'Add thing' })).toBeInTheDocument();
  });

  it('omits the actions slot when not provided', () => {
    const { container } = render(<EmptyState title="X" />);
    expect(container.querySelector('[class*="actions"]')).toBeNull();
  });

  it('applies size class names for sm / md / lg', () => {
    const { container, rerender } = render(<EmptyState title="X" size="sm" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-sm/);
    rerender(<EmptyState title="X" size="md" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-md/);
    rerender(<EmptyState title="X" size="lg" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-lg/);
  });

  it('defaults to size="md"', () => {
    const { container } = render(<EmptyState title="X" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-md/);
  });

  it('applies align class names for center / start', () => {
    const { container, rerender } = render(<EmptyState title="X" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/align-center/);
    rerender(<EmptyState title="X" align="start" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/align-start/);
  });

  it('renders the outer element as <section>', () => {
    const { container } = render(<EmptyState title="X" />);
    expect(container.firstChild?.nodeName).toBe('SECTION');
  });

  it('forwards ref to the outer element', () => {
    const ref = createRef<HTMLElement>();
    render(<EmptyState title="X" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });

  it('merges className', () => {
    const { container } = render(<EmptyState title="X" className="my-cls" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/my-cls/);
  });

  it('title accepts ReactNode (inline formatting)', () => {
    render(
      <EmptyState
        title={
          <>
            Found <strong>0</strong> results
          </>
        }
      />,
    );
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toBe('Found 0 results');
    expect(heading.querySelector('strong')).toHaveTextContent('0');
  });
});
```

- [ ] **Step 2: Gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/EmptyState 2>&1 | tail -8
```

All 16 tests must pass.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/EmptyState/EmptyState.test.tsx
git commit -m "EmptyState: unit tests — slots, sizes, align, heading level, ref"
```

---

## Task 4: Barrel + src/index.ts re-export

**Files:**

- Create: `packages/design-system/src/components/EmptyState/index.ts`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Write the component barrel**

```ts
export { EmptyState } from './EmptyState';
export type {
  EmptyStateProps,
  EmptyStateSize,
  EmptyStateAlign,
  EmptyStateHeadingLevel,
} from './EmptyState';
```

- [ ] **Step 2: Re-export from `src/index.ts`**

Slot alphabetically — `EmptyState` sits between `DropdownMenu` and `Input` (or wherever the existing alphabetical ordering puts it). Insert:

```ts
export { EmptyState } from './components/EmptyState';
export type {
  EmptyStateProps,
  EmptyStateSize,
  EmptyStateAlign,
  EmptyStateHeadingLevel,
} from './components/EmptyState';
```

- [ ] **Step 3: Gates**

```bash
npm run typecheck 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/EmptyState/index.ts \
        packages/design-system/src/index.ts
git commit -m "EmptyState: re-export from barrel + src/index.ts (Rule 5)"
```

---

## Task 5: Playground demo + wiring

**Files:**

- Create: `packages/playground/src/pages/components/EmptyStateDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Write `EmptyStateDemo.tsx`**

8 examples per the spec. Match existing demo conventions (`DemoLayout` + `Example`, `?raw` source imports). Use lucide icons (`Inbox`, `Search`, `SearchX`, `Users`, `KanbanSquare`).

Source imports:

- `tsxSource from '@lib-source/components/EmptyState/EmptyState.tsx?raw'`
- `scssSource from '@lib-source/components/EmptyState/EmptyState.module.scss?raw'`

Examples:

1. **Title only** — minimal: `<EmptyState title="No results" />`
2. **With icon** — Inbox + title
3. **With icon + description**
4. **With icon + description + single action**
5. **With icon + description + multiple actions (Cluster)**
6. **Sizes** — sm / md / lg side by side (or stacked)
7. **Align start** — left-aligned, demonstrate the column-tight use case
8. **Inside a Card** — wrap in `<Card padding="lg">` to show the canonical card-as-empty-section pattern

- [ ] **Step 2: Wire `App.tsx`**

Add import + route alphabetically.

```tsx
import { EmptyStateDemo } from './pages/components/EmptyStateDemo';
// …
<Route path="/components/empty-state" element={<EmptyStateDemo />} />;
```

- [ ] **Step 3: Wire `AppShell.tsx`**

Add to the Display group (or wherever fits). Use `Inbox` lucide icon (or `MailQuestion` / `PackageOpen`):

```tsx
import { Inbox } from 'lucide-react';
// …
{ to: '/components/empty-state', label: 'EmptyState', icon: Inbox, end: false },
```

Slot between `Calendar` and `Skeleton` alphabetically.

- [ ] **Step 4: Wire `ComponentsIndex.tsx`**

Add `EmptyState` to the `@eocrm/design-system` import. Add a card alphabetically:

```tsx
{
  to: '/components/empty-state',
  name: 'EmptyState',
  description:
    'Opinionated "nothing here" container — icon, title, description, actions. Three sizes for inline / card / hero use.',
  preview: (
    <EmptyState
      size="sm"
      icon={<Inbox size={24} />}
      title="No results"
      description="Try clearing filters."
    />
  ),
},
```

Make sure to also import the icon (`Inbox` from `lucide-react`).

- [ ] **Step 5: Wire `registry.ts`**

Add `'EmptyState'` to the `ComponentName` union alphabetically.

- [ ] **Step 6: Gates**

```bash
cd /home/dpws/projects/design-system
npm run typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/components/empty-state
```

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/
git commit -m "EmptyStateDemo: examples + sidebar + index + registry wiring"
```

---

## Task 6: AGENTS.md section

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Insert in the Display area**

Place between `Calendar` and `Skeleton` (or wherever fits the existing groupings).

````markdown
### `<EmptyState>` — "nothing here" container

```tsx
<EmptyState
  icon={<Inbox size={32} />}
  title="No contacts yet"
  description="Add your first contact to get started."
  actions={<Button>Add contact</Button>}
/>
```
````

- Four slots: `icon` (optional ReactNode), `title` (required ReactNode), `description` (optional), `actions` (optional). Stacked vertically.
- `title` renders as a semantic heading — default `<h3>`. Override via `headingLevel: 1–6` (clamped) when the empty state lives at a different heading depth.
- Three sizes — `sm` (inline / popover empties), `md` (card / section default), `lg` (hero / full-page).
- `align`: `'center'` (default) / `'start'` for tight-column use.
- Use `<Skeleton>` for **loading** states — EmptyState implies "nothing here," not "data on its way."
- No `variant="error"` — error treatments need different a11y (live regions, retry actions). Use a future `<Alert>` or render a danger-tinted EmptyState with your own error message.

````

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: document new <EmptyState>"
````

---

## Task 7: Final gates + Hard Rule 8 + PR

- [ ] **Step 1: Prettier write**

```bash
npx prettier --write "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md"
git add -A packages/ docs/
git commit -m "Prettier: format EmptyState changes" || echo "no formatting changes"
```

- [ ] **Step 2: Full gates**

```bash
cd /home/dpws/projects/design-system
npm test --workspace=@eocrm/design-system --run 2>&1 | tail -5
npm run typecheck 2>&1 | tail -3
npm run lint:css 2>&1 | tail -3
npm run build 2>&1 | tail -3
npx prettier --check "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md" 2>&1 | tail -3
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -cE "\.test\."
```

All green; npm pack count = 0.

- [ ] **Step 3: Push**

```bash
git push -u origin feat/empty-state
```

- [ ] **Step 4: Hard Rule 8 review cycle**

Dispatch a fresh-context review agent. Specifics to look at hard:

- `createElement(headingTag, …)` with `headingTag` typed as `\`h${number}\`` — verify TypeScript accepts this without an unsafe cast.
- `clampHeading` returns the heading level — verify the runtime guard handles all out-of-range inputs.
- Rule 4 escape hatches: the `.title` `margin: 0` is a defensive reset of user-agent heading margins. The `.description` `max-width: 48ch` constrains readable width. Both should be documented in the SCSS comments and (if stylelint flags them) wrapped in `stylelint-disable` blocks.
- Icon `aria-hidden` — we explicitly DON'T add it (consumer's icon may be semantic). Verify this is documented in AGENTS.md / JSDoc.
- The `<section>` wrapper has no inherent `role` — verify `aria-label` flows through via spread.
- Spread order: `{...props}` comes AFTER `ref`, so consumer can override className-conflicting attrs except `className` itself (which is composed via clsx — same Input precedent).

- [ ] **Step 5: Fix Critical + Important findings; re-push; re-review until clean.**

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "EmptyState: opinionated 'nothing here' container (icon / title / description / actions)" --body "$(cat <<'EOF'
## Summary

New `<EmptyState>` primitive — props-driven leaf component for consistent "nothing here" treatments.

- **4 slots**: `icon` (optional ReactNode), `title` (required ReactNode, semantic heading), `description` (optional), `actions` (optional). Stacked vertically with size-dependent spacing.
- **3 sizes**: `sm` (inline / popover), `md` (default — card / section), `lg` (hero / full-page).
- **`align: 'center' | 'start'`** — center default; start for tight columns.
- **`headingLevel: 1–6`** override (default 3) — clamped to 3 at runtime for invalid values.
- **No new tokens** — reuses existing color + spacing + font-size scales.
- **No `variant="error"`** — errors have different a11y (live regions, retry actions). Use a future `<Alert>` or render a danger-tinted EmptyState manually.
- **No `aria-hidden` on the icon** — consumer's icon may be semantic. Documented in JSDoc + AGENTS.md.

Unblocks `<DataTable>` v1 empty-state. Also useful in `<Select>`'s `renderEmpty`, mockup pages, filter "no results" views.

## Test plan

- [x] `npm test --run` — all green, 16 new EmptyState tests
- [x] `npm run typecheck` clean
- [x] `npm run lint:css` clean
- [x] `npm run build` clean
- [x] `npx prettier --check` clean
- [x] `npm pack --dry-run -w @eocrm/design-system` — no test files in tarball
- [x] Manual smoke: 8 demo examples render — title-only, with-icon, with-icon-description, single-action, multi-action, three-sizes, align-start, inside-a-Card
- [x] Hard Rule 8 review cycle — verdict: clean enough to stop

## Design spec / plan

- Spec: \`docs/superpowers/specs/2026-05-22-empty-state-design.md\`
- Plan: \`docs/superpowers/plans/2026-05-22-empty-state.md\`

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

Spec coverage:

- §Public API → Task 2 (TSX).
- §Visual / tokens → Task 2 (SCSS).
- §A11y (semantic heading + section wrapper + no auto aria-hidden) → Task 2 + Task 3 (tests).
- §States → Task 3 (omitted-slot tests).
- §Tests → Task 3 (16 tests).
- §Demo → Task 5 (8 examples).
- §AGENTS.md → Task 6.
- §Hard Rule 8 + PR → Task 7.

Type consistency:

- `EmptyStateSize = 'sm' | 'md' | 'lg'` matches Input/Checkbox/etc.
- `EmptyStateAlign = 'center' | 'start'` — new, simple binary.
- `EmptyStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6` — explicit union.
- All re-exported from both barrels.

No placeholders. All paths absolute. Each commit scoped.
