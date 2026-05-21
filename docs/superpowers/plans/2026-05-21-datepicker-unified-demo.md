# Unified DatePicker demo page — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse four datepicker demo pages into one tabbed `/components/datepickers` page.

**Architecture:** Extract a header-less `DemoBody` from `DemoLayout`. Refactor each of the four standalone demos into a `<XDemoPanel>` that renders only the body. New `DatePickersDemo` page renders a page header + `<Tabs>` + the active panel. Route + sidebar + index + cross-link helper updated.

**Tech Stack:** React, react-router-dom, `<Tabs>` from `@eocrm/design-system`.

**Branch:** `refactor/datepicker-unified-demo`. Off fresh `main`. Playground-only changes; no library code touched.

---

## Task 1: Branch + hooks check (already on branch)

- [ ] **Step 1: Verify branch + hooks installed**

```bash
git rev-parse --abbrev-ref HEAD   # → refactor/datepicker-unified-demo
git config --get core.hooksPath   # → .husky/_
test -x .husky/pre-push           # exit 0
```

Expected: branch matches, hooks path is `.husky/_`, pre-push exists.

---

## Task 2: Extract `DemoBody` from `DemoLayout`

**Files:**

- Create: `packages/playground/src/pages/components/DemoBody.tsx`
- Modify: `packages/playground/src/pages/components/DemoLayout.tsx`

- [ ] **Step 1: Read current `DemoLayout.tsx`**

The file currently renders: header (eyebrow + h1 + description) + source `<details>` (Tabs over TSX/SCSS) + examples grid + cross-link.

- [ ] **Step 2: Create `DemoBody.tsx` with the lower three pieces**

Exact file:

```tsx
import { useState, type ReactNode } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';
import { Card, Tabs } from '@eocrm/design-system';
import { CodeBlock } from './CodeBlock';
import { CrossLinks } from '../shared/CrossLinks';
import type { ComponentName } from '../mockups/registry';
import styles from './DemoLayout.module.scss';

export interface DemoBodyProps {
  tsxSource: string;
  scssSource: string;
  tsxFilename: string;
  scssFilename: string;
  componentName?: ComponentName;
  children: ReactNode;
}

/**
 * Source-view + examples + cross-link. The header-less core of
 * `<DemoLayout>` — reusable inside multi-variant pages where the page
 * header is rendered once and tabs swap the body.
 */
export function DemoBody({
  tsxSource,
  scssSource,
  tsxFilename,
  scssFilename,
  componentName,
  children,
}: DemoBodyProps) {
  const [sourceTab, setSourceTab] = useState<'tsx' | 'scss'>('tsx');

  return (
    <>
      <Card padding="none">
        <details className={styles.sourceDetails}>
          <summary className={styles.sourceSummary}>
            <span className={styles.summaryLabel}>
              <Code2 size={14} />
              View source code
            </span>
            <ChevronDown size={14} className={styles.chevron} />
          </summary>
          <div className={styles.sourceBody}>
            <Tabs
              items={[
                { id: 'tsx', label: 'Component' },
                { id: 'scss', label: 'Styles' },
              ]}
              activeId={sourceTab}
              onChange={(id) => setSourceTab(id as 'tsx' | 'scss')}
            />
            <div className={styles.sourceCode}>
              {sourceTab === 'tsx' ? (
                <CodeBlock code={tsxSource} language="tsx" filename={tsxFilename} />
              ) : (
                <CodeBlock code={scssSource} language="scss" filename={scssFilename} />
              )}
            </div>
          </div>
        </details>
      </Card>

      <h2 className={styles.sectionTitle}>Examples</h2>
      <div className={styles.examplesGrid}>{children}</div>

      {componentName && <CrossLinks kind="component" name={componentName} />}
    </>
  );
}
```

- [ ] **Step 3: Refactor `DemoLayout.tsx` to use `DemoBody`**

