# `<Progress>` — linear progress bar

```tsx
<Progress value={45} />                            // 45% determinate
<Progress value={67} label />                      // shows "67%" on the right
<Progress value={85} tone="warning" label />       // dark-amber fill (state coding)
<Progress />                                       // value omitted = indeterminate slide
<Progress value={3} max={10} label={`3 of 10`} />  // custom label slot
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `number` | no | — | Current progress value. Omit (or pass `undefined`) to render the indeterminate animation. Two-channel behavior for out-of-range and degenerate values: - **Visual fill** is clamped to [0%, 100%]. Values outside [0, max] render at the nearest valid bound. - **ARIA `aria-valuenow`** reports the raw number — this is the right screen-reader behavior so consumer bugs (a value drifting past max) surface in audits and SR announcements. Degenerate inputs fall back to the indeterminate animation: `NaN`, `Infinity`, `-Infinity`, and the case where `max <= 0`. This is the common file-upload race condition (`bytes_uploaded / total_bytes` before `total_bytes` is known produces NaN). |
| `max` | `number` | no | — | Upper bound. Defaults to `100`. Consumers using fraction values (0.0–1.0) pass `max={1}`. Consumers tracking a count ("3 of 10") pass `max={10}`. |
| `size` | `ProgressSize` | no | — | Track height. - `sm` — 4px (compact / inside form rows) - `md` — 8px (default) - `lg` — 12px (page-level emphasis) |
| `tone` | `ProgressTone` | no | — | Fill color tone. Defaults to `'default'` (accent blue). Tone applies ONLY to determinate mode; indeterminate always uses the accent tone because state-color semantics don't apply to an unknown total. - `default` — `--color-accent` - `success` — `--color-success` - `warning` — `--color-warning-strong` - `danger` — `--color-danger` |
| `label` | `ProgressLabel` | no | — | Optional label rendered to the RIGHT of the bar. - `false` (default) — no label - `true` — render `{Math.round((value / max) * 100)}%` when determinate. Auto-suppressed when indeterminate (there's no percentage to show). - `ReactNode` — render the node as-is, in BOTH determinate and indeterminate modes. Consumers wanting "Loading…" text next to an indeterminate bar pass `label="Loading…"`. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- `value?: number` — omit for indeterminate. NaN, Infinity, and `max <= 0` also fall back to indeterminate (defensive guard for file-upload race conditions where `bytes_uploaded / total_bytes` produces NaN before the total is known). Visual fill is clamped to [0%, 100%]; ARIA reports the raw value for SR debug visibility.
- `max?: number` — default `100`. Use `max={1}` for fraction values, `max={10}` for count-style "3 of 10" semantics.
- `size`: `sm` (4px) / `md` (8px, default) / `lg` (12px) — track height.
- `tone`: `default | success | warning | danger`. Applies to determinate only; indeterminate is always accent (state-color semantics don't apply to an unknown total).
- `label`: `false | true | ReactNode`. `true` shows `{n}%` (auto-suppressed when indeterminate); ReactNode renders in both modes (`label="Loading…"` is the canonical "indeterminate + text" pattern).
- `role="progressbar"` is locked — `Omit<HTMLAttributes, 'role'>` prevents the consumer from overriding it.
- Indeterminate `aria-valuetext` falls back to consumer-passed `aria-label`, then to the translated `progress.indeterminate` — not a hardcoded English string.

Use for per-file upload bars, wizard step indicators, form-completion meters and disk-usage gauges — anything with a known total. Storage-usage panel:

```tsx
<Stack gap="xs">
  <Title order={3} size="md">
    Storage
  </Title>
  <Progress value={85} max={100} tone="warning" label />
  <Text size="sm" tone="muted">
    85 GB of 100 GB used
  </Text>
</Stack>
```

**When NOT to use**

- An inline loading affordance next to a button — use indeterminate `<CircularProgress>`.
- Celebrating completion — a done bar is a done bar; leave the default tone. `tone` communicates state during progress (warning near a threshold, danger when over), not success-on-finish (so no `tone="success"` at `value={100}`).
- Arbitrary horizontal lines — use `<Divider>`.

**Anti-patterns**

- ❌ A hand-rolled `<div style={{ width: `${n}%`, … }}>` bar — use the primitive.
- ❌ `<Progress role="…">` — `role` is locked to `progressbar`; TypeScript rejects the override.
- ❌ A separate consumer-rendered label element — the `label` slot already handles spacing, font size and tabular-nums for stable digit widths.
