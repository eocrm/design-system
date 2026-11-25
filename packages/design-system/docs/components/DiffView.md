# `DiffView` — unified text diff with added/removed/context lines

```tsx
<DiffView fromLabel="Version 3" toLabel="Version 4" diff={unifiedDiff} />;

// Backend says the diff is too large: render your own notice instead.
{
  result.status === 'too_large' ? (
    <Alert tone="info">This change is too large to display.</Alert>
  ) : (
    <DiffView diff={result.diff} />
  );
}
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `diff` | `string` | yes | Unified text diff (with hunk headers), e.g. from `git diff` or PHP `sebastian/diff`. |
| `fromLabel` | `string` | no | Header label for the old side; shown as "fromLabel → toLabel", or alone when `toLabel` is unset. |
| `toLabel` | `string` | no | Header label for the new side. |
| `lineNumbers` | `boolean` | no | Show old/new line-number gutters, computed from the `@@` ranges. Default: `true`. |
| `wrap` | `boolean` | no | Wrap long lines. `false` keeps each line on one row and scrolls horizontally. Default: `true`. |
| `maxHeight` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | no | Frame max-height step; the diff scrolls past it. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **Input:** a unified diff (`@@ -a,b +c,d @@` hunks), e.g. from `git diff` or PHP `sebastian/diff`. Line numbers come from the `@@` ranges. An empty or hunk-less diff renders "No changes".
- **`too_large` pattern:** DiffView renders whatever it is given. When the backend refuses to produce a diff (`too_large`), the consumer renders its own notice instead of `DiffView`.
- **Accessibility:** a table named by the header label (or "Changes" without labels); each hunk is a row group labelled "Lines 12–15 → 12–17"; `+`/`−` are paired with hidden "Added"/"Removed" text, so colour is never the only signal.
- **`maxHeight`** caps the diff body; the header stays fixed above it.

## When NOT to use

- Code samples, not changes: use `CodeBlock`.
- Word-level (intra-line) highlighting or side-by-side layout: not supported.
- Editing or merging: DiffView is read-only.

## Anti-patterns

- Don't pass non-unified formats (JSON patches, `diff -y`): they render as nothing or "No changes".
- Don't wrap it in a scroll container for height; use `maxHeight` so the header stays fixed.
- Don't give it margin or width via `className`; lay it out with `Stack` / `Cluster`.
