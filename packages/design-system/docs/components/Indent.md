# `<Indent>` — indent nested content by depth

`<Indent level={n} gutter="lg">` indents its own box by `level × gutter` via `padding-inline-start` (token-based, RTL-aware). The DS-native way to express nesting depth — threaded comment trees, file/outline views — without inline CSS. `level={0}` is flush; nesting compounds. It pads its own box only (wrap a `<Stack>` inside for a multi-row block). For plain sibling spacing use `<Stack gap>`, not Indent.

```tsx
{
  comments.map((c) => (
    <Indent key={c.id} level={c.depth}>
      <CommentCard comment={c} />
    </Indent>
  ));
}
```

- `gutter`: `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 (default) · `xl` 24 · `2xl` 32 (px per level).
- `level` is a depth count (0, 1, 2, …); negatives clamp to 0.
