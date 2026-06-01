# `<IconTile>` — palette-colored tile framing an icon

## Goal

A small **decorative** container that frames a single icon, tinted by a **Palette** color. It closes the
`<StatTile>` `TODO.md` gap — the inline-styled tile the Dashboard stat cards and the Members invite rows
hand-roll today — and is renamed `IconTile` (more accurate than `StatTile`, since it's used beyond
stats). Distinct from `Avatar` (initials/photo) and `Badge` (text chip).

```tsx
<IconTile color="blue" icon={<Zap size={16} />} />
<IconTile color="amber" shape="circle" icon={<MailPlus size={14} />} />
```

## Locked-in decisions (brainstorm)

1. **Name:** `IconTile` (renamed from the TODO's `StatTile`).
2. **Color = Palette, not semantic tone.** A `color?: PaletteColor` prop (one of the 30 categorical
   colors), defaulting to `'slate'`. No semantic `tone` axis — Palette colors carry visual identity, not
   status (the Palette's own doc says use `BadgeTone` for status; here we want the categorical set).
3. **Content via an `icon` prop** (required `ReactNode`), not `children`. The consumer sizes their own
   icon (e.g. 14–20px), as the mocks do today.
4. **Decorative by default, `label` opts in.** Mirrors `<BrandIcon>`: no `label` → `aria-hidden="true"`;
   `label` set → `role="img"` + `aria-label`. The component handles a11y fully — the consumer never has
   to `aria-hidden` their icon.
5. **`size`:** `'sm' | 'md' | 'lg'` (24 / 32 / 40 px), default `'md'` — sizes the tile box, not the icon.
6. **`shape`:** `'square'` (radius-md, default) | `'circle'` (radius-full).
7. **Mock refactor:** Dashboard tile → `<IconTile color="blue" …>` (matches the prior accent look);
   Members invite tile → `<IconTile color="amber" shape="circle" …>` (decorative — drops the semantic
   warning link to its neighbouring Badge, per the brainstorm).

## Architecture

`IconTile` is a `forwardRef` `<span>` (Display cluster, primitive tier — it imports only the
`paletteTokens` util, no other library component). Lives in `src/components/IconTile/`.

```tsx
import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { paletteTokens, type PaletteColor } from '../../palette';
import styles from './IconTile.module.scss';

export type IconTileSize = 'sm' | 'md' | 'lg';
export type IconTileShape = 'square' | 'circle';

export interface IconTileProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  /** The icon to frame — a lucide icon (sized by you, ~14–20px), custom SVG, or any ReactNode. */
  icon: ReactNode;
  /**
   * Palette color for the tint (one of the 30 categorical colors). Defaults to `'slate'`.
   * Categorical, not semantic — for status use a `<Badge tone>` instead.
   */
  color?: PaletteColor;
  /** Tile box size. `'sm'` 24 / `'md'` 32 (default) / `'lg'` 40 px. Sizes the tile, not the icon. */
  size?: IconTileSize;
  /** `'square'` (radius-md, **default**) or `'circle'` (radius-full). */
  shape?: IconTileShape;
  /**
   * Accessible name. Omit (default) → the tile is decorative (`aria-hidden`), for use beside text
   * that carries the meaning. Set it → `role="img"` + `aria-label`, for a standalone tile whose icon
   * is the only indicator.
   */
  label?: string;
}

export const IconTile = forwardRef<HTMLSpanElement, IconTileProps>(function IconTile(
  { icon, color = 'slate', size = 'md', shape = 'square', label, className, style, ...rest },
  ref,
) {
  const { bg, fg } = paletteTokens(color);
  // Pass the palette tokens through as CSS custom properties; the stylesheet
  // reads them (background/color live in .module.scss). Keeps the color DRY —
  // no hand-maintained 30-color class list — and token-correct (values are
  // var(--color-palette-…), never raw). Dynamic-inline-var matches Progress.
  const cssVars = { '--icon-tile-bg': bg, '--icon-tile-fg': fg } as CSSProperties;

  // Decorative by default; `label` promotes it to a labelled image. Set before
  // {...rest} (Pattern A) so a consumer can override role/aria-*.
  const a11y = label != null ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  return (
    <span
      ref={ref}
      className={clsx(styles.tile, styles[`size-${size}`], styles[`shape-${shape}`], className)}
      style={{ ...cssVars, ...style }}
      {...a11y}
      {...rest}
    >
      {icon}
    </span>
  );
});
```

### A11y notes

- Default (no `label`): `aria-hidden="true"`, no role — decorative; the adjacent text (stat value,
  invitee email) carries meaning. Matches both mock sites (the Members tile is already `aria-hidden`).
- `label` set: `role="img"` + `aria-label={label}`, NOT aria-hidden. The `role="img"` makes AT treat the
  subtree as a single labelled image, so the inner icon needs no separate `aria-hidden`.
- `{...rest}` last (Pattern A) lets a consumer override the a11y defaults if needed.

### Color application — why CSS-var passthrough

`paletteTokens(color)` (the existing public helper) returns `{ bg: 'var(--color-palette-<color>-bg)', fg:
'var(--color-palette-<color>-fg)' }`. The component sets those as `--icon-tile-bg` / `--icon-tile-fg` on
the element; `IconTile.module.scss` declares `background: var(--icon-tile-bg); color:
var(--icon-tile-fg)`. This avoids a hand-maintained 30-class list (DRY — adding a palette color needs no
IconTile change) and keeps `background`/`color` declarations in the stylesheet. The two inline values are
CSS custom properties, not raw colors, so Rule 3 (no raw values) is satisfied; setting dynamic inline
values is the same pattern `Progress`/`CircularProgress` use. `style` is destructured and merged after
the vars so consumer `style` still composes.

## SCSS

`IconTile.module.scss`:

```scss
@use './IconTile.tokens';

.tile {
  display: inline-grid;
  place-items: center;
  background: var(--icon-tile-bg);
  color: var(--icon-tile-fg);
}

.size-sm {
  width: var(--icon-tile-size-sm);
  height: var(--icon-tile-size-sm);
}
.size-md {
  width: var(--icon-tile-size-md);
  height: var(--icon-tile-size-md);
}
.size-lg {
  width: var(--icon-tile-size-lg);
  height: var(--icon-tile-size-lg);
}

.shape-square {
  border-radius: var(--icon-tile-radius-square);
}
.shape-circle {
  border-radius: var(--icon-tile-radius-circle);
}
```

`IconTile.tokens.scss` (component tokens default to primitives, per the component-tokens convention):

```scss
:root {
  --icon-tile-size-sm: var(--size-sm); // 24px
  --icon-tile-size-md: var(--size-md); // 32px
  --icon-tile-size-lg: var(--size-lg); // 40px
  --icon-tile-radius-square: var(--radius-md);
  --icon-tile-radius-circle: var(--radius-full);
}
```

Fixed `width`/`height` per size mirrors `<Avatar>` (a sizing primitive with intrinsic dimensions) and is
not a Rule-4 layout leak; `width`/`height` are not in stylelint's `property-disallowed-list`. The
`background`/`color` values are `var(--icon-tile-*)` so `declaration-strict-value` is satisfied.

## Files

| File                                                                  | Change                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/design-system/src/components/IconTile/IconTile.tsx`         | NEW — component + props + JSDoc                                                              |
| `packages/design-system/src/components/IconTile/IconTile.module.scss` | NEW                                                                                          |
| `packages/design-system/src/components/IconTile/IconTile.tokens.scss` | NEW                                                                                          |
| `packages/design-system/src/components/IconTile/IconTile.test.tsx`    | NEW                                                                                          |
| `packages/design-system/src/components/IconTile/index.ts`             | NEW — `export { IconTile }` + types                                                          |
| `packages/design-system/src/index.ts`                                 | MODIFY — re-export                                                                           |
| `packages/design-system/src/_meta/manifest.ts`                        | MODIFY — `IconTile: 'Display'` in CLUSTERS                                                   |
| `packages/design-system/scripts/generate-manifest.mjs`                | MODIFY — same                                                                                |
| `packages/design-system/src/components.manifest.json`                 | REGEN — `npm run build:manifest`                                                             |
| `packages/design-system/AGENTS.md`                                    | MODIFY — Display TL;DR                                                                       |
| `packages/design-system/src/components/TODO.md`                       | MODIFY — tick `<StatTile>` (shipped as `<IconTile>`)                                         |
| `packages/playground/src/pages/components/IconTileDemo.tsx`           | NEW — demo                                                                                   |
| `packages/playground/src/App.tsx`                                     | MODIFY — `/components/icon-tile` route                                                       |
| `packages/playground/src/layout/AppShell/AppShell.tsx`                | MODIFY — Display nav entry (a lucide icon, plan picks one not already imported)              |
| `packages/playground/src/pages/components/ComponentsIndex.tsx`        | MODIFY — overview card                                                                       |
| `packages/playground/src/pages/mockups/registry.ts`                   | MODIFY — `ComponentName` union gains `IconTile`; add to Dashboard + Members `usesComponents` |
| `packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx`       | MODIFY — replace inline tile with `<IconTile color="blue">`                                  |
| `packages/playground/src/pages/mockups/Members/Members.tsx`           | MODIFY — replace inline tile with `<IconTile color="amber" shape="circle">`                  |

## Tests (`IconTile.test.tsx`)

- Renders the `icon` child (e.g. an `<svg data-testid>`); the outer element is a `<span>`.
- Defaults: `size="md"`, `shape="square"`, `color="slate"` — assert the `size-md` / `shape-square`
  classes and that the `--icon-tile-bg` inline custom property is `var(--color-palette-slate-bg)`.
- `size` → `size-sm`/`size-md`/`size-lg`; `shape` → `shape-square`/`shape-circle`.
- `color="blue"` sets `--icon-tile-bg: var(--color-palette-blue-bg)` and `--icon-tile-fg:
var(--color-palette-blue-fg)` (read `el.style.getPropertyValue('--icon-tile-bg')`).
- Decorative by default: no `label` → `aria-hidden="true"`, no `role`.
- `label="Pending invite"` → `role="img"` + `aria-label="Pending invite"`, and NOT `aria-hidden`.
- `ref` forwards to the `<span>`.
- `className` merges; consumer `style` merges with the CSS vars (pass `style={{ opacity: 0.5 }}`, assert
  both the var and the opacity are present); other attrs (`data-*`) spread.

## Demo (`IconTileDemo.tsx`)

`DemoLayout` + `Example` blocks: the full palette swatch grid (map `PALETTE_COLORS`); the three sizes;
square vs circle; decorative vs `label` (with a note on when each is right). Wired into `App.tsx`
(`/components/icon-tile`), the AppShell **Display** group, and `ComponentsIndex`.

## Mock refactor (ticks the `<StatTile>` TODO)

- **Dashboard** (`Dashboard.tsx`): the inline `<div style={{…accent square…}}>` → `<IconTile
color="blue" icon={<Icon size={16} />} />` (square/md default). `blue`'s `bg` (`#deebff`) matches the
  prior `--color-accent-subtle-bg`. Remove the `{/* TODO: replace when <StatTile> ships */}` comment.
- **Members** (`Members.tsx`): the inline `<span aria-hidden style={{…warning circle…}}>` → `<IconTile
color="amber" shape="circle" icon={<MailPlus size={14} />} />` (decorative — no `label`, matching the
  current `aria-hidden`). Remove the TODO comment.
- `registry.ts`: add `'IconTile'` to the `ComponentName` union and to both the `dashboard` and `members`
  entries' `usesComponents`.
- `TODO.md`: tick the `<StatTile>` entry `[x]`, note it **shipped as `<IconTile>`** (renamed) with the
  Palette-color model, and that the Dashboard + Members mocks were refactored.

## When NOT to use (JSDoc `@remarks` + AGENTS.md)

- A person → `<Avatar>` (initials / photo, round). IconTile frames a generic icon, not a person.
- Text or a status label → `<Badge>` (text chip; semantic `tone`). IconTile holds an icon and uses
  categorical Palette color, not status semantics.
- A plain icon with no tinted container → just render the lucide icon (optionally in a `<Cluster>`).
  IconTile is specifically the tinted square/circle treatment.
- Anti-pattern: ❌ a decorative IconTile (default) used as the _only_ indicator of meaning with no nearby
  text — give it a `label` so AT users get the meaning.

## Out of scope (v1)

- A semantic `tone` axis (Palette color only).
- Non-icon children / arbitrary content (it's an icon frame).
- Numeric or custom pixel sizes (the `sm`/`md`/`lg` scale only).
- Interactive / clickable behavior (it's decorative; wrap it in a `<button>`/`<Link>` if you need
  interaction — that's the consumer's layout concern).
