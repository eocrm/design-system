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

- `node` is a SLOT (pass `<Avatar size="sm">` / a small icon / `<Dot>`) — there's no built-in avatar. Match the node to `--thread-node-size` (default `sm` / 24px) so the rail/elbow connectors meet it cleanly; override `--thread-node-size` for a larger node. The rail branches to each reply with an elbow (`├─`/`└─`).
- `nodeAlign` (default `header`): the node centers on the first body line — set your header (`<Avatar size="sm">` + author/timestamp) as the first child and it aligns automatically; no consumer line-height hack. **Remove any old `lineHeight: var(--size-sm)` (or similar) header override** — it now double-compensates and pushes the text off the node's centre. `nodeAlign="top"` top-aligns the node instead. If your header line-box differs from `<Text size="sm">`, override `--thread-header-line-height`.
- Plain children are the comment body; any direct `<Thread.Item>` child is a reply. Don't wrap a reply in a Fragment / wrapper — the sort matches `Thread.Item` by identity and it won't be detected.
- `maxDepth` (default `4`): once nesting hits the cap, deeper replies render flat (same indent) instead of marching further right. `compact` flows to every nested level via CSS vars.
- **When NOT to use**: a flat activity feed with no parent/child nesting → `<Timeline>`; plain indentation with no connecting line → `<Indent>`.
