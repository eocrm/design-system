# Card.Header + Card.List + Card.ListRow — design spec

**Date:** 2026-05-24
**Branch:** `feat/card-compound`
**Scope:** Extend Card with three new compound subcomponents to formalize the "card with header + list body" pattern used in `Dashboard.tsx` ("Deals needing attention", "Recent activity"). `<Card.Header>` is a title row with optional right-aligned action + bottom-border separator. `<Card.List>` is a `<ul>` wrapper. `<Card.ListRow>` is one `<li>` with padded content + bottom dividing border.

## Goal

Replace the inline `.cardHeader` / `.cardTitle` / `.list` / `.listRow` SCSS recipes in Dashboard with first-class library primitives. The pattern is common enough (any "section card with a list of rows" page) that promoting it to the library unifies styling and accessibility (proper `<ul>`/`<li>` semantics, heading-level configurability).

## Why now

- Dashboard has TWO sections using this pattern (Deals + Recent activity). The Contacts list page is likely to add similar usage. Open-coded SCSS drifts.
- The semantic `<ul>` for a list of cards is the right ARIA shape — screen readers announce "list with N items". Inline `<div>` rows lose that.
- Card now has compound API surface (`tone` prop just shipped). Adding `.Header` / `.List` / `.ListRow` is the natural next step.

## Non-goals (v1)

- **No clickable-row affordance built into `Card.ListRow`**. Consumers wrap the row content with `<Link>` or `<button>` themselves. Polymorphic `as` prop on ListRow is overkill until a real pattern emerges.
- **No selectable rows / checkboxes**. That's a list/table primitive, not a Card concern.
- **No `Card.Footer`**. Could add later if needed; not in the dashboard.
- **No `Card.Section` for non-list bodies**. Consumers compose with plain children when the body isn't a list. The default `padding` prop still controls the body padding for non-list contents.
- **No collapsible header**. That's Accordion.
- **No header subtitle / metadata slot**. Children handle that — e.g., `<Card.Header><Stack gap="xs"><strong>Title</strong><span>subtitle</span></Stack></Card.Header>`.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- Existing tokens: `--space-2`/`--space-3`/`--space-4`, `--border-width`, `--color-border`, `--font-size-md`, `--font-weight-semibold`, `--color-fg`

No new tokens.

### File layout

```
packages/design-system/src/components/Card/
  Card.tsx              ← MODIFY: add Object.assign for compound + JSDoc updates
  CardHeader.tsx        ← NEW: heading-wrapped title row with action slot
  CardList.tsx          ← NEW: <ul> wrapper
  CardListRow.tsx       ← NEW: <li> row with padded content
  Card.module.scss      ← MODIFY: add .header / .title / .action / .list / .listRow rules
  Card.test.tsx         ← MODIFY: add ~8 cases for the new subcomponents
  index.ts              ← MODIFY: re-export new types
```

### Composition

```
<Card padding="none">
  <Card.Header action={<Link>View all</Link>}>Deals needing attention</Card.Header>
  <Card.List>
    {deals.map(d => (
      <Card.ListRow key={d.id}>
        <Stack>{d.title}</Stack>
        <Avatar name={d.owner} />
      </Card.ListRow>
    ))}
  </Card.List>
</Card>
                          │
                          ▼
       <div class="card paddingNone">
         <div class="header">
           <h3 class="title">Deals needing attention</h3>
           <span class="action"><a>View all</a></span>
         </div>
         <ul class="list">
           <li class="listRow">...</li>
           <li class="listRow">...</li>
         </ul>
       </div>
```

### Compound assembly

```ts
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  List: CardList,
  ListRow: CardListRow,
});
```

## Public API

### Card.Header

```ts
import type { HTMLAttributes, ReactNode } from 'react';

/** Heading level wrapping the title. Defaults to 'h3'. Same vocab as Accordion. */
export type CardHeaderLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Heading level. Defaults to 'h3' (assumes the page above has an h2). */
  headerLevel?: CardHeaderLevel;
  /** Optional right-aligned slot (typically a Link or Button). */
  action?: ReactNode;
  /** Title content. Becomes the inner text of the heading element. */
  children: ReactNode;
}
```

Renders:

```tsx
<div className={styles.header} {...rest}>
  <Heading className={styles.title}>{children}</Heading>
  {action && <span className={styles.action}>{action}</span>}
</div>
```

### Card.List

```ts
export interface CardListProps extends HTMLAttributes<HTMLUListElement> {
  children: ReactNode;
}
```

Renders a bare `<ul>` with list-reset styling.

### Card.ListRow

```ts
export interface CardListRowProps extends HTMLAttributes<HTMLLIElement> {
  children: ReactNode;
}
```

