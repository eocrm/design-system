# Playground: Mockups / Components Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the playground into two top-level sections — Mockups and Components — with a registry-driven, bidirectional cross-link between them.

**Architecture:** Move existing mockup pages into `pages/mockups/`, rename `pages/demo/` to `pages/components/`, add a central registry (`pages/mockups/registry.ts`) listing each mockup's components, and a shared `CrossLinks` component rendered from both sides. Routes hard-rename to `/mockups/*` and `/components/*`. Library code is not touched.

**Tech Stack:** React 18, react-router-dom v6, Vite, TypeScript, SCSS Modules, `@eocrm/design-system` (workspace package).

**Spec:** `docs/superpowers/specs/2026-05-19-playground-mockups-components-split-design.md`

**Branch:** `feat/playground-split-mockups-components`

**Verification baseline (run after every task that compiles):**

```bash
cd /home/dpws/projects/design-system
make build   # runs `tsc --noEmit && vite build` for the playground (and typechecks the library indirectly)
```

Expected: completes without TypeScript errors or unresolved imports. The playground has no unit tests; the build is the type/import gate.

---

## Task 1: Move mockup pages into `pages/mockups/`

Folder relocation only. URLs stay the same in this task; only import paths shift. After this task the app still runs on the old URLs.

**Files:**

- Move: `packages/playground/src/pages/Dashboard/` → `packages/playground/src/pages/mockups/Dashboard/`
- Move: `packages/playground/src/pages/Deals/` → `packages/playground/src/pages/mockups/Deals/`
- Move: `packages/playground/src/pages/Contacts/` → `packages/playground/src/pages/mockups/Contacts/`
- Move: `packages/playground/src/pages/ContactDetail/` → `packages/playground/src/pages/mockups/ContactDetail/`
- Move: `packages/playground/src/pages/Members/` → `packages/playground/src/pages/mockups/Members/`
- Modify: each moved `.tsx` file's `'../../data/mock'` import → `'../../../data/mock'`
- Modify: `packages/playground/src/App.tsx` (import paths only — routes untouched)

- [ ] **Step 1: Create the destination directory**

```bash
mkdir -p packages/playground/src/pages/mockups
```

- [ ] **Step 2: Git-move each folder**

```bash
git mv packages/playground/src/pages/Dashboard      packages/playground/src/pages/mockups/Dashboard
git mv packages/playground/src/pages/Deals          packages/playground/src/pages/mockups/Deals
git mv packages/playground/src/pages/Contacts       packages/playground/src/pages/mockups/Contacts
git mv packages/playground/src/pages/ContactDetail  packages/playground/src/pages/mockups/ContactDetail
git mv packages/playground/src/pages/Members        packages/playground/src/pages/mockups/Members
```

- [ ] **Step 3: Fix `data/mock` relative imports (depth changed by one)**

In each of:

- `packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx`
- `packages/playground/src/pages/mockups/Deals/Deals.tsx`
- `packages/playground/src/pages/mockups/Contacts/Contacts.tsx`
- `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx`
- `packages/playground/src/pages/mockups/Members/Members.tsx`

replace:

```ts
from '../../data/mock'
```

with:

```ts
from '../../../data/mock'
```

- [ ] **Step 4: Update import paths in `App.tsx`** (routes still untouched)

In `packages/playground/src/App.tsx` replace lines 3–7:

```tsx
import { Dashboard } from './pages/mockups/Dashboard/Dashboard';
import { Deals } from './pages/mockups/Deals/Deals';
import { Contacts } from './pages/mockups/Contacts/Contacts';
import { ContactDetail } from './pages/mockups/ContactDetail/ContactDetail';
import { Members } from './pages/mockups/Members/Members';
```

- [ ] **Step 5: Verify build**

```bash
make build
```

