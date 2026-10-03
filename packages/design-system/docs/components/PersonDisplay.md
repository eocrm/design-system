# `<PersonDisplay>` — Avatar + name (+ optional description lines)

```tsx
// Canonical: avatar + linked name + email
<PersonDisplay size="md">
  <PersonDisplay.Avatar name="Sarah Chen" src="/avatars/sarah.png" />
  <PersonDisplay.Name href="/contacts/sarah-chen">Sarah Chen</PersonDisplay.Name>
  <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
</PersonDisplay>

// Multiple description lines (email + role)
<PersonDisplay size="md">
  <PersonDisplay.Avatar name="Marcus Vega" />
  <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
  <PersonDisplay.Description>marcus@acme.com</PersonDisplay.Description>
  <PersonDisplay.Description>Account Executive</PersonDisplay.Description>
</PersonDisplay>

// Tight table cell — sm; name only
<PersonDisplay size="sm">
  <PersonDisplay.Avatar name="Avery Liu" />
  <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
</PersonDisplay>
```

<!-- props:start -->

## Props

### `PersonDisplayProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `size` | `PersonDisplaySize` | no | — | Visual size of the entire composition. `md` is the default — suits sidebars, members lists, and most card / table contexts. `sm` is the compact density for tight table cells; `lg` is the detail-page hero size. Propagates to the Avatar size and the Name / Description text sizes via context. `inline` fits a person into a text row: the Avatar is one line tall (`1lh`) and the Name inherits the surrounding text's size and weight (and colour, unless it has an `href` — then it's a subtle Link), so a person in a `DefinitionList` value or a table cell is exactly as tall as its plain-text neighbours. Follows the text size; no size decision per call site. Skip Descriptions — a second line defeats it. The root is a `<div>`, so not inside a `<p>`; in a line that also holds something taller than one line it top-aligns rather than sharing the baseline. |
| `shrink` | `boolean` | no | — | Force the composition to shrink-wrap to its content (avatar + name) instead of stretching to fill a parent. Default `false`. The root is `inline-flex` and shrink-wraps on its own — but as a child of a *stretching* flex/grid container (a detail/sidebar card column with `align-items: stretch` / `justify-self: stretch`) CSS blockifies it and the parent stretches it to the full column width. The avatar+name then sit in the left portion and the trailing empty space joins the box, so a `Popover.Trigger` / `Tooltip` cloned onto the PersonDisplay anchors to that wide box and centers far to the right of the person. Set `shrink` on such an overlay trigger to keep it content-width (`width: fit-content`) regardless of the parent, so the overlay anchors to the visible avatar+name. |
| `children` | `ReactNode` | yes | — | `<PersonDisplay.Avatar>` + `<PersonDisplay.Name>` (+ optional repeating `<PersonDisplay.Description>`) subcomponents in any order — Root sorts the Avatar into its own slot. |
| …native | | | | plus native `<div>` attributes |

