# Divider — design spec

**Date:** 2026-05-23
**Branch:** `feat/divider`
**Scope:** New `<Divider>` component for `@eocrm/design-system` — a thin separator primitive. Horizontal or vertical orientation, solid or dashed variant, three size tiers (`sm`/`md`/`lg`), optional center label slot.

## Goal

Replace ad-hoc `<hr>` and inline border-trick separators across the CRM. Provide one primitive that handles the three common use cases: (1) a plain rule between content sections, (2) a vertical separator inside a toolbar Cluster, (3) an "OR" divider between two grouped form sections.

## Why now

- Mockups currently use raw `<hr>` for horizontal separators (no styling consistency) and inline `<span>` borders for vertical separators inside Cluster (inconsistent thickness and color).
- The "OR" between auth-form sections is a recurring pattern in the CRM and adjacent products (login + reset password). Today it's open-coded with a flex layout + two `<span>` lines.
- The design system has token-correct values for line thickness (`--border-width` 1px / `--border-width-emphasis` 2px / `--border-width-strong` 3px) but no component that exposes them. Divider closes that loop.

## Non-goals (v1)

- **No `inset` / `flush` variants.** Consumer manages parent padding; Divider doesn't reach out to the container.
- **No color variants.** Always `--color-border`. If you need a danger-toned divider, use `<Alert tone="error">` instead.
- **No animation.** Divider is static.
- **No "dotted" variant.** Solid + dashed cover the use cases; dotted reads as noise.
- **No `align="start" | "center" | "end"` for the label.** Label is always centered. If the consumer needs left-anchored, they compose `<Stack><h3>Heading</h3><Divider /></Stack>` themselves.
- **No `<hr>`-as-root with label support.** When `children` is present, root MUST be `<div role="separator">` because `<hr>` can't have children per HTML spec. Documented in JSDoc.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- Existing tokens: `--color-border`, `--color-fg-muted`, `--border-width`, `--border-width-emphasis`, `--border-width-strong`, `--font-size-sm`, `--space-2`/`--space-3`, `--font-weight-medium`

No new tokens needed. The three border-width tokens map directly to the three size tiers.

### File layout

```
packages/design-system/src/components/Divider/
  Divider.tsx           ← forwardRef, branches on `children` presence → <hr> vs <div role=separator>
  Divider.module.scss   ← orientation × variant × size matrix + label-slot flex layout
  Divider.test.tsx      ← ~14 cases
  index.ts              ← exports Divider + types
```

Plus integration points:

- `packages/design-system/src/index.ts` — re-export `Divider`, `DividerProps`, `DividerOrientation`, `DividerVariant`, `DividerSize`
- `packages/design-system/AGENTS.md` — TL;DR slot near other layout primitives (Stack/Cluster/Grid cluster)
- `packages/playground/src/pages/components/DividerDemo.tsx` — 6 examples
- `packages/playground/src/App.tsx` — route at `/components/divider`
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar entry in the **Layout** group, alphabetically between `Cluster` and `Grid`
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview card
- `packages/playground/src/pages/mockups/registry.ts` — `'Divider'` in `ComponentName` union

### Composition

```
        Divider WITHOUT children (no label):
        <Divider orientation="horizontal" />        →  <hr role="separator" aria-orientation="horizontal" />
        <Divider orientation="vertical" />          →  <div role="separator" aria-orientation="vertical" />

        Divider WITH children (centered label):
        <Divider>OR</Divider>                       →  <div role="separator" aria-orientation="horizontal">
                                                          <span class="line" />
                                                          <span class="label">OR</span>
                                                          <span class="line" />
                                                        </div>
```

Branching on `children` is the only conditional logic. The horizontal/vertical orientation drives CSS class selection; same for variant/size.

## Public API

