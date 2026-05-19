# Playground: split into Mockups and Components, with cross-links

**Status:** approved (design phase) · **Date:** 2026-05-19 · **Branch:** `feat/playground-split-mockups-components`

## Problem

The playground today has two implicit kinds of pages:

1. **Mockup CRM pages** that show what a real product built on `@eocrm/design-system` looks like — Dashboard, Deals, Contacts, Contact detail, Members.
2. **Component demos** under `/demo/*` — Button, Input, Card, Stack, Cluster, Avatar, Badge, Tabs.

The sidebar groups them under "Workspace", "Demo", and "Settings", which obscures the actual split and treats Members as a settings concept it isn't. There is also no link between the two views: looking at a mockup, there is no way to jump to the demo of a component used there; looking at a demo, there is no way to find a realistic mockup that uses it.

## Goal

Make the playground a clear two-section site — **Mockups** and **Components** — with bidirectional cross-links so a reader of either side can find the other.

Non-goal: changing anything inside `@eocrm/design-system` itself. Library API, exports, and tests are untouched.

## Design

### Section model

Two top-level sections:

- **Mockups** — full CRM-like pages. Index at `/mockups`. Each page is a believable screen built only from `@eocrm/design-system` primitives.
- **Components** — one page per shipped library component. Index at `/components`. Same `DemoLayout` + `Example` pattern as today.

Each section has an overview/index page at its root path. The site root `/` redirects to `/mockups`.

### URL scheme

| Section    | Path                          | Notes                                    |
| ---------- | ----------------------------- | ---------------------------------------- |
| Mockups    | `/mockups`                    | new overview grid                        |
|            | `/mockups/dashboard`          | was `/`                                  |
|            | `/mockups/deals`              | was `/deals`                             |
|            | `/mockups/contacts`           | was `/contacts`                          |
|            | `/mockups/contacts/:id`       | was `/contacts/:id`                      |
|            | `/mockups/members`            | was `/members` (was in "Settings" group) |
| Components | `/components`                 | was `/demo` (existing `DemoIndex`)       |
|            | `/components/button`          | was `/demo/button`                       |
|            | `/components/input` … `/tabs` | analogous renames for every demo         |

No redirects from the old paths. The playground is dev-only, never published as a stable URL for consumers, and the deploy URL is the GitHub Pages preview. Hard rename keeps router and nav state simple.

### Cross-link mechanism

Single source of truth: each mockup page declares which library components it uses. The components side derives "Seen in" from that registry.

A single registry module:

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
  slug: string; // 'dashboard'
  title: string; // 'Dashboard'
  path: string; // '/mockups/dashboard'
  blurb: string; // one-line description for the index card
  usesComponents: ComponentName[];
}

export const MOCKUPS: MockupEntry[] = [
  /* … one entry per mockup … */
];

export function mockupsUsing(component: ComponentName): MockupEntry[] {
  return MOCKUPS.filter((m) => m.usesComponents.includes(component));
}
```

Why a central registry vs. per-page exports: the components side needs to enumerate all mockups for a given component; a central array makes that an O(n) filter without dynamic imports. Adding a mockup means appending one entry.

`ComponentName` is a string union over the components that exist as demos. TypeScript catches typos and stale references when a component is renamed or removed.

### Cross-link UI

A shared component `CrossLinks` renders a small footer block on both sides.

- On a **mockup page**, it lists the components used:
  > **Components used:** [Button](/components/button) · [Card](/components/card) · [Avatar](/components/avatar)
- On a **component demo**, it lists mockups that use the component:
  > **Seen in:** [Dashboard](/mockups/dashboard) · [Deals](/mockups/deals)

Both rendered with `Cluster` for spacing, using `Badge`-style chips that link via `NavLink`. The block sits after the main content, separated by a divider.

If a component has zero mockup usages, the demo simply omits the "Seen in" block (no empty state needed). Same on the mockup side: if a slug is missing from the registry (shouldn't happen — it's a dev mistake), `CrossLinks` renders nothing rather than throwing. TypeScript on `slug` as a union of registered slugs (derived via `as const` on `MOCKUPS`) is the realistic guard against drift.

### Sidebar

Two top-level groups replace today's three:

```
MOCKUPS
  Overview          → /mockups
  Dashboard         → /mockups/dashboard
  Deals             → /mockups/deals
  Contacts          → /mockups/contacts
  Members           → /mockups/members

