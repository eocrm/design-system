# EmptyState — design spec

**Date:** 2026-05-22
**Branch:** `feat/empty-state`
**Scope:** New `<EmptyState>` primitive — opinionated "nothing here" container with icon, title, description, and actions slots.

## Goal

A small, opinionated component that paints a consistent "nothing here" treatment across the CRM: vertical Stack of icon → title → description → action(s), token-correct spacing and typography, three sizes for inline / card / hero use.

The job is to **enforce visual consistency** for empty states. Screens that need unusual empty-state layouts shouldn't reach for this component — they should compose their own with `Stack` + `Button`.

## Why now

- DataTable v1 needs an empty state for the "no rows" case (next PR composes this).
- `<Select>`'s `renderEmpty` callback can compose this.
- Mockup screens (empty contacts, empty deals, empty members) all need it.
- Half a dozen screens currently inline this pattern by hand.

## Architecture

```tsx
<EmptyState
  icon={<Inbox size={48} />}
  title="No contacts yet"
  description="Add your first contact to get started."
  actions={<Button>Add contact</Button>}
/>
```

Props-driven (Option A), NOT compound. Reasoning:

- Empty states are visually opinionated — the component's job is consistency, not flexibility.
- All four slots are at fixed positions (icon top, title, description, actions bottom). A compound API doesn't add value.
- Matches Atlassian / Chakra EmptyState patterns.

A `<section>` wrapper with a `<Stack>`-like vertical layout inside. The title becomes an `<h3>` for semantic heading structure (consumer can override the level via the `headingLevel` prop if the surrounding page already has h1/h2/h3).

## Public API

```ts
export type EmptyStateSize = 'sm' | 'md' | 'lg';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * Icon rendered above the title. Pass a lucide icon, custom SVG, or any
   * ReactNode. Sized by the consumer — recommended sizes: sm=24, md=32, lg=48.
   * Omit for an icon-less empty state.
   */
  icon?: ReactNode;

  /**
   * Required title text. Rendered as a heading (default `<h3>`; override
   * via `headingLevel`). Accepts ReactNode so inline emphasis works
   * (e.g., `<>Found <strong>0</strong> results</>`).
   */
  title: ReactNode;

  /**
   * Optional description rendered below the title.
   */
  description?: ReactNode;

  /**
   * Optional action(s) rendered below the description. Typically a `<Button>`
   * or a `<Cluster gap="sm">` of buttons. Aligned with the rest of the
   * content per `align`.
   */
  actions?: ReactNode;

  /**
   * Visual size. Defaults to `'md'`.
   * - `'sm'` — compact for inline / popover use (empty Select results, empty
   *   filter chips). Icon 24px target, font-size-sm title.
   * - `'md'` — default for cards / sections (DataTable empty row, inbox empty).
   *   Icon 32px target, font-size-md title.
   * - `'lg'` — hero / full-page empty states. Icon 48px target, font-size-xl
   *   title.
   */
  size?: EmptyStateSize;

  /**
   * Horizontal alignment of the stacked content. Defaults to `'center'`.
   * - `'center'` — most empty states (centered illustration + text in a card).
   * - `'start'` — left-aligned, when the empty state sits in a tight column
   *   where centering would look stranded.
   */
  align?: 'center' | 'start';

  /**
   * Heading level for the `title`. Defaults to `3` (renders `<h3>`).
   * Set higher (4, 5, 6) when the empty state lives deep inside the
   * page's heading hierarchy. Set to `2` when the empty state IS the
   * page's primary content. Values outside `1-6` clamp to `3`.
   */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}
```

## Visual / tokens

Reuses existing tokens — no new tokens.

| Visual                     | Token / value                                |
| -------------------------- | -------------------------------------------- |
| Icon color                 | `--color-fg-muted`                           |
| Title color                | `--color-fg`                                 |
| Title font (sm)            | `--font-size-sm` semibold                    |
| Title font (md)            | `--font-size-md` semibold                    |
| Title font (lg)            | `--font-size-xl` semibold                    |
| Description color          | `--color-fg-subtle`                          |
| Description font           | `--font-size-sm` (sm) / `--font-size-md` (md, lg) |
| Gap between elements (sm)  | `--space-2`                                  |
| Gap between elements (md)  | `--space-3`                                  |
| Gap between elements (lg)  | `--space-4`                                  |
| Padding (sm)               | `--space-3`                                  |
| Padding (md)               | `--space-6`                                  |
| Padding (lg)               | `--space-10`                                 |

