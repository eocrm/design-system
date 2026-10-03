# `<Skeleton>` — loading placeholder

```tsx
<Skeleton width={120} />                                    // text line
<Skeleton variant="circular" width={32} />                  // avatar
<Skeleton variant="rectangular" width="100%" height={120} /> // image
<Skeleton loading={isFetching} delay={200} minDuration={300} /> // no flash
```

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
