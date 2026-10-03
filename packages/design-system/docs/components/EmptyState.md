# `<EmptyState>` — "nothing here" container

```tsx
<EmptyState
  icon={<Inbox size={32} />}
  title="No contacts yet"
  description="Add your first contact to get started."
  actions={<Button>Add contact</Button>}
/>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `icon` | `ReactNode` | no | — | Icon rendered above the title. Pass a lucide icon, custom SVG, or any ReactNode. Sized by the consumer — recommended: sm=24, md=32, lg=48. Omit for an icon-less empty state. |
| `title` | `ReactNode` | yes | — | Required title. Rendered as a semantic heading (default `<h3>`). Accepts ReactNode so inline emphasis works (e.g., `<>Found <strong>0</strong> results</>`). Keep it short and announceable — AT users hear it via heading navigation. |
| `description` | `ReactNode` | no | — | Optional description rendered below the title. |
| `actions` | `ReactNode` | no | — | Optional action(s) rendered below the description. Typically a `<Button>` or a `<Cluster gap="sm">` of buttons. |
| `size` | `EmptyStateSize` | no | — | Visual size. Defaults to `'md'`. - `'sm'` — compact for inline / popover use (empty Select results, empty filter chips). Icon target 24px, font-size-sm title. - `'md'` — default for cards / sections (DataTable empty row, inbox empty). Icon target 32px, font-size-md title. - `'lg'` — hero / full-page empty states. Icon target 48px, font-size-xl title. |
| `align` | `EmptyStateAlign` | no | — | Horizontal alignment of the stacked content. Defaults to `'center'`. Use `'start'` when the empty state sits in a tight column where centering would look stranded. |
| `headingLevel` | `EmptyStateHeadingLevel` | no | — | Heading level for the `title`. Defaults to `3` (renders `<h3>`). Set higher (4–6) when the empty state lives deep inside the page's heading hierarchy. Set to `2` when the empty state IS the page's primary content. Values outside `1–6` clamp to `3`. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- Four slots: `icon` (optional ReactNode), `title` (required ReactNode), `description` (optional), `actions` (optional). Stacked vertically.
- `title` renders as a semantic heading — default `<h3>`. Override via `headingLevel: 1–6` (clamped) when the empty state lives at a different heading depth.
- Three sizes — `sm` (inline / popover empties), `md` (card / section default), `lg` (hero / full-page).
- `align`: `'center'` (default) / `'start'` for tight-column use.
- Use `<Skeleton>` for **loading** states — EmptyState implies "nothing here," not "data on its way."
- No `variant="error"` — error treatments need different a11y (live regions, retry actions). Use a future `<Alert>` or render a danger-tinted EmptyState with your own error message.
- No automatic `aria-hidden` on the icon — consumer's icon may be semantic (e.g., a country-flag icon in a "No results for this region" state). If the icon is purely decorative, the consumer should pass `aria-hidden`.
- The wrapper `<section>` only becomes a screen-reader landmark when it has an accessible name — pass `aria-label` (or `aria-labelledby`) when the empty state should be navigable as a region (typically when it IS the page's primary content with `headingLevel={1 | 2}`).
- Not for a page-level 404 / 500 — use a dedicated error page.
- For unusual layouts compose `<Stack>` + `<Button>` directly; this component is deliberately inflexible.
- ❌ A long sentence as `title` — keep titles short; long strings hurt heading navigation.
- ❌ Multiple primary action buttons — one clear next action; secondaries are `ghost`.

```tsx
// Multiple actions
<EmptyState
  icon={<Search size={32} />}
  title="No results"
  description="Try a different query or clear the filters."
  actions={
    <Cluster gap="sm" justify="center">
      <Button onClick={clearFilters}>Clear filters</Button>
      <Button variant="ghost" onClick={openSearch}>New search</Button>
    </Cluster>
  }
/>

// Inline (e.g. a Select dropdown's empty results)
<EmptyState size="sm" icon={<SearchX size={24} />} title="No matches" />
```
