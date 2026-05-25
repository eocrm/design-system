# DefinitionList component — design spec

**Date:** 2026-05-25
**Component:** `<DefinitionList>` (compound)
**Motivation:** Replace the hand-rolled `<Field>` helper in `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx` (currently sitting inside `<Card.List>` after PR #68's mockup refactor) with a properly semantic primitive whose value-side supports a leading icon.

## Why a new primitive

`<Card.List>` + `<Card.ListRow>` renders `<ul>/<li>` — generic list semantics. Property panels show **key / value pairs**, for which HTML provides `<dl>/<dt>/<dd>` — screen readers announce the term-definition relationship natively. Hand-rolling that semantic inside Card.List requires divs and aria attributes the library shouldn't ask consumers to invent.

Concrete repeated pattern across CRM screens:

- Contact properties (Email / Phone / Company / Location with lucide icons)
- Settings forms (label / value pairs, sometimes stacked instead of side-by-side)
- Sidebar panels showing entity metadata (created date, owner, tags, etc.)
- Read-only summary cards

The lucide-icon-on-value pattern repeats anywhere a CRM shows entity properties. Centralizing it removes an inline `<Cluster gap="sm">` wrapper everywhere.

## HTML / semantics

```html
<dl>
  <div>
    <!-- DefinitionList.Item, HTML5-sanctioned grouper -->
    <dt>Email</dt>
    <!-- DefinitionList.Term -->
    <dd>
      <!-- DefinitionList.Description -->
      <span aria-hidden>📬</span>
      foo@bar.com
    </dd>
  </div>
  <!-- more items -->
</dl>
```

The wrapping `<div>` is structural-only. HTML5 explicitly permits `<div>` as a direct child of `<dl>` to group a `<dt>` with its `<dd>(s)` — the exact use case here. Screen readers ignore the `<div>` for ARIA purposes and announce term/description pairs from `<dt>/<dd>` directly. No `aria-labelledby` or role overrides needed.

The icon on `<dd>` is wrapped in an `aria-hidden` span: it's decorative; the `<dt>` already carries the semantic label.

## API surface

Compound component, row-grouped — `<DefinitionList.Item>` explicitly wraps each term-description pair.

```tsx
<DefinitionList
  layout?: 'horizontal' | 'stacked'    // default 'horizontal'
  termWidth?: string                   // CSS length; default 'max-content'
  spacing?: 'sm' | 'md' | 'lg'         // vertical padding per item; default 'md'
  dividers?: boolean                   // border-bottom between items; default false
  className?: string
  ...HTMLAttributes<HTMLDListElement>  // <dl> spread
>
  <DefinitionList.Item
    className?: string
    ...HTMLAttributes<HTMLDivElement>  // <div> grouper spread
  >
    <DefinitionList.Term
      className?: string
      ...HTMLAttributes<HTMLElement>   // <dt> spread
    >
      Email
    </DefinitionList.Term>
    <DefinitionList.Description
      icon?: ReactNode                 // leading icon, rendered inside <dd> before children
      className?: string
      ...HTMLAttributes<HTMLElement>   // <dd> spread
    >
      foo@bar.com
    </DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>
```

**Spread pattern**: A (props last, consumer wins) — matches `Card`, `Stack`, `Cluster`, `Grid`.

**Object.assign compound**:

```tsx
export const DefinitionList = Object.assign(DefinitionListRoot, {
  Item: DefinitionListItem,
  Term: DefinitionListTerm,
  Description: DefinitionListDescription,
});
```

**Children validation**: in dev (NODE_ENV !== 'production'), the root iterates `Children.toArray` (with the `flattenChildren` helper to unwrap one level of Fragments) and `console.warn`s when any direct child isn't a `DefinitionListItem`. Production builds skip the check. Matches the PageHeader pattern (see `packages/design-system/src/components/PageHeader/PageHeader.tsx`'s `BackButton` dev warnings for the canonical implementation).

## Default rationale

| Prop        | Default                   | Why                                                                                                           |
| ----------- | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `layout`    | `'horizontal'`            | Matches the driving ContactDetail use case                                                                    |
| `termWidth` | undefined → `max-content` | Auto-size to the longest term; no guessing                                                                    |
| `spacing`   | `'md'`                    | Matches Card.ListRow's vertical rhythm so the ContactDetail.About migration doesn't visually shift            |
| `dividers`  | `false`                   | Clean default — matches Bootstrap / Tailwind / Mantine dl conventions; ContactDetail.About explicitly opts in |

## Layout mechanics

### Horizontal — CSS grid + `display: contents`

```scss
.list[data-layout='horizontal'] {
  display: grid;
  grid-template-columns: var(--dl-term-width, max-content) 1fr;
  column-gap: var(--space-4);
}

.item {
  display: contents;
}
```

