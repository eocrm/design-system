# `<CircularProgress>` — circular progress / spinner

```tsx
<CircularProgress value={45} />                    // donut, 32px default
<CircularProgress value={75} label />              // centered "75%"
<CircularProgress />                               // indeterminate spinner (the "Loader" use case)
<CircularProgress size="sm" />                     // 16px inline spinner next to a button
<CircularProgress tone="success" value={100} />    // green full circle
```

- Same prop vocabulary as `<Progress>` — `value?`, `max?`, `size`, `tone`, `label`.
- Same NaN/Infinity/max<=0 indeterminate fallback as `<Progress>`.
- `size`: `sm` (16px / 2px stroke) / `md` (32px / 3px stroke, default) / `lg` (56px / 4px stroke).
- Built as inline `<svg viewBox="0 0 36 36">` with two `<circle>` elements (track + fill). Determinate arc is driven by `stroke-dashoffset`; indeterminate is a CSS `rotate` animation on a partial arc.
- Centered `label` auto-suppressed at `size="sm"` (no room for text) AND when `label=true` on indeterminate. ReactNode labels still suppress at `size="sm"` regardless.
- `prefers-reduced-motion` disables the spin animation and shows a static accent ring.