```ts
import type { HTMLAttributes, ReactNode } from 'react';

/** Layout direction. Defaults to `'horizontal'`. */
export type DividerOrientation = 'horizontal' | 'vertical';

/** Line style. Defaults to `'solid'`. */
export type DividerVariant = 'solid' | 'dashed';

/**
 * Line thickness tier. Defaults to `'sm'` (1px).
 * - `'sm'` — `--border-width` (1px). Default. Quiet separation.
 * - `'md'` — `--border-width-emphasis` (2px). Section breaks.
 * - `'lg'` — `--border-width-strong` (3px). Heavy emphasis; rare.
 */
export type DividerSize = 'sm' | 'md' | 'lg';

export interface DividerProps extends Omit<HTMLAttributes<HTMLElement>, 'role' | 'children'> {
  /** Layout direction. Defaults to `'horizontal'`. */
  orientation?: DividerOrientation;

  /** Line style. Defaults to `'solid'`. */
  variant?: DividerVariant;

  /** Line thickness tier. Defaults to `'sm'`. */
  size?: DividerSize;

  /**
   * Optional centered label rendered between two line segments.
   * Common pattern: `<Divider>OR</Divider>`.
   *
   * When `children` is set, the root element becomes `<div role="separator">`
   * instead of `<hr>` (HTML `<hr>` cannot have children). Otherwise the
   * default `<hr>` is used for horizontal-no-label cases.
   *
   * Works with `orientation="vertical"` too but renders awkwardly (text wraps
   * across two short line segments). Avoid vertical + label combos.
   */
  children?: ReactNode;
}
```

**Spread order — Pattern A** (consumer wins) for ARIA + data-\*, with component-owned attrs after:

```tsx
<hr
  ref={ref}
  {...props}
  role="separator"
  aria-orientation={orientation}
  className={clsx(
    styles.divider,
    ORIENTATION_CLASS[orientation],
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    className,
  )}
/>
```

For the labeled case:

```tsx
<div
  ref={ref}
  {...props}
  role="separator"
  aria-orientation={orientation}
  data-labeled="true"
  className={clsx(
    styles.divider,
    styles.labeled,
    ORIENTATION_CLASS[orientation],
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    className,
  )}
>
  <span className={styles.line} aria-hidden="true" />
  <span className={styles.label}>{children}</span>
  <span className={styles.line} aria-hidden="true" />
</div>
```

Component-owned attrs (after spread) — `role`, `aria-orientation`, `data-labeled`, `className`. Consumer can override aria-\* attrs via override, but not these specifically; ref forwards to the root.

## Architecture flow

Two render paths:

1. **`children == null`**: render `<hr>` with the right classes. Simple, native HTML semantics. `<hr>` already implies `role="separator"`, but we set it explicitly for parity with the labeled path.

2. **`children != null`**: render `<div role="separator">` with three children: two `.line` spans (flanking) and a `.label` span (center). Flex layout — `.line` gets `flex: 1` (allowed: internal layout of children, not at component boundary).

```tsx
export const Divider = forwardRef<HTMLElement, DividerProps>(function Divider(
  { orientation = 'horizontal', variant = 'solid', size = 'sm', children, className, ...props },
  ref,
) {
  const classes = clsx(
    styles.divider,
    ORIENTATION_CLASS[orientation],
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    children != null && styles.labeled,
    className,
  );

  if (children == null) {
    return (
      <hr
        ref={ref as React.Ref<HTMLHRElement>}
        {...props}
        role="separator"
        aria-orientation={orientation}
        className={classes}
      />
    );
  }

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      {...props}
      role="separator"
      aria-orientation={orientation}
      data-labeled="true"
      className={classes}
    >
      <span className={styles.line} aria-hidden="true" />
      <span className={styles.label}>{children}</span>
      <span className={styles.line} aria-hidden="true" />
    </div>
  );
});
```

**Why `forwardRef<HTMLElement>`**: the ref's target type changes between `HTMLHRElement` (no children path) and `HTMLDivElement` (with label). React's `forwardRef` requires one ref type; `HTMLElement` is the closest common ancestor. Consumers needing a specific type can cast. Documented in JSDoc.

## Styling — `Divider.module.scss`

