# `Split` Layout Primitive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Split` master–detail layout primitive (intrinsic-width `aside` + filling `main`, via CSS grid `auto 1fr`) to `@eocrm/design-system`, then fix the vertical-Tabs demo + shipped guidance to use it instead of the wrapping `Cluster` anti-pattern.

**Architecture:** `Split` is a layout-owning primitive — a sibling of `Stack`/`Cluster`/`Grid`, modeled closely on `Grid` (clsx class maps for `gap`/`align`, `forwardRef`, prop spread) and `AppLayout` (named `aside` slot + `children`-as-main). It renders one `<div>` grid container with two cell `<div>`s. `grid-template-columns` is `var(--split-aside-width, auto) 1fr` (`side="start"`) or `1fr var(--split-aside-width, auto)` (`side="end"`), with the children reordered to match so DOM order = visual order = tab order. `asideWidth` is passed through as an inline `--split-aside-width` custom property so the SCSS stays tokens-only.

**Tech Stack:** React 19 (`forwardRef`, `CSSProperties`), TypeScript, CSS Modules + SCSS, design tokens, Vitest + RTL (`globals: true`).

---

## File Structure

- `packages/design-system/src/components/Split/Split.tsx` — component + full JSDoc (Rule 7).
- `packages/design-system/src/components/Split/Split.module.scss` — grid container, side templates, gap/align classes, `.aside`/`.main` cells (tokens-only, no layout leakage).
- `packages/design-system/src/components/Split/Split.tokens.scss` — `--split-gap-*` defaulting to `--space-*`.
- `packages/design-system/src/components/Split/Split.test.tsx` — unit tests (Rule 1).
- `packages/design-system/src/components/Split/index.ts` — barrel export.
- `packages/design-system/src/index.ts` — public re-export (Rule 5).
- `packages/design-system/src/_meta/manifest.ts` + `packages/design-system/scripts/generate-manifest.mjs` — `Split: 'Layout'` CLUSTERS entry in BOTH; then `npm run build:manifest`.
- `packages/design-system/AGENTS.md` — `### <Split>` TL;DR.
- `packages/playground/src/pages/components/SplitDemo.tsx` — demo page.
- `packages/playground/src/App.tsx` — route.
- `packages/playground/src/layout/AppShell/navItems.ts` — Layout-group nav entry.
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview card.
- `packages/playground/src/pages/mockups/registry.ts` — `ComponentName` union += `'Split'`.
- `packages/playground/src/pages/components/TabsDemo.tsx` — vertical example `Cluster`→`Split`.
- `packages/design-system/src/components/Tabs/Tabs.tsx` — JSDoc `@example` `Cluster`→`Split`.
- `packages/design-system/AGENTS.md` — Tabs vertical snippet `Cluster`→`Split`.

---

## Task 1: `Split` component + tests (TDD)

**Files:**

- Create: `packages/design-system/src/components/Split/Split.tsx`
- Create: `packages/design-system/src/components/Split/Split.module.scss`
- Create: `packages/design-system/src/components/Split/Split.tokens.scss`
- Create: `packages/design-system/src/components/Split/Split.test.tsx`
- Create: `packages/design-system/src/components/Split/index.ts`

