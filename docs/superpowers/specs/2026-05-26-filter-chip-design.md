# FilterChip — dismissible "active filter" pill

**Status:** approved (design phase) · **Date:** 2026-05-26 · **Branch:** `feat/filter-chip`

## Problem

The Audit mockup (`packages/playground/src/pages/mockups/Audit/Audit.tsx`) renders active filter chips today using a hand-rolled escape hatch: `<Badge role="button" tabIndex={0} style={{ cursor: 'pointer' }} aria-label="Remove filter">` plus an inline `<X>` icon as a child. The inline `style` is a documented Hard rule 6 escape hatch (see `packages/design-system/src/components/TODO.md` → `DismissibleBadge`). It works visually, but every consumer of the filter-bar pattern (EOCRM audit, contacts owner picker, deals stage picker, members role picker) would need to either copy this hack or build their own — both bad for a library whose mockups should dogfood real primitives.

There's also a structural mismatch: the active chip pattern from real CRMs (Linear, Trello, GitHub) is `Label · Value · X` — three slots, not the single-text Badge shape. A tone-colored dot prefixes the value when the filter category has a color identity (events have a namespace tone; tenants are neutral). A Badge with a flat string can't model that.

## Goal

Ship `FilterChip` — a new compound primitive in `@eocrm/design-system` modeling the "active filter" pill. Compound API with `<FilterChip>` root + `<FilterChip.Label>` + `<FilterChip.Value>` subcomponents. Dismiss button auto-renders when the root receives an `onDismiss` callback. First consumer: the Audit mockup, which retires its escape-hatch Badge chips and ticks the `DismissibleBadge` TODO.

**Non-goals:** size variants, interactive states beyond the dismiss button, drag-to-reorder, keyboard reorder, chip groups/clustering layout (the consumer composes chips inside `<Cluster>`).

## Design

### API shape

A compound primitive with three parts: root + label + value. The dismiss button is implicit — present iff `onDismiss` is passed.

```tsx
import { FilterChip } from '@eocrm/design-system';

// Label + tone-dotted value + dismiss
<FilterChip onDismiss={() => removeChip('event')}>
  <FilterChip.Label>Event</FilterChip.Label>
  <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
</FilterChip>

// Label + plain value + dismiss (no tone dot)
<FilterChip onDismiss={() => removeChip('tenant')}>
  <FilterChip.Label>Tenant</FilterChip.Label>
  <FilterChip.Value>beta</FilterChip.Value>
</FilterChip>

// Value-only (no label slot)
<FilterChip onDismiss={() => removeChip('platform')}>
  <FilterChip.Value tone="warning">Platform only</FilterChip.Value>
</FilterChip>

// Read-only (no dismiss button — onDismiss omitted)
<FilterChip>
  <FilterChip.Label>Status</FilterChip.Label>
  <FilterChip.Value>Active</FilterChip.Value>
</FilterChip>
```

### Types

```tsx
import type { HTMLAttributes, ReactNode } from 'react';
import type { BadgeTone } from '../Badge';

export interface FilterChipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /**
   * Optional dismiss callback. When provided, a `×` button renders at the
   * end of the chip; clicking it fires this handler. Omit to render a
   * read-only chip.
   */
  onDismiss?: () => void;
  /**
   * Override the default `aria-label` on the dismiss button.
   * Default: `'Remove filter'`. Pass a more specific label (e.g.,
   * `'Remove Event: auth.* filter'`) for screen reader clarity.
   */
  dismissLabel?: string;
  children: ReactNode;
}

export interface FilterChipLabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export interface FilterChipValueProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Optional dot tone — adds a colored 6px circle before the value text.
   * Use to distinguish filter categories (e.g., event filters get a
   * tone-matched dot; platform-only / system filters get `warning`).
   * Omit for plain text values.
   */
  tone?: BadgeTone;
  children: ReactNode;
}
```

### Visual anatomy

```
┌──────────────────────────────────────────┐
│ Event     ● auth.* (3)     ×             │  root (.chip)
│   ↑           ↑               ↑          │
│ label    value (with dot)   dismiss      │
└──────────────────────────────────────────┘
```

- **Root** — pill container with white background, thin border, fully-rounded corners. `display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-full); background: var(--color-bg-base);`.
- **Label** — muted `<Text size="sm">`. Renders as a `<span>`. No dot, no special styling beyond the muted tone.
- **Value** — regular `<Text size="sm">`. If `tone` is set, prefixes a small dot (`<span className={styles.dot} data-tone={tone}>`) with `background-color` set via a token derived from the tone (`var(--color-{tone}-base)`). The dot is `aria-hidden` and sits inside the value span so the visual association is tight.
- **Dismiss button** — `<button type="button" aria-label={dismissLabel}>` containing a 12px lucide `<X>` icon. Hover background `var(--color-bg-muted)`. Small padding so the hit target is at least ~20×20px. Renders only when `onDismiss` is provided.

### Composition

| Layer               | Built from                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root pill container | hand-rolled `<div>` with token-based styling — no existing primitive matches the pill geometry exactly (Badge is solid-fill, Card is square + heavier) |
| Label               | `<Text size="sm" tone="muted">`                                                                                                                        |
| Value text          | `<Text size="sm">`                                                                                                                                     |
| Value tone dot      | inline `<span>` styled via a SCSS modifier class keyed off `data-tone` attribute                                                                       |
| Dismiss button      | hand-rolled `<button>` + lucide `<X size={12} aria-hidden>`                                                                                            |

`Badge` is NOT reused for the value dot. Badge's dot prop is bound to its own pill shape; using it here would force a nested pill-in-pill. A 6px CSS span styled to the same tone palette is cleaner.

