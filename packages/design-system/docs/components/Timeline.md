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

<!-- props:start -->

## Props

### `TimelineProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `compact` | `boolean` | no | Tighter gutter, node box, and spacing for dense sidebar widgets. Default `false`. |
| `children` | `ReactNode` | yes | `<Timeline.Item>`s. |
| …native | | | plus native `<ol>` attributes |

### `TimelineItemProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `node` | `ReactNode` | yes | The gutter node — an `<Avatar>`, `<Dot>`, icon, etc. Centered in a fixed node box so the connector aligns regardless of node content. |
| `children` | `ReactNode` | yes | The item content (right of the node) — e.g. name·type·time, body, system text. |
| …native | | | plus native `<li>` attributes |

<!-- props:end -->

- The last item's connector stops automatically (CSS `:last-child`); `compact` flows via CSS vars.

```tsx
// Compact sidebar widget with dot nodes:
<Timeline compact>
  <Timeline.Item node={<Dot tone="success" />}>
    <Text size="sm">Renewal confirmed</Text>
  </Timeline.Item>
</Timeline>
```

- Not for a horizontal step indicator (Timeline is vertical).
- ❌ Hand-rolling the connector line: it is built in.
- ❌ Layout margins on items: spacing comes from `compact` / the row gap token.
