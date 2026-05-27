# Color Palette — categorical color set

**Status:** approved (design phase) · **Date:** 2026-05-27 · **Branch:** `feat/color-palette`

## Problem

The library ships six **semantic** Badge tones (`neutral`, `info`, `success`, `warning`, `danger`, `purple`) and six **Avatar fill** colors (`--color-avatar-1` … `--color-avatar-6`, deterministically hashed from name). Neither is enough when a consumer needs **categorical** color identity across more than a handful of items — e.g., the audit log has 10+ event namespaces (`auth.*`, `user.*`, `role.*`, `invitation.*`, `contact.*`, `deal.*`, `system_setting.*`, …) and each deserves a visually distinct chip color so users can scan by category. Same problem appears for tag/label palettes (think GitHub labels), team-colored checkboxes in a Kanban, color-tagged calendar events, etc.

Today consumers either:

1. Reuse the same 6 Badge tones — names collide across rows and the visual distinction disappears.
2. Hand-roll inline hex values — breaks Hard rule 6 (no inline styles in mockups, no raw values in `.module.scss`).

What's missing is a curated set of **categorical** colors — distinct enough to tell apart at a glance, harmonized so they don't clash when used side-by-side, and exposed as tokens consumers can reference via the design-system surface.

## Goal

Ship a **30-color categorical palette** in `@eocrm/design-system`. Each color is a bg + fg pair (matching the existing Badge tone shape) under a new `--color-palette-*` token namespace. Consumers reference the colors by name via `PaletteColor` (TypeScript union) and `paletteTokens()` (helper that returns the CSS var names). The library Checkbox gains a `color?: PaletteColor` prop so consumers can color-tag checkboxes per team / per group / per status without hand-rolling styles.

The audit-event-chip use case is solved on the **consumer side** (no library API change for Badge/FilterChip): consumer code maps `event.split('.')[0] → PaletteColor` and applies the tokens via a small inline chip component or by reaching for `paletteTokens(color)` in its own CSS-in-JS / module-style file.

**Non-goals:**

- Extending `BadgeTone` / `FilterChipValueProps.tone` to accept the 30 palette names — would conflate semantic vs categorical and balloon prop autocomplete. Can land as a follow-up if consumers ask.
- Multi-shade per color (50/100/300/500/700 like Tailwind) — paired bg + fg only.
- Dark theme variants — design system is light-only today; add when dark theme lands.
- Auto-assignment helper like Avatar's `avatarColorIndex(name)`. Consumers manage their own domain → color mapping (this is the configurability point).
- A library-side "audit event chip" component. The audit-event-chip example is a **consumer-side custom component** that uses the palette tokens; the library doesn't ship it.

## Design

### Color list

30 named colors covering the color wheel + earth + grays. Each name maps to a `bg` (very light tint, lightness ~94–97 %) and `fg` (dark saturated, lightness ~25–40 %) pair. Same shape as existing `--color-badge-*-bg/--color-badge-*-fg` tokens.

| #   | Name       | Family      | bg (target light) | fg (target dark) |
| --- | ---------- | ----------- | ----------------- | ---------------- |
| 1   | `red`      | warm        | #ffebe6           | #bf2600          |
| 2   | `coral`    | warm        | #ffe5dd           | #9e3a14          |
| 3   | `orange`   | warm        | #fff0db           | #974f00          |
| 4   | `amber`    | warm        | #fff7d6           | #7a5300          |
| 5   | `gold`     | warm        | #fff3c0           | #806100          |
| 6   | `yellow`   | warm        | #fffacc           | #6b5f00          |
| 7   | `olive`    | green-warm  | #f0f3cc           | #4d5a00          |
| 8   | `lime`     | green       | #e8f7c8           | #3c6900          |
| 9   | `green`    | green       | #d4f5dd           | #006633          |
| 10  | `emerald`  | green       | #d2f0e1           | #00714d          |
| 11  | `mint`     | green-cool  | #d6f5ec           | #00755a          |
| 12  | `teal`     | cool        | #d6f0f0           | #006970          |
| 13  | `cyan`     | cool        | #dff5f9           | #00657a          |
| 14  | `sky`      | cool        | #dceefb           | #1f5285          |
| 15  | `blue`     | cool        | #deebff           | #0747a6          |
| 16  | `navy`     | cool        | #d8e0f0           | #1a2e63          |
| 17  | `indigo`   | purple      | #e2e2f7           | #2c2d80          |
| 18  | `violet`   | purple      | #e3deff           | #4030a6          |
| 19  | `lavender` | purple      | #ece6ff           | #5d4ba6          |
| 20  | `purple`   | purple      | #eae6ff           | #403294          |
| 21  | `plum`     | purple-warm | #efddf0           | #6a2b6b          |
| 22  | `fuchsia`  | pink        | #fbdef5           | #7a1c70          |
| 23  | `magenta`  | pink        | #ffd9f0           | #8c195e          |
| 24  | `pink`     | pink        | #ffe0eb           | #a3174a          |
| 25  | `rose`     | pink-warm   | #ffe1e1           | #a01a35          |
| 26  | `brown`    | earth       | #f1e3d3           | #6b4a1f          |
| 27  | `taupe`    | earth-gray  | #ece5db           | #5a4a3a          |
| 28  | `slate`    | gray        | #e2e6ed           | #3d4b66          |
| 29  | `stone`    | gray        | #e9e7e3           | #4d4944          |
| 30  | `charcoal` | gray        | #d8dadc           | #2e3338          |

