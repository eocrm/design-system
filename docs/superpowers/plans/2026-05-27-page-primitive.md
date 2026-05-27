# Page Primitive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<Page>` — a thin layout primitive in `@eocrm/design-system` that wraps page-root content with the canonical CRM rhythm (`gap="lg"`). Migrate all six existing mockups in the same PR.

**Architecture:** One file, one component, one SCSS module. Page renders a flex column with token-driven gap, mirroring Stack's gap scale 1:1 but as its own primitive — gives a reserved slot for future page-level concerns (max-width, scroll restoration, container queries) without entangling Stack.

**Tech Stack:** React 19, TypeScript, Vitest + React Testing Library, SCSS modules. No new dependencies. Reuses Stack's `StackGap` type via type re-aliasing.

**Spec:** `docs/superpowers/specs/2026-05-27-page-primitive-design.md`

**Branch:** `feat/page-primitive` (already checked out)

**Confirmed primitive facts (probed before writing this plan):**
- `Stack.tsx` exports `StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'`
- `Stack.module.scss` maps `gapXs=space-1`, `gapSm=space-2`, `gapMd=space-3`, `gapLg=space-4`, `gapXl=space-6`, `gap2xl=space-8` — Page mirrors these tokens
- `lg` default = `var(--space-4)` = 16px (the canonical CRM page rhythm)
- Stack is the pattern reference: `forwardRef<HTMLDivElement>`, `extends HTMLAttributes<HTMLDivElement>`, clsx-merged className

---

## File Structure

| File | Role |
|---|---|
| `packages/design-system/src/components/Page/Page.tsx` (NEW) | Component + types + gap lookup |
| `packages/design-system/src/components/Page/Page.module.scss` (NEW) | Root flex + gap classes |
| `packages/design-system/src/components/Page/Page.test.tsx` (NEW) | Hard rule 1 + gap propagation |
| `packages/design-system/src/components/Page/index.ts` (NEW) | Public re-exports |
| `packages/design-system/src/index.ts` (MODIFY) | Add Page + types |
| `packages/design-system/src/_meta/manifest.ts` (MODIFY) | Cluster mapping `Page: 'Layout'` |
| `packages/design-system/scripts/generate-manifest.mjs` (MODIFY) | Same cluster mapping |
| `packages/design-system/src/components.manifest.json` (REGENERATED) | `npm run build:manifest` |
| `packages/design-system/AGENTS.md` (MODIFY) | Layout-cluster TL;DR section |
| `packages/playground/src/pages/components/PageDemo.tsx` (NEW) | DemoLayout + 3 examples |
| `packages/playground/src/App.tsx` (MODIFY) | Route + import |
| `packages/playground/src/layout/AppShell/AppShell.tsx` (MODIFY) | Sidebar entry (Layout cluster) |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` (MODIFY) | Overview card |
| `packages/playground/src/pages/mockups/registry.ts` (MODIFY) | `ComponentName` union + per-mockup `usesComponents` |
| `packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx` (MODIFY) | Outer Stack → Page |
| `packages/playground/src/pages/mockups/Contacts/Contacts.tsx` (MODIFY) | Same |
| `packages/playground/src/pages/mockups/Deals/Deals.tsx` (MODIFY) | Same |
| `packages/playground/src/pages/mockups/Members/Members.tsx` (MODIFY) | Same |
| `packages/playground/src/pages/mockups/Audit/Audit.tsx` (MODIFY) | Same |
| `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx` (MODIFY) | Same |

---

## Task 1: Scaffold the Page primitive + tests + meta-wiring

The `src/index.ts` re-export and the `_meta/manifest.ts` cluster entry must land together with the component — the structure + manifest meta-tests don't tolerate deferral. This task bundles all of them.

**Files:**
- Create: `packages/design-system/src/components/Page/Page.tsx`
- Create: `packages/design-system/src/components/Page/Page.module.scss`
- Create: `packages/design-system/src/components/Page/Page.test.tsx`
- Create: `packages/design-system/src/components/Page/index.ts`
- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/src/_meta/manifest.ts`
- Modify: `packages/design-system/scripts/generate-manifest.mjs`
- Regenerate: `packages/design-system/src/components.manifest.json`