### Accessibility

- **Root** carries `role="group"` so screen readers announce the chip as one unit (label + value + dismiss button). The root accepts a consumer-supplied `aria-label` for explicit labeling; otherwise the natural reading order is `"Event: auth.* (3), Remove filter button"`.
- **Dismiss button** is a real `<button type="button">` with `aria-label={dismissLabel ?? 'Remove filter'}`. The lucide X icon inside is `aria-hidden`.
- **Tone dot** is decorative — `aria-hidden="true"`. The value text already conveys the filter; the dot is purely visual.
- **Label and Value** are plain `<span>` elements. No `role`, no `aria-*` — the surrounding `role="group"` is enough.

### File layout

```
packages/design-system/src/components/FilterChip/
  FilterChip.tsx              ← Root + Label + Value (one file)
  FilterChip.module.scss      ← Token-only styling (pill, dot tones, dismiss)
  FilterChip.test.tsx         ← Hard rule 1 minimum + behavior
  index.ts                    ← Public re-exports
```

Single `.tsx` keeps the compound API close-coupled. No context is needed between the parts — the Root just spreads its dismiss button after the consumer's children.

### Public exports

Added to `packages/design-system/src/index.ts`:

```ts
export { FilterChip } from './components/FilterChip';
export type {
  FilterChipProps,
  FilterChipLabelProps,
  FilterChipValueProps,
} from './components/FilterChip';
```

Added to `packages/design-system/src/_meta/manifest.ts` + `packages/design-system/scripts/generate-manifest.mjs`:

```ts
FilterChip: 'Display';
```

### Tests

Per Hard rule 1 minimum + key behaviors:

**Render-level:**

- Renders without crash with default props.
- Renders Label, Value, and dismiss button when all three are provided.
- Omits dismiss button when `onDismiss` is not passed.
- Value renders the tone dot when `tone` is set; omits it otherwise.
- `aria-label` on dismiss uses `dismissLabel` override when provided; falls back to `'Remove filter'`.
- `className` on root, Label, and Value merges with internal styles.

**Behavior:**

- Clicking the dismiss button fires `onDismiss`.
- Dismiss button is keyboard-actionable (Enter and Space fire `onDismiss`).
- Root has `role="group"`.

## Demo + cross-link wiring

- Create `packages/playground/src/pages/components/FilterChipDemo.tsx` using the `DemoLayout` + `Example` + `InputExample` pattern. Four examples:
  - Label + tone-dotted value + dismiss (canonical).
  - Label + plain value + dismiss.
  - Value-only with dismiss.
  - Read-only (no dismiss).
- Wire into `App.tsx`, `AppShell.tsx` (Display cluster), `ComponentsIndex.tsx`.
- Add `'FilterChip'` to the `ComponentName` union in `packages/playground/src/pages/mockups/registry.ts`.
- Update `packages/design-system/AGENTS.md` with a TL;DR + canonical snippet.

## Audit mockup integration

Replace the existing Badge-with-X chip block in `packages/playground/src/pages/mockups/Audit/Audit.tsx` with `<FilterChip>` instances. The current code:

```tsx
<Badge
  key={c.key}
  tone={c.tone}
  dot="start"
  role="button"
  tabIndex={0}
  onClick={() => removeChip(c.key)}
  onKeyDown={(e) => { … }}
  aria-label={`Remove ${c.label}: ${c.value} filter`}
  style={{ cursor: 'pointer' }}  // ← escape hatch
>
  {c.label}: {c.value} <X size={12} aria-hidden />
</Badge>
```

becomes:

```tsx
<FilterChip
  key={c.key}
  onDismiss={() => removeChip(c.key)}
  dismissLabel={`Remove ${c.label}: ${c.value} filter`}
>
  <FilterChip.Label>{c.label}</FilterChip.Label>
  <FilterChip.Value tone={c.tone === 'neutral' ? undefined : c.tone}>{c.value}</FilterChip.Value>
</FilterChip>
```

- The escape-hatch inline `style={{ cursor: 'pointer' }}` is dropped.
- The TODO entry in `packages/design-system/src/components/TODO.md` is removed.
- The audit mockup's `usesComponents` array in `packages/playground/src/pages/mockups/registry.ts` adds `'FilterChip'` and drops `'Badge'` if Badge is no longer used in the mockup (verify by grep). Keep Badge in usesComponents if it's still imported elsewhere in the file (e.g., the impersonation badge on the Actor cell).

## Out of scope

1. **Size variants.** One size — the filter-bar size. If a smaller variant is needed later, add a `size` prop in a follow-up spec.
2. **Pill color variants.** Only the dot is toned; the pill itself is always neutral (white with thin border). Trying to color the pill background like Badge would conflate "filter chip" with "tag" semantics.
3. **Interactive chip (click-anywhere-to-X).** The X button is the only interactive target. Clicking elsewhere on the chip does nothing — the consumer can opt-in to other behaviors by wrapping the chip in their own click handler.
4. **Keyboard reorder / drag.** Out of scope; filter chips don't reorder in any of our reference UX (Linear, Trello, EOCRM).
5. **Loading or pending state.** No "applying" spinner inside the chip. If the consumer's `onDismiss` is async, they control the visual state externally.
6. **Built-in icon slot on Value.** No `iconStart` / `iconEnd` props. The dot covers the only visual indicator we need. If a future filter needs an avatar in the value slot, the consumer composes `<FilterChip.Value><Avatar size="2xs"/> Sarah</FilterChip.Value>` — `Value` is a `<span>` that accepts arbitrary children.
7. **Animated dismiss.** No exit animation when the chip is removed from the DOM. The consumer's state update unmounts it; if animation is needed later, that's a separate spec.