- [ ] **Step 1: Write the failing test file** `Split.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Split } from './Split';

describe('Split', () => {
  it('renders the aside and the main (children)', () => {
    render(
      <Split aside={<span data-testid="aside">rail</span>}>
        <span data-testid="main">panel</span>
      </Split>,
    );
    expect(screen.getByTestId('aside')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
  });

  it('wraps aside and main in distinct cells inside one container', () => {
    const { container } = render(
      <Split aside={<span data-testid="aside" />}>
        <span data-testid="main" />
      </Split>,
    );
    const root = container.firstElementChild!;
    const asideCell = root.querySelector('[class*="aside"]');
    const mainCell = root.querySelector('[class*="main"]');
    expect(asideCell).not.toBeNull();
    expect(mainCell).not.toBeNull();
    expect(asideCell).toContainElement(screen.getByTestId('aside'));
    expect(mainCell).toContainElement(screen.getByTestId('main'));
  });

  it('places aside before main in DOM order when side="start" (default)', () => {
    const { container } = render(
      <Split aside={<span data-testid="aside" />}>
        <span data-testid="main" />
      </Split>,
    );
    const aside = container.querySelector('[class*="aside"]')!;
    const main = container.querySelector('[class*="main"]')!;
    expect(aside.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('places main before aside in DOM order when side="end"', () => {
    const { container } = render(
      <Split side="end" aside={<span data-testid="aside" />}>
        <span data-testid="main" />
      </Split>,
    );
    const aside = container.querySelector('[class*="aside"]')!;
    const main = container.querySelector('[class*="main"]')!;
    expect(main.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('applies the side modifier class', () => {
    const { container, rerender } = render(<Split aside={<i />}>x</Split>);
    expect((container.firstElementChild as HTMLElement).className).toMatch(/sideStart/);
    rerender(
      <Split side="end" aside={<i />}>
        x
      </Split>,
    );
    expect((container.firstElementChild as HTMLElement).className).toMatch(/sideEnd/);
  });

  it('maps gap to the right class', () => {
    const { container } = render(
      <Split gap="xl" aside={<i />}>
        x
      </Split>,
    );
    expect((container.firstElementChild as HTMLElement).className).toMatch(/gapXl/);
  });

  it('maps align to the right class (default start)', () => {
    const { container, rerender } = render(<Split aside={<i />}>x</Split>);
    expect((container.firstElementChild as HTMLElement).className).toMatch(/alignStart/);
    rerender(
      <Split align="stretch" aside={<i />}>
        x
      </Split>,
    );
    expect((container.firstElementChild as HTMLElement).className).toMatch(/alignStretch/);
  });

  it('sets the --split-aside-width custom property from asideWidth (default auto)', () => {
    const { container, rerender } = render(<Split aside={<i />}>x</Split>);
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue('--split-aside-width'),
    ).toBe('auto');
    rerender(
      <Split asideWidth="240px" aside={<i />}>
        x
      </Split>,
    );
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue('--split-aside-width'),
    ).toBe('240px');
  });

  it('merges className on the container', () => {
    const { container } = render(
      <Split className="external" aside={<i />}>
        x
      </Split>,
    );
    expect((container.firstElementChild as HTMLElement).className).toMatch(/external/);
  });

  it('merges consumer style with the aside-width custom property', () => {
    const { container } = render(
      <Split style={{ maxWidth: 500 }} aside={<i />}>
        x
      </Split>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.maxWidth).toBe('500px');
    expect(el.style.getPropertyValue('--split-aside-width')).toBe('auto');
  });

  it('forwards ref to the container div', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Split ref={ref} aside={<i />}>
        x
      </Split>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('spreads native HTML attributes onto the container', () => {
    const { container } = render(
      <Split aside={<i />} data-testid="sp" aria-label="settings layout">
        x
      </Split>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('data-testid', 'sp');
    expect(el).toHaveAttribute('aria-label', 'settings layout');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd packages/design-system && npx vitest run src/components/Split/Split.test.tsx`
Expected: FAIL — `Split` not found / module missing.

- [ ] **Step 3: Write `Split.tokens.scss`**

```scss
// Split.tokens.scss — Component-scoped tokens for <Split>. Gap mirrors the
// shared space scale (same values as Stack/Cluster/Grid).
:root {
  --split-gap-xs: var(--space-1);
  --split-gap-sm: var(--space-2);
  --split-gap-md: var(--space-3);
  --split-gap-lg: var(--space-4);
  --split-gap-xl: var(--space-6);
  --split-gap-2xl: var(--space-8);
}
```

- [ ] **Step 4: Write `Split.module.scss`**

```scss
@use './Split.tokens';

.split {
  display: grid;
}

// Column templates. The aside track is driven by --split-aside-width (set
// inline from the asideWidth prop; defaults to `auto` = intrinsic). `1fr` and
// `auto` are intrinsic grid keywords, not raw lengths (same as Grid).
.sideStart {
  grid-template-columns: var(--split-aside-width, auto) 1fr;
}

.sideEnd {
  grid-template-columns: 1fr var(--split-aside-width, auto);
}

// The main pane shrinks instead of overflowing or pushing the aside wider.
.main {
  min-width: 0;
}

// Gap presets — mirror Stack/Cluster/Grid scale + camelCase naming.
.gapXs {
  gap: var(--split-gap-xs);
}

.gapSm {
  gap: var(--split-gap-sm);
}

.gapMd {
  gap: var(--split-gap-md);
}

.gapLg {
  gap: var(--split-gap-lg);
}

.gapXl {
  gap: var(--split-gap-xl);
}

.gap2xl {
  gap: var(--split-gap-2xl);
}

// Cross-axis alignment of the two panes.
.alignStart {
  align-items: start;
}

.alignStretch {
  align-items: stretch;
}

.alignCenter {
  align-items: center;
}
```