- [ ] **Step 1: Create Page.tsx**

Write `packages/design-system/src/components/Page/Page.tsx`:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { type StackGap } from '../Stack';
import styles from './Page.module.scss';

/**
 * Gap union for `<Page>`. Reuses `StackGap` so the scale stays
 * synchronized across layout primitives — when Stack gains a size,
 * Page gains it automatically.
 */
export type PageGap = StackGap;

export interface PageProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Vertical rhythm between top-level page sections.
   * - `xs` (4) / `sm` (8) / `md` (12) — tighter than canonical; rare.
   * - `lg` (16, **default**) — the canonical CRM page rhythm; matches
   *   every shipped mockup.
   * - `xl` (24) / `2xl` (32) — looser; for spacious overview / hero pages.
   */
  gap?: PageGap;
  children: ReactNode;
}

const gapClass: Record<PageGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};

/**
 * Page-root layout primitive. Wraps a CRM page's contents with the
 * canonical vertical rhythm between top-level sections (PageHeader,
 * filter row, body card / table, etc.). Default `gap="lg"` = 16px
 * between sections — matches every shipped mockup.
 *
 * Page is intentionally thin — it's a renamed Stack with a default,
 * sitting at the page root. Its identity exists so future page-level
 * concerns (max-width, scroll restoration, container queries) have
 * a natural home without churning every consumer.
 *
 * @example
 * // Canonical page shape — PageHeader + body sections
 * <Page>
 *   <PageHeader>
 *     <PageHeader.Title>Contacts</PageHeader.Title>
 *   </PageHeader>
 *   <Card>{filters}</Card>
 *   <Table>{rows}</Table>
 * </Page>
 *
 * @example
 * // Per-page rhythm override (rare — only when 'lg' doesn't fit)
 * <Page gap="md">
 *   {denseDashboardSections}
 * </Page>
 *
 * @remarks When NOT to use
 * - Nested page-like regions inside another Page — use `<Stack>` instead.
 *   Page is the OUTER wrapper at the page root; nesting two Pages
 *   compounds their rhythms in a confusing way.
 * - Inside a Card or modal body — those are sub-page contexts with
 *   their own padding contract. Use `<Stack>` there.
 *
 * @remarks Anti-patterns
 * - Adding inline padding or margin to Page. The page container
 *   (AppShell content, modal body) provides the outer padding;
 *   Page just provides the inner rhythm.
 * - Wrapping Page in another Page — see above.
 */
export const Page = forwardRef<HTMLDivElement, PageProps>(function Page(
  { gap = 'lg', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(styles.root, gapClass[gap], className)}
      // {...rest} last so consumer overrides win (Pattern A — Page has no
      // locked-in attributes; even data-* and aria-* can be overridden).
      {...rest}
    >
      {children}
    </div>
  );
});
```

- [ ] **Step 2: Create Page.module.scss**

Write `packages/design-system/src/components/Page/Page.module.scss`. Mirrors Stack's gap classes — when Stack adds/changes a size, the same change happens here.

```scss
.root {
  display: flex;
  flex-direction: column;
}

.gapXs {
  gap: var(--space-1);
}

.gapSm {
  gap: var(--space-2);
}

.gapMd {
  gap: var(--space-3);
}

.gapLg {
  gap: var(--space-4);
}

.gapXl {
  gap: var(--space-6);
}

.gap2xl {
  gap: var(--space-8);
}
```

- [ ] **Step 3: Create index.ts**

Write `packages/design-system/src/components/Page/index.ts`:

```ts
export { Page } from './Page';
export type { PageProps, PageGap } from './Page';
```

- [ ] **Step 4: Create Page.test.tsx**

Vitest globals — do NOT import `describe`/`it`/`expect`/`vi`. Write `packages/design-system/src/components/Page/Page.test.tsx`:

```tsx
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Page } from './Page';

