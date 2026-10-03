# `<AvatarGroup>` — Slack-style stacked row of avatars

```tsx
<AvatarGroup max={4} size="md" onOverflowClick={(_e, n) => openMembersPopover(n)}>
  {team.map((m) => (
    <Avatar key={m.id} name={m.name} src={m.avatarUrl} status={m.presence} />
  ))}
</AvatarGroup>

// Static: without onOverflowClick the +N is non-interactive
<AvatarGroup max={3}>
  <Avatar name="Alex Rivera" />
  <Avatar name="Priya Patel" />
  <Avatar name="Tom Kim" />
  <Avatar name="Sara Chen" />
</AvatarGroup>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | Avatar children. |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | no | — | Diameter default for child avatars. Defaults to `'md'`. Each child can still override via its own `size` prop (idiomatic React composition — explicit prop wins). For a strictly uniform group, don't set `size` on individual children. - `sm` (24px) — table rows, dense lists. - `md` (32px, default) — most uses. - `lg` (40px) — detail-page headers. - `xl` (80px) — member-card popovers / profile headers. |
| `max` | `number` | no | — | Maximum number of visible avatars. Children beyond this count collapse into a single `+N` button at the tail. Defaults to `4`. The `+N` only appears when there are STRICTLY more children than `max`. |
| `tooltip` | `boolean` | no | — | Whether to render a name tooltip on each child avatar. Defaults to `true` inside the group (a standalone `<Avatar tooltip>` is opt-in; group context flips that default). Set `false` on the group to suppress all tooltips; overridable per-child by setting `tooltip` on the Avatar. |
| `onOverflowClick` | `((event: MouseEvent<HTMLButtonElement, MouseEvent>, hiddenCount: number) => void)` | no | — | Fires when the user clicks the `+N` overflow button. The library does NOT render a popover — apps decide what happens (open a modal, navigate, etc.). When omitted, the `+N` is rendered as a non-interactive `<span>` (still labelled for AT). |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- Horizontal row of overlapping `<Avatar>`s with a `+N` overflow control when child count exceeds `max` (default `4`).
- The group wrapper is `role="list"` and each visible avatar is wrapped in a `role="listitem"` div; the +N (button or span) is the last list item.
- forwardRef to the outer `<div>`. `className` is merged.

#### When NOT to use

- A single avatar: use `<Avatar>` directly.
- Showing member counts but not faces: use a `Badge` next to a label.

#### Anti-patterns

- ❌ Wrapping `<AvatarGroup>` in a `<button>` as one click target. The `+N` is the click affordance; the visible avatars are deliberately not interactive. Wrap individual avatars in `<button>` / `<Link>` if needed.
- ❌ Mixing avatar sizes inside one group on purpose. Per-child `size` wins, which is useful for emphasising one member but visually noisy if used carelessly.
