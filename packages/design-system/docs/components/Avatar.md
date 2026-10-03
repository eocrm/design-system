# `<Avatar>` — profile circle

```tsx
<Avatar name="Alex Rivera" />
<Avatar name="Alex Rivera" src="https://example.com/alex.jpg" size="lg" />
```

- `name` (required) — alt/aria-label, initials source, and color seed. Same name → same color, always.
- `src` — image URL. Empty/whitespace = no image. Falls back to initials on load failure.
- `size`: `sm` (24) / `md` (32, default) / `lg` (40) / `xl` (80, member-card popovers / profile headers) / `inline`: one line of the surrounding text tall (`1lh`), initials scaled to match. Use it for a person in running text or a details row. `inline` isn't available on `<AvatarGroup>`; don't set it per child inside a group either.
- `status?` — presence dot in the bottom-right corner. `'online' | 'busy' | 'away' | 'offline'`. Omit to render no dot. **Setting `status` changes the accessible name**: it becomes `"{name}, {status}"` (localized), because colour alone cannot carry the status — WCAG 1.4.1. Query with `getByRole('img', { name: 'Alex, online' })`, not `{ name: 'Alex' }`. Each status also renders a distinct **shape** (filled / half / barred / hollow), so it survives colour-vision deficiency and greyscale; the dot itself stays `aria-hidden` so nothing is announced twice.
- `tooltip?` — wraps the avatar in `<Tooltip>` with `content={name}`. Defaults to `false` standalone (back-compat). Inside `<AvatarGroup>`, the group's `tooltip` becomes the default (which itself defaults to `true`); explicit per-child still wins.
- Inside `<AvatarGroup>`, the group's `size` and `tooltip` become defaults — explicit per-child props still win. The avatar also picks up a `--color-bg` ring so stacked siblings read as distinct.
- Use `avatarColorIndex(name)` if you need to match an avatar's color elsewhere (e.g. a chart segment).