it('renders children in source order', () => {
  render(
    <Page>
      <div data-testid="first">first</div>
      <div data-testid="second">second</div>
    </Page>,
  );
  const first = screen.getByTestId('first');
  const second = screen.getByTestId('second');
  expect(first).toBeInTheDocument();
  expect(second).toBeInTheDocument();
  // Source order preserved
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('defaults gap to "lg"', () => {
  const { container } = render(
    <Page>
      <span>child</span>
    </Page>,
  );
  // Page's CSS module class names contain "gapLg" when gap="lg".
  expect(container.firstElementChild?.className).toMatch(/gapLg/);
});

it('applies gap="xs" class', () => {
  const { container } = render(
    <Page gap="xs">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gapXs/);
});

it('applies gap="sm" class', () => {
  const { container } = render(
    <Page gap="sm">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gapSm/);
});

it('applies gap="md" class', () => {
  const { container } = render(
    <Page gap="md">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gapMd/);
});

it('applies gap="xl" class', () => {
  const { container } = render(
    <Page gap="xl">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gapXl/);
});

it('applies gap="2xl" class', () => {
  const { container } = render(
    <Page gap="2xl">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gap2xl/);
});

it('merges custom className with internal classes', () => {
  const { container } = render(
    <Page className="custom-page">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild).toHaveClass('custom-page');
  // Internal root class still present
  expect(container.firstElementChild?.className).toMatch(/root/);
});

it('forwards ref to the underlying div', () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <Page ref={ref}>
      <span>child</span>
    </Page>,
  );
  expect(ref.current).toBeInstanceOf(HTMLDivElement);
});

it('spreads arbitrary HTML attributes onto the root', () => {
  const { container } = render(
    <Page data-testid="page-root" aria-label="contacts page">
      <span>child</span>
    </Page>,
  );
  const root = container.firstElementChild;
  expect(root).toHaveAttribute('data-testid', 'page-root');
  expect(root).toHaveAttribute('aria-label', 'contacts page');
});
```

- [ ] **Step 5: Add to src/index.ts barrel re-export**

Open `packages/design-system/src/index.ts`. Add a Page export block near the other Layout-cluster components (look for `Stack`, `Cluster`, `Grid`, `PageHeader` — pick a natural spot, e.g. right after Stack):

```ts
export { Page } from './components/Page';
export type { PageProps, PageGap } from './components/Page';
```

- [ ] **Step 6: Add to manifest CLUSTERS (TS source)**

Open `packages/design-system/src/_meta/manifest.ts`. Find the `Layout` cluster block (Stack, Cluster, Divider, Grid, Card, PageHeader). Add `Page: 'Layout',` alphabetically. The resulting block looks like (exact alphabetical position may differ — match what's already there):

```ts
  Card: 'Layout',
  Cluster: 'Layout',
  Divider: 'Layout',
  Grid: 'Layout',
  Page: 'Layout',
  PageHeader: 'Layout',
  Stack: 'Layout',
```

- [ ] **Step 7: Add to manifest generator (JS copy)**

Open `packages/design-system/scripts/generate-manifest.mjs`. Find the same Layout cluster block. Add `Page: 'Layout',` in the same alphabetical position.

- [ ] **Step 8: Regenerate components.manifest.json**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run build:manifest 2>&1 | tail -5
```

Verify:
```bash
cd /Users/dpws/projects/design-system && grep -A 6 '"Page"' packages/design-system/src/components.manifest.json
```
Should show `"cluster": "Layout"` and a sensible `"tier"` value.

- [ ] **Step 9: Run tests + gates**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -10
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

All four must be clean. Expected: Page adds 10 new tests (total +10). Full suite passes including the structure.test.ts and manifest.test.ts meta-tests.

If the meta-tests still fail, double-check Steps 5–8 — those are exactly the meta-test entry points.

- [ ] **Step 10: Commit**

```bash
cd /Users/dpws/projects/design-system
git status --short  # expect the 4 new files + 3 modified + manifest.json
git add packages/design-system/src/components/Page packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json
git commit -m "$(cat <<'EOF'
Page: scaffold page-root layout primitive

Thin layout primitive — a renamed Stack at the page-root with a
default gap="lg". Mirrors Stack's gap scale 1:1 (xs/sm/md/lg/xl/2xl)
and reuses StackGap as the union type so the scale stays in lockstep.

Reserved slot for future page-level concerns (max-width, scroll
restoration, container queries) without churning consumers later.

Public exports + Layout cluster mapping land in the same commit
because the structure + manifest meta-tests don't tolerate splitting
those across commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: AGENTS.md TL;DR section

**Files:**
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Find the insertion point**

```bash
grep -nE "^### \`<Stack" packages/design-system/AGENTS.md
grep -nE "^### \`<PageHeader" packages/design-system/AGENTS.md
```

Page sits in the Layout cluster. The existing Layout-related sections are likely Stack / Cluster / Grid / Card / PageHeader. Insert the Page section immediately AFTER the `### <Stack>` section (Page reads as a more specific specialization of Stack) and BEFORE whatever comes next.