- [ ] **Step 5: Write `Split.tsx`**

```tsx
import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Split.module.scss';

/** Which side the `aside` pane sits on. RTL-aware (DOM + column order flip together). */
export type SplitSide = 'start' | 'end';

/** Gap between the two panes. Same scale as Stack/Cluster/Grid. */
export type SplitGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Cross-axis (vertical) alignment of the two panes. */
export type SplitAlign = 'start' | 'stretch' | 'center';

export interface SplitProps extends HTMLAttributes<HTMLDivElement> {
  /** The narrow, intrinsic-width pane — a vertical `Tabs` rail, filter list, or nav column. */
  aside: ReactNode;
  /**
   * Which side `aside` sits on.
   * - `'start'` (default) — leading edge (left in LTR).
   * - `'end'` — trailing edge (right in LTR).
   */
  side?: SplitSide;
  /**
   * `aside` column width.
   * - `'auto'` (default) — intrinsic; sizes to the pane's content.
   * - a CSS length (e.g. `'240px'`) — pins the column so `main` doesn't reflow
   *   when `aside` content changes width.
   */
  asideWidth?: string;
  /**
   * Gap between the two panes, in pixels:
   * `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32).
   * Same scale as Stack, Cluster, and Grid.
   */
  gap?: SplitGap;
  /**
   * Cross-axis (vertical) alignment of the panes.
   * - `'start'` (default) — panes hug the top.
   * - `'stretch'` — `aside` matches `main`'s height (full-height bordered rail).
   * - `'center'` — panes vertically centered.
   */
  align?: SplitAlign;
}

const gapClass: Record<SplitGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};

const alignClass: Record<SplitAlign, string> = {
  start: styles.alignStart,
  stretch: styles.alignStretch,
  center: styles.alignCenter,
};

/**
 * Master–detail layout primitive: an intrinsic-width `aside` pane beside a
 * filling `main` pane (`children`), via CSS grid `auto 1fr`. Sibling to
 * `Stack` (vertical) / `Cluster` (horizontal-wrap) / `Grid` (2D). Like those —
 * and `AppLayout`/`Page`/`Screen` — Split is a documented exception to the
 * "components don't own layout" rule: it owns only its internal grid.
 *
 * Use it whenever a narrow rail (a vertical `Tabs` strip, a filter list, a nav
 * column) sits beside a wider detail panel. Unlike `Cluster` it never wraps the
 * panel below the rail; unlike `Grid columns={2}` the rail keeps its natural
 * width instead of taking half.
 *
 * @example
 * // Vertical Tabs rail beside its detail panel (the canonical use):
 * <Split aside={<Tabs orientation="vertical" items={items} activeId={id} onChange={setId} />}>
 *   <SectionPanel id={id} />
 * </Split>
 *
 * @example
 * // Pinned rail width, aside on the right:
 * <Split aside={<Filters />} side="end" asideWidth="260px" gap="lg">
 *   <Results />
 * </Split>
 *
 * @remarks When NOT to use
 * - For equal-width columns — use `<Grid columns={2}>`. Split is intentionally
 *   asymmetric (intrinsic aside + filling main).
 * - For a wrapping row of peers (toolbar, tag list) — use `<Cluster>`.
 * - For the app-level shell (full-height sidebar + topbar) — use `<AppLayout>`.
 *   Split is for *in-page* two-pane regions.
 *
 * @remarks Anti-patterns
 * - ❌ Putting primary page navigation in `aside`. That belongs in the app
 *   shell (`<Rail>` / `<AppLayout sidebar>`); Split's aside is intra-page.
 * - ❌ Expecting `main` to push the layout wider than its container — it has
 *   `min-width: 0`, so its content shrinks/scrolls instead of overflowing.
 */
