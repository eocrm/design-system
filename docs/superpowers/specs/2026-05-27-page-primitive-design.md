# Page — page-root layout primitive

**Status:** approved (design phase) · **Date:** 2026-05-27 · **Branch:** `feat/page-primitive`

## Problem

Every mockup wraps its content in `<Stack gap="lg">` as the page-root container. Six mockups, identical outer pattern, no shared name. The visual rhythm matters (it's how `PageHeader → Card → Table` sit at 16px gaps), but the wrapper is unnamed — it reads as a layout detail rather than the page-level construct it actually is. Consumer code (the real EOCRM) will hit the same problem.

Adding a dedicated `<Page>` primitive accomplishes three things:

1. **Semantic clarity** at the page-root — `<Page>` reads as "this is a page" instead of "this is a vertical Stack of stuff."
2. **A reserved slot** for future page-level concerns — max-width container, scroll restoration markers, container-query breakpoints, page-level focus management — without churning every consumer when those concerns arrive.
3. **One canonical name** for the page rhythm so future drift (one page using `gap="md"`, another `gap="xl"`) gets caught at code review.

## Goal

Ship `<Page>` — a thin layout primitive in `@eocrm/design-system` that wraps page-root content with the canonical CRM vertical rhythm (`gap="lg"`, i.e. 16px between sections). All six existing mockups adopt it in the same PR.

**Non-goals:**

- Compound API with `Page.Header` / `Page.Footer` subcomponents — flat. PageHeader stays a sibling.
- Auto-wrapping the playground's `<CrossLinks>` footer — playground concern, stays a sibling at the end of mockup children.
- Max-width / page-width constraints — out of scope for the initial version; the reserved slot exists but the prop doesn't.
- Scroll restoration, scroll-to-top, focus management on route change — separate hooks if/when needed.

## Design

### API shape

```tsx
import { Page, PageHeader } from '@eocrm/design-system';

export function Contacts() {
  return (
    <Page>
      <PageHeader>
        <PageHeader.Title>Contacts</PageHeader.Title>
        {/* … */}
      </PageHeader>
      <Card>{/* filters */}</Card>
      <Table>{/* contacts table */}</Table>
    </Page>
  );
}
```

```tsx
// Per-page gap override (rare — only when the default 'lg' doesn't fit)
<Page gap="md">{/* dense dashboard with tighter section rhythm */}</Page>
```

### Types

```tsx
import type { HTMLAttributes, ReactNode } from 'react';
import type { StackGap } from '../Stack';

export type PageGap = StackGap; // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface PageProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Vertical rhythm between top-level page sections. Defaults to
   * `'lg'` (16px) — the canonical CRM page rhythm matching every
   * shipped mockup. Override only for pages with unusual density.
   */
  gap?: PageGap;
  children: ReactNode;
}
```

### Visual anatomy

```
┌─────────────────────────────────────────────┐
│ (page-root container — AppShell content)    │
│ ┌─ <Page> ─────────────────────────────┐    │
│ │ <PageHeader/>                        │    │
│ │   ↕ var(--space-4) (gap = lg)        │    │
│ │ <Card>filters…</Card>                │    │
│ │   ↕ var(--space-4)                   │    │
│ │ <Table/> …                           │    │
│ └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

- **Root** — `<div>` rendered with `display: flex; flex-direction: column; gap: var(--space-*)` keyed off the `gap` prop. No padding (AppShell provides container padding), no background, no max-width.
- **Children** — any ReactNode. PageHeader is conventionally first; the playground's `<CrossLinks>` is conventionally last in mockups.

### Gap mapping (mirrors Stack 1:1)

| `gap` value      | Token       | Pixels |
| ---------------- | ----------- | ------ |
| `xs`             | `--space-1` | 4      |
| `sm`             | `--space-2` | 8      |
| `md`             | `--space-3` | 12     |
| `lg` _(default)_ | `--space-4` | 16     |
| `xl`             | `--space-6` | 24     |
| `2xl`            | `--space-8` | 32     |

### Composition

| Layer          | Built from                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root container | Hand-rolled `<div>` with own `flex-direction: column` + `gap`. Reuses the same gap class scheme as Stack but stays its own primitive (Page-specific page-level concerns can land here without churning Stack). |

### Accessibility

- No forced `role` — Page is a presentational grouping. The real semantic landmark is AppShell's `<main>` further up. Consumers wanting `<Page as="section">` for nested page-like regions are out of scope; Page is `<div>` only.

### File layout

```
packages/design-system/src/components/Page/
  Page.tsx              ← forwardRef + spread + gap class lookup
  Page.module.scss      ← root flex + .gapXs / .gapSm / … (mirrors Stack)
  Page.test.tsx         ← Hard rule 1 + gap propagation + className/spread
  index.ts              ← public re-exports
```

### Public exports

`packages/design-system/src/index.ts`:

```ts
export { Page } from './components/Page';
export type { PageProps, PageGap } from './components/Page';
```

Manifest cluster: `Layout` (sits next to Stack, Cluster, Grid, Card, PageHeader).

### Tests

Per Hard rule 1 minimum + behavior:

- Renders without crashing with default props.
- Renders children in source order.
- `gap` defaults to `'lg'` (rendered class includes `gapLg`).
- Each non-default `gap` value (`xs`, `sm`, `md`, `xl`, `2xl`) maps to its corresponding class.
- `className` merges with the internal class.
- Arbitrary HTML attrs (`data-testid`, etc.) spread onto the root `<div>`.
- `ref` forwards to the underlying `<div>`.

## Demo + cross-link wiring

- Create `packages/playground/src/pages/components/PageDemo.tsx` with `DemoLayout` + `Example` + `InputExample`. Examples (each renders three uniform `<Card padding="md">` stand-ins as children so the gap between them is the visual focus):
  - Default (`gap="lg"`) — the canonical 16px rhythm
  - Compact (`gap="md"`) — same children, tighter rhythm
  - Spacious (`gap="xl"`) — same children, looser rhythm
- Wire into `App.tsx` (`/components/page`), `AppShell.tsx` (Layout cluster), `ComponentsIndex.tsx` overview card.
- Add `'Page'` to the `ComponentName` union in `packages/playground/src/pages/mockups/registry.ts`.
- Add a `Page` section to `packages/design-system/AGENTS.md` (in the Layout cluster, near Stack / Cluster / Grid).

## Mockup migrations (in this PR)

Replace the outer `<Stack gap="lg">` with `<Page>` in all six mockups. The inner content (PageHeader, body sections, CrossLinks at the end) stays identical.

| Mockup              | Outer wrapper before | Outer wrapper after |
| ------------------- | -------------------- | ------------------- |
| `Dashboard.tsx`     | `<Stack gap="lg">`   | `<Page>`            |
| `Contacts.tsx`      | `<Stack gap="lg">`   | `<Page>`            |
| `Deals.tsx`         | `<Stack gap="lg">`   | `<Page>`            |
| `Members.tsx`       | `<Stack gap="lg">`   | `<Page>`            |
| `Audit.tsx`         | `<Stack gap="lg">`   | `<Page>`            |
| `ContactDetail.tsx` | `<Stack gap="lg">`   | `<Page>`            |

Per file:

- Add `Page` to the `@eocrm/design-system` import block alphabetically.
- If `Stack` is no longer used elsewhere in the file (grep first), drop it from the import.
- Update the mockup's `usesComponents` array in `registry.ts`: add `'Page'`; drop `'Stack'` only when no longer imported directly.

## Out of scope

1. **Compound `Page.Header` / `Page.Footer` subcomponents.** PageHeader already exists as its own primitive; bundling it into Page would force a coupling. Footer-like content (CrossLinks in mockups) varies per consumer.
2. **Max-width container constraint.** Real CRM pages today expand to the AppShell content area's width with no max constraint. A `width="md" | "lg" | "wide"` prop can land later when there's a concrete need.
3. **Scroll restoration / focus management.** These are router/lifecycle concerns; PageHeader-related, not Page-internal. A `useScrollToTopOnRouteChange()` hook or similar can land separately.
4. **Polymorphic `as` prop.** Page is `<div>` only. The semantic `<main>` lives in AppShell; nested page-like regions should use `<section>` directly via the consumer.
5. **Background / theming variants.** Page is neutral; theming is a token-level concern.
6. **Built-in error boundary or loading-skeleton state.** Those compose with React's own primitives outside Page.
