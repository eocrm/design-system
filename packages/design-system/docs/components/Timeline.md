# `<Timeline>` — vertical activity-feed primitive

`<Timeline>` + `<Timeline.Item node>` — a connector line running between per-item `node` slots (`<Avatar>` / `<Dot>` / icon) with content to the right; the line stops at the last node. `<Timeline compact>` tightens it for a sidebar widget. Semantic `<ol>`/`<li>`. For a plain list use `<Stack>`.

```tsx
<Timeline>
  {activities.map((a) => (
    <Timeline.Item key={a.id} node={<Avatar name={a.actor} size="sm" />}>
      <Text size="sm">
        <strong>{a.actor}</strong> · {a.type} · {a.time}
      </Text>
      <Text size="sm" tone="muted">
        {a.body}
      </Text>
    </Timeline.Item>
  ))}
</Timeline>
```

- `node` is a SLOT (pass `<Dot>` / `<Avatar size="sm">` / a small icon) — there's no built-in dot.
- The last item's connector stops automatically (CSS `:last-child`); `compact` flows via CSS vars.