```tsx
import { type ReactNode } from 'react';
import { Stack } from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import type { ComponentName } from '../mockups/registry';
import styles from './DemoLayout.module.scss';

export interface DemoLayoutProps {
  name: string;
  description: string;
  tsxSource: string;
  scssSource: string;
  tsxFilename: string;
  scssFilename: string;
  componentName?: ComponentName;
  children: ReactNode;
}

export function DemoLayout({
  name,
  description,
  tsxSource,
  scssSource,
  tsxFilename,
  scssFilename,
  componentName,
  children,
}: DemoLayoutProps) {
  return (
    <Stack gap="lg">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Component</span>
        <h1 className={styles.title}>{name}</h1>
        <p className={styles.description}>{description}</p>
      </header>

      <DemoBody
        tsxSource={tsxSource}
        scssSource={scssSource}
        tsxFilename={tsxFilename}
        scssFilename={scssFilename}
        componentName={componentName}
      >
        {children}
      </DemoBody>
    </Stack>
  );
}
```

- [ ] **Step 4: Typecheck + build**

```bash
npm run typecheck
npm run build
```

Both clean.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/DemoBody.tsx \
        packages/playground/src/pages/components/DemoLayout.tsx
git commit -m "DemoLayout: extract DemoBody (header-less core) for multi-variant pages"
```

---

## Task 3: Refactor `DatePickerDemo.tsx` to export `DatePickerDemoPanel`

**Files:**

- Modify: `packages/playground/src/pages/components/DatePickerDemo.tsx`

- [ ] **Step 1: Replace `DemoLayout` with `DemoBody`**

Find:

```tsx
export function DatePickerDemo() {
  return (
    <DemoLayout
      name="DatePicker"
      componentName="DatePicker"
      description="..."
      tsxSource={tsxSource}
      ...
    >
      <Example title="Uncontrolled" ... />
      ...
    </DemoLayout>
  );
}
```

Replace with:

```tsx
export function DatePickerDemoPanel() {
  return (
    <DemoBody
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DatePicker.tsx"
      scssFilename="DatePicker.module.scss"
      componentName="DatePicker"
    >
      <Example title="Uncontrolled" ... />
      ...
    </DemoBody>
  );
}
```

(Keep the description-text content; it's now passed in via the parent page header for the combined view, but each panel can also include a one-paragraph variant description if useful. For this task, drop the `description` prop entirely — the page header has it.)

Update the import line at the top: replace `import { DemoLayout } from './DemoLayout'` with `import { DemoBody } from './DemoBody'`.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: TS errors in `App.tsx` referencing `DatePickerDemo` (not yet fixed — these clear in Task 7). For this task, the per-file typecheck on this file should be clean.

- [ ] **Step 3: Commit**

```bash
git add packages/playground/src/pages/components/DatePickerDemo.tsx
git commit -m "DatePickerDemo: convert to DatePickerDemoPanel (header-less, DemoBody-based)"
```

---

## Task 4: Refactor `DateRangePickerDemo.tsx` to export `DateRangePickerDemoPanel`

**Files:**

- Modify: `packages/playground/src/pages/components/DateRangePickerDemo.tsx`

- [ ] **Step 1: Same shape as Task 3 — replace `DemoLayout` with `DemoBody`, rename export to `DateRangePickerDemoPanel`, drop the `description` prop.**

- [ ] **Step 2: Commit**

```bash
git add packages/playground/src/pages/components/DateRangePickerDemo.tsx
git commit -m "DateRangePickerDemo: convert to DateRangePickerDemoPanel"
```

---

## Task 5: Refactor `InlineDatePickerDemo.tsx` → `InlineDatePickerDemoPanel`

**Files:**

- Modify: `packages/playground/src/pages/components/InlineDatePickerDemo.tsx`

- [ ] **Step 1: Same conversion.**

- [ ] **Step 2: Commit**

```bash
git add packages/playground/src/pages/components/InlineDatePickerDemo.tsx
git commit -m "InlineDatePickerDemo: convert to InlineDatePickerDemoPanel"
```

---

## Task 6: Refactor `InlineDateRangePickerDemo.tsx` → `InlineDateRangePickerDemoPanel`

**Files:**

- Modify: `packages/playground/src/pages/components/InlineDateRangePickerDemo.tsx`

- [ ] **Step 1: Same conversion.**

- [ ] **Step 2: Commit**

```bash
git add packages/playground/src/pages/components/InlineDateRangePickerDemo.tsx
git commit -m "InlineDateRangePickerDemo: convert to InlineDateRangePickerDemoPanel"
```

---

## Task 7: Create `DatePickersDemo.tsx` (the unified page)

**Files:**

- Create: `packages/playground/src/pages/components/DatePickersDemo.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useSearchParams } from 'react-router-dom';
import { Stack, Tabs } from '@eocrm/design-system';
import { DatePickerDemoPanel } from './DatePickerDemo';
import { DateRangePickerDemoPanel } from './DateRangePickerDemo';
import { InlineDatePickerDemoPanel } from './InlineDatePickerDemo';
import { InlineDateRangePickerDemoPanel } from './InlineDateRangePickerDemo';
import styles from './DemoLayout.module.scss';

