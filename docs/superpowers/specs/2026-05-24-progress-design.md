# Progress + CircularProgress — design spec

**Date:** 2026-05-24
**Branch:** `feat/file-upload` (Progress ships first as a pre-req for FileUpload — see "Why now" below)
**Scope:** Two new primitives — `<Progress>` (linear) and `<CircularProgress>` — added to `@eocrm/design-system`. Both support determinate (`value` 0–`max`) and indeterminate (`value` omitted) modes, four tones, three sizes, and an optional inline label.

## Goal

Give consumers two opinionated, token-backed progress affordances so they stop reaching for raw `<div style={{ width: '${n}%', height: '8px', background: '#xxx' }}>` patterns and stop pulling in a separate spinner library for inline loading states.

Both shapes serve distinct purposes:

- **`<Progress>`** — tracks known progress against a known total. Canonical uses in the CRM: per-file upload bars in `<FileUpload>` (the next consumer), wizard step completion, disk-usage gauges, form-completion meters.
- **`<CircularProgress>`** — also tracks progress (donut chart shape) but more commonly used as a loading affordance in its indeterminate mode (inline next to a "Saving…" button, centered in a card while data fetches).

## Why now

`<FileUpload>` (next session's brainstorm) needs per-file progress UI. The plan was originally to inline a tiny `.progressBar` SCSS rule in FileUpload for v1 and ship `<Progress>` later. The user chose instead to ship `<Progress>` first as a pre-req, with FileUpload importing it cleanly. This PR delivers that pre-req.

Other near-term consumers already on the wishlist:

- Toast progress (an upload toast that shows live percentage)
- Multi-step wizard step indicators (a single bar across the top showing "step 3 of 5")
- Inline `<Spinner>`-style loading next to async-fetch UI (CircularProgress in indeterminate mode)

## Non-goals (v1)

- **No `striped`, `animated`, `buffer`, or `segmented` props.** Bootstrap-style striped bars and Material-style buffer bars are not requested. YAGNI.
- **No `<ProgressGroup>` / multi-segment Progress.** A bar with three differently-colored segments ("70 KB done, 20 KB in flight, 10 KB pending") is a real Bootstrap pattern but no current consumer asks for it.
- **No `RadialProgress` / `Gauge` / arc-only shapes.** Just full-circle donut for `<CircularProgress>`.
- **No `min` prop on either component.** Implicit min = 0. Consumers using a non-zero baseline can rescale themselves.
- **No imperative API** (no `progressRef.current.setValue(45)`). Pure declarative.
- **No automatic completion side effects** — `value === max` does NOT fire an `onComplete` callback, hide the bar, or do anything beyond rendering. State management is the consumer's.
- **No animation customization** — the indeterminate animation duration and easing are baked into the SCSS. Consumers wanting different timing override via `.progress` class or wrap with a custom component.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- Existing tokens: `--color-accent`, `--color-success`, `--color-warning`, `--color-danger`, `--color-bg-muted`, `--color-fg`, `--color-fg-muted`, `--font-size-sm`, `--font-weight-medium`, `--radius-full` (9999px, used as pill-shape end-caps on the linear bar), `--space-1`, `--space-2`, `--transition-base` (140ms ease-out).

No new tokens needed.

### File layout

```
packages/design-system/src/components/Progress/
  Progress.tsx                ← NEW (linear)
  Progress.module.scss        ← NEW
  Progress.test.tsx           ← NEW
  index.ts                    ← NEW

packages/design-system/src/components/CircularProgress/
  CircularProgress.tsx        ← NEW
  CircularProgress.module.scss ← NEW
  CircularProgress.test.tsx   ← NEW
  index.ts                    ← NEW

packages/design-system/src/index.ts                                ← MODIFY: re-exports
packages/design-system/AGENTS.md                                   ← MODIFY: add Progress section before Skeleton

packages/playground/src/pages/components/ProgressDemo.tsx          ← NEW
packages/playground/src/pages/components/CircularProgressDemo.tsx  ← NEW
packages/playground/src/App.tsx                                    ← MODIFY: 2 routes
packages/playground/src/layout/AppShell/AppShell.tsx               ← MODIFY: add to "Display" group
packages/playground/src/pages/components/ComponentsIndex.tsx       ← MODIFY: 2 cards
packages/playground/src/pages/mockups/registry.ts                  ← MODIFY: extend ComponentName union (no current mockup uses Progress yet — the registry entry just makes the type available)
```

Two separate component directories instead of one shared directory. The internals diverge enough (div+width vs svg+stroke-dashoffset) that sharing a directory would force `Progress/Progress.tsx` and `Progress/Circular.tsx` to import from each other, which is more friction than the discoverability win.

### Composition example

```tsx
<Stack gap="md">
  <Title order={3}>Storage usage</Title>
  <Progress value={85} max={100} tone="warning" label />
  <Text size="sm" tone="muted">85 GB of 100 GB used</Text>
</Stack>

<Cluster gap="sm">
  <Button>Save</Button>
  <CircularProgress size="sm" aria-label="Saving" />
</Cluster>

<Card>
  <Stack gap="sm">
    <Text>Uploading contacts.csv</Text>
    <Progress value={uploadedBytes} max={totalBytes} />
  </Stack>
</Card>
```

## Public API

### `<Progress>` (linear)

```ts
import type { HTMLAttributes, ReactNode } from 'react';

/** Visual size — controls the track height. */
export type ProgressSize = 'sm' | 'md' | 'lg';

/** Color tone for the fill. Default `'default'` uses the accent color. */
export type ProgressTone = 'default' | 'success' | 'warning' | 'danger';

/** Label render mode. */
export type ProgressLabel = boolean | ReactNode;

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /**
   * Current progress value in the inclusive range [0, max]. Omit (or pass
   * `undefined`) to render the indeterminate animation. The component does
   * NOT clamp — values outside [0, max] render visually clipped but ARIA
   * still reports the raw number, which is the right SR behavior for
   * detecting consumer bugs.
   */
  value?: number;
  /**
   * Upper bound. Defaults to `100`. Consumers using fraction values
   * (0.0–1.0) pass `max={1}`. Consumers tracking a count ("3 of 10")
   * pass `max={10}`.
   */
  max?: number;
  /**
   * Track height.
   * - `sm` — 4px (compact / inside form rows)
   * - `md` — 8px (default)
   * - `lg` — 12px (page-level emphasis)
   */
  size?: ProgressSize;
  /**
   * Fill color tone. Defaults to `'default'` (accent blue). Tone applies
   * ONLY to determinate mode; indeterminate always uses the accent tone
   * because state-color semantics don't apply to an unknown total.
   * - `default` — `--color-accent`
   * - `success` — `--color-success`
   * - `warning` — `--color-warning`
   * - `danger` — `--color-danger`
   */
  tone?: ProgressTone;
  /**
   * Optional label rendered to the RIGHT of the bar.
   * - `false` (default) — no label
   * - `true` — render `{Math.round((value / max) * 100)}%` when determinate.
   *   Auto-suppressed when indeterminate (there's no percentage to show).
   * - `ReactNode` — render the node as-is, in BOTH determinate and
   *   indeterminate modes. Consumers wanting "Loading…" text next to an
   *   indeterminate bar pass `label="Loading…"`.
   */
  label?: ProgressLabel;
}
```

The component renders:

```tsx
<div
  className={clsx(styles.progress, styles[`size-${size}`], styles[`tone-${tone}`], className)}
  role="progressbar"
  aria-valuenow={determinate ? value : undefined}
  aria-valuemin={0}
  aria-valuemax={max}
  aria-valuetext={determinate ? undefined : (ariaLabel ?? 'Loading…')}
  {...rest}
>
  <div className={styles.track}>
    <div
      className={clsx(styles.fill, indeterminate && styles.indeterminate)}
      style={determinate ? { width: `${percent}%` } : undefined}
    />
  </div>
  {label !== false && !(label === true && indeterminate) && (
    <span className={styles.label}>{label === true ? `${Math.round(percent)}%` : label}</span>
  )}
</div>
```

(Label render rule: `false` → nothing; `true` + determinate → `{n}%`; `true` + indeterminate → nothing; ReactNode → render the node regardless of mode.) The label slot can be a Cluster with the bar on the left and the label on the right. The outer `.progress` element handles `display: flex; align-items: center; gap: var(--space-2)` so consumers don't have to wrap.

### `<CircularProgress>` (circular)

```ts
import type { HTMLAttributes, ReactNode } from 'react';

export type CircularProgressSize = 'sm' | 'md' | 'lg';
export type CircularProgressTone = 'default' | 'success' | 'warning' | 'danger';
export type CircularProgressLabel = boolean | ReactNode;

export interface CircularProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Same shape as ProgressProps#value. Omit for indeterminate. */
  value?: number;
  /** Same as ProgressProps#max. Defaults to 100. */
  max?: number;
  /**
   * Diameter + stroke pairing.
   * - `sm` — 16px diameter, 2px stroke (inline next to a button)
   * - `md` — 32px diameter, 3px stroke (default, near a heading)
   * - `lg` — 56px diameter, 4px stroke (page-level loader)
   */
  size?: CircularProgressSize;
  /** Same as ProgressProps#tone. Indeterminate ignores tone. */
  tone?: CircularProgressTone;
  /**
   * Optional centered label.
   * - `false` (default) — no label
   * - `true` — render `{percent}%` centered. Auto-suppressed at `size='sm'`
   *   (16px circle has no room for text) AND when indeterminate.
   * - `ReactNode` — render the node centered, in BOTH modes (still
   *   auto-suppressed at `size='sm'` regardless — the geometry doesn't
   *   change).
   */
  label?: CircularProgressLabel;
}
```

The component renders:

```tsx
<div
  className={clsx(styles.circular, styles[`size-${size}`], styles[`tone-${tone}`], className)}
  role="progressbar"
  aria-valuenow={determinate ? value : undefined}
  aria-valuemin={0}
  aria-valuemax={max}
  aria-valuetext={determinate ? undefined : (ariaLabel ?? 'Loading…')}
  {...rest}
>
  <svg viewBox="0 0 36 36" className={styles.svg}>
    <circle className={styles.track} cx="18" cy="18" r={radius} />
    <circle
      className={clsx(styles.fill, indeterminate && styles.indeterminate)}
      cx="18"
      cy="18"
      r={radius}
      strokeDasharray={circumference}
      strokeDashoffset={determinate ? offset : undefined}
    />
  </svg>
  {label !== false && size !== 'sm' && !(label === true && indeterminate) && (
    <span className={styles.label}>{label === true ? `${Math.round(percent)}%` : label}</span>
  )}
</div>
```

The `viewBox="0 0 36 36"` + `r={16}` give a circle with circumference ≈ 100.53, so `strokeDashoffset = circumference * (1 - value / max)` produces the right partial-fill arc without needing per-size circumference math.

## Styling — module SCSS rules

### `Progress.module.scss`

```scss
.progress {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.track {
  flex: 1;
  background: var(--color-bg-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
}

.size-sm .track,
.size-sm .fill {
  height: 4px;
}

.size-md .track,
.size-md .fill {
  height: 8px;
}

.size-lg .track,
.size-lg .fill {
  height: 12px;
}

.tone-default .fill {
  background: var(--color-accent);
}
.tone-success .fill {
  background: var(--color-success);
}
.tone-warning .fill {
  background: var(--color-warning);
}
.tone-danger .fill {
  background: var(--color-danger);
}

.indeterminate {
  width: 30% !important;
  animation: progressSlide 1.2s linear infinite;
}

@keyframes progressSlide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.label {
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
```

**Rule 4 check:**

- `.progress` is flex with `width: 100%`. The 100% width is the only `width` value on a non-internal element — it's intrinsic, not a layout instruction at the boundary. Inside a `<Stack>`, the parent controls width; `.progress` just fills the slot it's given.
- `.track flex: 1` is internal child sizing inside the `.progress` flex container — allowed.
- `.label flex-shrink: 0` is internal sizing — allowed.
- No `margin`, no `position`, no `top/left/right/bottom`. Clean.
- The `!important` on `.indeterminate width` is necessary because the inline `style={{ width: ... }}` from determinate mode would otherwise win. The CSS rule needs to override the inline style when transitioning to indeterminate. Annotated with a comment in the SCSS.

### `CircularProgress.module.scss`

```scss
.circular {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.svg {
  transform: rotate(-90deg);
  overflow: visible;
}

.size-sm {
  width: 16px;
  height: 16px;
}
.size-md {
  width: 32px;
  height: 32px;
}
.size-lg {
  width: 56px;
  height: 56px;
}

.size-sm .svg .track,
.size-sm .svg .fill {
  stroke-width: 2;
}

.size-md .svg .track,
.size-md .svg .fill {
  stroke-width: 3;
}

.size-lg .svg .track,
.size-lg .svg .fill {
  stroke-width: 4;
}

.track {
  fill: none;
  stroke: var(--color-bg-muted);
}

.fill {
  fill: none;
  stroke: var(--color-accent);
  stroke-linecap: round;
  transition: stroke-dashoffset var(--transition-base);
}

.tone-default .fill {
  stroke: var(--color-accent);
}
.tone-success .fill {
  stroke: var(--color-success);
}
.tone-warning .fill {
  stroke: var(--color-warning);
}
.tone-danger .fill {
  stroke: var(--color-danger);
}

.indeterminate {
  animation: circularSpin 1.2s linear infinite;
  stroke-dasharray: 30 100 !important;
}

@keyframes circularSpin {
  to {
    transform: rotate(360deg);
  }
}

.label {
  position: absolute;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg);
  font-variant-numeric: tabular-nums;
}
```

**Rule 4 check on `position`:** `.circular` uses `position: relative` to anchor the absolutely-positioned `.label`. `.label` uses `position: absolute` to center inside the circle. Both are internal-child layout for the centered-text-in-donut pattern — NOT layout-at-the-component-boundary. Same exception used in Avatar's status-dot positioning. Document with a SCSS comment.

The `.indeterminate` `transform: rotate(...)` animation applies to the SVG, not to the outer `.circular`. The outer can still receive consumer-supplied transforms via `style`.

## ARIA + behavior reference

| Concern                | Behavior                                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root role**          | `role="progressbar"` on the outermost `<div>` for both linear and circular.                                                                                                                              |
| **Determinate ARIA**   | `aria-valuenow={value}`, `aria-valuemin={0}`, `aria-valuemax={max}`. `aria-valuetext` left undefined so SR uses the default "{n} percent" announcement.                                                  |
| **Indeterminate ARIA** | `aria-valuenow` omitted (`undefined`). `aria-valuemin`/`max` still present. `aria-valuetext="Loading…"` by default; consumer can override via `aria-label`.                                              |
| **Tone semantics**     | Visual only. SRs do NOT announce "warning" tone. Consumers needing semantic urgency wrap with `role="alert"`.                                                                                            |
| **Label slot**         | When `label` is true or a ReactNode, the text is rendered in the DOM and reachable by screen readers. When `label` is true on indeterminate mode, no label renders.                                      |
| **Focus**              | Neither component is focusable. Interactive children (cancel button next to a progress bar) carry their own focus.                                                                                       |
| **Reduced motion**     | `@media (prefers-reduced-motion: reduce)` disables both animations (`progressSlide`, `circularSpin`) and replaces the indeterminate fill with a static 100% accent bar / circle. Documented in the SCSS. |

## Testing

### `Progress.test.tsx` (~15 cases)

1. Renders with no props (indeterminate by default) — `role="progressbar"`, no `aria-valuenow`
2. `value={45}` renders with `aria-valuenow={45}`, `aria-valuemin={0}`, `aria-valuemax={100}`
3. `value={3} max={10}` renders with `aria-valuemax={10}`
4. Each size applies the matching class (parameterized, sm/md/lg)
5. Each tone applies the matching class (parameterized, default/success/warning/danger)
6. `label` false: no label DOM
7. `label` true determinate: shows `${Math.round(percent)}%` text
8. `label` true indeterminate: no label DOM (indeterminate suppresses the percentage label)
9. `label` ReactNode determinate: renders the node
10. `label` ReactNode indeterminate (e.g. `label="Loading…"`): renders the node — ReactNode is not auto-suppressed
11. Indeterminate state applies the `.indeterminate` class on `.fill`
12. Determinate state sets inline `style.width = '${percent}%'`
13. `value > max` clamps visually but ARIA reports the raw value
14. `className` from props merges (does not replace) base class
15. Spreads native HTML attrs (`id`, `data-testid`, `aria-label`)

### `CircularProgress.test.tsx` (~15 cases)

1. Renders with no props (indeterminate by default) — `role="progressbar"`, no `aria-valuenow`
2. `value={45}` renders `aria-valuenow={45}`, default `max={100}`
3. `value={3} max={10}` reports `aria-valuemax={10}`
4. Each size applies the matching class (parameterized)
5. Each tone applies the matching class (parameterized)
6. Renders an `<svg>` with `viewBox="0 0 36 36"` and two `<circle>` elements (track + fill)
7. Determinate state sets `strokeDashoffset` on the fill circle
8. Indeterminate state applies the `.indeterminate` class on the fill circle
9. `label` false: no label DOM
10. `label` true determinate (size md or lg): shows percentage text
11. `label` true indeterminate (size md): no label (auto-suppressed)
12. `label` true with `size="sm"`: no label (auto-suppressed regardless of mode)
13. `label` ReactNode at `size="md"`: renders the node (both modes)
14. `className` from props merges
15. Spreads native HTML attrs

## Demo additions

### `ProgressDemo.tsx` — examples

1. **Sizes** — `sm` / `md` / `lg` with `value={60}` to show track height difference
2. **Tones** — all four tones at `value={75}`
3. **Determinate vs indeterminate** — two bars side by side, one with `value={45}`, one with no value
4. **Labels** — three bars: `label={false}` (default), `label={true}` (percent), `label={"3 of 10"}` (custom ReactNode)
5. **Composing in a card** — Card with Title + Progress + Text-muted (the canonical "Storage usage" panel)
6. **Live demo** — an interactive `value` slider that drives a Progress underneath

### `CircularProgressDemo.tsx` — examples

1. **Sizes** — `sm` / `md` / `lg` determinate at 45% to show diameter scaling
2. **Tones** — all four tones at `value={80}`
3. **Indeterminate** — three sizes spinning (this is the "Spinner" use case — show it clearly)
4. **Labels** — `md` and `lg` with `label` true; show that `sm` ignores the label
5. **Inline with a button** — `<Cluster><Button>Save</Button><CircularProgress size="sm" /></Cluster>` — the canonical loading pattern

## AGENTS.md update

Add a **Progress** section to `packages/design-system/AGENTS.md` placed right before the `<Skeleton>` section (both are "feedback / loading state" primitives — they should sit adjacent in the file). Section contents:

- `<Progress>` API table (value, max, size, tone, label)
- `<CircularProgress>` API table
- Two canonical snippets: storage-usage panel + inline button spinner
- "Hard rule" subsection:
  - ❌ Raw `<div style={{ width: '${n}%', background: ... }}>` — use `<Progress value={n}>`
  - ❌ Spinning-circle SVGs hand-rolled per-page — use `<CircularProgress />` indeterminate
  - ❌ `<Progress tone="success" value={100}>` to "celebrate" completion. Tones communicate STATE during progress (warning at 85%, danger at 95%), not celebration. A done bar is a done bar — leave it the default tone.

## Self-imposed constraints / decisions baked in

- **Indeterminate trigger = `value` omitted.** No `indeterminate: boolean` prop. Matches Mantine, Chakra. The TS type makes `value` optional.
- **No animation API.** Reduced-motion handled via CSS media query; consumers wanting custom timing override the SCSS class.
- **Two separate components, not one.** Diverging internals justify the split. Shared vocabulary (`size`, `tone`, `label`, `value`, `max`) keeps the mental model unified.
- **Linear label sits to the RIGHT of the bar always** (no inside-the-bar option). Inside-the-bar fails at low values and on `tone="danger"` (white text on red would clash with `tone="warning"` orange).
- **Circular label is centered**, auto-suppressed at `size="sm"` (16px circle has no room for text).
- **`role="progressbar"` is forbidden via `Omit<HTMLAttributes, 'role'>`.** Consumers can't override the role — it's the component's contract.

## Hard Rule 8

Standard cycle: gates green, fresh-context reviewer, fix Critical + Important, repeat until clean.

## Open questions (called out during brainstorming)

1. **`label` placement on linear** — decided RIGHT, not inside. Documented above.
2. **CircularProgress label at `size="sm"`** — decided auto-suppress. Documented above.
3. **Indeterminate animation timing** — picked 1.2s linear infinite, 30%-width pulse for linear, full-rotation for circular. Tweakable in SCSS without breaking the public API.

None remain unresolved.