COMPONENTS
  Overview          → /components
  Button            → /components/button
  Input             → /components/input
  Card              → /components/card
  Stack             → /components/stack
  Cluster           → /components/cluster
  Avatar            → /components/avatar
  Badge             → /components/badge
  Tabs              → /components/tabs
```

The "Preferences" placeholder and "Settings" heading go away. They were never functional.

### File layout

Move existing pages and rename `demo/` → `components/`:

```
packages/playground/src/pages/
  mockups/
    registry.ts                  NEW
    MockupsIndex.tsx             NEW (+ MockupsIndex.module.scss)
    Dashboard/                   moved from src/pages/Dashboard
    Deals/                       moved
    Contacts/                    moved
    ContactDetail/               moved
    Members/                     moved
  components/                    renamed from src/pages/demo
    ComponentsIndex.tsx          renamed from DemoIndex.tsx
    ComponentsIndex.module.scss  renamed from DemoIndex.module.scss
    DemoLayout.tsx               kept (name retained — it's a layout primitive)
    Example.tsx                  kept
    CodeBlock.tsx                kept
    ButtonDemo.tsx … TabsDemo.tsx  kept (filenames unchanged)
  shared/
    CrossLinks.tsx               NEW (+ .module.scss)
```

The `demo` filename suffix on `ButtonDemo.tsx` etc. stays — it disambiguates from the library's `Button.tsx` source and matches the existing convention.

`@lib-source/*` Vite alias is unaffected. Demo `?raw` imports of library source still resolve through `vite.config.ts`.

### Mockup page changes

Each mockup page imports its declared components and renders `<CrossLinks kind="mockup" slug="dashboard" />` at the bottom. The component looks the slug up in the registry; the page does not duplicate its own component list at the call site.

### Component demo changes

`DemoLayout` gains an optional prop `componentName?: ComponentName`. When present, it renders `<CrossLinks kind="component" name={componentName} />` after the existing source-code block.

Each `<Name>Demo.tsx` passes `componentName="<Name>"`.

### Index pages

- **`MockupsIndex`** mirrors the existing `DemoIndex` look: card per mockup with title, blurb, and `usesComponents` chips. No live preview thumbnail — mockups are full pages and don't shrink well.
- **`ComponentsIndex`** is the existing `DemoIndex` renamed. No content change beyond updating the heading copy from "Components" / "Demo" to match.

## Testing

This is a structural refactor of a dev-only package with no unit tests today on the playground side. Verification is:

1. `make build` — full typecheck + bundle of the playground passes.
2. `make lint` — Stylelint clean.
3. `make up` — playground runs and:
   - `/` redirects to `/mockups`
   - Every sidebar link in both sections resolves to its page
   - Every mockup page shows a "Components used" block linking into `/components/*`
   - Every component demo with at least one mockup usage shows a "Seen in" block linking into `/mockups/*`
   - Old `/demo/*` and `/deals` etc. URLs 404 (we accept this; documented above)
4. Library tests (`make build-lib` + the design-system Vitest run) are unaffected and pass — sanity check that no library file was touched.

No new automated tests are added for the playground. The cross-link registry is small, hand-maintained, and TypeScript catches the realistic failure modes (typo in a component name, dangling reference).

## Risks and trade-offs

- **Hard URL rename breaks any bookmarks.** Accepted — playground is dev-only and lives behind a GitHub Pages preview, not a stable consumer URL.
- **Central registry can drift from reality.** A mockup could import `Button` without listing it. Mitigation: convention + a follow-up if it becomes painful (e.g., a tiny dev-only assertion that scans imports). Not in scope here.
- **`CrossLinks` is rendered inside mockup pages**, which slightly bends the playground's "mockups look like real screens" goal. Accepted — the footer block is clearly out-of-band (separated by a divider, labelled), and the value of cross-linking outweighs the visual purity. Alternative considered (right-rail) was rejected as more invasive to existing layouts.

## Out of scope

- Library code, exports, tests.
- New component demos. (Existing eight demos move as-is.)
- Visual redesign of mockup pages.
- Any automation that derives `usesComponents` from imports.
- Renaming the `*Demo.tsx` filenames.
