# `<AppLayout>` Implementation Plan (resolves issue #117)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship a viewport-filling `<AppLayout>` shell primitive (`topBar` + `sidebar` + `children` slots) so the consumer can drop its `ds-shims/AppLayout.tsx`.

**Spec:** GitHub issue eocrm/design-system#117 (issue-as-spec). Consumer contract: `forwardRef<HTMLDivElement>`, props `topBar`/`sidebar`/`children`; the shim couldn't express `min-height: 100vh`.

**Architecture:** A layout-owning primitive (documented exception to "no layout props", like `Screen`/`Page`/`Rail`). Full-height flex column: `topBar` on top, then a flex row of `sidebar` (intrinsic width) + `main` (`flex:1`); root `min-height: 100vh`. No visual styling — slots bring their own surfaces. `topBar`/`sidebar` optional (superset of the shim, still drop-in).

**Lint facts (verified):** the component `property-disallowed-list` blocks only `margin*`/`flex-grow`/`flex-basis`/`align-self`/`justify-self`/`grid-*`; `flex` shorthand, `min-height`, `min-width`, `display`, `flex-direction` are allowed. `declaration-strict-value` governs only color/border/opacity, so `100vh`/`1`/`0`/`none` need no tokens. Vitest `globals: true` (don't import describe/it/expect).

---

## Task 1: Library component + tests + export + manifest + AGENTS.md

**Files:**

- Create `packages/design-system/src/components/AppLayout/AppLayout.tsx`
- Create `packages/design-system/src/components/AppLayout/AppLayout.module.scss`
- Create `packages/design-system/src/components/AppLayout/index.ts`
- Create `packages/design-system/src/components/AppLayout/AppLayout.test.tsx`
- Modify `packages/design-system/src/index.ts` (add export after the Constrain block, ~line 61)
- Modify `packages/design-system/src/_meta/manifest.ts` (CLUSTERS Layout block)
- Modify `packages/design-system/scripts/generate-manifest.mjs` (CLUSTERS Layout block)
- Modify `packages/design-system/AGENTS.md` (TL;DR section near Screen)
- Regenerate `packages/design-system/src/components.manifest.json` via `npm run build:manifest`

- [ ] **Step 1: `AppLayout.tsx`** — write exactly:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './AppLayout.module.scss';

export interface AppLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Top bar slot — spans the full width above the sidebar + content row.
   * Omit for a shell with no top bar.
   */
  topBar?: ReactNode;
  /**
   * Sidebar slot — sits to the left of the content, filling the height of the
   * row below the top bar. Sets its own width (intrinsic). Omit for no sidebar.
   */
  sidebar?: ReactNode;
  /** Main content slot — fills the remaining space. */
  children: ReactNode;
}

/**
 * Viewport-filling application shell layout. A full-height flex column: an
 * optional `topBar` across the top, then a row of an optional `sidebar` (left)
 * and the main `children` (right) that together fill the viewport height
 * (`min-height: 100vh`).
 *
 * Replaces the ad-hoc `Stack` + `Cluster` shell composition consumers hand-rolled,
 * which couldn't express `min-height: 100vh` without raw CSS.
 *
 * @example
 * // Mounted once at the app root:
 * <AppLayout topBar={<TopBar />} sidebar={<Rail>{nav}</Rail>}>
 *   <Page>{routedContent}</Page>
 * </AppLayout>
 *
 * @example
 * // No sidebar — top bar + content only:
 * <AppLayout topBar={<TopBar />}>
 *   <Page>{content}</Page>
 * </AppLayout>
 *
 * @remarks Layout-owning primitive
 * Like `<Page>` / `<Screen>` / `<Rail>`, AppLayout is the documented exception to
 * the "components don't own layout" rule — owning the full-height shell layout
 * (viewport fill + flex column + sidebar row) is its entire job. It carries no
 * visual styling; the `topBar` / `sidebar` slots bring their own surfaces.
 *
 * @remarks When NOT to use
 * - ❌ For in-page content layout — use `<Stack>` / `<Cluster>` / `<Grid>`.
 * - ❌ For a chromeless full-bleed page (sign-in / 404 / error) — use `<Screen>`.
 * - ❌ Don't nest AppLayout inside another AppLayout, `<Page>`, or `<Screen>`.
 *   It's the top-level shell, mounted once at the app root.
 */
