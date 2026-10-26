# `<List>` — bulleted / numbered prose lists (ul / ol)

Semantic list of prose items: facts, steps, header names, error extras. Renders `<ul>` / `<ol>` with `<li>`, component-drawn markers aligned to the first text line, and a hanging indent. Compound: `List`, `List.Item`.

TL;DR: `<List>` for bullets, `<List variant="number">` for ordered steps, `numberStyle="badge"` for numbered-step cards.

```tsx
<List variant="number" numberStyle="badge">
  <List.Item>Open Settings and choose Integrations.</List.Item>
  <List.Item>Paste the API token and save.</List.Item>
</List>

<List gap="xs">
  <List.Item>
    <code>X-RateLimit-Remaining</code> — requests left in the window.
  </List.Item>
  <List.Item>
    <code>Retry-After</code> — seconds to wait after a 429.
  </List.Item>
</List>
```

<!-- props:start -->

## Props

### `ListProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `variant` | `'bullet' \| 'number'` | no | Marker style. See `ListVariant`. Default `'bullet'`. |
| `gap` | `'xs' \| 'sm' \| 'md'` | no | Space between items. See `ListGap`. Default `'sm'`. |
| `numberStyle` | `'plain' \| 'badge'` | no | Number look; only applies to `variant="number"`. See `ListNumberStyle`. Default `'plain'`. |
| `children` | `ReactNode` | no | `List.Item` elements. A nested `List` goes inside a `List.Item`. |
| …native | | | plus native HTML attributes |

### `ListItemProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | no | Item content. Text, inline elements, or a nested `List`. |
| …native | | | plus native `<li>` attributes |

<!-- props:end -->

- Numbers come from item position, so adding or removing items keeps them correct. There is no `start` prop.
- Markers are `aria-hidden`; the list carries an explicit `role="list"` so Safari/VoiceOver keeps list semantics.
- Text inherits size and colour, so it works inside `Card`, `Alert` and prose-width containers.
- Nest by putting a `List` inside a `List.Item`; it indents one level.
- `numberStyle` has no effect on bullets.

When NOT to use: key–value pairs → `DefinitionList`; rows of records → `Card.List` / `Table`; interactive or selectable rows → `Card.List`; custom markers or icons (unsupported).

- ❌ Raw `<ul>` / `<ol>` or `Stack` + `Dot` composites for prose lists: use `List`.
- ❌ Children other than `List.Item`: markers and numbering won't render.
- ❌ Using `numberStyle="badge"` with `variant="bullet"` expecting badges: it is ignored.
