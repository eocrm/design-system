# `<AvatarGroup>` — Slack-style stacked row of avatars

```tsx
<AvatarGroup max={4} size="md" onOverflowClick={(_e, n) => openMembersPopover(n)}>
  {team.map((m) => (
    <Avatar key={m.id} name={m.name} src={m.avatarUrl} status={m.presence} />
  ))}
</AvatarGroup>
```

- Horizontal row of overlapping `<Avatar>`s with a `+N` overflow control when child count exceeds `max` (default `4`).
- `size` is the default for child avatars (per-child explicit `size` still wins). Four sizes: `'sm' | 'md' | 'lg' | 'xl'` (`xl` = member-card popovers / profile headers). For a strictly uniform group, just don't set per-child sizes.
- `tooltip` defaults to `true` (group context flips the per-Avatar default — standalone `<Avatar tooltip>` is opt-in, but inside a group each visible face shows its name on hover by default). Set `tooltip={false}` at the group level to suppress all tooltips, or per-child to opt out one.
- `onOverflowClick(event, hiddenCount)` — the library does NOT render its own popover. The app decides what happens (open a `<Popover>` listing all members, navigate to a page, open a modal). When omitted, `+N` renders as a non-interactive `<span>` (still labelled for AT).
- The group wrapper is `role="list"` and each visible avatar is wrapped in a `role="listitem"` div; the +N (button or span) is the last list item.
- forwardRef to the outer `<div>`. `className` is merged.
