# `<Skeleton>` — loading placeholder

```tsx
<Skeleton width={120} />                                    // text line
<Skeleton variant="circular" width={32} />                  // avatar
<Skeleton variant="rectangular" width="100%" height={120} /> // image
<Skeleton loading={isFetching} delay={200} minDuration={300} /> // no flash
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `variant` | `SkeletonVariant` | no | — | Shape preset. Defaults to `'text'`. - `'text'` — inline-block; `height` defaults to `1em` so it sits on text baselines. Use inside paragraphs / labels for word-shaped placeholders. - `'circular'` — `border-radius: 50%`; when only one of `width`/`height` is set, the other matches (square). Avatar / icon placeholder. - `'rectangular'` — block, small radius. Image / card / button placeholder. |
| `width` | `string \| number` | no | — | Explicit width. Number → px, string → as-is (e.g., `'60%'`, `'12rem'`). |
| `height` | `string \| number` | no | — | Explicit height. Number → px, string → as-is. Defaults: `text` → `1em`, `circular` → matches `width` (square), `rectangular` → no default (consumer must size). |
| `animation` | `SkeletonAnimation` | no | — | Animation. Defaults to `'pulse'`. - `'pulse'` — opacity 1 → 0.6 → 1, 1.5s ease-in-out infinite. - `'none'` — static. Use when stacking many skeletons to avoid motion overload. Regardless of this prop, animation is suppressed when the user has `prefers-reduced-motion: reduce`. |
| `loading` | `boolean` | no | — | Whether the loading placeholder is needed. Defaults to `true`. Keep Skeleton mounted and drive this prop when using `minDuration`, so the component can finish its visibility window after loading completes. |
| `delay` | `number` | no | — | Milliseconds to wait before rendering the placeholder. Defaults to `0`. A load that finishes inside this window never displays the Skeleton. |
| `minDuration` | `number` | no | — | Minimum milliseconds to remain visible after the placeholder renders. Defaults to `0`. Prevents a Skeleton that appears just after `delay` from disappearing again within a frame or two. |
| …native | | | | plus native `<span>` attributes |

<!-- props:end -->

For a mutually exclusive placeholder/content branch, use the public timing hook:

```tsx
const showPlaceholder = useSkeletonVisibility(isFetching, {
  delay: 200,
  minDuration: 300,
});

return showPlaceholder ? (
  <Skeleton variant="rectangular" width="100%" height={120} />
) : isFetching ? null : (
  <ContactList contacts={contacts} />
);
```

- Three variants: `text` (default, inline, `height=1em`), `circular` (avatar / icon, square when only one dim set), `rectangular` (image / card / button, block).
- `width` / `height` flow to inline style — `number` becomes `px`, `string` passes through (`'60%'`, `'12rem'`).
- `animation`: `'pulse'` (default, opacity cycle) / `'none'` (static).
- Timed visibility: keep Skeleton mounted, drive `loading`, and use `delay` to suppress fast-load flashes plus `minDuration` to prevent a just-shown placeholder from vanishing immediately. All three preserve legacy behavior by default (`loading=true`, both durations `0`). Do not conditionally unmount a timed Skeleton — unmounting bypasses `minDuration`.
- `useSkeletonVisibility(loading, { delay, minDuration })` exposes the same timing semantics for composite components that must choose between placeholder and content. During the delay it returns `false`, so guard the content branch with `loading` when stale content must not render.
- Pulse is **automatically suppressed** when the user has `prefers-reduced-motion: reduce`.
- `aria-hidden='true'` by default — Skeleton is decorative. Communicate "loading" from a parent live region you own. Note `aria-busy` alone on the section will NOT do it — no mainstream screen reader speaks it on a non-live element; pair it with `role="status"` and text that changes. Skeleton is one of the few components where announcing is genuinely yours, because it has no state of its own to describe.
- Composes — for a list-row placeholder, render `<Skeleton variant='circular' />` + 2–3 text skeletons + a button-shaped rectangular in a Cluster.
- Use `<EmptyState>` for "nothing here yet" — Skeleton implies "loading," not "empty."

```tsx
// List-row loading: avatar + two text lines + button
<Cluster gap="md" align="center">
  <Skeleton variant="circular" width={32} />
  <Stack gap="xs" style={{ flex: 1 }}>
    <Skeleton width="60%" />
    <Skeleton width="40%" />
  </Stack>
  <Skeleton variant="rectangular" width={80} height={32} />
</Cluster>
```

**Anti-patterns**

- Wrapping real content in a Skeleton: it is a leaf, don't pass children.
- Omitting all dimensions on `rectangular`: with no `width` / `height` the box has zero size and renders invisibly. Always size it.
- Showing an immediate placeholder for loads that resolve quickly: use `delay` so fast loads never display it.
- Conditionally unmounting a timed Skeleton (`{loading && <Skeleton minDuration={300} />}`): React removes it before the minimum can finish. Keep it mounted and pass `loading={loading}`.
