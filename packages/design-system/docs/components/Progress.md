# `<Progress>` — linear progress bar

```tsx
<Progress value={45} />                            // 45% determinate
<Progress value={67} label />                      // shows "67%" on the right
<Progress value={85} tone="warning" label />       // dark-amber fill (state coding)
<Progress />                                       // value omitted = indeterminate slide
<Progress value={3} max={10} label={`3 of 10`} />  // custom label slot
```

- `value?: number` — omit for indeterminate. NaN, Infinity, and `max <= 0` also fall back to indeterminate (defensive guard for file-upload race conditions where `bytes_uploaded / total_bytes` produces NaN before the total is known). Visual fill is clamped to [0%, 100%]; ARIA reports the raw value for SR debug visibility.
- `max?: number` — default `100`. Use `max={1}` for fraction values, `max={10}` for count-style "3 of 10" semantics.
- `size`: `sm` (4px) / `md` (8px, default) / `lg` (12px) — track height.
- `tone`: `default | success | warning | danger`. Applies to determinate only; indeterminate is always accent (state-color semantics don't apply to an unknown total).
- `label`: `false | true | ReactNode`. `true` shows `{n}%` (auto-suppressed when indeterminate); ReactNode renders in both modes (`label="Loading…"` is the canonical "indeterminate + text" pattern).
- `role="progressbar"` is locked — `Omit<HTMLAttributes, 'role'>` prevents the consumer from overriding it.
- Indeterminate `aria-valuetext` falls back to consumer-passed `aria-label`, then to the translated `progress.indeterminate` (#503) — not a hardcoded English string.