export const Split = forwardRef<HTMLDivElement, SplitProps>(function Split(
  {
    aside,
    children,
    side = 'start',
    asideWidth = 'auto',
    gap = 'md',
    align = 'start',
    className,
    style,
    ...props
  },
  ref,
) {
  const asideCell = <div className={styles.aside}>{aside}</div>;
  const mainCell = <div className={styles.main}>{children}</div>;
  return (
    <div
      ref={ref}
      className={clsx(
        styles.split,
        side === 'end' ? styles.sideEnd : styles.sideStart,
        gapClass[gap],
        alignClass[align],
        className,
      )}
      // asideWidth → custom property the SCSS grid template reads. Consumer
      // `style` spread AFTER so they can still override anything.
      style={{ '--split-aside-width': asideWidth, ...style } as CSSProperties}
      {...props}
    >
      {side === 'end' ? (
        <>
          {mainCell}
          {asideCell}
        </>
      ) : (
        <>
          {asideCell}
          {mainCell}
        </>
      )}
    </div>
  );
});
```

Note: `.aside` is referenced in SCSS only as a class hook for tests/structure; it needs no rules of its own (the `auto` track sizes it). It IS emitted because `styles.aside` is used in the TSX — but CSS Modules only generates a class name for selectors present in the SCSS. **Add an empty-but-present `.aside { }` is NOT valid SCSS;** instead rely on the fact that `styles.aside` returns `undefined` if `.aside` isn't in the SCSS, which would break the test's `[class*="aside"]` query. **Therefore add a real `.aside` rule to the SCSS** (Step 4) — append:

```scss
// Aside cell — intrinsic width comes from the grid track; this class exists as
// a structural/styling hook (and so `styles.aside` resolves).
.aside {
  min-width: 0;
}
```

(`min-width: 0` on the aside is harmless and lets very long aside content shrink rather than blow out the `auto` track; it also gives the class a real declaration so CSS Modules emits it.)

- [ ] **Step 6: Write `index.ts`**

```ts
export { Split } from './Split';
export type { SplitProps, SplitSide, SplitGap, SplitAlign } from './Split';
```

- [ ] **Step 7: Run tests, verify all pass**

Run: `cd packages/design-system && npx vitest run src/components/Split/Split.test.tsx`
Expected: PASS (all). If the `[class*="aside"]` query fails, confirm `.aside` rule was added to the SCSS (Step 5 note).

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/Split/
git commit -m "feat(Split): master–detail layout primitive (aside + filling main)"
```

---

## Task 2: Public export + manifest

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/src/_meta/manifest.ts`
- Modify: `packages/design-system/scripts/generate-manifest.mjs`

- [ ] **Step 1: Re-export from `src/index.ts`**

Add near the other layout exports (e.g. after the `Grid` export lines):

```ts
export { Split } from './components/Split';
export type { SplitProps, SplitSide, SplitGap, SplitAlign } from './components/Split';
```

- [ ] **Step 2: Add `Split: 'Layout'` to BOTH CLUSTERS maps**

In `src/_meta/manifest.ts` (the `const CLUSTERS` block, Layout section) add:

```ts
  Split: 'Layout',
```

In `scripts/generate-manifest.mjs` (the `const CLUSTERS` block, Layout section) add the identical line:

```js
  Split: 'Layout',
```

Place it next to `Grid: 'Layout',` in both for tidiness.

- [ ] **Step 3: Regenerate the manifest JSON**

Run: `cd packages/design-system && npm run build:manifest`
Expected: regenerates `src/components.manifest.json` with a `Split` entry; no error.

- [ ] **Step 4: Verify the manifest drift test passes**

Run: `cd packages/design-system && npx vitest run src/structure.test.ts`
(If the meta-test file has a different name, run the full `npx vitest run` and confirm the manifest/structure tests pass.)
Expected: PASS — both maps in sync, JSON regenerated.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json
git commit -m "feat(Split): export + manifest CLUSTERS entry (Layout)"
```

---

## Task 3: Playground demo + nav wiring

**Files:**

- Create: `packages/playground/src/pages/components/SplitDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/navItems.ts`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Create `SplitDemo.tsx`** (exercises the REAL `Split` with a real vertical `Tabs` rail)