Renders a `<li>` with padded content + bottom dividing border (suppressed on the last child via SCSS `:last-child`).

### Card root (unchanged signature, new compound API)

Existing `<Card>` API is unchanged. `tone`, `padding`, all native attrs work the same. Object.assign adds the three subcomponents.

## Styling — `Card.module.scss` additions

```scss
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--border-width) solid var(--color-border);
}

.title {
  // stylelint-disable-next-line property-disallowed-list -- native heading margin reset
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg);
  min-width: 0;
}

.action {
  flex-shrink: 0;
}

.list {
  list-style: none;
  // stylelint-disable-next-line property-disallowed-list -- native <ul> margin reset
  margin: 0;
  // stylelint-disable-next-line property-disallowed-list -- native <ul> padding reset
  padding: 0;
}

.listRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--border-width) solid var(--color-border);
}

.listRow:last-child {
  border-bottom: 0;
}
```

**Rule 4 check**:

- `.header` and `.listRow` use `display: flex` for internal layout — internal child arrangement, not at the component boundary.
- `.title` has `margin: 0` for native heading reset — documented inline disable, same pattern as Accordion's `.header`.
- `.list` has `margin: 0` and `padding: 0` for native `<ul>` reset — both documented inline disables, same pattern as Breadcrumb's `.list`.
- `.action` has `flex-shrink: 0` — internal child sizing inside `.header`'s flex container, not at the boundary.

## ARIA + behavior reference

| Concern                  | Behavior                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Card.Header element**  | `<div>` wrapping a heading element (h2-h6 configurable via `headerLevel`) + optional action span                                                                    |
| **Card.List element**    | `<ul>` — semantic list, AT announces "list with N items"                                                                                                            |
| **Card.ListRow element** | `<li>` — semantic list item, no role override                                                                                                                       |
| **Heading level**        | Default `h3`. Override via `headerLevel`. Same vocab as Accordion.                                                                                                  |
| **Action region**        | A plain `<span>` wrapper around `action` — no role / no aria. Consumer's action is whatever they pass (typically a Link or Button which carry their own semantics). |
| **Focus**                | None of the new subcomponents are focusable themselves. Interactive children (Link in action, clickable content in rows) carry their own focus.                     |

## Testing

`Card.test.tsx` — add a new `describe('compound API')` block with ~9 cases:

1. `<Card.Header>` renders a `<div>` containing an `<h3>` with the title text (default heading level)
2. `headerLevel="h2"` wraps the title in `<h2>`
3. Header `action` prop renders inside the header (right slot)
4. Header without `action`: no action span in the DOM
5. `<Card.List>` renders a `<ul>` with list-reset styling (no list-style markers)
6. `<Card.ListRow>` renders a `<li>` with content
7. Multiple ListRows: every row except the last has a bottom-border (last child has none)
8. Compound composes: `<Card><Card.Header>T</Card.Header><Card.List><Card.ListRow>R</Card.ListRow></Card.List></Card>` renders the expected DOM tree
9. Header `className` and ListRow `className` merge (not replace) with the component's base classes

## Demo additions — `CardDemo.tsx`

Add 2 new examples:

1. **"Card with header + action + list body"** — the canonical dashboard pattern:

   ```tsx
   <Card padding="none">
     <Card.Header action={<Link variant="muted">View all</Link>}>
       Deals needing attention
     </Card.Header>
     <Card.List>
       <Card.ListRow>...</Card.ListRow>
       <Card.ListRow>...</Card.ListRow>
     </Card.List>
   </Card>
   ```

2. **"Header without action"** — a simpler header-only card:
   ```tsx
   <Card padding="none">
     <Card.Header>Recent activity</Card.Header>
     <Card.List>
       <Card.ListRow>...</Card.ListRow>
     </Card.List>
   </Card>
   ```

## Mockup cleanup (in scope)

`Dashboard.tsx`:

- Replace `<div className={styles.cardHeader}>` with `<Card.Header>` (both sections)
- Replace `<ul className={styles.list}>` with `<Card.List>`
- Replace `<li className={styles.listRow}>` with `<Card.ListRow>`
- The "View all" link becomes the `action` prop on the first header

`Dashboard.module.scss`:

- Delete `.cardHeader`, `.cardTitle`, `.list`, `.listRow` blocks (~30 lines removed)
- Keep `.cardLink`, `.listRowTitle`, `.listRowMeta`, `.activityLine`, `.activityTarget` — these style the content INSIDE the rows, not the row containers themselves

## AGENTS.md update

Extend the existing `<Card>` section TL;DR with the compound API. Show one canonical example with header + list.

## Hard Rule 8

Standard cycle: gates green, fresh-context reviewer, fix Critical + Important, repeat until clean.

## Open questions

None.
