# `<AvatarGroup>` — Slack-style stacked row of avatars

```tsx
<AvatarGroup max={4} size="md" onOverflowClick={(_e, n) => openMembersPopover(n)}>
  {team.map((m) => (
    <Avatar key={m.id} name={m.name} src={m.avatarUrl} status={m.presence} />
  ))}
</AvatarGroup>
```

<!-- props:start -->

## Props

| Prop              | Type                                                                                | Required | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `children`        | `ReactNode`                                                                         | yes      | —       | Avatar children.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `size`            | `"sm" \| "md" \| "lg" \| "xl"`                                                      | no       | —       | Diameter default for child avatars. Defaults to `'md'`. Each child can still override via its own `size` prop (idiomatic React composition — explicit prop wins). For a strictly uniform group, don't set `size` on individual children. - `sm` (24px) — table rows, dense lists. - `md` (32px, default) — most uses. - `lg` (40px) — detail-page headers. - `xl` (80px) — member-card popovers / profile headers. |
| `max`             | `number`                                                                            | no       | —       | Maximum number of visible avatars. Children beyond this count collapse into a single `+N` button at the tail. Defaults to `4`. The `+N` only appears when there are STRICTLY more children than `max`.                                                                                                                                                                                                             |
| `tooltip`         | `boolean`                                                                           | no       | —       | Whether to render a name tooltip on each child avatar. Defaults to `true` inside the group; overridable per-child by setting `tooltip` on the Avatar.                                                                                                                                                                                                                                                              |
| `onOverflowClick` | `((event: MouseEvent<HTMLButtonElement, MouseEvent>, hiddenCount: number) => void)` | no       | —       | Fires when the user clicks the `+N` overflow button. The library does NOT render a popover — apps decide what happens (open a modal, navigate, etc.). When omitted, the `+N` is rendered as a non-interactive `<span>`.                                                                                                                                                                                            |
| …native           |                                                                                     |          |         | plus native `<div>` attributes                                                                                                                                                                                                                                                                                                                                                                                     |

<!-- props:end -->

- Horizontal row of overlapping `<Avatar>`s with a `+N` overflow control when child count exceeds `max` (default `4`).
- `size` is the default for child avatars (per-child explicit `size` still wins). Four sizes: `'sm' | 'md' | 'lg' | 'xl'` (`xl` = member-card popovers / profile headers). For a strictly uniform group, just don't set per-child sizes.
- `tooltip` defaults to `true` (group context flips the per-Avatar default — standalone `<Avatar tooltip>` is opt-in, but inside a group each visible face shows its name on hover by default). Set `tooltip={false}` at the group level to suppress all tooltips, or per-child to opt out one.
- `onOverflowClick(event, hiddenCount)` — the library does NOT render its own popover. The app decides what happens (open a `<Popover>` listing all members, navigate to a page, open a modal). When omitted, `+N` renders as a non-interactive `<span>` (still labelled for AT).
- The group wrapper is `role="list"` and each visible avatar is wrapped in a `role="listitem"` div; the +N (button or span) is the last list item.
- forwardRef to the outer `<div>`. `className` is merged.