type Variant = 'datepicker' | 'daterangepicker' | 'inline-datepicker' | 'inline-daterangepicker';

const VARIANTS: Variant[] = [
  'datepicker',
  'daterangepicker',
  'inline-datepicker',
  'inline-daterangepicker',
];

function isVariant(v: string | null): v is Variant {
  return v !== null && (VARIANTS as string[]).includes(v);
}

export function DatePickersDemo() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('variant');
  const active: Variant = isVariant(raw) ? raw : 'datepicker';

  return (
    <Stack gap="lg">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Component</span>
        <h1 className={styles.title}>Date pickers</h1>
        <p className={styles.description}>
          Single date or range × popover field or inline calendar — four variants of the same
          month-grid surface. Pick the one that matches the page's interaction need.
        </p>
      </header>

      <Tabs
        items={[
          { id: 'datepicker', label: 'DatePicker' },
          { id: 'daterangepicker', label: 'DateRangePicker' },
          { id: 'inline-datepicker', label: 'InlineDatePicker' },
          { id: 'inline-daterangepicker', label: 'InlineDateRangePicker' },
        ]}
        activeId={active}
        onChange={(id) => setParams({ variant: id }, { replace: true })}
      />

      {active === 'datepicker' && <DatePickerDemoPanel />}
      {active === 'daterangepicker' && <DateRangePickerDemoPanel />}
      {active === 'inline-datepicker' && <InlineDatePickerDemoPanel />}
      {active === 'inline-daterangepicker' && <InlineDateRangePickerDemoPanel />}
    </Stack>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: TS errors only in `App.tsx` (still referencing the removed `<DatePickerDemo>` etc.) — those clear in Task 8.

- [ ] **Step 3: Commit**

```bash
git add packages/playground/src/pages/components/DatePickersDemo.tsx
git commit -m "DatePickersDemo: unified page with variant tabs (URL search-param state)"
```

---

## Task 8: Routes — App.tsx (4 → 1)

**Files:**

- Modify: `packages/playground/src/App.tsx`

- [ ] **Step 1: Remove 4 old imports, add 1 new import**

Remove:
```tsx
import { DatePickerDemo } from './pages/components/DatePickerDemo';
import { DateRangePickerDemo } from './pages/components/DateRangePickerDemo';
import { InlineDatePickerDemo } from './pages/components/InlineDatePickerDemo';
import { InlineDateRangePickerDemo } from './pages/components/InlineDateRangePickerDemo';
```

Add:
```tsx
import { DatePickersDemo } from './pages/components/DatePickersDemo';
```

- [ ] **Step 2: Remove 4 routes, add 1 route**

Remove these `<Route>`s:

```tsx
<Route path="/components/datepicker" element={<DatePickerDemo />} />
<Route path="/components/daterangepicker" element={<DateRangePickerDemo />} />
<Route path="/components/inline-datepicker" element={<InlineDatePickerDemo />} />
<Route path="/components/inline-daterangepicker" element={<InlineDateRangePickerDemo />} />
```

Add (in alphabetical position between `/components/cluster` and `/components/dropdown-menu`, OR between `/components/button` and `/components/input` depending on existing sort — match the file's existing ordering convention):

```tsx
<Route path="/components/datepickers" element={<DatePickersDemo />} />
```

- [ ] **Step 3: Typecheck + build**

```bash
npm run typecheck
npm run build
```

Both must be clean.

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/App.tsx
git commit -m "App: collapse 4 datepicker routes into /components/datepickers"
```

---

## Task 9: Sidebar (AppShell) — 5 Forms entries → 2

**Files:**

- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`

- [ ] **Step 1: In the `Forms` group of `componentGroups`, remove these 4 entries:**

```tsx
{ to: '/components/datepicker', label: 'DatePicker', icon: CalendarCheck, end: false },
{ to: '/components/daterangepicker', label: 'DateRangePicker', icon: CalendarRange, end: false },
{ to: '/components/inline-datepicker', label: 'InlineDatePicker', icon: CalendarPlus, end: false },
{ to: '/components/inline-daterangepicker', label: 'InlineDateRangePicker', icon: CalendarHeart, end: false },
```

Add:

```tsx
{ to: '/components/datepickers', label: 'Date pickers', icon: CalendarRange, end: false },
```

(in the alphabetical position between Button and Input).

- [ ] **Step 2: Remove now-unused icon imports**

The `CalendarCheck`, `CalendarPlus`, `CalendarHeart` icons are no longer used here. Check if they're used elsewhere in the file (e.g., `Calendar` component might use `CalendarDays`). Remove only the unused ones.

- [ ] **Step 3: Typecheck + build**

```bash
npm run typecheck
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/layout/AppShell/AppShell.tsx
git commit -m "AppShell: collapse 4 datepicker sidebar entries into 'Date pickers'"
```

---

## Task 10: ComponentsIndex — 4 cards → 1

**Files:**

- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`

- [ ] **Step 1: Remove 4 cards (DatePicker, DateRangePicker, InlineDatePicker, InlineDateRangePicker)**

- [ ] **Step 2: Add a single "Date pickers" card in their place**

```tsx
{
  to: '/components/datepickers',
  name: 'Date pickers',
  description:
    'Four variants of the same month grid — DatePicker, DateRangePicker, and inline counterparts.',
  preview: (
    <div style={{ width: 200 }}>
      <DatePicker defaultValue={new Date(2026, 4, 21)} aria-label="Preview" />
    </div>
  ),
},
```

- [ ] **Step 3: Remove now-unused imports**

`DateRangePicker`, `InlineDatePicker`, `InlineDateRangePicker` may be removable from the imports (verify they're not used elsewhere in the file).

- [ ] **Step 4: Typecheck + build**

```bash
npm run typecheck
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "ComponentsIndex: collapse 4 datepicker cards into one 'Date pickers' card"
```

---

## Task 11: CrossLinks — extend `componentPath()`

**Files:**

- Modify: `packages/playground/src/pages/shared/CrossLinks.tsx`

- [ ] **Step 1: Add special-case mapping for the 4 datepicker names**

```tsx
function componentPath(name: ComponentName): string {
  switch (name) {
    case 'DatePicker':
      return '/components/datepickers?variant=datepicker';
    case 'DateRangePicker':
      return '/components/datepickers?variant=daterangepicker';
    case 'InlineDatePicker':
      return '/components/datepickers?variant=inline-datepicker';
    case 'InlineDateRangePicker':
      return '/components/datepickers?variant=inline-daterangepicker';
    default: {
      // PascalCase → kebab-case so multi-word names match their route slugs
      // (e.g. DropdownMenu → /components/dropdown-menu).
      const slug = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      return `/components/${slug}`;
    }
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/playground/src/pages/shared/CrossLinks.tsx
git commit -m "CrossLinks: map 4 datepicker ComponentNames to /components/datepickers?variant"
```

---

## Task 12: Smoke test + prettier + final gates + PR

**Files:** (no edits — gates + smoke)

- [ ] **Step 1: Prettier --write everything touched**

```bash
npx prettier --write \
  "packages/playground/src/**/*.{ts,tsx,scss}" \
  "docs/superpowers/specs/2026-05-21-datepicker-unified-demo-design.md" \
  "docs/superpowers/plans/2026-05-21-datepicker-unified-demo.md"
```

- [ ] **Step 2: Run all gates**

```bash
npm test --workspace=@eocrm/design-system --run 2>&1 | tail -5
npm run typecheck
npm run lint:css
npm run build
npx prettier --check "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md"
```

All must be clean. Tests should still be 776/776 (no library changes).

- [ ] **Step 3: Smoke test — start dev server, visit each URL**

```bash
make dev &  # or already running
```

Visit:
- `http://localhost:8080/components/datepickers` → DatePicker tab active
- `http://localhost:8080/components/datepickers?variant=daterangepicker` → DateRangePicker tab active
- `http://localhost:8080/components/datepickers?variant=inline-datepicker` → InlineDatePicker tab active
- `http://localhost:8080/components/datepickers?variant=inline-daterangepicker` → InlineDateRangePicker tab active

Verify on each:
- Page header reads "Date pickers" (not the variant name)
- The tab strip is visible with 4 tabs and the right one is active
- The active panel shows source `<details>` + examples
- "Seen in" cross-links at the bottom resolve correctly

Also navigate from a mockup (e.g., `/mockups/contact-detail`) that uses `DatePicker` — confirm the "Components used: DatePicker" link goes to `/components/datepickers?variant=datepicker`.

- [ ] **Step 4: Commit any prettier fixes**

```bash
git add -A packages/ docs/
git diff --cached --stat
# only commit if there's actual content
git commit -m "Prettier: format unified DatePicker demo files" || echo "no formatting changes"
```

- [ ] **Step 5: Push branch**

```bash
git push -u origin refactor/datepicker-unified-demo
```

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "Playground: unified DatePicker demo page with variant tabs" --body "$(cat <<'EOF'
## Summary

- Collapsed four separate datepicker demo pages into one `/components/datepickers` page driven by a `<Tabs>` strip with URL search-param state (`?variant=datepicker|daterangepicker|inline-datepicker|inline-daterangepicker`).
- Extracted `DemoBody` (header-less core of `DemoLayout`) so multi-variant pages can render one page header + tabs + a shared body shape.
- Each of the four old `<XDemo>` files now exports `<XDemoPanel>` (the DemoBody-based examples-only view) instead of a standalone full-page component.
- `componentPath()` in `CrossLinks` now maps the four datepicker `ComponentName`s to the unified URL with the right `?variant=…` query. Mockup→component cross-links keep working.
- Sidebar: 5 Forms entries → 2 (the four pickers collapse into one "Date pickers" item using `CalendarRange`).
- ComponentsIndex: 4 cards → 1 card.

No library changes; no design-system source touched.

## Test plan

- [x] `npm test --run` — 776/776 (library tests unchanged)
- [x] `npm run typecheck` clean
- [x] `npm run lint:css` clean
- [x] `npm run build` clean
- [x] `npx prettier --check` clean
- [x] Manual smoke: every variant reachable via direct URL (datepickers, ?variant=daterangepicker, etc.)
- [x] Manual smoke: clicking a tab updates the URL and the panel
- [x] Manual smoke: mockup "Components used: DatePicker" link resolves to `/components/datepickers?variant=datepicker`
- [x] Manual smoke: per-panel "Seen in: <mockup>" links resolve

## Design spec / plan

- Spec: `docs/superpowers/specs/2026-05-21-datepicker-unified-demo-design.md`
- Plan: `docs/superpowers/plans/2026-05-21-datepicker-unified-demo.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

Spec coverage:

- §Routing → Task 8.
- §`DemoLayout` split → Task 2.
- §Per-variant panels → Tasks 3–6.
- §New page → Task 7.
- §`componentPath()` extension → Task 11.
- §Sidebar → Task 9.
- §ComponentsIndex → Task 10.
- §Files touched → all tasks combined.
- §Behavior verification → Task 12 smoke test.

Type consistency:

- `Variant` union local to `DatePickersDemo.tsx` (Task 7); never exported.
- `ComponentName` from registry untouched.
- `DemoBodyProps` (Task 2) exposes the same lower-three pieces of `DemoLayoutProps`.

No placeholders. All file paths absolute. Tasks 3–6 are intentionally similar — repeated mechanical refactors, one commit each.
