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

- Compound: `<PersonDisplay>` + `<PersonDisplay.Avatar>` + `<PersonDisplay.Name>` + repeating `<PersonDisplay.Description>`.
- `size`: `'inline'` / `'sm'` / `'md'` (default) / `'lg'`. Propagates to Avatar size and Text scales via context. `inline` fits a person into a text row, e.g. a `DefinitionList` value: the avatar is one line tall and the Name inherits the row's size and weight (and colour, unless it has an `href`), so the row is as tall as its text neighbours. Skip Descriptions with it. The root is a `<div>`, so don't put it inside a `<p>`. Don't pass `size` to `PersonDisplay.Avatar` directly — Root controls it (the prop is omitted from `PersonDisplayAvatarProps` by type).
- `<PersonDisplay.Name href="...">` renders the name as a `<Link variant="subtle">` (real `<a>`) — `Link`'s `variant="subtle"` is **not** deprecated, unlike `Text`/`Title`'s `tone="subtle"` (#521); do not "fix" it. Omit `href` for read-only displays (audit actor, activity timeline).
- `<PersonDisplay.Description>` is muted text; repeat for additional lines. Children can be `ReactNode` — e.g. `admin@acme.com <Badge tone="warning" size="sm">impersonating</Badge>` to inline a marker.
- **A Description clips itself on the inline axis** (`overflow-x: clip`, `white-space: nowrap`), so a long unbroken value cannot paint outside a narrow container such as a DataTable stacked card (#527). Put **interactive** content in `<PersonDisplay.Name href=…>`, which does not clip: a control flush with the Description line's left or right edge loses those bands of its focus ring, and that residual is recorded in `tests/focus-ring-geometry.baseline.json` rather than hidden. The block axis is deliberately left `visible`, so a ring is never clipped top or bottom.
- All Avatar props (`name`, `src`, `status`, `tooltip`) flow through `<PersonDisplay.Avatar>` except `size`.
- `shrink` (boolean, default `false`): force content-width (`width: fit-content`). PersonDisplay shrink-wraps on its own, but a **stretching** flex/grid parent (`align-items: stretch` / `justify-self: stretch`) stretches it full-width, so a `Popover.Trigger`/`Tooltip` cloned onto it anchors to the wide box and centers right of the person. Add `shrink` on such an overlay trigger to re-anchor it to the avatar+name.
- **Use for the standard "person row" — Avatar + name + 0–2 muted lines.** Not for Avatar-only badges (use `<Avatar>`), avatar stacks (use `<AvatarGroup>`), or click-anywhere row interactions (wrap PersonDisplay in your own Link).