### `PersonDisplayAvatarProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | `string` | yes | — | The person's name. Required — used as the `alt`/`aria-label`, as the source of the initials, and as the seed for the deterministic fallback color. The same name always renders the same color. When `tooltip` is true, also used as the tooltip body. |
| `src` | `string` | no | — | Image URL. When provided, the `<img>` is rendered with `alt={name}`. Empty/whitespace strings are treated as missing. If the image fails to load (404, network), the component automatically falls back to initials. |
| `status` | `AvatarStatus` | no | — | Presence dot in the bottom-right. - `'online'` — green. - `'busy'` — red. - `'away'` — amber (the categorical amber, dark enough to read at dot size). - `'offline'` — gray. Omit to render no dot at all. Setting `status` changes the accessible name to `"{name}, {status}"` (localized), because colour alone cannot carry the status (WCAG 1.4.1); query with `getByRole('img', { name: 'Alex, online' })`. Each status also renders a distinct shape (filled / half / barred / hollow), so it survives colour-vision deficiency and greyscale; the dot stays `aria-hidden` so nothing is announced twice. |
| `tooltip` | `boolean` | no | — | Whether to wrap the avatar in a `<Tooltip>` showing `name`. Defaults to `false` (back-compat — existing renders don't gain a hover affordance). Inside `<AvatarGroup>`, the group's `tooltip` prop becomes the default (which itself defaults to `true` for grouped avatars); explicit per-child still wins. |
| …native | | | | plus native HTML attributes |

### `PersonDisplayDescriptionProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | One line of descriptive metadata — email, role, company, etc. Repeat the subcomponent for additional lines; each renders on its own row beneath the name. Accepts arbitrary `ReactNode` children so consumers can inline a `<Badge>` or other small decoration. |
| …native | | | | plus native `<span>` attributes |

### `PersonDisplayNameProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `href` | `string` | no | — | When set, the name renders as a `<Link>` to this URL. Use for navigable people (contacts, members) where the row links to a detail page. Omit for read-only displays (audit actor, activity timeline) where the name is plain text. |
| `children` | `ReactNode` | yes | — | The person's display name — usually a plain string. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- Compound: `<PersonDisplay>` + `<PersonDisplay.Avatar>` + `<PersonDisplay.Name>` + repeating `<PersonDisplay.Description>`.
- `size`: `'inline'` / `'sm'` / `'md'` (default) / `'lg'`. Propagates to Avatar size and Text scales via context. `inline` fits a person into a text row, e.g. a `DefinitionList` value: the avatar is one line tall and the Name inherits the row's size and weight (and colour, unless it has an `href`), so the row is as tall as its text neighbours. Skip Descriptions with it. The root is a `<div>`, so don't put it inside a `<p>`. Don't pass `size` to `PersonDisplay.Avatar` directly — Root controls it (the prop is omitted from `PersonDisplayAvatarProps` by type).
- `<PersonDisplay.Name href="...">` renders the name as a `<Link variant="subtle">` (real `<a>`) — `Link`'s `variant="subtle"` is **not** deprecated, unlike `Text`/`Title`'s `tone="subtle"`; do not "fix" it. Omit `href` for read-only displays (audit actor, activity timeline).
- `<PersonDisplay.Description>` is muted text; repeat for additional lines. Children can be `ReactNode` — e.g. `admin@acme.com <Badge tone="warning" size="sm">impersonating</Badge>` to inline a marker.
- **A Description clips itself on the inline axis** (`overflow-x: clip`, `white-space: nowrap`), so a long unbroken value cannot paint outside a narrow container such as a DataTable stacked card. Put **interactive** content in `<PersonDisplay.Name href=…>`, which does not clip: a control flush with the Description line's left or right edge loses those bands of its focus ring, and that residual is recorded in `tests/focus-ring-geometry.baseline.json` rather than hidden. The block axis is deliberately left `visible`, so a ring is never clipped top or bottom.
- All Avatar props (`name`, `src`, `status`, `tooltip`) flow through `<PersonDisplay.Avatar>` except `size`.
- `shrink` (boolean, default `false`): force content-width (`width: fit-content`). PersonDisplay shrink-wraps on its own, but a **stretching** flex/grid parent (`align-items: stretch` / `justify-self: stretch`) stretches it full-width, so a `Popover.Trigger`/`Tooltip` cloned onto it anchors to the wide box and centers right of the person. Add `shrink` on such an overlay trigger to re-anchor it to the avatar+name.
- **Use for the standard "person row" — Avatar + name + 0–2 muted lines.** Not for Avatar-only badges (use `<Avatar>`), avatar stacks (use `<AvatarGroup>`), or click-anywhere row interactions (wrap PersonDisplay in your own Link).

```tsx
// Inline — a DefinitionList value, as tall as the text rows around it
<PersonDisplay size="inline">
  <PersonDisplay.Avatar name="Avery Liu" />
  <PersonDisplay.Name href="/members/avery">Avery Liu</PersonDisplay.Name>
</PersonDisplay>
```

`<PersonDisplay.Avatar>` is a thin wrapper around `<Avatar>`; it reads its size from the root and all other Avatar props (`status`, etc.) flow through. `<PersonDisplay.Name>` text size also follows the root `size`.

- This is always a horizontal avatar-left layout; for a "profile hero" with a centered avatar above the name, compose by hand.

**Anti-patterns**

- ❌ Wrapping the whole PersonDisplay in a `<Link>` just to link the person — the Name owns that via `href`. (Wrap it only for click-anywhere row interactions, as above.)
- ❌ `size="sm"` for a person among text values (a `DefinitionList`, a sentence) — the 24px avatar makes that row taller than its neighbours. Use `size="inline"`.
- ❌ Descriptions under `size="inline"` — the second line is exactly the extra height `inline` exists to avoid.
- ❌ Wrapping `<PersonDisplay.Avatar>` in a Fragment or a custom component — the root identifies the Avatar slot by element type, so a wrapped Avatar lands in the text column. Render it as a direct child; use `{shouldShow ? <PersonDisplay.Avatar … /> : null}` for conditional rendering (`null`/`false` are ignored).