```tsx
import { useState } from 'react';
import { Activity, CreditCard, Settings, Shield } from 'lucide-react';
import { Badge } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { Split } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Tabs } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const sections: Record<string, { title: string; body: string }> = {
  general: { title: 'General', body: 'Workspace name, locale, and default landing page.' },
  security: {
    title: 'Security',
    body: 'SSO, session timeout, and IP allow-list. Unsaved changes.',
  },
  activity: { title: 'Activity', body: 'Audit log of configuration changes (14 this month).' },
  billing: { title: 'Billing', body: 'Plan, seats, and invoices.' },
};

const settingsTabs = [
  { id: 'general', label: 'General', icon: <Settings size={14} /> },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield size={14} />,
    trailing: <Badge tone="warning">Unsaved</Badge>,
  },
  { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 14 },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={14} />, count: 3 },
];

export function SplitDemo() {
  const [section, setSection] = useState('general');
  const [sectionEnd, setSectionEnd] = useState('general');
  const active = sections[section];
  const activeEnd = sections[sectionEnd];

  return (
    <DemoLayout
      name="Split"
      description="Master–detail layout primitive: an intrinsic-width aside pane beside a filling main pane (CSS grid auto 1fr). Never wraps. For a vertical Tabs rail beside its detail panel, a filter column beside results, etc."
      files={getComponentFiles('Split')}
      componentName="Split"
    >
      <Example
        title="Vertical Tabs rail + detail panel (canonical)"
        description="aside holds the narrow vertical Tabs rail; children is the filling detail panel. The panel sits to the right and fills remaining width at any container size — no wrapping."
        code={`const [section, setSection] = useState('general');

<Split aside={
  <Tabs
    orientation="vertical"
    items={settingsTabs}
    activeId={section}
    onChange={setSection}
  />
} gap="lg">
  <Card padding="md">{/* detail for {section} */}</Card>
</Split>`}
      >
        <Split
          gap="lg"
          aside={
            <Tabs
              orientation="vertical"
              items={settingsTabs}
              activeId={section}
              onChange={setSection}
            />
          }
        >
          <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
            <Stack gap="xs">
              <strong style={{ color: 'var(--color-fg)' }}>{active.title}</strong>
              <span>{active.body}</span>
            </Stack>
          </Card>
        </Split>
      </Example>

      <Example
        title="side='end' + pinned asideWidth"
        description="side='end' moves the aside to the trailing edge; asideWidth pins the rail width so the main panel doesn't reflow as the active row's adornments change."
        code={`<Split side="end" asideWidth="200px" gap="lg" aside={<Tabs orientation="vertical" … />}>
  <Card padding="md">{/* detail */}</Card>
</Split>`}
      >
        <Split
          side="end"
          asideWidth="200px"
          gap="lg"
          aside={
            <Tabs
              orientation="vertical"
              items={settingsTabs}
              activeId={sectionEnd}
              onChange={setSectionEnd}
            />
          }
        >
          <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
            <Stack gap="xs">
              <strong style={{ color: 'var(--color-fg)' }}>{activeEnd.title}</strong>
              <span>{activeEnd.body}</span>
            </Stack>
          </Card>
        </Split>
      </Example>
    </DemoLayout>
  );
}
```