No new tokens. No new keyframes. No new colors.

## A11y

- Title renders as a semantic heading (`<h3>` by default; `headingLevel` prop adjusts). AT users navigate to it via heading shortcuts.
- The outer `<section>` is implicit grouping. Consumer can pass `aria-label` for clarification if needed.
- Icon is decorative (`aria-hidden="true"` is the consumer's choice; we don't add it automatically since the consumer-passed icon may be semantic — e.g., a country flag icon in a "No results for this region" state).
- No `role` set; standard `<section>` semantics suffice.

## File layout

```
packages/design-system/src/components/EmptyState/
  EmptyState.tsx
  EmptyState.module.scss
  EmptyState.test.tsx
  index.ts
```

Top-level `src/index.ts` re-exports `EmptyState`, `EmptyStateProps`, `EmptyStateSize`.

## States

- Default rendering — vertical stack, center-aligned, md size.
- All slots empty except title — still renders (title is the only required prop).
- All slots filled — icon → title → description → actions, with size-dependent gaps and padding.
- `align="start"` — content shifts left, still vertically stacked.

## Tests

- Renders the title as a heading (default h3).
- `headingLevel={2}` renders an h2; values outside 1-6 clamp to 3.
- Icon renders when set; absent when omitted.
- Description renders when set; absent when omitted.
- Actions render when set; absent when omitted.
- `size` applies the right class names for sm / md / lg.
- Defaults to `size="md"`.
- `align="start"` applies the alignment class; default is `center`.
- `ref` forwards to the outer `<section>`.
- `className` merges, does not replace.
- `title` accepts ReactNode (e.g., a `<strong>` inline).

## Playground demo

`EmptyStateDemo.tsx` — 8 examples:

1. **Title only** — minimal use, just `<EmptyState title="No results" />`
2. **With icon** — Inbox icon + title
3. **With icon + description** — adds context paragraph
4. **With icon + description + single action** — the canonical signup-prompt shape
5. **With icon + description + multiple actions** — primary + ghost buttons in a Cluster
6. **Sizes** — sm / md / lg side by side
7. **Align start** — left-aligned variant
8. **Inside Card / Table** — composed inside a `<Card padding="lg">` and a `<Table>` whose `<Table.Body>` shows EmptyState (using `colSpan` on the cell)

## AGENTS.md

Add `<EmptyState>` section in the Display group (or wherever fits between `Calendar` and `Table`).

## Non-goals

- **Illustration assets**. We pass icons through as-is — no bundled illustrations. The CRM's own illustration library (when one exists) plugs into the `icon` slot.
- **Compound subcomponents** (`EmptyState.Icon`, `EmptyState.Title`, etc.). Props-driven is sufficient; consumers needing unusual layouts shouldn't reach for this component.
- **Built-in pagination-style "load more" affordance.** Pagination is its own primitive (next PR). EmptyState is a leaf — it just renders the four slots.
- **Reduced-motion concerns**. No animations in v1.

## Risks / open questions

- **`title: ReactNode` vs `string`** — going with ReactNode for flexibility (inline `<strong>`, `<code>`, count interpolation). The semantic heading still wraps the value; AT reads it as the heading's accessible name. Documented in JSDoc that the consumer should keep the title short and announceable.
- **Heading level conflicts** — defaulting to `<h3>` is the most common case (inside a Card on a page that already has an h1 and h2). When the empty state is the page's primary content, consumer overrides via `headingLevel`. We clamp out-of-range values to 3 to avoid runtime crashes from `headingLevel="7"` typos.
- **No `loading` prop** — if a screen wants to show a Skeleton while loading and an EmptyState when empty, that's two separate render branches in the consumer's code. We don't muddy EmptyState with loading state.
- **No `error` variant either** — for errors, consumers use their own treatment (probably a Banner / Alert component later) or reuse EmptyState with a danger-tinted icon and an error message. Documented as an acceptable workaround in the JSDoc.