The wrapping `<div>` produces no box; the `<dt>` and `<dd>` directly participate in the dl's grid. All terms align in column 1, all descriptions in column 2 — column 1 auto-sizes to the longest term across all rows. `termWidth` prop sets `--dl-term-width` via inline style on the root (one of the few places a component is allowed to set its own CSS variable via style, since the prop value is the user's input).

`display: contents` is supported in Chrome 102+, Firefox 95+, Safari 11.1+ — well past the library's browser baseline in 2026.

### Stacked — flex column

```scss
.list[data-layout='stacked'] {
  display: flex;
  flex-direction: column;
}

.list[data-layout='stacked'] .item {
  // term stacks above description naturally as <dt> + <dd>
}
```

In stacked mode the `<div>` is a normal flex item; its children flow normally (dt above dd by source order).

### Description icon

Inside `<DefinitionList.Description>`:

```tsx
<dd className={styles.description}>
  {icon && (
    <span className={styles.icon} aria-hidden>
      {icon}
    </span>
  )}
  {children}
</dd>
```

`.description` is `display: flex; align-items: center; gap: var(--space-2)` so the icon sits inline before the value text with consistent spacing.

### Spacing

Per-item vertical padding controlled by the root's `spacing` prop, applied via `data-spacing` on the root (consistent with `data-layout` already used in the SCSS sketches above):