(If `Tabs`'s `items` prop needs the `TabItem[]` type for `settingsTabs`, import `type { TabItem }` and annotate `const settingsTabs: TabItem[] = [...]` to satisfy typecheck.)

- [ ] **Step 2: Add route in `App.tsx`**

Add the import near the other component-demo imports:

```ts
import { SplitDemo } from './pages/components/SplitDemo';
```

Add the route near the other `/components/*` routes (e.g. after the `screen` or `stack` route):

```tsx
<Route path="/components/split" element={<SplitDemo />} />
```

- [ ] **Step 3: Add the nav entry in `navItems.ts`**

In the `Layout` group's `items` array, add (place after the Grid line):

```ts
{ to: '/components/split', label: 'Split', icon: PanelLeft, end: false },
```

Add `PanelLeft` to the `lucide-react` import at the top of the file if it isn't already imported.

- [ ] **Step 4: Add the overview card in `ComponentsIndex.tsx`**

Add the import near the other library imports:

```ts
import { Split } from '@eocrm/design-system';
```

Add an entry to the `items` array (near the other Layout entries, e.g. after the Grid entry). Reuse the existing `styles.tile` preview block used by the Grid card:

```tsx
{
  to: '/components/split',
  name: 'Split',
  description:
    'Master–detail layout: an intrinsic-width aside beside a filling main pane (CSS grid auto 1fr). For a vertical Tabs rail + detail panel.',
  preview: (
    <Split gap="sm" aside={<div className={styles.tile} style={{ width: 28 }} />}>
      <div className={styles.tile} />
    </Split>
  ),
},
```

(If `styles.tile` has a fixed width that fights the narrow aside, drop the inline `width` and let the tile size itself — match whatever the Grid card preview does.)

- [ ] **Step 5: Add `'Split'` to the `ComponentName` union in `registry.ts`**

Add `| 'Split'` to the `ComponentName` union (alphabetically, between `'SocialButton'`/`'Stack'` region). No mockup uses it yet, so do NOT add it to any `usesComponents` array.

- [ ] **Step 6: Build the playground (typecheck + bundle)**

Run: `cd /Users/dpws/projects/design-system && make build`
Expected: PASS. Fix any typecheck error (e.g. `TabItem[]` annotation per Step 1 note).

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/pages/components/SplitDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/navItems.ts packages/playground/src/pages/components/ComponentsIndex.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "feat(playground): Split demo + nav/index/registry wiring"
```

---

## Task 4: AGENTS.md — `Split` TL;DR

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add a `### <Split>` section near the layout primitives**

Find the layout-primitive sections (Stack / Cluster / Grid). Add, after the `Grid` section, a new section:

```md
### `<Split>` — master–detail two-pane layout

Intrinsic-width `aside` pane beside a filling `main` pane (`children`), via CSS
grid `auto 1fr`. Never wraps. Sibling to Stack/Cluster/Grid; for in-page
master–detail (a vertical `Tabs` rail beside its detail panel, a filter column
beside results).

\`\`\`tsx
<Split aside={<Tabs orientation="vertical" items={items} activeId={id} onChange={setId} />} gap="lg">
<SectionPanel id={id} />
</Split>
\`\`\`

- `aside` (required ReactNode) — the narrow pane; `children` — the filling main pane.
- `side`: `'start'` (default) or `'end'` — which edge the aside sits on (RTL-aware).
- `asideWidth`: `'auto'` (default, intrinsic) or a CSS length like `'240px'` to pin the rail.
- `gap`: `xs`/`sm`/`md` (default)/`lg`/`xl`/`2xl` — same scale as Stack/Cluster/Grid.
- `align`: `'start'` (default) / `'stretch'` (full-height aside) / `'center'`.
- `main` has `min-width: 0` — long content shrinks/scrolls instead of overflowing.

When NOT to use: equal columns → `<Grid columns={2}>`; wrapping peer row → `<Cluster>`; app shell sidebar → `<AppLayout>`/`<Rail>`.
```

- [ ] **Step 2: Verify markdown formatting**

Run: `cd /Users/dpws/projects/design-system && npx prettier --check packages/design-system/AGENTS.md`
If flagged: `npx prettier --write packages/design-system/AGENTS.md`.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "docs(AGENTS): add Split master–detail layout primitive"
```

---

## Task 5: Fix the Tabs bug — `Cluster` → `Split` at all three sites

**Files:**

- Modify: `packages/playground/src/pages/components/TabsDemo.tsx`
- Modify: `packages/design-system/src/components/Tabs/Tabs.tsx`
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: `TabsDemo.tsx` — vertical example uses `Split`**

In the "Vertical (master–detail)" example, replace the `<Cluster gap="lg" align="start">…</Cluster>` wrapper (which holds the vertical `<Tabs>` and the detail `<Card>`) with:

```tsx
<Split
  gap="lg"
  aside={
    <Tabs
      orientation="vertical"
      items={[
        { id: 'general', label: 'General', icon: <Settings size={14} /> },
        {
          id: 'security',
          label: 'Security',
          icon: <Shield size={14} />,
          trailing: <Badge tone="warning">Unsaved</Badge>,
        },
        { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 14 },
        { id: 'billing', label: 'Billing', icon: <CreditCard size={14} />, count: 3 },
      ]}
      activeId={vTab}
      onChange={setVTab}
    />
  }
>
  <Card padding="md" style={{ minWidth: 280, color: 'var(--color-fg-muted)' }}>
    <Stack gap="xs">
      <strong style={{ color: 'var(--color-fg)' }}>{active.title}</strong>
      <span>{active.body}</span>
    </Stack>
  </Card>
</Split>
```

Update the example's `code` string to mirror this `<Split aside={…}>…</Split>` shape. Update the example `description` to say "Place it in a `Split` beside the detail panel" instead of "in a Cluster".

- Replace the `Cluster` import with `Split` (`import { Split } from '@eocrm/design-system';`). Confirm `Cluster` is not used elsewhere in the file before removing its import; `Stack`, `Card`, `Badge` imports stay.
- The `minWidth: 280` on the Card is now safe (Split never wraps; main has `min-width: 0` so the 280 acts as a comfortable floor, not a wrap trigger). Keep it.

- [ ] **Step 2: `Tabs.tsx` — JSDoc `@example` uses `Split`**

In the vertical `@example` block of the `Tabs` component JSDoc, replace:

```
 * <Cluster gap="lg" align="start">
 *   <Tabs
 *     orientation="vertical"
 *     items={[ … ]}
 *     activeId={section}
 *     onChange={setSection}
 *   />
 *   <SectionPanel id={section} />
 * </Cluster>
```

with:

```
 * <Split
 *   aside={
 *     <Tabs
 *       orientation="vertical"
 *       items={[
 *         { id: 'general', label: 'General' },
 *         { id: 'security', label: 'Security', trailing: <Badge tone="warning">Unsaved</Badge> },
 *         { id: 'billing', label: 'Billing', count: 3 },
 *       ]}
 *       activeId={section}
 *       onChange={setSection}
 *     />
 *   }
 * >
 *   <SectionPanel id={section} />
 * </Split>
```

(JSDoc examples are not compiled; just keep them accurate. No import changes in `Tabs.tsx`.)

- [ ] **Step 3: `AGENTS.md` — Tabs vertical snippet uses `Split`**

In the `### <Tabs>` section, the "Vertical master–detail rail" snippet currently wraps in `<Cluster gap="lg" align="start">`. Replace it with the `Split` form:

```md
\`\`\`tsx
<Split
aside={
<Tabs
orientation="vertical"
items={[
{ id: 'general', label: 'General' },
{ id: 'security', label: 'Security', trailing: <Badge tone="warning">Unsaved</Badge> },
{ id: 'billing', label: 'Billing', count: 3 },
]}
activeId={section}
onChange={setSection}
/>
}

>   <SectionPanel id={section} />
> </Split>
> \`\`\`
```

Also update the Tabs `orientation` bullet phrase "Put a vertical strip in a fixed-width column beside its detail panel." → "Put a vertical strip in a `Split`'s `aside` beside its detail panel."

- [ ] **Step 4: Gates**

Run: `cd /Users/dpws/projects/design-system && make build && npx prettier --check packages/design-system/AGENTS.md packages/playground/src/pages/components/TabsDemo.tsx packages/design-system/src/components/Tabs/Tabs.tsx`
Expected: PASS. Prettier-write any flagged file.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/TabsDemo.tsx packages/design-system/src/components/Tabs/Tabs.tsx packages/design-system/AGENTS.md
git commit -m "fix(Tabs): use Split for vertical master–detail layout (was wrapping Cluster)"
```

---

## Final gates (after all tasks)

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 \
  | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

All green. Then run the Hard-rule-8 fresh-context adversarial review-fix loop over `packages/design-system/**` before pushing.

---

## Self-Review

**Spec coverage:**

- New `Split` (grid `auto 1fr`, slot API, `side`/`asideWidth`/`gap`/`align`, no-stacking, `min-width:0` main) → Task 1.
- Export + manifest (both maps) → Task 2.
- Demo + route + nav + index card + registry union (Core invariant) → Task 3.
- JSDoc `@remarks` → Task 1 (in component JSDoc). AGENTS TL;DR → Task 4.
- Tabs bug fix at all three sites → Task 5.

**Placeholder scan:** None — all code shown. (Task 2 Step 4 names `structure.test.ts` defensively with a fallback to the full suite.)

**Type consistency:** `SplitProps`/`SplitSide`/`SplitGap`/`SplitAlign` consistent across Tasks 1–2; `aside` is `ReactNode` (required); `asideWidth` is `string` defaulting `'auto'`; class maps cover every union member. The `--split-aside-width` custom-property name matches between `Split.tsx` (inline style), `Split.module.scss` (grid template), and tests.
