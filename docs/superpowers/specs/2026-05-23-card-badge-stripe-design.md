# Card tone + Badge stripe variant — design spec

**Date:** 2026-05-23
**Branch:** `feat/card-badge-stripe`
**Scope:** Two related visual additions in one PR. (1) Card gets an optional `tone` prop that draws a tone-colored left stripe (matches the inline pattern in `Dashboard.module.scss`'s `.statCard`). (2) Badge gets a new `variant="stripe"` that renders rectangular (not pill) with a tone-colored left stripe + tinted body.

## Goal

Formalize the "tone-coded left stripe" emphasis pattern that the dashboard already uses inline. Two surfaces:

- **Card**: an opt-in `tone` prop. Default = no stripe (current bordered look). When set, draws a 3px stripe in the tone color on the left edge.
- **Badge**: a new `variant="stripe"` that swaps the pill shape for a rectangular block with a tone-colored left stripe + a softly-tinted body. Coexists with the default `variant="filled"` (the current pill).

Both use the existing tone vocabulary (`accent` / `info` / `success` / `warning` / `danger`), driven by the same color tokens Alert uses.

## Why now

- `Dashboard.tsx` already paints accent stripes on stat cards via inline className override + hand-rolled SCSS. Any other page wanting the same pattern would copy the recipe. Promoting it to a Card prop unifies.
- Badge currently has only the filled-pill shape. Several CRM patterns (deal-stage labels, task tags) want a rectangular tone-coded chip that reads as "category marker" rather than "loud status pill". A `variant="stripe"` covers that gap without losing the existing pill.
- Same tone vocabulary as Alert means consumers learn it once.

## Non-goals (v1)

- **No `tone` on Card without left stripe** (e.g., "tone but as tinted bg"). The dashboard pattern is specifically the left stripe; Alert already covers the tinted-bg case.
- **No right-stripe / top-stripe / bottom-stripe variants on either component.** Left only.
- **No outline variant on Badge** (e.g., colored border + transparent bg). Solid pill + stripe rectangle cover the use cases; outline can be added v2.
- **No removable Badge.** No `onClose` / `×` button. Out of scope.
- **No nested tone propagation** (e.g., a Card with `tone="success"` doesn't change the tone of Badges inside it). Each component owns its own tone.
- **No new tokens.** All five tones reuse existing `--color-{accent,info,success,warning,danger}` + `--color-{accent,info,success,warning,danger}-bg-subtle` tokens (Alert already uses them).

## Architecture

### Card

```ts
import type { HTMLAttributes } from 'react';

/** Optional left-stripe tone. When set, draws a 3px accent-colored bar on the left edge. */
export type CardTone = 'accent' | 'info' | 'success' | 'warning' | 'danger';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;  // existing
  /**
   * Optional left-edge tone stripe (3px). Useful for "stat card" / "status card"
   * patterns where one card in a row needs visual emphasis. Default: no stripe
   * (the card keeps its standard bordered look).
   */
  tone?: CardTone;
}
```

The component renders the same `<div>` as today, with an additional `data-tone={tone}` attribute when `tone` is set. SCSS attribute selectors paint the left stripe via `border-left-color` (overriding the default transparent border-left).

**SCSS**:

```scss
.card {
  // existing rules…
  // Reserve a 3px transparent border-left on every card so the layout doesn't
  // shift when tone is added/removed.
  border-left: var(--border-width-strong) solid transparent;
}

.card[data-tone='accent']  { border-left-color: var(--color-accent); }
.card[data-tone='info']    { border-left-color: var(--color-info); }
.card[data-tone='success'] { border-left-color: var(--color-success); }
.card[data-tone='warning'] { border-left-color: var(--color-warning); }
.card[data-tone='danger']  { border-left-color: var(--color-danger); }
```

The reserved-transparent-border trick avoids layout reflow when toggling the prop (vs. only setting `border-left` when tone is present, which would shift content 3px). Same approach as Alert.

### Badge

```ts
/** Visual variant. Defaults to `'filled'` (the existing pill look). */
export type BadgeVariant = 'filled' | 'stripe';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;     // existing
  size?: BadgeSize;     // existing
  dot?: boolean;        // existing
  dotPosition?: BadgeDot; // existing
  /**
   * Visual variant.
   * - `'filled'` (default) — solid tone-tinted pill. The standard "loud status" look.
   * - `'stripe'` — rectangular block with a tone-colored left stripe + soft tinted body.
   *   Use for category markers or sidebar labels where pill emphasis is too loud.
   */
  variant?: BadgeVariant;
}
```

When `variant="stripe"`:
- Shape: rectangular (no `border-radius` — or a small `--radius-sm` for a soft edge)
- Body bg: tone's `*-bg-subtle` token (e.g., `--color-success-bg-subtle`)
- Body text: tone's regular fg color (e.g., `--color-success`)
- Left edge: 3px stripe in tone color
- No uppercase / no letter-spacing (rectangular labels read as labels, not loud pills)

**SCSS**:

```scss
// Existing .badge / .sm / .md / .neutral / .info / .success etc. rules.

// New variant: rectangular block with left stripe.
.stripe {
  border-radius: var(--radius-sm);
  text-transform: none;
  letter-spacing: normal;
  font-weight: var(--font-weight-medium);
  // Reserve transparent border-left so toggling tone doesn't shift layout.
  border-left: var(--border-width-strong) solid transparent;
  padding-left: var(--space-2);
}

// Tone overrides for stripe variant — body bg + fg + border-left color.
.stripe.accent  { background: var(--color-accent-bg-subtle); color: var(--color-accent);  border-left-color: var(--color-accent); }
.stripe.info    { background: var(--color-info-bg-subtle);    color: var(--color-info);    border-left-color: var(--color-info); }
.stripe.success { background: var(--color-success-bg-subtle); color: var(--color-success); border-left-color: var(--color-success); }
.stripe.warning { background: var(--color-warning-bg-subtle); color: var(--color-warning); border-left-color: var(--color-warning); }
.stripe.danger  { background: var(--color-danger-bg-subtle);  color: var(--color-danger);  border-left-color: var(--color-danger); }
.stripe.neutral { background: var(--color-bg-muted);           color: var(--color-fg);      border-left-color: var(--color-fg-muted); }
.stripe.purple  { background: var(--color-badge-purple-bg);    color: var(--color-badge-purple-fg); border-left-color: var(--color-badge-purple-fg); }
```

(Note: `accent` isn't a current Badge tone — adding it for parity with Card. If we don't want to expand BadgeTone, we'll skip `accent` on Badge and keep current 6 tones.)

**Decision**: keep the BadgeTone union unchanged (neutral/info/success/warning/danger/purple). The stripe variant uses these 6 tones. Card's `tone` includes `accent` because Card doesn't already have a `tone` prop — different naming surface.

### File touches

**Library**:
- `packages/design-system/src/components/Card/Card.tsx` — add `tone` prop, `data-tone` attr, JSDoc
- `packages/design-system/src/components/Card/Card.module.scss` — add reserved-transparent border-left + 5 tone selectors
- `packages/design-system/src/components/Card/Card.test.tsx` — add ~5 cases
- `packages/design-system/src/components/Badge/Badge.tsx` — add `variant` prop, JSDoc, route to stripe SCSS class when set
- `packages/design-system/src/components/Badge/Badge.module.scss` — add `.stripe` + tone overrides
- `packages/design-system/src/components/Badge/Badge.test.tsx` — add ~5 cases
- `packages/design-system/src/index.ts` — re-export `CardTone`, `BadgeVariant`

**Playground**:
- `packages/playground/src/pages/components/CardDemo.tsx` — add tone gallery example
- `packages/playground/src/pages/components/BadgeDemo.tsx` — add stripe-variant gallery example
- (Mockup refactor — optional, see below)

**Mockup cleanup** (within this PR):
- `Dashboard.module.scss` — delete `.statCard { border-left: ... }` and switch to `<Card tone="accent">` in `Dashboard.tsx`. Demonstrates the new prop in a real mockup.

### AGENTS.md updates

- Card section: add `tone` bullet to the existing list.
- Badge section: add `variant` bullet, add a stripe example.

## Public API summary

```tsx
// Card
<Card padding="md" tone="accent">...</Card>
<Card tone="success">Healthy</Card>
<Card>Plain bordered (existing)</Card>

// Badge
<Badge tone="info">Lead</Badge>                          // existing filled pill
<Badge variant="stripe" tone="warning">Renewal due</Badge>   // new
<Badge variant="stripe" tone="success" size="sm">Active</Badge>
```

## Testing

### Card (~5 new cases on top of existing tests)

1. No `tone` prop: no `data-tone` attribute
2. `tone="accent"`: `data-tone="accent"` set
3. Each of the 5 tones (it.each): `data-tone` value matches
4. `tone` does NOT affect `padding` (regression check that they compose)
5. `tone="accent"` + `className="custom"` merges (no replacement)

### Badge (~5 new cases on top of existing tests)

1. Default variant is `'filled'` (no `.stripe` class)
2. `variant="filled"` explicit: no `.stripe` class (verify the default path is identical)
3. `variant="stripe"` adds `.stripe` class
4. `variant="stripe" tone="success"` applies both `.stripe` and `.success` classes
5. `variant="stripe"` works with `size="sm"` and `size="md"` (verify the size classes still apply)

## Demo additions

**`CardDemo.tsx`**:
```tsx
<Example title="Tone-coded cards (left stripe)">
  <Cluster gap="md" wrap>
    <Card padding="md" tone="accent">Accent</Card>
    <Card padding="md" tone="info">Info</Card>
    <Card padding="md" tone="success">Success</Card>
    <Card padding="md" tone="warning">Warning</Card>
    <Card padding="md" tone="danger">Danger</Card>
  </Cluster>
</Example>
```

**`BadgeDemo.tsx`**:
```tsx
<Example title='Stripe variant (rectangular with left stripe)'>
  <Cluster gap="sm" wrap>
    <Badge variant="stripe" tone="info">Lead</Badge>
    <Badge variant="stripe" tone="success">Active</Badge>
    <Badge variant="stripe" tone="warning">Renewal due</Badge>
    <Badge variant="stripe" tone="danger">Churned</Badge>
    <Badge variant="stripe" tone="neutral">Archived</Badge>
    <Badge variant="stripe" tone="purple">Enterprise</Badge>
  </Cluster>
</Example>
```

## Mockup cleanup (in-scope)

`Dashboard.tsx`:
```tsx
// Before
<Card padding="md" className={styles.statCard}>...</Card>

// After
<Card padding="md" tone="accent">...</Card>
```

`Dashboard.module.scss`: delete the `.statCard { border-left: ... }` block. The component handles it now.

## Hard Rule 8

Standard cycle: gates green, fresh-context reviewer, fix Critical + Important, repeat until clean.

## Open questions

None.