```scss
.divider {
  // Base — no implicit margin so the consumer's parent owns spacing.
  border: 0;
  // Default to the size token; refined per variant/orientation below.
  color: var(--color-border);
}

// ─── No-label cases: <hr> styled with border-top or border-left ─────────

.horizontal {
  width: 100%;
  border-top: var(--border-width) solid var(--color-border);
}

.vertical {
  align-self: stretch;
  border-left: var(--border-width) solid var(--color-border);
  // Reserve some intrinsic width so the line is visible without parent height.
  min-height: var(--space-3);
}

// ─── Variant — dashed swaps the border-style ────────────────────────────

.dashed.horizontal {
  border-top-style: dashed;
}

.dashed.vertical {
  border-left-style: dashed;
}

// ─── Size tiers — bump the border width ─────────────────────────────────

.sizeMd.horizontal {
  border-top-width: var(--border-width-emphasis);
}
.sizeMd.vertical {
  border-left-width: var(--border-width-emphasis);
}

.sizeLg.horizontal {
  border-top-width: var(--border-width-strong);
}
.sizeLg.vertical {
  border-left-width: var(--border-width-strong);
}

// ─── Labeled — flex layout with two line spans flanking the label ───────

.labeled {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  // The root div no longer holds the line — the spans do.
  border-top: 0;
  border-left: 0;
}

.labeled.vertical {
  flex-direction: column;
  align-self: stretch;
  min-height: var(--space-3);
}

.line {
  flex: 1;
  border: 0;
  background: var(--color-border);
  height: var(--border-width);
  border-radius: 0;
}

.labeled.vertical .line {
  width: var(--border-width);
  height: auto;
  align-self: stretch;
}

// Dashed lines: collapse the height to 0 and rely on the border to draw
// the dashed pattern. Otherwise the height + border would stack visually.
.dashed .line {
  background: transparent;
  height: 0;
  border-top: var(--border-width) dashed var(--color-border);
}

.dashed.vertical .line {
  width: 0;
  border-top: 0;
  border-left: var(--border-width) dashed var(--color-border);
}

.sizeMd .line {
  height: var(--border-width-emphasis);
}
.sizeLg .line {
  height: var(--border-width-strong);
}

.sizeMd.vertical .line {
  width: var(--border-width-emphasis);
  height: auto;
}
.sizeLg.vertical .line {
  width: var(--border-width-strong);
  height: auto;
}

.sizeMd.dashed .line {
  border-top-width: var(--border-width-emphasis);
  height: 0;
}
.sizeLg.dashed .line {
  border-top-width: var(--border-width-strong);
  height: 0;
}

.sizeMd.dashed.vertical .line {
  border-left-width: var(--border-width-emphasis);
  width: 0;
}
.sizeLg.dashed.vertical .line {
  border-left-width: var(--border-width-strong);
  width: 0;
}

.label {
  flex: 0 0 auto;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg-muted);
  white-space: nowrap;
}
```

**Rule 4 check**:

- `.horizontal` has `width: 100%` — intrinsic-of-parent width, NOT layout claim. Allowed (matches Input/Textarea precedent).
- `.vertical` has `align-self: stretch` — needed because the parent (typically a Cluster) doesn't know to stretch this child; without it, the vertical line collapses to 0 height. This IS layout-at-component-boundary and would normally violate Rule 4, but the documented exception for "intrinsically vertical primitives that need parent height" applies (same as how ButtonGroup uses `align-self: flex-start`). Add inline `stylelint-disable-next-line property-disallowed-list -- vertical separator needs parent height; same Rule 4 exception as ButtonGroup` comment.
- `min-height: var(--space-3)` on `.vertical` — a fallback so the vertical divider has SOME visible height even outside flex/grid parents. Pragmatic.
- `.line` uses `flex: 1` — that's INTERNAL layout of the labeled-divider's children, not at the component boundary. Allowed.

## ARIA + behavior reference

| Concern                        | Behavior                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Default element (no label)** | `<hr role="separator" aria-orientation="...">`. Native HTML semantics.                                                            |
| **Labeled element**            | `<div role="separator" aria-orientation="...">` with two `<span class="line" aria-hidden>` siblings and a `<span class="label">`. |
| **role**                       | Always `"separator"`. WAI-ARIA recommended for visual separators.                                                                 |
| **aria-orientation**           | Always set (`"horizontal"` or `"vertical"`). Default for `role="separator"` is "horizontal" but explicit is clearer.              |
| **Line spans**                 | `aria-hidden="true"` — purely decorative; the role on the root carries the semantic.                                              |
| **Focus**                      | Not focusable. Divider is informational, not interactive.                                                                         |
| **Ref target**                 | The root (`<hr>` or `<div>` depending on `children`). Consumers needing a specific element type can cast the ref.                 |