Color values are starting targets. The implementer should eyeball-test all 30 swatches together to confirm distinctness at small sizes; if any two land too close, nudge one and document the change in the implementation PR.

### Token names

```scss
--color-palette-red-bg: #ffebe6;
--color-palette-red-fg: #bf2600;
--color-palette-coral-bg: #ffe5dd;
--color-palette-coral-fg: #9e3a14;
/* … 28 more pairs … */
--color-palette-charcoal-bg: #d8dadc;
--color-palette-charcoal-fg: #2e3338;
```

All 60 tokens live in `packages/design-system/src/styles/tokens.scss`, in their own block titled `// ─── Categorical palette (consumer-defined mapping) ───`. Block placement: after the existing `--color-badge-*` block (which they conceptually extend, despite being a separate namespace).

### Public TypeScript surface

A new module `packages/design-system/src/palette/palette.ts`:

```tsx
/**
 * Categorical color palette. 30 named colors with bg + fg pairs.
 * Use for consumer-defined domain → color mappings (audit event
 * namespaces, tag/label color picker, team-colored checkboxes, …).
 *
 * Not semantic — use `BadgeTone` (info/success/warning/danger/…)
 * for status. Palette colors carry no meaning beyond visual identity.
 */
export type PaletteColor =
  | 'red'
  | 'coral'
  | 'orange'
  | 'amber'
  | 'gold'
  | 'yellow'
  | 'olive'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'mint'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'navy'
  | 'indigo'
  | 'violet'
  | 'lavender'
  | 'purple'
  | 'plum'
  | 'fuchsia'
  | 'magenta'
  | 'pink'
  | 'rose'
  | 'brown'
  | 'taupe'
  | 'slate'
  | 'stone'
  | 'charcoal';

/** Ordered list of all 30 palette colors. Use for demo grids / pickers. */
export const PALETTE_COLORS: readonly PaletteColor[] = [
  'red',
  'coral',
  'orange',
  'amber',
  'gold',
  'yellow',
  'olive',
  'lime',
  'green',
  'emerald',
  'mint',
  'teal',
  'cyan',
  'sky',
  'blue',
  'navy',
  'indigo',
  'violet',
  'lavender',
  'purple',
  'plum',
  'fuchsia',
  'magenta',
  'pink',
  'rose',
  'brown',
  'taupe',
  'slate',
  'stone',
  'charcoal',
] as const;

/**
 * Returns the CSS custom-property names for a palette color's bg and fg.
 *
 * @example
 * const { bg, fg } = paletteTokens('amber');
 * // bg === 'var(--color-palette-amber-bg)'
 * // fg === 'var(--color-palette-amber-fg)'
 */
export function paletteTokens(color: PaletteColor): { bg: string; fg: string } {
  return {
    bg: `var(--color-palette-${color}-bg)`,
    fg: `var(--color-palette-${color}-fg)`,
  };
}
```

Public exports from `packages/design-system/src/index.ts`:

```ts
export type { PaletteColor } from './palette/palette';
export { PALETTE_COLORS, paletteTokens } from './palette/palette';
```

Manifest cluster: **not** added — palette is not a component, it's a utility module. The existing meta-tests only iterate `src/components/`, so the new `src/palette/` directory falls outside their scope. (Verify during implementation.)

### Checkbox `color` prop

`<Checkbox color="violet" />` tints the **checked** state. Default (no `color`) is unchanged — uses the existing `--color-accent` for the checked background. When set:

- Checked-state background: `var(--color-palette-${color}-fg)` (the saturated darker token — gives a visible filled checkbox).
- Checkmark itself: stays white (no change).
- Focus ring: unchanged (the ring stays accent-colored regardless of fill color — focus rings carry their own a11y meaning).
- Indeterminate state: same color logic as checked.
- Unchecked: no visual change.

Type:

```tsx
export interface CheckboxProps {
  /* …existing props… */

  /**
   * Optional palette color for the checked / indeterminate fill. When
   * set, the checkbox's filled state uses the palette color instead of
   * the default accent. Use to color-tag checkbox groups (per-team,
   * per-status, per-category). Focus ring stays accent-colored.
   */
  color?: PaletteColor;
}
```

Implementation: in `Checkbox.tsx`, when `color` is set, render an inline `style={{ '--checkbox-color': `var(--color-palette-${color}-fg)` } as React.CSSProperties}` on the checkbox root. The SCSS then references `var(--checkbox-color, var(--color-accent))` for the checked/indeterminate background. This keeps the SCSS token-driven and confines the inline style to a single CSS-var assignment.