If the file groups Layout components together more loosely, place Page near them — match the existing rhythm of the file.

- [ ] **Step 2: Insert the section**

The section content (leading blank line is required for markdown spacing):

````markdown

### `<Page>` — page-root layout primitive

```tsx
// Canonical CRM page shape
<Page>
  <PageHeader>
    <PageHeader.Title>Contacts</PageHeader.Title>
  </PageHeader>
  <Card>{filters}</Card>
  <Table>{rows}</Table>
</Page>

// Per-page rhythm override (rare — only when 'lg' doesn't fit)
<Page gap="md">
  {denseDashboardSections}
</Page>
```

- `gap`: `'xs'` (4) / `'sm'` (8) / `'md'` (12) / `'lg'` (16, **default**) / `'xl'` (24) / `'2xl'` (32). The default `'lg'` is the canonical CRM page rhythm — match it across pages unless you have a specific reason.
- Page is the OUTER wrapper at the page root. Inside it, sections compose with `<PageHeader>`, `<Card>`, `<Table>`, etc.
- **Use Page at the page root, not nested.** For sub-regions (inside a card, modal, drawer), use `<Stack>` instead — those contexts have their own padding contract.
- Page does NOT add padding. The page container (AppShell content, modal body) provides outer padding; Page just provides inner section rhythm.
- Page is intentionally thin — a renamed Stack with a page-level default. It exists so future page-level concerns (max-width, scroll restoration, container queries) have a natural home.
````