export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(function AppLayout(
  { topBar, sidebar, children, className, ...props },
  ref,
) {
  // Pattern A — props last: AppLayout is a consumer-overridable layout
  // primitive (like Stack/Card), so {...props} wins over our defaults.
  return (
    <div ref={ref} className={clsx(styles.root, className)} {...props}>
      {topBar != null && <div className={styles.topBar}>{topBar}</div>}
      <div className={styles.body}>
        {sidebar != null && <div className={styles.sidebar}>{sidebar}</div>}
        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
});
```

- [ ] **Step 2: `AppLayout.module.scss`** — write exactly:

```scss
// AppLayout is a layout-owning primitive — the documented exception to the
// "no layout properties on components" rule (like Page / Screen / Rail). Owning
// the viewport-filling shell (min-height + flex column + sidebar row) is its
// whole job. No visual styling — the topBar / sidebar slots bring their own
// surfaces. (stylelint's property-disallowed-list blocks flex-grow / flex-basis
// but not the `flex` shorthand, min-height, or min-width, so no disable needed.)
.root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

// Full-width top bar; natural height.
.topBar {
  flex: none;
}

// The sidebar + content row fills the remaining viewport height.
.body {
  display: flex;
  flex: 1;
  flex-direction: row;
  min-height: 0;
}

// Sidebar sets its own width.
.sidebar {
  flex: none;
}

// Content fills the rest; min-width:0 lets wide content (tables) shrink instead
// of overflowing the row.
.main {
  flex: 1;
  min-width: 0;
}
```

- [ ] **Step 3: `index.ts`** — write exactly:

```ts
export { AppLayout } from './AppLayout';
export type { AppLayoutProps } from './AppLayout';
```

- [ ] **Step 4: `AppLayout.test.tsx`** — write exactly (vitest globals; no describe/it/expect imports):

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('renders children in a <div> and forwards ref to the root', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <AppLayout ref={ref}>
        <span data-testid="content">main</span>
      </AppLayout>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(container.firstChild);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders the topBar slot when provided, omits its wrapper when not', () => {
    const { queryByTestId, rerender } = render(
      <AppLayout topBar={<span data-testid="top">bar</span>}>x</AppLayout>,
    );
    expect(queryByTestId('top')).toBeInTheDocument();
    rerender(<AppLayout>x</AppLayout>);
    expect(queryByTestId('top')).not.toBeInTheDocument();
  });

  it('renders the sidebar slot when provided, omits its wrapper when not', () => {
    const { queryByTestId, rerender } = render(
      <AppLayout sidebar={<span data-testid="side">nav</span>}>x</AppLayout>,
    );
    expect(queryByTestId('side')).toBeInTheDocument();
    rerender(<AppLayout>x</AppLayout>);
    expect(queryByTestId('side')).not.toBeInTheDocument();
  });

  it('renders all three regions together', () => {
    render(
      <AppLayout
        topBar={<span data-testid="top">bar</span>}
        sidebar={<span data-testid="side">nav</span>}
      >
        <span data-testid="content">main</span>
      </AppLayout>,
    );
    expect(screen.getByTestId('top')).toBeInTheDocument();
    expect(screen.getByTestId('side')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('merges className and spreads other attrs onto the root', () => {
    const { container } = render(
      <AppLayout className="my-cls" data-foo="bar">
        x
      </AppLayout>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/my-cls/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
```

- [ ] **Step 5: export from `src/index.ts`** — insert after the Constrain export block (the `export type { ConstrainProps, ... }` line):

```ts
export { AppLayout } from './components/AppLayout';
export type { AppLayoutProps } from './components/AppLayout';
```

- [ ] **Step 6: manifest map #1** — in `src/_meta/manifest.ts`, inside the `// Layout` block of `CLUSTERS`, add (e.g. right after `Constrain: 'Layout',`):

```ts
  AppLayout: 'Layout',
```

- [ ] **Step 7: manifest map #2** — in `scripts/generate-manifest.mjs`, inside the matching `// Layout` block of `CLUSTERS`, add the identical line:

```js
  AppLayout: 'Layout',
```

- [ ] **Step 8: regenerate the manifest JSON**

Run:

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run build:manifest
```

Expected: `src/components.manifest.json` updated to include an `AppLayout` entry (cluster `Layout`).

- [ ] **Step 9: AGENTS.md TL;DR** — add a section near the other layout primitives (e.g. after the `<Screen>` section), mirroring the Screen format:

````markdown
### `<AppLayout>` — viewport-filling app shell

```tsx
<AppLayout topBar={<TopBar />} sidebar={<Rail>{nav}</Rail>}>
  <Page>{content}</Page>
</AppLayout>
```

- Top-level shell layout, mounted **once** at the app root. Full-height flex column: `topBar` across the top, then a row of `sidebar` (left, intrinsic width) + main `children` (fills the rest). Root is `min-height: 100vh`.
- `topBar`: optional top region (omit for none). `sidebar`: optional left region (omit for none). `children`: the main content (required).
- Layout-owning primitive (the `<Page>` / `<Screen>` / `<Rail>` exception to "no layout properties"). Carries no visual styling — slots bring their own surfaces. Don't nest inside another `AppLayout` / `<Page>` / `<Screen>`; for a chromeless page use `<Screen>`, for in-page layout use `<Stack>` / `<Cluster>`.
````

- [ ] **Step 10: library gates** — run from repo root, all must pass:

```bash
cd /Users/dpws/projects/design-system
npm run typecheck && make build-lib && make lint && make test && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 \
  | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

- [ ] **Step 11: commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/AppLayout packages/design-system/src/index.ts \
  packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs \
  packages/design-system/src/components.manifest.json packages/design-system/AGENTS.md
git commit -m "feat(AppLayout): viewport-filling app shell primitive (#117)"
```

---

## Task 2: Playground demo + four wiring points

**Files:**

- Create `packages/playground/src/pages/components/AppLayoutDemo.tsx`
- Modify `packages/playground/src/App.tsx` (import + route)
- Modify `packages/playground/src/layout/AppShell/AppShell.tsx` (lucide icon import + Layout nav entry)
- Modify `packages/playground/src/pages/components/ComponentsIndex.tsx` (import + card)
- (Registry `registry.ts` is NOT touched — no mockup uses AppLayout.)

- [ ] **Step 1: `AppLayoutDemo.tsx`** — write exactly (demos are playground tooling, NOT mockups, so a bounded raw-`div` preview frame with inline style is allowed here):

```tsx
import { AppLayout, Page, Stack, Text, Title } from '@eocrm/design-system';
import type { ReactNode } from 'react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

// AppLayout fills the viewport (min-height: 100vh); in a demo we clip it to a
// bounded frame so the structure is visible inline. Raw div + inline style is
// fine here — demo pages are tooling, not mockups (Rule 6 doesn't apply).
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 320,
        overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}