Expected: completes without errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Move mockup pages into pages/mockups/"
```

---

## Task 2: Rename `pages/demo/` to `pages/components/`, rename index

Same folder-relocation pattern. URLs and routes still unchanged. `DemoIndex` file is renamed; the exported function and the `Demo*` filenames stay (the spec keeps `*Demo.tsx` as the disambiguator from library source files).

**Files:**

- Move: `packages/playground/src/pages/demo/` → `packages/playground/src/pages/components/`
- Rename inside that folder: `DemoIndex.tsx` → `ComponentsIndex.tsx`, `DemoIndex.module.scss` → `ComponentsIndex.module.scss`
- Modify: export name `DemoIndex` → `ComponentsIndex` inside the renamed file (function + module.scss import path)
- Modify: `packages/playground/src/App.tsx` (import paths + the `DemoIndex` → `ComponentsIndex` reference)

- [ ] **Step 1: Git-move the folder**

```bash
git mv packages/playground/src/pages/demo packages/playground/src/pages/components
```

- [ ] **Step 2: Rename DemoIndex files**

```bash
git mv packages/playground/src/pages/components/DemoIndex.tsx          packages/playground/src/pages/components/ComponentsIndex.tsx
git mv packages/playground/src/pages/components/DemoIndex.module.scss  packages/playground/src/pages/components/ComponentsIndex.module.scss
```

- [ ] **Step 3: Rename function + style import inside `ComponentsIndex.tsx`**

In `packages/playground/src/pages/components/ComponentsIndex.tsx`:

- Change `import styles from './DemoIndex.module.scss';` → `import styles from './ComponentsIndex.module.scss';`
- Change `export function DemoIndex()` → `export function ComponentsIndex()`

(Leave the item `to:` URLs as `/demo/*` for now — they're rewritten in Task 6.)

- [ ] **Step 4: Update `App.tsx` imports**

In `packages/playground/src/App.tsx`:

```tsx
import { ComponentsIndex } from './pages/components/ComponentsIndex';
import { ButtonDemo } from './pages/components/ButtonDemo';
import { InputDemo } from './pages/components/InputDemo';
import { CardDemo } from './pages/components/CardDemo';
import { StackDemo } from './pages/components/StackDemo';
import { ClusterDemo } from './pages/components/ClusterDemo';
import { AvatarDemo } from './pages/components/AvatarDemo';
import { BadgeDemo } from './pages/components/BadgeDemo';
import { TabsDemo } from './pages/components/TabsDemo';
```

And change the route element `<DemoIndex />` → `<ComponentsIndex />` (route path is still `/demo` for now).

- [ ] **Step 5: Verify build**

```bash
make build
```

Expected: completes without errors. App still works at old URLs.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Rename pages/demo to pages/components; DemoIndex -> ComponentsIndex"
```

---

## Task 3: Create the mockup registry

Single source of truth for the mockup ↔ component cross-link. Fully populated in this task — no second pass needed.

**Files:**

- Create: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Create `registry.ts`**

```ts
// packages/playground/src/pages/mockups/registry.ts

export type ComponentName =
  | 'Button'
  | 'Input'
  | 'Card'
  | 'Stack'
  | 'Cluster'
  | 'Avatar'
  | 'Badge'
  | 'Tabs';

export interface MockupEntry {
  slug: string;
  title: string;
  path: string;
  blurb: string;
  usesComponents: ComponentName[];
}

export const MOCKUPS = [
  {
    slug: 'dashboard',
    title: 'Dashboard',
    path: '/mockups/dashboard',
    blurb: 'CRM home — KPI cards, pipeline summary, recent activity.',
    usesComponents: ['Card', 'Stack', 'Cluster', 'Avatar', 'Badge', 'Button'],
  },
  {
    slug: 'deals',
    title: 'Deals',
    path: '/mockups/deals',
    blurb: 'Kanban-style pipeline grouped by stage.',
    usesComponents: ['Card', 'Stack', 'Cluster', 'Badge', 'Avatar'],
  },
  {
    slug: 'contacts',
    title: 'Contacts',
    path: '/mockups/contacts',
    blurb: 'Tabular contact list with status chips and quick filters.',
    usesComponents: ['Card', 'Stack', 'Cluster', 'Input', 'Avatar', 'Badge', 'Tabs'],
  },
  {
    slug: 'contact-detail',
    title: 'Contact detail',
    path: '/mockups/contacts/:id',
    blurb: 'Single contact view with tabs and activity feed.',
    usesComponents: ['Card', 'Stack', 'Cluster', 'Avatar', 'Badge', 'Button', 'Tabs'],
  },
  {
    slug: 'members',
    title: 'Members',
    path: '/mockups/members',
    blurb: 'Team & seat management — roles, invites, seat usage.',
    usesComponents: ['Card', 'Stack', 'Cluster', 'Avatar', 'Badge', 'Button', 'Input'],
  },
] as const satisfies readonly MockupEntry[];

export type MockupSlug = (typeof MOCKUPS)[number]['slug'];

export function getMockup(slug: MockupSlug): MockupEntry | undefined {
  return MOCKUPS.find((m) => m.slug === slug);
}

export function mockupsUsing(component: ComponentName): readonly MockupEntry[] {
  return MOCKUPS.filter((m) => m.usesComponents.includes(component));
}
```

Note: `as const satisfies readonly MockupEntry[]` makes `MockupSlug` a literal union so callers can't pass an unknown slug.

- [ ] **Step 2: Verify build**

```bash
make build
```

Expected: passes. Nothing imports `registry.ts` yet but the file must typecheck on its own.

- [ ] **Step 3: Commit**

```bash
git add packages/playground/src/pages/mockups/registry.ts
git commit -m "Add mockups registry for cross-link source of truth"
```

---

## Task 4: Add the `CrossLinks` shared component

Renders the footer block on both mockup pages and component demos.

**Files:**

- Create: `packages/playground/src/pages/shared/CrossLinks.tsx`
- Create: `packages/playground/src/pages/shared/CrossLinks.module.scss`

- [ ] **Step 1: Create the SCSS module**

`packages/playground/src/pages/shared/CrossLinks.module.scss`:

```scss
.wrap {
  border-top: var(--border-width) solid var(--color-border);
  padding-top: var(--space-4);
  margin-top: var(--space-6);
}

.label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-right: var(--space-2);
}

.link {
  font-size: var(--font-size-sm);
  color: var(--color-text-default);
  text-decoration: none;
  border-bottom: var(--border-width) solid var(--color-border);

  &:hover {
    color: var(--color-text-strong);
    border-bottom-color: var(--color-text-strong);
  }
}

.sep {
  color: var(--color-text-muted);
  margin: 0 var(--space-1);
}
```

If any of these token names are missing, fall back to the closest existing token in `packages/design-system/src/styles/tokens.scss` — the file enumerates everything available. Do not introduce raw values.

- [ ] **Step 2: Create the component**

`packages/playground/src/pages/shared/CrossLinks.tsx`:

```tsx
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Cluster } from '@eocrm/design-system';
import {
  type ComponentName,
  type MockupSlug,
  getMockup,
  mockupsUsing,
} from '../mockups/registry';
import styles from './CrossLinks.module.scss';

type Props =
  | { kind: 'mockup'; slug: MockupSlug }
  | { kind: 'component'; name: ComponentName };

function componentPath(name: ComponentName): string {
  return `/components/${name.toLowerCase()}`;
}

export function CrossLinks(props: Props) {
  if (props.kind === 'mockup') {
    const mockup = getMockup(props.slug);
    if (!mockup || mockup.usesComponents.length === 0) return null;

    return (
      <div className={styles.wrap}>
        <Cluster gap="xs" align="center">
          <span className={styles.label}>Components used:</span>
          {mockup.usesComponents.map((name, i) => (
            <Fragment key={name}>
              {i > 0 && <span className={styles.sep}>·</span>}
              <Link to={componentPath(name)} className={styles.link}>
                {name}
              </Link>
            </Fragment>
          ))}
        </Cluster>
      </div>
    );
  }

  const seenIn = mockupsUsing(props.name);
  if (seenIn.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <Cluster gap="xs" align="center">
        <span className={styles.label}>Seen in:</span>
        {seenIn.map((m, i) => (
          <Fragment key={m.slug}>
            {i > 0 && <span className={styles.sep}>·</span>}
            <Link to={m.path.replace(':id', 'c-001')} className={styles.link}>
              {m.title}
            </Link>
          </Fragment>
        ))}
      </Cluster>
    </div>
  );
}
```

Note on `:id`: `contact-detail` has a parameterised path. For the "Seen in" link we point at a concrete id. Verify that `c-001` exists in `packages/playground/src/data/mock.ts`; if not, replace with the first id literally present in `mock.ts`.

- [ ] **Step 3: Confirm the chosen contact id exists**

```bash
grep -nE "id:\s*'c-001'" packages/playground/src/data/mock.ts
```

Expected: at least one match. If zero matches, find any id in `mock.ts`:

```bash
grep -nE "id:\s*'c-" packages/playground/src/data/mock.ts | head -1
```

and substitute that literal into the `.replace(':id', '<that-id>')` call.

- [ ] **Step 4: Verify build**

```bash
make build
```

Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/shared/
git commit -m "Add CrossLinks shared component"
```

---

## Task 5: Create `MockupsIndex` page

Overview card grid mirroring `ComponentsIndex`. Driven by `MOCKUPS`. No live preview thumbnails (spec).

**Files:**

- Create: `packages/playground/src/pages/mockups/MockupsIndex.tsx`
- Create: `packages/playground/src/pages/mockups/MockupsIndex.module.scss`

- [ ] **Step 1: Create the SCSS module**

`packages/playground/src/pages/mockups/MockupsIndex.module.scss`:

```scss
.eyebrow {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  font-weight: 600;
}

.title {
  font-size: var(--font-size-3xl);
  font-weight: 600;
  margin: var(--space-1) 0 var(--space-2);
  color: var(--color-text-strong);
}

.description {
  font-size: var(--font-size-md);
  color: var(--color-text-muted);
  max-width: 60ch;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.card {
  display: block;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: var(--border-width) solid var(--color-border);
  background: var(--color-bg-default);
  color: var(--color-text-default);
  text-decoration: none;
  transition: border-color 120ms ease, transform 120ms ease;

  &:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-1px);
  }
}

.cardName {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-strong);
}

.cardBlurb {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

.chips {
  margin-top: var(--space-3);
}
```

Same fallback rule on token names as Task 4.

- [ ] **Step 2: Create the page**

`packages/playground/src/pages/mockups/MockupsIndex.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Badge, Cluster, Stack } from '@eocrm/design-system';
import { MOCKUPS } from './registry';
import styles from './MockupsIndex.module.scss';

export function MockupsIndex() {
  // Skip the parameterised contact-detail entry from the index — it isn't a top-level page.
  const indexMockups = MOCKUPS.filter((m) => !m.path.includes(':'));

  return (
    <Stack gap="lg">
      <header>
        <span className={styles.eyebrow}>Mockups</span>
        <h1 className={styles.title}>CRM mockups</h1>
        <p className={styles.description}>
          Full-page mockups built only from <code>@eocrm/design-system</code> primitives. Each
          page links the components it uses, and each component links back to the mockups it
          appears in.
        </p>
      </header>

      <div className={styles.grid}>
        {indexMockups.map((m) => (
          <Link key={m.slug} to={m.path} className={styles.card}>
            <div className={styles.cardName}>{m.title}</div>
            <p className={styles.cardBlurb}>{m.blurb}</p>
            <Cluster gap="xs" className={styles.chips}>
              {m.usesComponents.map((name) => (
                <Badge key={name} tone="info">
                  {name}
                </Badge>
              ))}
            </Cluster>
          </Link>
        ))}
      </div>
    </Stack>
  );
}
```

If `Cluster` does not accept a `className` prop, wrap the chips in a `<div className={styles.chips}>` and put the `Cluster` inside without a className. Check `packages/design-system/src/components/Cluster/Cluster.tsx` if uncertain.

- [ ] **Step 3: Verify build**

```bash
make build
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/pages/mockups/MockupsIndex.tsx packages/playground/src/pages/mockups/MockupsIndex.module.scss
git commit -m "Add MockupsIndex page"
```

---

## Task 6: Switch routes, sidebar, and intra-page links to new URLs

This is the cut-over. After this task, `/demo/*` and old root-level URLs 404; everything goes through `/mockups/*` and `/components/*`.

**Files:**

- Modify: `packages/playground/src/App.tsx` (routes)
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` (nav arrays + sections)
- Modify: `packages/playground/src/pages/mockups/Contacts/Contacts.tsx` (Link `to={`/contacts/${c.id}`}` → `/mockups/contacts/${c.id}`)
- Modify: `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx` (`<Navigate to="/contacts" />` and `<Link to="/contacts">` → `/mockups/contacts`)
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` (each item `to: '/demo/X'` → `to: '/components/X'`)

- [ ] **Step 1: Rewrite `App.tsx` routes**

Replace the entire `App.tsx` body with:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { MockupsIndex } from './pages/mockups/MockupsIndex';
import { Dashboard } from './pages/mockups/Dashboard/Dashboard';
import { Deals } from './pages/mockups/Deals/Deals';
import { Contacts } from './pages/mockups/Contacts/Contacts';
import { ContactDetail } from './pages/mockups/ContactDetail/ContactDetail';
import { Members } from './pages/mockups/Members/Members';
import { ComponentsIndex } from './pages/components/ComponentsIndex';
import { ButtonDemo } from './pages/components/ButtonDemo';
import { InputDemo } from './pages/components/InputDemo';
import { CardDemo } from './pages/components/CardDemo';
import { StackDemo } from './pages/components/StackDemo';
import { ClusterDemo } from './pages/components/ClusterDemo';
import { AvatarDemo } from './pages/components/AvatarDemo';
import { BadgeDemo } from './pages/components/BadgeDemo';
import { TabsDemo } from './pages/components/TabsDemo';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/mockups" replace />} />

          <Route path="/mockups" element={<MockupsIndex />} />
          <Route path="/mockups/dashboard" element={<Dashboard />} />
          <Route path="/mockups/deals" element={<Deals />} />
          <Route path="/mockups/contacts" element={<Contacts />} />
          <Route path="/mockups/contacts/:id" element={<ContactDetail />} />
          <Route path="/mockups/members" element={<Members />} />

          <Route path="/components" element={<ComponentsIndex />} />
          <Route path="/components/button" element={<ButtonDemo />} />
          <Route path="/components/input" element={<InputDemo />} />
          <Route path="/components/card" element={<CardDemo />} />
          <Route path="/components/stack" element={<StackDemo />} />
          <Route path="/components/cluster" element={<ClusterDemo />} />
          <Route path="/components/avatar" element={<AvatarDemo />} />
          <Route path="/components/badge" element={<BadgeDemo />} />
          <Route path="/components/tabs" element={<TabsDemo />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Update sidebar in `AppShell.tsx`**

In `packages/playground/src/layout/AppShell/AppShell.tsx`:

Replace the three nav arrays (`navItems`, `demoItems`, `settingsItems`) with two:

```tsx
const mockupItems = [
  { to: '/mockups', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/mockups/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/mockups/deals', label: 'Deals', icon: KanbanSquare, end: false },
  { to: '/mockups/contacts', label: 'Contacts', icon: Users, end: false },
  { to: '/mockups/members', label: 'Members', icon: UserCog, end: false },
];

const componentItems = [
  { to: '/components', label: 'Overview', icon: Component, end: true },
  { to: '/components/button', label: 'Button', icon: MousePointer2, end: false },
  { to: '/components/input', label: 'Input', icon: TextCursorInput, end: false },
  { to: '/components/card', label: 'Card', icon: RectangleHorizontal, end: false },
  { to: '/components/stack', label: 'Stack', icon: Rows3, end: false },
  { to: '/components/cluster', label: 'Cluster', icon: Columns3, end: false },
  { to: '/components/avatar', label: 'Avatar', icon: CircleUser, end: false },
  { to: '/components/badge', label: 'Badge', icon: Tag, end: false },
  { to: '/components/tabs', label: 'Tabs', icon: PanelTop, end: false },
];
```

Note: the Mockups "Overview" reuses `LayoutDashboard` as a section icon. If you want a different icon (e.g. `Layers` from lucide-react), import and substitute. The Dashboard child can keep `LayoutDashboard` or switch to `Home`.

Replace the three `<div className={styles.navSection}>` blocks + the `Preferences` `<a>` with two:

```tsx
<nav className={styles.nav}>
  <div className={styles.navSection}>Mockups</div>
  {mockupItems.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  ))}

  <div className={styles.navSection}>Components</div>
  {componentItems.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  ))}
</nav>
```

Drop the now-unused `Settings` import and `settingsItems`. Drop the `Preferences` `<a>` entirely.

- [ ] **Step 3: Update intra-mockup links**

In `packages/playground/src/pages/mockups/Contacts/Contacts.tsx`:

Replace both occurrences:

```tsx
<Link to={`/contacts/${c.id}`} ...>
```

with:

```tsx
<Link to={`/mockups/contacts/${c.id}`} ...>
```

In `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx`:

- `<Navigate to="/contacts" replace />` → `<Navigate to="/mockups/contacts" replace />`
- `<Link to="/contacts">Contacts</Link>` → `<Link to="/mockups/contacts">Contacts</Link>`

- [ ] **Step 4: Update `ComponentsIndex` item paths**

In `packages/playground/src/pages/components/ComponentsIndex.tsx`, change every `to: '/demo/X'` to `to: '/components/X'`. Eight occurrences.

Also update the header copy:

```tsx
<span className={styles.eyebrow}>Components</span>
<h1 className={styles.title}>Component library</h1>
```

(`eyebrow` was previously `Demo`.)

- [ ] **Step 5: Verify build**

```bash
make build
```

Expected: passes.

- [ ] **Step 6: Manual smoke**

```bash
make dev
```

Open `http://localhost:8080/` and verify:

- `/` redirects to `/mockups`
- Every sidebar item in both groups resolves to a page (no 404 / no blank content)
- From `/mockups/contacts` clicking a row opens `/mockups/contacts/<id>`
- From `/mockups/contacts/<id>` the "Contacts" breadcrumb returns to `/mockups/contacts`

Kill the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Switch playground to /mockups/* and /components/* routes"
```

---

## Task 7: Add `componentName` prop to `DemoLayout` and render `CrossLinks`

**Files:**

- Modify: `packages/playground/src/pages/components/DemoLayout.tsx`

- [ ] **Step 1: Add the prop and render**

In `packages/playground/src/pages/components/DemoLayout.tsx`:

Add to imports:

```tsx
import { CrossLinks } from '../shared/CrossLinks';
import type { ComponentName } from '../mockups/registry';
```

Extend the props interface:

```tsx
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
```

Destructure it:

```tsx
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
```

Render `CrossLinks` after the `<Stack gap="xl">{children}</Stack>` (still inside the outer `Stack gap="lg"`):

```tsx
<h2 className={styles.sectionTitle}>Examples</h2>
<Stack gap="xl">{children}</Stack>

{componentName && <CrossLinks kind="component" name={componentName} />}
</Stack>
```

Prop is optional so unwired demos still compile.

- [ ] **Step 2: Verify build**

```bash
make build
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/playground/src/pages/components/DemoLayout.tsx
git commit -m "DemoLayout: accept componentName, render CrossLinks footer"
```

---

## Task 8: Wire `componentName` into every component demo

Eight one-line edits.

**Files:**

- Modify: `packages/playground/src/pages/components/ButtonDemo.tsx`
- Modify: `packages/playground/src/pages/components/InputDemo.tsx`
- Modify: `packages/playground/src/pages/components/CardDemo.tsx`
- Modify: `packages/playground/src/pages/components/StackDemo.tsx`
- Modify: `packages/playground/src/pages/components/ClusterDemo.tsx`
- Modify: `packages/playground/src/pages/components/AvatarDemo.tsx`
- Modify: `packages/playground/src/pages/components/BadgeDemo.tsx`
- Modify: `packages/playground/src/pages/components/TabsDemo.tsx`

- [ ] **Step 1: Add `componentName` to each `<DemoLayout>` opening tag**

In each file, find the `<DemoLayout` opening and add a `componentName` prop matching the exported name. Example for `ButtonDemo.tsx`:

```tsx
<DemoLayout
  name="Button"
  description="..."
  tsxSource={tsxSource}
  scssSource={scssSource}
  tsxFilename="Button.tsx"
  scssFilename="Button.module.scss"
  componentName="Button"
>
```

Repeat for: `componentName="Input"`, `"Card"`, `"Stack"`, `"Cluster"`, `"Avatar"`, `"Badge"`, `"Tabs"`.

- [ ] **Step 2: Verify build**

```bash
make build
```

Expected: passes. TypeScript will fail if any name typo is not in `ComponentName`.

- [ ] **Step 3: Commit**

```bash
git add packages/playground/src/pages/components/
git commit -m "Wire componentName into every component demo"
```

---

## Task 9: Add `CrossLinks` to every mockup page

Five mockup pages, each gets `<CrossLinks kind="mockup" slug="<slug>" />` at the very end of its rendered tree.

**Files:**

- Modify: `packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx`
- Modify: `packages/playground/src/pages/mockups/Deals/Deals.tsx`
- Modify: `packages/playground/src/pages/mockups/Contacts/Contacts.tsx`
- Modify: `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx`
- Modify: `packages/playground/src/pages/mockups/Members/Members.tsx`

- [ ] **Step 1: Add the import + footer to each page**

In each mockup `.tsx`, add at the top of the imports:

```tsx
import { CrossLinks } from '../../shared/CrossLinks';
```

(Two `../` because the file lives in `pages/mockups/<Name>/<Name>.tsx`.)

Each page's top-level render is a single `Stack` or `<>`. Add `<CrossLinks kind="mockup" slug="<slug>" />` as the last child:

| File                                          | `slug`             |
| --------------------------------------------- | ------------------ |
| `mockups/Dashboard/Dashboard.tsx`             | `"dashboard"`      |
| `mockups/Deals/Deals.tsx`                     | `"deals"`          |
| `mockups/Contacts/Contacts.tsx`               | `"contacts"`       |
| `mockups/ContactDetail/ContactDetail.tsx`     | `"contact-detail"` |
| `mockups/Members/Members.tsx`                 | `"members"`        |

Example for `Dashboard.tsx` — the existing render is a `Stack`; append the cross-link block as the last child:

```tsx
return (
  <Stack gap="lg">
    {/* existing content unchanged */}
    <CrossLinks kind="mockup" slug="dashboard" />
  </Stack>
);
```

For `ContactDetail.tsx`, the early `Navigate` returns before the cross-link is reached — that's intentional. Place the `CrossLinks` only inside the main "found contact" return block.

- [ ] **Step 2: Verify build**

```bash
make build
```

Expected: passes. TypeScript will reject any slug not in the `MockupSlug` union.

- [ ] **Step 3: Manual smoke**

```bash
make dev
```

- Visit each `/mockups/*` page and confirm the "Components used:" footer renders with at least one link.
- Visit each `/components/*` page and confirm the "Seen in:" footer renders. (Every component appears in at least one mockup per the registry, so none should be empty.)
- Click a link from each side and confirm it navigates correctly.

Kill the dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Render CrossLinks footer on every mockup page"
```

---

## Task 10: Update playground `CLAUDE.md`

Reflect the new section split and paths so future agents follow the new convention.

**Files:**

- Modify: `packages/playground/CLAUDE.md`

- [ ] **Step 1: Update the rules**

Apply these substitutions across `packages/playground/CLAUDE.md`:

- "Hard rules / 1. Every library component has a demo page here" — change the path from `src/pages/demo/<Name>Demo.tsx` to `src/pages/components/<Name>Demo.tsx`.
- "Rule 3. Demo pages follow the `DemoLayout` + `Example` pattern" — add `componentName="<Name>"` to the example snippet's `<DemoLayout>` props.
- "Rule 4. Wire new demos into three places" — replace with **four** places:
  1. `src/App.tsx` — add `<Route path="/components/<name>" element={<<Name>Demo />} />`
  2. `src/layout/AppShell/AppShell.tsx` — add to the `componentItems` array
  3. `src/pages/components/ComponentsIndex.tsx` — add a card to the overview grid with a small live preview
  4. `src/pages/mockups/registry.ts` — extend the `ComponentName` union (and add the component to any mockup that uses it)
- Add a new top-level section "Mockups vs. Components" explaining: mockups live under `pages/mockups/`, components under `pages/components/`, cross-links are driven by `pages/mockups/registry.ts`.
- Routing section: the line about `BrowserRouter` and `basename` is still correct — no change.

- [ ] **Step 2: Commit**

```bash
git add packages/playground/CLAUDE.md
git commit -m "Update playground CLAUDE.md for mockups/components split"
```

---

## Task 11: Final verification, push, open PR

- [ ] **Step 1: Run the full quality gate**

```bash
cd /home/dpws/projects/design-system
make build
make lint
```

Expected:

- `make build` completes (typechecks library and bundles playground).
- `make lint` reports zero Stylelint errors.

If `make lint` fires `scale-unlimited/declaration-strict-value` on any new SCSS, the file uses a raw value where a token belongs — replace with the token before continuing.

- [ ] **Step 2: Manual final smoke**

```bash
make up
```

Walk through:

1. `/` → redirects to `/mockups` and the overview grid lists Dashboard, Deals, Contacts, Members.
2. Every sidebar link in both Mockups and Components groups resolves.
3. Every mockup page shows "Components used:" with links into `/components/*`.
4. Every component demo shows "Seen in:" with links into `/mockups/*`.
5. Old paths: visit `/contacts` and `/demo/button` directly — expect blank content / no matching route. Acceptable per spec; the only intentional carry-over is `/` → `/mockups`.

Kill the dev server.

- [ ] **Step 3: Push branch**

```bash
git push -u origin feat/playground-split-mockups-components
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "Split playground into Mockups and Components, with cross-links" --body "$(cat <<'EOF'
## Summary
- Restructure playground into two top-level sections: **Mockups** (`/mockups/*`) and **Components** (`/components/*`).
- Add a central registry (`pages/mockups/registry.ts`) declaring which library components each mockup uses.
- Add a shared `CrossLinks` footer that renders on both sides, derived from the registry — single source of truth.
- Hard URL rename: old `/demo/*` and bare root routes are not redirected (dev-only playground).
- Library code, exports, and tests are untouched.

Spec: `docs/superpowers/specs/2026-05-19-playground-mockups-components-split-design.md`
Plan: `docs/superpowers/plans/2026-05-19-playground-mockups-components-split.md`

## Test plan
- [ ] CI `Quality / check` passes
- [ ] `make build` and `make lint` locally green
- [ ] `/` redirects to `/mockups`
- [ ] Every Mockups page shows "Components used:" with at least one working link
- [ ] Every Components demo shows "Seen in:" with at least one working link
- [ ] Sidebar shows exactly two sections (Mockups, Components) with overviews
EOF
)"
```

- [ ] **Step 5: Wait for CI and merge per the repo's PR workflow**

Per repo `CLAUDE.md`: wait for the `Quality / check` status check, then squash-or-merge at the user's discretion.

---

## Self-review (run after writing this plan, before handoff)

**Spec coverage check:**

| Spec section                                       | Implemented by         |
| -------------------------------------------------- | ---------------------- |
| Two top-level sections (Mockups, Components)       | Task 6 (sidebar)       |
| `/` redirects to `/mockups`                        | Task 6                 |
| URL scheme (`/mockups/*`, `/components/*`)         | Task 6                 |
| `mockups/registry.ts` central registry             | Task 3                 |
| Bidirectional cross-link via `CrossLinks`          | Tasks 4, 7, 8, 9       |
| File layout (`pages/mockups/`, `pages/components/`)| Tasks 1, 2             |
| `MockupsIndex` mirroring `ComponentsIndex`         | Task 5                 |
| `DemoLayout` keeps name; gets `componentName` prop | Task 7                 |
| Members moves out of Settings group                | Task 6 (no settings)   |
| No library changes                                 | none touch the library |
| No new playground tests                            | none added             |
| Updated playground CLAUDE.md                       | Task 10                |
| Verification = `make build` + `make lint` + manual | Task 11                |

All spec sections traced to a task.

**Placeholder scan:** No "TBD", "TODO", or "fill in details" left. The one piece of conditional logic ("if `Cluster` doesn't accept `className`, wrap in a div") is a verifiable instruction with an exact file to consult, not a placeholder.

**Type consistency:** `ComponentName`, `MockupSlug`, `MockupEntry`, `MOCKUPS`, `getMockup`, `mockupsUsing`, `CrossLinks`, `componentName` — all spelled the same way everywhere. The `:id` substitution in `CrossLinks` uses a contact id verified against `mock.ts` in Task 4 Step 3.
