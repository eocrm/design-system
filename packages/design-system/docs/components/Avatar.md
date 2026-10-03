# `<Avatar>` — profile circle

```tsx
<Avatar name="Alex Rivera" />
<Avatar name="Alex Rivera" src="https://example.com/alex.jpg" size="lg" status="online" />

// Hover-discoverable name (off by default; opt in)
<Avatar name="Alex Rivera" tooltip />

// In a table row
<Cluster gap="sm" align="center">
  <Avatar name={contact.name} size="sm" />
  <span>{contact.name}</span>
</Cluster>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | `string` | yes | — | The person's name. Required — used as the `alt`/`aria-label`, as the source of the initials, and as the seed for the deterministic fallback color. The same name always renders the same color. When `tooltip` is true, also used as the tooltip body. |
| `src` | `string` | no | — | Image URL. When provided, the `<img>` is rendered with `alt={name}`. Empty/whitespace strings are treated as missing. If the image fails to load (404, network), the component automatically falls back to initials. |
| `size` | `'inline' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | no | — | Diameter. - `sm` (24px) — table rows, dense lists. - `md` (32px, default) — most uses. - `lg` (40px) — detail-page headers. - `xl` (80px) — member-card popovers / profile headers. - `inline` — one line of the surrounding text tall (`1lh`), initials scaled to match, so an avatar in a text row (a `DefinitionList` value, a table cell, a line of text) doesn't make it taller. Follows the text size; no size decision per call site. Not available on `<AvatarGroup>` — and don't set it per child inside one: the group's overlaps are sized for its fixed steps. Inside `<AvatarGroup>`, defaults to the group's `size`. |
| `status` | `'online' \| 'busy' \| 'away' \| 'offline'` | no | — | Presence dot in the bottom-right. - `'online'` — green. - `'busy'` — red. - `'away'` — amber (the categorical amber, dark enough to read at dot size). - `'offline'` — gray. Omit to render no dot at all. Setting `status` changes the accessible name to `"{name}, {status}"` (localized), because colour alone cannot carry the status (WCAG 1.4.1); query with `getByRole('img', { name: 'Alex, online' })`. Each status also renders a distinct shape (filled / half / barred / hollow), so it survives colour-vision deficiency and greyscale; the dot stays `aria-hidden` so nothing is announced twice. |
| `tooltip` | `boolean` | no | — | Whether to wrap the avatar in a `<Tooltip>` showing `name`. Defaults to `false` (back-compat — existing renders don't gain a hover affordance). Inside `<AvatarGroup>`, the group's `tooltip` prop becomes the default (which itself defaults to `true` for grouped avatars); explicit per-child still wins. |
| …native | | | | plus native `<span>` attributes |

<!-- props:end -->

- Inside `<AvatarGroup>`, the group's `size` and `tooltip` become defaults — explicit per-child props still win. The avatar also picks up a `--color-bg` ring so stacked siblings read as distinct.
- Use `avatarColorIndex(name)` if you need to match an avatar's color elsewhere (e.g. a chart segment).

#### When NOT to use

- Company logos: Avatars are for people. Use a `Logo` component (not yet shipped) or an `<img>` with rounded corners.
- As a clickable button. If clicking opens a profile, wrap the Avatar in a `<button>` or `<Link>`; don't make the Avatar itself interactive.

#### Anti-patterns

- ❌ `<Avatar name="" />`: `name` is required and is the accessible label.
- ❌ Relying on the status dot's colour, or re-tinting it. The distinct shape is the channel that survives colour-vision deficiency, and `away` vs `busy` collapses without it.
- ❌ Adding your own visually-hidden status text next to the avatar. It is announced twice, and inside the no-`src` branch (a `role="img"`) ARIA prunes children as presentational, so it would be silent there anyway.
- ❌ Using Avatar for a non-person icon. Use an icon component.
- ❌ Wrapping the result in `role="img"` again. With `src`, the inner `<img>` is the labeled image; without it, the wrapper has `role="img" aria-label={name}`, plus the localized `status` when set (`"Alex, online"`).
