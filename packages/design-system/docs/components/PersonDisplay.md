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
| Prop | Type | Required | Description |
|---|---|---|---|
| `size` | `'inline' \| 'sm' \| 'md' \| 'lg'` | no | Visual size of the entire composition. `md` is the default — suits sidebars, members lists, and most card / table contexts. `sm` is the compact density for tight table cells; `lg` is the detail-page hero size. Propagates to the Avatar size and the Name / Description text sizes via context. `inline` fits a person into a text row: the Avatar is one line tall (`1lh`) and the Name inherits the surrounding text's size and weight (and colour, unless it has an `href` — then it's a subtle Link), so a person in a `DefinitionList` value or a table cell is exactly as tall as its plain-text neighbours. Follows the text size; no size decision per call site. Skip Descriptions — a second line defeats it. The root is a `<div>`, so not inside a `<p>`; in a line that also holds something taller than one line it top-aligns rather than sharing the baseline. |
| `shrink` | `boolean` | no | Force the composition to shrink-wrap to its content (avatar + name) instead of stretching to fill a parent. Default `false`. The root is `inline-flex` and shrink-wraps on its own — but as a child of a *stretching* flex/grid container (a detail/sidebar card column with `align-items: stretch` / `justify-self: stretch`) CSS blockifies it and the parent stretches it to the full column width. The avatar+name then sit in the left portion and the trailing empty space joins the box, so a `Popover.Trigger` / `Tooltip` cloned onto the PersonDisplay anchors to that wide box and centers far to the right of the person. Set `shrink` on such an overlay trigger to keep it content-width (`width: fit-content`) regardless of the parent, so the overlay anchors to the visible avatar+name. |
| `children` | `ReactNode` | yes | `<PersonDisplay.Avatar>` (or `<PersonDisplay.AgentAvatar>`) + `<PersonDisplay.Name>` (+ optional `<PersonDisplay.OnBehalfOf>` and repeating `<PersonDisplay.Description>`) subcomponents in any order — Root sorts the avatar into its own slot. With an `OnBehalfOf`, Name and OnBehalfOf share one truncating row above the Descriptions. |
| …native | | | plus native `<div>` attributes |

### `PersonDisplayAgentAvatarProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Agent label. Not announced here: the avatar is decorative, and the visible `PersonDisplay.Name` (pass the same label) names the agent. |
| `mark` | `ReactNode` | no | Agent mark, inherits `currentColor` (a neutral foreground), so pass a glyph drawn with `fill`/`stroke="currentColor"`; marks with hard-coded fills keep their colours (the app's responsibility). Defaults to a lucide `Bot`. |
| `member` | `AgentAvatarMember \| null` | no | The member the agent acts for. Omit for an agent alone (no badge); `null` or an empty name for an erased member (placeholder badge). |
| …native | | | plus native HTML attributes |

### `PersonDisplayAvatarProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | The person's name. Required — used as the `alt`/`aria-label`, as the source of the initials, and as the seed for the deterministic fallback color. The same name always renders the same color. When `tooltip` is true, also used as the tooltip body. |
| `src` | `string` | no | Image URL. When provided, the `<img>` is rendered with `alt={name}`. Empty/whitespace strings are treated as missing. If the image fails to load (404, network), the component automatically falls back to initials. |
| `status` | `'online' \| 'busy' \| 'away' \| 'offline'` | no | Presence dot in the bottom-right. - `'online'` — green. - `'busy'` — red. - `'away'` — amber (the categorical amber, dark enough to read at dot size). - `'offline'` — gray. Omit to render no dot at all. Setting `status` changes the accessible name to `"{name}, {status}"` (localized), because colour alone cannot carry the status (WCAG 1.4.1); query with `getByRole('img', { name: 'Alex, online' })`. Each status also renders a distinct shape (filled / half / barred / hollow), so it survives colour-vision deficiency and greyscale; the dot stays `aria-hidden` so nothing is announced twice. |
| `tooltip` | `boolean` | no | Whether to wrap the avatar in a `<Tooltip>` showing `name`. Defaults to `false` (back-compat — existing renders don't gain a hover affordance). Inside `<AvatarGroup>`, the group's `tooltip` prop becomes the default (which itself defaults to `true` for grouped avatars); explicit per-child still wins. |
| …native | | | plus native HTML attributes |

### `PersonDisplayDescriptionProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes | One line of descriptive metadata — email, role, company, etc. Repeat the subcomponent for additional lines; each renders on its own row beneath the name. Accepts arbitrary `ReactNode` children so consumers can inline a `<Badge>` or other small decoration. |
| …native | | | plus native `<span>` attributes |

### `PersonDisplayNameProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `href` | `string` | no | When set, the name renders as a `<Link>` to this URL. Use for navigable people (contacts, members) where the row links to a detail page. Omit for read-only displays (audit actor, activity timeline) where the name is plain text. |
| `children` | `ReactNode` | yes | The person's display name — usually a plain string. |
| …native | | | plus native HTML attributes |

### `PersonDisplayOnBehalfOfProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | no | The member the agent acts for, rendered after a muted "for" prefix. A plain name, or a `<Link>` to the member. Omit (or pass an empty string) when the member was erased: renders "for a former member". Plain-text children (a string, a number, or text-only nodes like `{first} {last}`) give the member box a hover `title` of the full "for {member}" text (the erased copy when erased), which shadows a consumer `title` on OnBehalfOf; a `<Link>` or other element child gets none. The root span is `display: contents` (its prefix and member join the Name's row), so box styles passed via `className`/`style` on it don't paint. |
| …native | | | plus native `<span>` attributes |

<!-- props:end -->

- Compound: `<PersonDisplay>` + `<PersonDisplay.Avatar>` (or `<PersonDisplay.AgentAvatar>`) + `<PersonDisplay.Name>` (+ `<PersonDisplay.OnBehalfOf>`) + repeating `<PersonDisplay.Description>`. Inside the agent row, Name always renders before OnBehalfOf whatever the child order.
- `<PersonDisplay.Name href="...">` renders the name as a `<Link variant="subtle">` (real `<a>`) — `Link`'s `variant="subtle"` is **not** deprecated, unlike `Text`/`Title`'s `tone="subtle"`; do not "fix" it. Omit `href` for read-only displays (audit actor, activity timeline).
- **A Description clips itself on the inline axis** (`overflow-x: clip`, `white-space: nowrap`), so a long unbroken value cannot paint outside a narrow container such as a DataTable stacked card. Put **interactive** content in `<PersonDisplay.Name href=…>`, which does not clip (except inside the agent row, where the Name clips on the inline axis like the OnBehalfOf next to it): a control flush with the Description line's left or right edge loses those bands of its focus ring, and that residual is recorded in `tests/focus-ring-geometry.baseline.json` rather than hidden. The block axis is deliberately left `visible`, so a ring is never clipped top or bottom.
- All Avatar props (`name`, `src`, `status`, `tooltip`) flow through `<PersonDisplay.Avatar>` except `size`.
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

## Agent acting for a member

```tsx
// AI agent acting on behalf of a member
<PersonDisplay size="md">
  <PersonDisplay.AgentAvatar name="Scout" member={{ name: 'Sarah Chen', src: '/avatars/sarah.png' }} />
  <PersonDisplay.Name>Scout</PersonDisplay.Name>
  <PersonDisplay.OnBehalfOf>Sarah Chen</PersonDisplay.OnBehalfOf>
  <PersonDisplay.Description>Enrichment agent</PersonDisplay.Description>
</PersonDisplay>

// Member erased: placeholder badge + "for a former member"
<PersonDisplay size="md">
  <PersonDisplay.AgentAvatar name="Scout" member={null} />
  <PersonDisplay.Name>Scout</PersonDisplay.Name>
  <PersonDisplay.OnBehalfOf />
</PersonDisplay>

// Inline: a text row, no member badge; Name + "for Sarah Chen" read as one line
<PersonDisplay size="inline">
  <PersonDisplay.AgentAvatar name="Scout" member={{ name: 'Sarah Chen' }} />
  <PersonDisplay.Name>Scout</PersonDisplay.Name>
  <PersonDisplay.OnBehalfOf>Sarah Chen</PersonDisplay.OnBehalfOf>
</PersonDisplay>
```

- **Three member states** (pass the same state to `AgentAvatar.member` and `OnBehalfOf`): a member (`{ name, src? }` / name child) shows the badge and "for {member}"; `member` omitted = agent alone (no badge, no `OnBehalfOf`); `member={null}` or an empty name = erased, placeholder badge and "for a former member".
- `PersonDisplay.AgentAvatar` takes the `AgentAvatar` props minus `size` (from the root) and `decorative`. It is **decorative** inside PersonDisplay (`aria-hidden`): the visible Name and `OnBehalfOf` already carry both identities, so nothing is announced twice. The standalone `AgentAvatar` is `role="img"` unless you pass `decorative` (see [AgentAvatar](AgentAvatar.md)).
- `OnBehalfOf` children: a plain name or a `<Link>` to the member. The "for" prefix is localized.
- Name and `OnBehalfOf` share one truncating row: the prefix never shrinks, the member ellipsises down to roughly 6ch, then the Name ellipsises. Descriptions sit below.
- A `<Link>` in `OnBehalfOf` keeps its whole focus ring: the member box pads both inline ends by the ring's extent. Only a member Link that is itself truncated loses its trailing ring band, because the Link runs past the clip edge; its start, top and bottom bands stay.
- As a flex item (e.g. an activity row `<Cluster wrap={false}>` of IconTile + PersonDisplay + timestamp) the root shrinks (`min-width: 0`) and truncates instead of overflowing. Its siblings shrink too unless you keep them whole: wrap them in `<Constrain flex="none">`.
- `OnBehalfOf`'s root is `display: contents`, so box styles (background, border, padding) passed via `className` / `style` on it don't paint; style the child you pass. When its children are plain text (a string, a number, or text-only nodes like `{first} {last}`), or the member is erased, the member box gets a hover `title` with the full "for {member}" text (or the erased copy). Over the member box that shadows a consumer `title` passed to `OnBehalfOf`. A `<Link>` or other element child gets no `title`.
- `inline` hides the member badge and keeps the agent on one text line.

**Agent anti-patterns**

- ❌ Using the agent parts for a human. Agents only; a person is `PersonDisplay.Avatar`.
- ❌ Passing a multi-colour brand `mark` and expecting it to come out neutral. The tile only sets `color` (a neutral foreground); draw the glyph with `fill`/`stroke="currentColor"`. Hard-coded fills keep their colours, which is the app's responsibility.
- ❌ Deriving the brand `mark` from a client-chosen name. Pick the mark from a trusted, server-known agent identity, or an agent can impersonate another product.
- ❌ Adding a "bot" / "AI" kind chip next to the Name. The tile and "for {member}" already signal it.
