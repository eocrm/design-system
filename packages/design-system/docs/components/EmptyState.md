# `<EmptyState>` — "nothing here" container

```tsx
<EmptyState
  icon={<Inbox size={32} />}
  title="No contacts yet"
  description="Add your first contact to get started."
  actions={<Button>Add contact</Button>}
/>
```

- Four slots: `icon` (optional ReactNode), `title` (required ReactNode), `description` (optional), `actions` (optional). Stacked vertically.
- `title` renders as a semantic heading — default `<h3>`. Override via `headingLevel: 1–6` (clamped) when the empty state lives at a different heading depth.
- Three sizes — `sm` (inline / popover empties), `md` (card / section default), `lg` (hero / full-page).
- `align`: `'center'` (default) / `'start'` for tight-column use.
- Use `<Skeleton>` for **loading** states — EmptyState implies "nothing here," not "data on its way."
- No `variant="error"` — error treatments need different a11y (live regions, retry actions). Use a future `<Alert>` or render a danger-tinted EmptyState with your own error message.
- No automatic `aria-hidden` on the icon — consumer's icon may be semantic (e.g., a country-flag icon in a "No results for this region" state). If the icon is purely decorative, the consumer should pass `aria-hidden`.
- The wrapper `<section>` only becomes a screen-reader landmark when it has an accessible name — pass `aria-label` (or `aria-labelledby`) when the empty state should be navigable as a region (typically when it IS the page's primary content with `headingLevel={1 | 2}`).