### Consumer-side mapping pattern

The audit-event-chip case lives entirely in consumer code. The library doesn't ship a chip primitive for this; the consumer composes one with palette tokens:

```tsx
// consumer file, e.g. packages/playground/src/data/eventColor.ts
import type { PaletteColor } from '@eocrm/design-system';

const EVENT_NAMESPACE_COLOR: Record<string, PaletteColor> = {
  auth: 'blue',
  user: 'violet',
  role: 'amber',
  invitation: 'pink',
  contact: 'teal',
  deal: 'emerald',
  membership: 'gold',
  system_setting: 'slate',
  // …add more as event taxonomy grows
};

export function eventPaletteColor(event: string): PaletteColor {
  const namespace = event.split('.')[0];
  return EVENT_NAMESPACE_COLOR[namespace] ?? 'stone';
}
```

The chip itself is also consumer-owned (custom mockup component using `paletteTokens()`). Sample chip the demo will show:

```tsx
import { paletteTokens, type PaletteColor } from '@eocrm/design-system';

function CategoryChip({ color, children }: { color: PaletteColor; children: ReactNode }) {
  const { bg, fg } = paletteTokens(color);
  return (
    <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
      {children}
    </span>
  );
}
```

This is **not** in the library — it's demo code showing the consumer pattern.

### File layout

```
packages/design-system/src/palette/
  palette.ts            ← PaletteColor type + PALETTE_COLORS + paletteTokens
  palette.test.ts       ← unit tests (type union completeness, helper correctness)
  index.ts              ← public re-exports
```

(Note: `palette/`, not `components/palette/`. The directory naming signals "this is not a React component"; the meta-tests look at `components/*` only.)

### Tests

`palette.test.ts`:

- `paletteTokens('red')` returns `{ bg: 'var(--color-palette-red-bg)', fg: 'var(--color-palette-red-fg)' }`.
- `PALETTE_COLORS` array has length 30.
- `PALETTE_COLORS` contains every member of the `PaletteColor` union (via type assertion `satisfies readonly PaletteColor[]`).
- Each name in `PALETTE_COLORS` is unique (no duplicates).

`Checkbox.test.tsx` additions:

- `<Checkbox color="violet" />` renders with the CSS variable `--checkbox-color` set to the violet token.
- Default `<Checkbox />` (no `color`) has no `--checkbox-color` inline style.
- Color does not override focus ring color (visual; documented + asserted by reading the rendered style if the test framework supports computed-style queries).

## Demo + cross-link wiring

- Create `packages/playground/src/pages/components/PaletteDemo.tsx`. Three examples:
  - **Swatch grid** — all 30 colors as bg+fg labeled tiles in a 6-col grid. Each tile shows the bg as the fill, the name + fg as foreground text.
  - **Consumer pattern — domain mapping** — short code snippet showing `EVENT_NAMESPACE_COLOR` + `eventPaletteColor()` + a row of sample chips for `auth.login_succeeded`, `user.created`, `role.assigned`, etc. The chips are a small inline `CategoryChip` defined in the demo file (`paletteTokens()` + style).
  - **Checkbox colors** — 6 checkboxes labeled "Marketing / Engineering / Sales / Support / Design / Ops" each with a different `color` prop. Half pre-checked to show the colored fill state.
- Wire into `App.tsx` (`/components/palette`), `AppShell.tsx` (where to place — see below), `ComponentsIndex.tsx` overview card.
- Add `'Palette'` to the `ComponentName` union in `packages/playground/src/pages/mockups/registry.ts` so the cross-link UI works when mockups eventually adopt palette colors.

**Sidebar placement:** the existing `componentGroups` clusters in `AppShell.tsx` are Layout / Forms / Display / Navigation / Feedback / etc. Palette is a token utility, not a true component, but the demo lives at `/components/palette`. Add it to the **Display** cluster (sits near Badge / Avatar / Text — tokens with visual identity).

- Add a `Palette` section to `packages/design-system/AGENTS.md`. Place near Badge (in the Display cluster) — that's the section the agent reaches for when looking up "what colors does this system have?".

## Out of scope

1. **Badge / FilterChip palette tones.** Their existing semantic tone unions stay 6-wide. If consumers want a colored Badge, they build their own chip using palette tokens.
2. **Auto-assignment helpers.** No `paletteColorIndex(name)`. Consumers either own a static map (`Record<key, PaletteColor>`) or hash on their own.
3. **Multi-shade per color.** Two values per color (bg + fg). Anything richer requires its own spec.
4. **Dark theme variants.** Add when dark mode is on the roadmap.
5. **Palette picker UI component.** The demo shows a swatch grid for browsing; a user-facing "pick a tag color" picker is out of scope (consumer can build with the palette).
6. **Color contrast verification harness.** Each pair is designed for WCAG AA (4.5:1) at the small-chip use. A runtime verification helper is not part of v1; spot-check during implementation.
7. **Extending Avatar's color scheme to use the new palette.** Avatar already has its own 6-color name-hashed scheme; staying separate keeps the two concerns decoupled.
