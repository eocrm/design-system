# `<Thread>` — nested-reply threading primitive

`<Thread>` + `<Thread.Item node>` — a per-level left vertical rail connecting a parent comment to its nested replies, with the leading `node` slot (`<Avatar>` / icon / `<Dot>`) as the connection point. Replies are written as nested `<Thread.Item>`s; the recursive compound detects them (by identity) and indents under the rail. Depth-capped (`maxDepth`, default `4`) so deep threads stop marching right — past the cap, replies render flat at the same indent. `<Thread compact>` tightens the gaps for dense sidebars. The node centers on the first body line (the header) by default — pass `nodeAlign="top"` to top-align it instead. The rail terminates at the last reply's elbow, so it's surface-independent (no `--thread-surface` to keep in sync — works on tinted backgrounds). Semantic `<ul>`/`<li>`.

```tsx
<Thread maxDepth={4}>
  <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
    <Stack gap="xs">
      <Text size="sm">
        <strong>Maya Chen</strong> · 2h ago
      </Text>
      <Text size="sm">Flagged the Acme renewal — usage dropped last quarter.</Text>
    </Stack>
    {/* replies = nested <Thread.Item>s; render them inline with the body */}
    <Thread.Item node={<Avatar name="Tom Okafor" size="sm" />}>
      <Text size="sm">Good catch — I'll set up a call.</Text>
    </Thread.Item>
  </Thread.Item>
</Thread>
```

<!-- props:start -->

## Props

### `ThreadProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `maxDepth` | `number` | no | — | Max visual nesting depth before replies render flat (no further indent). Once the cap is reached, deeper replies keep the same indent level so the thread stops marching right. Default `4`. |
| `compact` | `boolean` | no | — | Tighter gaps for dense surfaces (sidebars, panels). The remapped tokens cascade to every nested item via CSS custom properties. Default `false`. |
| `nodeAlign` | `ThreadNodeAlign` | no | — | Where the leading `node` sits relative to the comment body. - `header` (default) — vertically centered on the **first body line** (the author / timestamp header), Jira/GitHub style, so a node taller than one line (e.g. a 24px `<Avatar>`) reads as centered against the name rather than top-aligned. Assumes the header line-box matches `--thread-header-line-height` (defaults to `<Text size="sm">`); override that token if your header line differs. Remove any old header `lineHeight` override (e.g. `var(--size-sm)`) — it now double-compensates. - `top` — top-aligned with the body (the node's top meets the body's top). Use when the node is about one line tall, or when you deliberately want top alignment. |
| `children` | `ReactNode` | yes | — | The `<Thread.Item>`s. |
| …native | | | | plus native `<ul>` attributes |

### `ThreadItemProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `node` | `ReactNode` | yes | — | The leading marker the rail connects to — an `<Avatar>`, icon, or `<Dot>`. Centered in its node box so the rail/elbow connectors meet it cleanly regardless of node content; by default the box centers on the first body line so a taller node aligns to the header (see `Thread`'s `nodeAlign`). It's a slot: there is no built-in avatar. Size the node to `--thread-node-size` (default `sm` / 24px) — e.g. `<Avatar size="sm">`; for a larger node, override `--thread-node-size` to match. |
| `children` | `ReactNode` | yes | — | The comment body/actions, plus optional nested `<Thread.Item>` replies. Plain children render as the comment body; any direct `<Thread.Item>` child renders as a reply under the rail. |
| …native | | | | plus native `<li>` attributes |

<!-- props:end -->

- Plain children are the comment body; any direct `<Thread.Item>` child is a reply. Don't wrap a reply in a Fragment / wrapper — the sort matches `Thread.Item` by identity and it won't be detected.
- **When NOT to use**: a flat activity feed with no parent/child nesting → `<Timeline>`; plain indentation with no connecting line → `<Indent>`.

- Also not for a non-threaded vertical list (`<Stack>`) or an avatar + name/meta row (`<PersonDisplay>`; use it as an item's `node` / body, not instead of Thread).
- ❌ Layout margins on items: spacing comes from `compact` / the row-gap token.
