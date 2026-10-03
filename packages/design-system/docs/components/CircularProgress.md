# `<CircularProgress>` — circular progress / spinner

```tsx
<CircularProgress value={45} />                    // donut, 32px default
<CircularProgress value={75} label />              // centered "75%"
<CircularProgress />                               // indeterminate spinner (the "Loader" use case)
<CircularProgress size="sm" />                     // 16px inline spinner next to a button
<CircularProgress tone="success" value={100} />    // green full circle
<CircularProgress size="lg" value={80} tone="success" label />  // stat-card-style donut
<CircularProgress value={3} max={10} label={`3 / 10`} />        // custom label ("n of N", a status word)

// Canonical inline loader next to a button
<Cluster gap="sm">
  <Button>Save</Button>
  <CircularProgress size="sm" aria-label="Saving" />
</Cluster>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `number` | no | — | Current progress value. Omit (or pass `undefined`) to render the indeterminate spinning animation. Two-channel behavior for out-of-range and degenerate values: - **Visual arc** is clamped to [0%, 100%]. Values outside [0, max] render at the nearest valid bound. - **ARIA `aria-valuenow`** reports the raw number so consumer bugs (a value drifting past max) surface in audits and SR announcements. Degenerate inputs fall back to the indeterminate spinner: `NaN`, `Infinity`, `-Infinity`, and the case where `max <= 0`. This is the common file-upload race condition (`bytes_uploaded / total_bytes` before `total_bytes` is known produces NaN). |
| `max` | `number` | no | — | Upper bound. Defaults to `100`. Consumers using fraction values (0.0–1.0) pass `max={1}`. Consumers tracking a count ("3 of 10") pass `max={10}`. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | — | Diameter + stroke pairing. - `sm` — 16px diameter, 2px stroke (inline next to a button — also the shape to use for "Saving…" loading affordances; pass no `value` for the indeterminate spinner.) - `md` — 32px diameter, 3px stroke (default — near a heading) - `lg` — 56px diameter, 4px stroke (page-level loader) |
| `tone` | `'default' \| 'success' \| 'warning' \| 'danger'` | no | — | Stroke color tone. Defaults to `'default'` (accent blue). Same vocab as `<Progress>`. Indeterminate ignores tone — always accent. |
| `label` | `CircularProgressLabel` | no | — | Optional centered label. - `false` (default) — no label - `true` — render `{Math.round(percent)}%` centered. Auto-suppressed at `size='sm'` (16px circle has no room for text) AND when indeterminate. - `ReactNode` — render the node centered in BOTH modes. Still auto-suppressed at `size='sm'` regardless — the geometry doesn't change. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- Same prop vocabulary as `<Progress>` — `value?`, `max?`, `size`, `tone`, `label`.
- Same NaN/Infinity/max<=0 indeterminate fallback as `<Progress>`.
- Built as inline `<svg viewBox="0 0 36 36">` with two `<circle>` elements (track + fill). Determinate arc is driven by `stroke-dashoffset`; indeterminate is a CSS `rotate` animation on a partial arc.
- Centered `label` auto-suppressed at `size="sm"` (no room for text) AND when `label=true` on indeterminate. ReactNode labels still suppress at `size="sm"` regardless.
- `prefers-reduced-motion` disables the spin animation and shows a static accent ring.

- `role="progressbar"` is locked (can't be overridden via the `role` prop) and is announced to screen readers. Tracks known progress like `<Progress>` in a circular geometry, better for inline loading indicators and tight spaces; indeterminate mode is the canonical spinner.

#### When NOT to use

- ❌ Horizontal progress next to row content → `<Progress>` linear.
- ❌ Replacing `<Skeleton>` for loading placeholders. Skeleton implies "structure on its way"; CircularProgress implies "I'm working on it."
- ❌ A decorative icon: the `progressbar` role is announced.

#### Anti-patterns

- ❌ Hand-rolled spinning `<svg>` per page. `<CircularProgress />` indeterminate is the same visual, accessible and reduced-motion-aware.
- ❌ `<CircularProgress value={0}>` to render an empty circle. `value={0}` is determinate (0% done); the intent is usually indeterminate, so omit `value`.
- ❌ `<CircularProgress size="sm" label>` expecting centered text in a 16px circle. The label is auto-suppressed at `sm` by design; use `md` or `lg`.