- [ ] **Step 3: Gates**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -3
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -3
```

All clean.

- [ ] **Step 4: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/AGENTS.md
git commit -m "$(cat <<'EOF'
Page: AGENTS.md TL;DR section

Adds the Page primer in the Layout cluster (near Stack). Three
bullets cover gap defaults, the page-root convention, and the
"use Stack for nested sub-regions" guidance.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Component demo + nav wiring

**Files:**
- Create: `packages/playground/src/pages/components/PageDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts` (just the `ComponentName` union)

- [ ] **Step 1: Create PageDemo.tsx**

Write `packages/playground/src/pages/components/PageDemo.tsx`:

```tsx
import { Card, Page, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import tsxSource from '@lib-source/components/Page/Page.tsx?raw';
import scssSource from '@lib-source/components/Page/Page.module.scss?raw';

function Stand({ children }: { children: string }) {
  return (
    <Card padding="md">
      <Text>{children}</Text>
    </Card>
  );
}

export function PageDemo() {
  return (
    <DemoLayout
      name="Page"
      componentName="Page"
      description="Page-root layout primitive. Wraps a CRM page's top-level sections with the canonical vertical rhythm (gap='lg'). Each example shows the same three sections under a different gap setting."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Page.tsx"
      scssFilename="Page.module.scss"
    >
      <Example
        title='Default — gap="lg"'
        description="The canonical CRM page rhythm: 16px between top-level sections. Matches every shipped mockup."
        code={`<Page>
  <PageHeader>{/* … */}</PageHeader>
  <Card>{/* … */}</Card>
  <Table>{/* … */}</Table>
</Page>`}
      >
        <InputExample width="auto">
          <Page>
            <Stand>PageHeader stand-in</Stand>
            <Stand>Card / filter row</Stand>
            <Stand>Table / body section</Stand>
          </Page>
        </InputExample>
      </Example>

      <Example
        title='Compact — gap="md"'
        description="Tighter rhythm (12px). Use for dense dashboards or pages that pack many narrow sections."
        code={`<Page gap="md">
  {/* … */}
</Page>`}
      >
        <InputExample width="auto">
          <Page gap="md">
            <Stand>Section one</Stand>
            <Stand>Section two</Stand>
            <Stand>Section three</Stand>
          </Page>
        </InputExample>
      </Example>

      <Example
        title='Spacious — gap="xl"'
        description="Looser rhythm (24px). Use for overview / hero pages with few large sections."
        code={`<Page gap="xl">
  {/* … */}
</Page>`}
      >
        <InputExample width="auto">
          <Page gap="xl">
            <Stand>Section one</Stand>
            <Stand>Section two</Stand>
            <Stand>Section three</Stand>
          </Page>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: Route in App.tsx**

Open `packages/playground/src/App.tsx`. Add the import alongside the other component-demo imports (search for `StackDemo` and place near it):

```tsx
import { PageDemo } from './pages/components/PageDemo';
```

Add the route alongside the other component routes:

```tsx
<Route path="/components/page" element={<PageDemo />} />
```

- [ ] **Step 3: Sidebar in AppShell.tsx**

Open `packages/playground/src/layout/AppShell/AppShell.tsx`. The Layout group's items array sits near the top of `componentGroups`. Add the Page entry alphabetically (between `PageHeader` and `Stack`):

```tsx
{ to: '/components/page', label: 'Page', icon: FileText, end: false },
```

Add `FileText` to the existing `lucide-react` import block at the top if not already present. (`FileText` is the natural lucide icon for a page; check if it's already imported. If it is, just use it. If not, add it alphabetically in the destructure.)

- [ ] **Step 4: Card in ComponentsIndex.tsx**

Open `packages/playground/src/pages/components/ComponentsIndex.tsx`. Add `Page` and `Card`, `Text` to the existing `@eocrm/design-system` import block if needed (grep to verify which are missing). Find a sensible insertion point for the card — near `Stack` or `PageHeader`. Add:

```tsx
{
  to: '/components/page',
  name: 'Page',
  description:
    'Page-root layout primitive. Wraps top-level sections with the canonical CRM rhythm (gap="lg").',
  preview: (
    <Page>
      <Card padding="sm">
        <Text size="sm">Header</Text>
      </Card>
      <Card padding="sm">
        <Text size="sm">Body</Text>
      </Card>
    </Page>
  ),
},
```

No `pointerEvents: 'none'` wrap needed (no interactive children).

- [ ] **Step 5: ComponentName union in registry.ts**

Open `packages/playground/src/pages/mockups/registry.ts`. The `ComponentName` union is alphabetical. Add `| 'Page'` between `| 'PageHeader'` neighbor and the next entry — read the existing union and place alphabetically:

```ts
  | 'Page'
  | 'PageHeader'
```

Do NOT touch `usesComponents` arrays yet — those come in Tasks 4–9.

- [ ] **Step 6: Gates**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
```

All clean. Test count stays unchanged (this task adds no test files).

- [ ] **Step 7: Commit**

```bash
cd /Users/dpws/projects/design-system
git status --short  # expect 5 files modified
git add packages/playground/src/pages/components/PageDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
Page: playground demo + nav wiring

Three examples showing the gap="lg" (default), "md" (compact), and
"xl" (spacious) rhythms with three uniform Card stand-ins as
section content. Wired into the Layout cluster in the sidebar
(FileText icon), ComponentsIndex overview card, and the
ComponentName union in registry.ts. Mockup-side usesComponents
wiring is deferred to the per-mockup migration tasks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Migrate Dashboard mockup

**Files:**
- Modify: `packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Locate the outer Stack**

```bash
grep -nE "<Stack gap=\"lg\">|</Stack>" packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx | head -10
```

The outer `<Stack gap="lg">` is the page-root wrapper (around line 66). Locate its closing tag — the LAST `</Stack>` in the file that matches.

- [ ] **Step 2: Swap outer wrapper to Page**

Replace the outer `<Stack gap="lg">` (around line 66) with `<Page>`. Replace its matching closing `</Stack>` with `</Page>`. Indentation stays identical.

Concretely: the return statement should now look like:

```tsx
return (
  <Page>
    <PageHeader>{/* … */}</PageHeader>
    {/* … */}
    <CrossLinks kind="mockup" slug="dashboard" />
  </Page>
);
```

- [ ] **Step 3: Update imports**

Open the design-system import block at the top of Dashboard.tsx. Add `Page` alphabetically. Then grep to see if `Stack` is still used INSIDE the file (the file does have nested Stacks; they stay):

```bash
grep -nE "<Stack\b" packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx | head -5
```

Likely Stack remains in use (inner stacks for recent-activity rows, etc.). Keep `Stack` in the import.

- [ ] **Step 4: Update registry**

Open `packages/playground/src/pages/mockups/registry.ts`. Find the `dashboard` mockup entry. Add `'Page'` to its `usesComponents` array alphabetically. `'Stack'` should remain (still used inside the page).

- [ ] **Step 5: Gates**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

All clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
Dashboard mockup: adopt <Page> for the page-root wrapper

Replaces the outer <Stack gap="lg"> with <Page>. Inner Stacks
(activity rows, recent-contacts grid items) stay as-is.
Registry: dashboard.usesComponents gains 'Page'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Migrate Contacts mockup

**Files:**
- Modify: `packages/playground/src/pages/mockups/Contacts/Contacts.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Locate the outer Stack**

```bash
grep -nE "<Stack gap=\"lg\">|</Stack>" packages/playground/src/pages/mockups/Contacts/Contacts.tsx | head -5
```

- [ ] **Step 2: Swap outer wrapper to Page**

Replace the outer `<Stack gap="lg">` (around line 36) with `<Page>`. Replace its matching closing `</Stack>` with `</Page>`.

```tsx
return (
  <Page>
    <PageHeader>{/* … */}</PageHeader>
    {/* … */}
    <CrossLinks kind="mockup" slug="contacts" />
  </Page>
);
```

- [ ] **Step 3: Update imports + check Stack usage**

Add `Page` alphabetically. Grep to check Stack usage:

```bash
grep -nE "<Stack\b" packages/playground/src/pages/mockups/Contacts/Contacts.tsx | head -5
```

If the only Stack was the outer one, drop `Stack` from the import. If others remain, keep it.

- [ ] **Step 4: Update registry**

Find the `contacts` mockup entry. Add `'Page'` to `usesComponents` alphabetically. If Stack was dropped from imports, drop `'Stack'` from `usesComponents` too.

- [ ] **Step 5: Gates + Commit**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
git add packages/playground/src/pages/mockups/Contacts/Contacts.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
Contacts mockup: adopt <Page> for the page-root wrapper

Outer <Stack gap="lg"> → <Page>. Registry updated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Migrate Deals mockup

**Files:**
- Modify: `packages/playground/src/pages/mockups/Deals/Deals.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Locate the outer Stack**

```bash
grep -nE "<Stack gap=\"lg\">|</Stack>" packages/playground/src/pages/mockups/Deals/Deals.tsx | head -5
```

- [ ] **Step 2: Swap outer wrapper to Page**

Replace the outer `<Stack gap="lg">` (around line 66) with `<Page>` and the matching closing `</Stack>` with `</Page>`.

- [ ] **Step 3: Imports + grep Stack usage**

Add `Page` alphabetically. Check:
```bash
grep -nE "<Stack\b" packages/playground/src/pages/mockups/Deals/Deals.tsx | head -5
```
Keep or drop `Stack` accordingly.

- [ ] **Step 4: Update registry**

Find `deals` mockup. Add `'Page'`; drop `'Stack'` if no longer used.

- [ ] **Step 5: Gates + Commit**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
git add packages/playground/src/pages/mockups/Deals/Deals.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
Deals mockup: adopt <Page> for the page-root wrapper

Outer <Stack gap="lg"> → <Page>. Registry updated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Migrate Members mockup

**Files:**
- Modify: `packages/playground/src/pages/mockups/Members/Members.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Locate the outer Stack**

```bash
grep -nE "<Stack gap=\"lg\">|</Stack>" packages/playground/src/pages/mockups/Members/Members.tsx | head -5
```

- [ ] **Step 2: Swap outer wrapper to Page**

Replace the outer `<Stack gap="lg">` (around line 31) with `<Page>` and the matching closing `</Stack>` with `</Page>`.

- [ ] **Step 3: Imports + grep Stack usage**

Add `Page` alphabetically. Check Stack usage; keep or drop.

- [ ] **Step 4: Update registry**

Find `members` mockup. Add `'Page'`; drop `'Stack'` if no longer used.

- [ ] **Step 5: Gates + Commit**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
git add packages/playground/src/pages/mockups/Members/Members.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
Members mockup: adopt <Page> for the page-root wrapper

Outer <Stack gap="lg"> → <Page>. Registry updated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Migrate Audit mockup

**Files:**
- Modify: `packages/playground/src/pages/mockups/Audit/Audit.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Locate the outer Stack**

```bash
grep -nE "<Stack gap=\"lg\">|</Stack>" packages/playground/src/pages/mockups/Audit/Audit.tsx | head -5
```

- [ ] **Step 2: Swap outer wrapper to Page**

Replace the outer `<Stack gap="lg">` (around line 296) with `<Page>` and the matching closing `</Stack>` with `</Page>`.

- [ ] **Step 3: Imports + grep Stack usage**

Add `Page` alphabetically. Check Stack usage; keep or drop. (Audit has Stack used inside ExpandedPanel — likely stays.)

- [ ] **Step 4: Update registry**

Find `audit` mockup. Add `'Page'`; drop `'Stack'` if no longer used.

- [ ] **Step 5: Gates + Commit**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
git add packages/playground/src/pages/mockups/Audit/Audit.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
Audit mockup: adopt <Page> for the page-root wrapper

Outer <Stack gap="lg"> → <Page>. Registry updated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Migrate ContactDetail mockup

**Files:**
- Modify: `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Locate the outer Stack**

```bash
grep -nE "<Stack gap=\"lg\">|</Stack>" packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx | head -10
```

There are multiple Stacks in this file (sidebars, etc.). The OUTER one is the page-root wrapper at the top of the return statement (around line 40). Identify its matching closing tag (the LAST `</Stack>` in the file that closes the outermost wrapper — likely after `<CrossLinks ... />`).

- [ ] **Step 2: Swap outer wrapper to Page**

Replace the outermost `<Stack gap="lg">` (around line 40) with `<Page>`. Replace the matching closing `</Stack>` with `</Page>`. The inner Stacks stay untouched.

```tsx
return (
  <Page>
    <Breadcrumb>{/* … */}</Breadcrumb>
    <PageHeader borderBottom={false}>{/* … */}</PageHeader>
    {/* … inner layout … */}
    <CrossLinks kind="mockup" slug="contact-detail" />
  </Page>
);
```

- [ ] **Step 3: Update imports**

Add `Page` alphabetically. `Stack` MUST remain — it's used inside the file (the right-column sidebar Stacks at lines ~93 and ~156, etc.).

- [ ] **Step 4: Update registry**

Find `contact-detail` mockup. Add `'Page'` to `usesComponents` alphabetically. Keep `'Stack'`.

- [ ] **Step 5: Gates + Commit**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
git add packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
ContactDetail mockup: adopt <Page> for the page-root wrapper

Outer <Stack gap="lg"> → <Page>. Inner column Stacks stay untouched.
Registry updated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Library + mockup review cycles

**Files:** depends on findings.

- [ ] **Step 1: Final gate sweep**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "\.(test|spec)\.tsx?$" | head -5
```

All four gates green; pack grep must return zero lines.

- [ ] **Step 2: Library reviewer (Hard rule 8)**

Spawn a fresh-context `general-purpose` agent. Brief on the 10 categories: bugs, a11y, API inconsistencies, type safety, rule violations (Hard rules 1, 3, 3a, 4, 5, 6, 7), test coverage, token discipline, SCSS, cross-package leakage, package/distribution. Focus on the new Page files + the manifest + AGENTS.md additions.

- [ ] **Step 3: Mockup reviewer (playground Hard rule 7)**

Spawn a separate fresh-context `general-purpose` agent for the playground Hard rule 7 categories. Focus on the six migrated mockup files + the registry. Verify the migrations are surgical (outer Stack → Page only; inner Stacks untouched) and registry sync is correct.

- [ ] **Step 4: Fix findings**

Address Critical and Important from both reviewers. Document deliberate skips of Nice-to-haves.

- [ ] **Step 5: Re-run gates + re-spawn reviewers**

Repeat until both verdicts are `clean enough to stop`.

- [ ] **Step 6: Commit any review-fix changes (if uncommitted)**

---

## Task 11: Push + PR

- [ ] **Step 1: Push the branch**

```bash
cd /Users/dpws/projects/design-system && git push -u origin feat/page-primitive 2>&1 | tail -10
```

If prettier pre-push fails, run `npx prettier --write <flagged files>`, commit as `chore: prettier`, and re-push.

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "Page: page-root layout primitive + 6 mockup migrations" --body "$(cat <<'EOF'
## Summary

New layout primitive `<Page>` in `@eocrm/design-system` — a thin renamed Stack at the page-root with a default `gap="lg"` (16px). All six existing mockups (Dashboard, Contacts, Deals, Members, Audit, ContactDetail) migrate from `<Stack gap="lg">` to `<Page>` in the same PR.

The primitive is intentionally minimal — same gap union as Stack, no padding, no max-width. It exists to give future page-level concerns (max-width, scroll restoration, container queries) a natural home without churning consumers later.

- Spec: `docs/superpowers/specs/2026-05-27-page-primitive-design.md`
- Plan: `docs/superpowers/plans/2026-05-27-page-primitive.md`

## Test plan

- [x] 10 unit tests on Page (render, default gap, all 6 gap classes, className merge, ref forwarding, attribute spread)
- [x] `make build`, `make lint`, `npm run typecheck` — all green
- [x] `npm pack --dry-run -w @eocrm/design-system` — no test files in the tarball; Page files included
- [x] Component demo at `/components/page` with three gap examples
- [x] Hard rule 8 library review-fix cycle — final verdict `clean enough to stop`
- [x] Hard rule 7 mockup review-fix cycle — final verdict `clean enough to stop`
- [x] All six migrated mockup routes load (HTTP 200) and visually preserve their prior layout

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | tail -3
```

- [ ] **Step 3: Report the PR URL**

---

## Self-Review

**1. Spec coverage:**
- Page primitive with `gap` prop defaulting to `'lg'` — Task 1 ✓
- Six gap values (`xs/sm/md/lg/xl/2xl`) using Stack's token scale — Task 1 ✓
- `PageGap` type re-aliases `StackGap` — Task 1 ✓
- forwardRef, props spread, className merge — Task 1 ✓
- JSDoc with `@example` + `@remarks` per Hard rule 7 — Task 1 ✓
- Tests (render, defaults, all gaps, className, ref, attribute spread) — Task 1 ✓
- Public exports + manifest cluster `Layout` — Task 1 ✓ (collapsed into Task 1 because of meta-tests)
- AGENTS.md TL;DR — Task 2 ✓
- Component demo (three gap examples with uniform Card stand-ins) — Task 3 ✓
- App.tsx route + AppShell sidebar + ComponentsIndex card + ComponentName union — Task 3 ✓
- Six mockup migrations — Tasks 4–9 ✓
- Both review cycles — Task 10 ✓
- Push + PR — Task 11 ✓
- Out-of-scope items (no Page.Header/Footer, no max-width, no scroll restoration, no `as` prop, no theming variants) — covered by their absence ✓

**2. Placeholder scan:** every step has concrete code or commands. Mockup-migration tasks instruct grep-then-decide for whether `Stack` stays in the import (each mockup may differ); this is an explicit instruction, not a placeholder.

**3. Type consistency:**
- `PageGap`, `PageProps` defined in Task 1 and re-exported identically in Task 1 Step 5.
- `gap: 'lg'` default consistent across spec, Task 1 implementation, Task 1 tests, Task 2 docs, Task 3 demo.
- `gapClass` lookup table values match Stack's gap class names 1:1 (gapXs/gapSm/gapMd/gapLg/gapXl/gap2xl).
- `forwardRef<HTMLDivElement>` consistent across implementation and ref-forwarding test.

One stress-tested decision: the `src/index.ts` + manifest entries land WITH the Page scaffold in Task 1, not in a follow-up task. This is because of meta-tests (`structure.test.ts` checks every component dir is re-exported; `manifest.test.ts` checks every component has a cluster). Splitting them caused failures in earlier PRs (FilterChip, PersonDisplay) — Task 1 incorporates the lesson.