function Bar({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-bg-subtle)',
        borderBottom: 'var(--border-width) solid var(--color-border)',
      }}
    >
      <Text weight="semibold">{label}</Text>
    </div>
  );
}

function Side() {
  return (
    <div
      style={{
        width: 180,
        height: '100%',
        padding: 'var(--space-4)',
        background: 'var(--color-bg-subtle)',
        borderRight: 'var(--border-width) solid var(--color-border)',
      }}
    >
      <Stack gap="sm">
        <Text tone="muted">Dashboard</Text>
        <Text tone="muted">Contacts</Text>
        <Text tone="muted">Deals</Text>
      </Stack>
    </div>
  );
}

export function AppLayoutDemo() {
  return (
    <DemoLayout
      name="AppLayout"
      description="Viewport-filling application shell: an optional topBar across the top, then a row of an optional sidebar (left) and the main content. The top-level layout primitive, mounted once at the app root."
      files={getComponentFiles('AppLayout')}
    >
      <Example
        title="Full shell (topBar + sidebar + content)"
        description="The canonical app shell. AppLayout fills the viewport; shown clipped to a bounded frame."
        code={`<AppLayout topBar={<TopBar />} sidebar={<Rail>{nav}</Rail>}>
  <Page>{content}</Page>
</AppLayout>`}
      >
        <Frame>
          <AppLayout topBar={<Bar label="eocrm" />} sidebar={<Side />}>
            <Page>
              <Stack gap="sm">
                <Title order={3}>Dashboard</Title>
                <Text tone="muted">Main content fills the remaining space.</Text>
              </Stack>
            </Page>
          </AppLayout>
        </Frame>
      </Example>

      <Example
        title="No sidebar"
        description="Omit the sidebar slot for a top bar + content shell."
        code={`<AppLayout topBar={<TopBar />}>
  <Page>{content}</Page>
</AppLayout>`}
      >
        <Frame>
          <AppLayout topBar={<Bar label="eocrm" />}>
            <Page>
              <Text tone="muted">No sidebar — content spans the full width.</Text>
            </Page>
          </AppLayout>
        </Frame>
      </Example>

      <Example
        title="No top bar"
        description="Omit the topBar slot for a sidebar + content shell."
        code={`<AppLayout sidebar={<Rail>{nav}</Rail>}>
  <Page>{content}</Page>
</AppLayout>`}
      >
        <Frame>
          <AppLayout sidebar={<Side />}>
            <Page>
              <Text tone="muted">No top bar — sidebar runs full height.</Text>
            </Page>
          </AppLayout>
        </Frame>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: `App.tsx` import + route** — add the import alongside the other component-demo imports:

```tsx
import { AppLayoutDemo } from './pages/components/AppLayoutDemo';
```

and add the route inside the `/components/*` route block (near the Constrain route):

```tsx
<Route path="/components/app-layout" element={<AppLayoutDemo />} />
```

- [ ] **Step 3: `AppShell.tsx` nav** — add a lucide icon to the existing `lucide-react` import block (use `PanelsTopLeft` — verify it isn't already imported; if it is, use `LayoutTemplate`), then add to the `Layout` group's `items` array:

```tsx
{ to: '/components/app-layout', label: 'AppLayout', icon: PanelsTopLeft, end: false },
```

- [ ] **Step 4: `ComponentsIndex.tsx` import + card** — add the import:

```tsx
import { AppLayout } from '@eocrm/design-system';
```

and add a card object to the `items` array near the other Layout cards (preview uses the existing `styles.bar` helper; a plain illustrative composition is fine here):

```tsx
{
  to: '/components/app-layout',
  name: 'AppLayout',
  description: 'Viewport-filling app shell — topBar + sidebar + content.',
  preview: (
    <Stack gap="xs">
      <div className={styles.bar} />
      <Cluster gap="xs" wrap={false}>
        <div className={styles.tile} />
        <Stack gap="xs">
          <div className={styles.bar} />
          <div className={styles.bar} />
        </Stack>
      </Cluster>
    </Stack>
  ),
},
```

(If `Cluster` / `Stack` aren't already imported in ComponentsIndex.tsx, they are — confirm; the preview uses only already-imported helpers + `styles.bar`/`styles.tile`.)

- [ ] **Step 5: playground gates** — run from repo root:

```bash
cd /Users/dpws/projects/design-system
make build && make lint && npm run format:check
```

Expected: typecheck + bundle succeed; lint + prettier clean. (If prettier flags the new files, `npx prettier --write` them.)

- [ ] **Step 6: commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/components/AppLayoutDemo.tsx packages/playground/src/App.tsx \
  packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "feat(playground): AppLayout demo + nav/route/grid wiring (#117)"
```

---

## Self-review

- **Issue coverage:** `topBar`/`sidebar`/`children` slots ✓, `forwardRef<HTMLDivElement>` ✓, `min-height: 100vh` viewport fill ✓ (the shim's blocker), HTMLAttributes spread ✓.
- **Core invariant:** tests (Task 1.4) ✓, demo + 4-way wiring (Task 2) ✓, `src/index.ts` export (1.5) ✓, JSDoc `@remarks` anti-patterns (1.1) ✓, AGENTS.md TL;DR (1.9) ✓, manifest both maps + regen (1.6–1.8) ✓.
- **Hard rules:** tokens-only (no raw color/border values; `100vh` not token-governed) ✓, layout-owning exception documented ✓, forwardRef + spread ✓, no i18n needed (no user-facing strings) ✓.
- **Consistency:** component dir `AppLayout` is the join key across all files; route path `app-layout` uniform across App/AppShell/ComponentsIndex; cluster `Layout` in both manifest maps.
