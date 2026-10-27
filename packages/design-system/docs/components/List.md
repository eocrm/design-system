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

<List variant="number" numberStyle="badge" size="heading" gap="md">
  <List.Item>
    <Title order={3} size="xl">Create a token</Title>
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
| `size` | `'body' \| 'heading'` | no | Marker scale; use `'heading'` when each item starts with a `Title size="xl"`. See `ListSize`. Default `'body'`. |
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

- Numbers come from CSS counters, so adding, removing or conditionally rendering items keeps them contiguous. There is no `start` prop.
- Markers are `aria-hidden`; the list carries an explicit `role="list"` so Safari/VoiceOver keeps list semantics.
- Text inherits size and colour, so it works inside `Card`, `Alert` and prose-width containers.
- Nest by putting a `List` inside a `List.Item`; it indents one level. A nested `List` uses its own `size`, so a body list inside a `size="heading"` step keeps body markers.
- To theme a `size="heading"` List's markers, override the `--list-heading-*` tokens; `--list-badge-size`, `--list-marker-*` and the other generic marker tokens only reach body-size lists.
- `numberStyle` has no effect on bullets.
- With `numberStyle="badge"` the numbers are visual only; screen readers announce the list position ("1 of 3") rather than the badge text.
- `size="heading"` fits markers to a `Title size="xl"` first line; the badge turns into a rounded square.

When NOT to use: key–value pairs → `DefinitionList`; rows of records → `Card.List` / `Table`; interactive or selectable rows → `Card.List`; custom markers or icons (unsupported).

- ❌ Raw `<ul>` / `<ol>` or `Stack` + `Dot` composites for prose lists: use `List`.
- ❌ Children other than `List.Item` (a `div`, text, a raw `li`): they get no marker and are not counted. Wrapper components are fine if they render `List.Item`.
- ❌ Using `numberStyle="badge"` with `variant="bullet"` expecting badges: it is ignored.