## Testing

`Divider.test.tsx` — 14 cases.

### Element + ARIA

1. Renders `<hr>` when no children
2. Renders `<div>` when children present
3. Always has `role="separator"`
4. `aria-orientation="horizontal"` when orientation omitted (default)
5. `aria-orientation="vertical"` when orientation="vertical"

### Variants + sizes

6. Default variant=solid, size=sm → class `horizontal` + no `dashed` class + no `sizeMd`/`sizeLg`
7. `variant="dashed"` applies `dashed` class
8. `size="md"` applies `sizeMd` class
9. `size="lg"` applies `sizeLg` class

### Label slot

10. `children="OR"` renders the OR text inside `.label`
11. Labeled divider has two `.line` spans flanking the label
12. The `.line` spans have `aria-hidden="true"`

### Misc

13. `className` merges, doesn't replace
14. `ref` forwards to the root element (assert `tagName` matches HR or DIV based on children)

**Vitest gotchas**:

- The `aria-hidden` test on `.line` spans: `container.querySelectorAll('span[aria-hidden="true"]')` should return 2 elements.
- The ref test conditionally asserts tagName: when children passed, `expect(ref.current?.tagName).toBe('DIV')`; otherwise `'HR'`.

## Playground demo — `DividerDemo.tsx`

6 examples:

1. **Horizontal default** — `<Divider />` between two `<p>` elements.
2. **Variant + size matrix** — 6 dividers stacked: solid sm/md/lg, then dashed sm/md/lg.
3. **Labeled** — `<Divider>OR</Divider>` between two `<Button variant="secondary">` blocks (simulating an auth form).
4. **Vertical inside Cluster** — `<Cluster>Edit <Divider orientation="vertical" /> Duplicate <Divider orientation="vertical" /> Archive</Cluster>`.
5. **Inside Card** — a Card with header + Divider + body to show section separation.
6. **Custom className** — show how consumers extend with their own styles via className override (e.g., a custom color).

## AGENTS.md TL;DR slot

Insert after `### <Grid>` (around line 382), in the layout cluster.

````markdown
### `<Divider>` — separator primitive

Thin rule between content sections. Horizontal (default) or vertical. Optional centered label slot. Three size tiers + solid/dashed variants.

```tsx
import { Divider } from '@eocrm/design-system';

// Default horizontal
<Divider />

// Vertical (inside a Cluster)
<Cluster gap="sm">
  <Button>Edit</Button>
  <Divider orientation="vertical" />
  <Button>Duplicate</Button>
</Cluster>

// Labeled (auth-form pattern)
<Divider>OR</Divider>

// Variants + sizes
<Divider variant="dashed" />
<Divider size="lg" />
```
````

- **Default**: solid, size `'sm'` (1px), horizontal.
- **Labeled** dividers use `<div role="separator">` instead of `<hr>` because HTML `<hr>` can't have children.
- **Vertical** dividers stretch to the parent's height — works inside Cluster/Stack/Flex but needs a parent with known height. Falls back to `--space-3` minimum height as a sanity floor.
- **No spacing prop** — parent owns layout per Rule 4. Use Stack `gap` around the Divider.

#### When NOT to use

- ❌ Decorative under a heading → just style the heading's `border-bottom`.
- ❌ A vertical separator between unrelated stacked sections → use Stack with `gap` instead.
- ❌ A colored "tone" separator → use `<Alert>` for tone-driven persistent messages.

#### Anti-patterns

- ❌ `<Divider>OR</Divider>` inside `orientation="vertical"` — text wraps awkwardly across two short line segments. Use horizontal.
- ❌ `<Divider size="lg" />` for casual section breaks. Reserve `lg` (3px) for strong visual hierarchy.
- ❌ Adding `margin` via `style={{ marginY: 16 }}`. The parent should own spacing.

```

## Hard Rule 8

The pre-push review-fix cycle on library changes is mandatory. Gates green, fresh-context reviewer, fix Critical + Important, repeat until clean.

## Open questions

None. All clarifications baked in.
```