| spacing | padding-block                                                       |
| ------- | ------------------------------------------------------------------- |
| `sm`    | `var(--space-2)`                                                    |
| `md`    | `var(--space-3)` (default — matches Card.ListRow's vertical rhythm) |
| `lg`    | `var(--space-4)`                                                    |

Padding sits on the `<dt>` and `<dd>` directly (because `<div>` is `display: contents` in horizontal mode and has no box).

### Dividers

When `dividers` is true, every item except the first gets `border-top: var(--border-width) solid var(--color-border)` on its `<dt>` and `<dd>` (same reason as spacing — the div is contents). In stacked mode, the border goes on the `.item` element itself since it has a box.

## Files

```
packages/design-system/src/components/DefinitionList/
  DefinitionList.tsx              ← Root + Item + Term + Description + Object.assign + flattenChildren helper
  DefinitionList.module.scss      ← grid + flex layouts + icon styles + dividers
  DefinitionList.test.tsx         ← ~12 unit cases
  index.ts                        ← barrel
```

## Public exports (library `src/index.ts`)

```ts
export { DefinitionList } from './components/DefinitionList';
export type {
  DefinitionListProps,
  DefinitionListLayout,
  DefinitionListSpacing,
  DefinitionListItemProps,
  DefinitionListTermProps,
  DefinitionListDescriptionProps,
} from './components/DefinitionList';
```

## Tests (Vitest + React Testing Library)

The structure test (`src/structure.test.ts`) enforces 4 files per component dir, so all four files exist from task 1.

Twelve unit cases:

1. Renders `<dl>` with default props (no crash, correct tag).
2. `ref` forwards to the underlying `<dl>` node.
3. `className` from props merges with the internal class (not replaces).
4. Item renders as `<div>`, Term as `<dt>`, Description as `<dd>` (verify via `tagName`).
5. Description renders icon before children, wrapped in `aria-hidden` `<span>`.
6. Description renders correctly without `icon` prop (no extra wrapper span).
7. `layout='horizontal'` applies the horizontal layout class / data-attribute.
8. `layout='stacked'` applies the stacked layout class / data-attribute.
9. `termWidth='180px'` sets the `--dl-term-width` CSS variable inline on the root.
10. `spacing='sm' | 'md' | 'lg'` each apply the correct class.
11. `dividers` prop applies the divider modifier class.
12. Dev-only warning fires (via `vi.spyOn(console, 'warn')`) when a direct child isn't a `DefinitionList.Item`; production build (or matching `process.env.NODE_ENV === 'production'`) does not warn.

Two extra robustness cases:

13. Empty list (no items) renders `<dl>` without crashing.
14. Multiple Items render in source order (DOM order matches JSX order).

## Migration: ContactDetail.About (same PR)

Currently (after PR #68):

```tsx
<Card>
  <Card.Header headerLevel="h2">About</Card.Header>
  <Card.List>
    <Field label="Email" value={contact.email} icon={<Mail size={14} />} />
    <Field label="Phone" value="+1 (415) 555-0142" icon={<Phone size={14} />} />
    <Field label="Company" value={contact.company} icon={<Building size={14} />} />
    <Field label="Location" value="San Francisco, CA" icon={<MapPin size={14} />} />
  </Card.List>
</Card>
```

After:

```tsx
<Card>
  <Card.Header headerLevel="h2">About</Card.Header>
  <DefinitionList dividers>
    <DefinitionList.Item>
      <DefinitionList.Term>Email</DefinitionList.Term>
      <DefinitionList.Description icon={<Mail size={14} />}>
        {contact.email}
      </DefinitionList.Description>
    </DefinitionList.Item>
    <DefinitionList.Item>
      <DefinitionList.Term>Phone</DefinitionList.Term>
      <DefinitionList.Description icon={<Phone size={14} />}>
        +1 (415) 555-0142
      </DefinitionList.Description>
    </DefinitionList.Item>
    <DefinitionList.Item>
      <DefinitionList.Term>Company</DefinitionList.Term>
      <DefinitionList.Description icon={<Building size={14} />}>
        {contact.company}
      </DefinitionList.Description>
    </DefinitionList.Item>
    <DefinitionList.Item>
      <DefinitionList.Term>Location</DefinitionList.Term>
      <DefinitionList.Description icon={<MapPin size={14} />}>
        San Francisco, CA
      </DefinitionList.Description>
    </DefinitionList.Item>
  </DefinitionList>
</Card>
```

Delete the co-located `Field` helper. Update `packages/playground/src/pages/mockups/registry.ts` to add `DefinitionList` to `contact-detail.usesComponents` (alphabetical insert).

The `dividers` prop on the new primitive preserves the row-separator look that the previous `Card.List` rendered. No visual regression.

## Playground demo

New demo file: `packages/playground/src/pages/components/DefinitionListDemo.tsx`. Five examples:

1. **Horizontal** — contact-properties pattern with icons (the canonical case).
2. **Horizontal with explicit `termWidth`** — show width override.
3. **Horizontal with `dividers`** — the ContactDetail.About variant.
4. **Stacked** — settings-page pattern (no icons, longer descriptions).
5. **Mixed content in dd** — Badge + Text + Link inside a Description, demonstrating the ReactNode children type.

Wiring (4 places per playground CLAUDE.md):

1. `src/App.tsx` — route `/components/definition-list`.
2. `src/layout/AppShell/AppShell.tsx` — add to the `Display` component group (lucide icon: `List`).
3. `src/pages/components/ComponentsIndex.tsx` — overview card with mini preview.
4. `src/pages/mockups/registry.ts` — already updated above as part of the ContactDetail migration.

## AGENTS.md placement

Insert a new section after `<Card>` (currently line ~677), before `<Stack>`. Rationale: Card and DefinitionList are both structural-display primitives; placing DefinitionList adjacent makes the cross-reference obvious. The `<Table>` cluster (line ~1465) is too far down — Table is for arbitrary tabular data, DefinitionList is for keyed pairs.

The new section follows the existing TL;DR pattern: one-sentence intro, canonical JSX snippet, prop summary, anti-patterns.

## Out of scope (deferred)

The following are intentionally not shipped in this PR. If a real consumer asks, file a follow-up:

- **Icon on `<dt>`** — no concrete consumer. Adding would mean `DefinitionListTermProps.icon?: ReactNode`.
- **Trailing icon on `<dd>`** — patterns like "value + external-link affordance" can be composed today by putting `<Link>` or `<Button iconOnly>` as children inside `<DefinitionList.Description>`.
- **Built-in null/empty placeholder ("—")** — consumer's job. If `value` is null, the consumer renders `<DefinitionList.Description><Text tone="subtle">—</Text></DefinitionList.Description>`. Not worth a prop.
- **Nested DefinitionLists** — works structurally (a dd can contain another dl) but no styling support and no consumer driver.
- **Row hover / stripe states** — pure display primitive; if a row needs to be interactive, the consumer wraps the children in `<Link>` or `<Button>`.
- **Async loading variant** — consumer composes with `<Skeleton>` inside `<Description>`.

## Risks & open questions

- **`display: contents` and ARIA**: a few historical browser versions stripped `display: contents` nodes from the a11y tree (Safari < 11.1). All current browsers expose them correctly. The library doesn't formally document a browser baseline, but the existing Floating UI + CSS-grid usage already implies modern browsers.
- **Term column width with `max-content`** can cause layout shift if descriptions load progressively (the longest term renders later → column re-sizes). Mitigation: consumers with strict layout requirements pass an explicit `termWidth`. Document the trade-off in JSDoc.
- **Dev warning noise**: if a consumer wants to put a non-Item element between rows (e.g., `<Divider>`, a heading sub-section), the warning will fire. We accept the noise — the right pattern is `<DefinitionList>...</DefinitionList>` with the consumer placing dividers/headings OUTSIDE between two separate DefinitionLists. If a real consumer hits this, revisit.

## Follow-up work

- If `<dt>` ever needs an icon (e.g. categorized property panels), add `DefinitionListTermProps.icon?: ReactNode` with the same leading-position + aria-hidden treatment as Description.
- If consumers consistently want a built-in row-hover state, add `interactive?: boolean` prop later.
- If the `<Box width>` TODO ships (see `packages/design-system/src/components/TODO.md`), DefinitionList becomes the canonical example of "key-value pair primitive that doesn't need explicit widths" because of `max-content` — no migration needed.
