# `<BrandIcon>` — multi-color brand / social-provider marks

## Goal

A small library primitive that renders a brand's official multi-color mark for SSO buttons and
brand chrome — `<BrandIcon name="google" />`. Ships **Google** and **Yandex** in v1; extensible
to more brands later. Closes the `<BrandIcon>` `TODO.md` gap (the Login mockup hand-rolls an
inline Google `<svg>` escape hatch today).

## Locked-in decisions (brainstorm)

1. **Single component, `name` union:** `<BrandIcon name="google" | "yandex" />` (not individual
   `<GoogleIcon>` components). Fits the library's one-dir-per-component convention; one demo /
   test / manifest entry; the union documents the available brands.
2. **v1 brands:** `google` (4-color "G") + `yandex` (red rounded-square "Я" logomark, `#FC3F1D`).
3. **Full-color, brand-mandated.** No `color`/`tone` prop — brand guidelines fix the colors; this
   is the documented exception to the token-only-color rule. Uses official brand SVG path data.
4. **`size`:** numeric px, default **20** (matches how the codebase sizes lucide icons).
5. **Decorative by default** (`aria-hidden="true"`); a `title` prop opts into a labeled `role="img"`.
6. **Cluster:** Display · **tier:** primitive · **no i18n** (brand names are proper nouns,
   consumer-supplied).
7. **Refactor + bookkeeping:** replace the Login mockup's inline Google `<svg>` with
   `<BrandIcon name="google" size={16} />`; tick the `<BrandIcon>` `TODO.md` entry; mark the
   `<AuthScreen>` entry **deferred** (we won't build a reusable auth-layout primitive for a single
   mockup screen).

## Architecture

An internal SVG registry keyed by brand, rendered into a single `<svg>`:

```tsx
type BrandSvg = { viewBox: string; body: ReactNode };
// Record<BrandName, …> makes completeness a COMPILE-TIME guarantee: TypeScript
// fails the build if a BrandName is added to the union without a registry entry.
const ICONS: Record<BrandName, BrandSvg> = {
  google: { viewBox: '0 0 48 48', body: <>…4 brand-colored <path>s…</> },
  yandex: { viewBox: '0 0 24 24', body: <>…red rounded-square + white "Я"…</> },
};
```

Render: `<svg ref={ref} width={size} height={size} viewBox={icon.viewBox} className={clsx(styles.icon, className)} {...a11y} {...rest}>{titleEl}{icon.body}</svg>` (consumer `className` destructured + merged; `{...rest}` last so a consumer can still override the a11y defaults).

- **a11y:** when `title` is omitted → `aria-hidden="true"` (decorative; the adjacent text label
  carries the name). When `title` is set → `role="img"` + `aria-label={title}` + a `<title>` child.
  `{...rest}` spreads LAST so a consumer can override either (Pattern A).
- **Brand hex** lives in the SVG path `fill`s (not tokens) — the documented exception. The exact
  path data comes from official brand assets (Google's 4-color G; Yandex's red logomark); where an
  official asset isn't to hand, a faithful hand-authored mark is used (same as the approved preview).

## Props

```ts
import { type SVGAttributes } from 'react';

/** Brands shipped today. Extend the union + the ICONS registry to add more. */
export type BrandName = 'google' | 'yandex';

export interface BrandIconProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
  /** Which brand mark to render. */
  name: BrandName;
  /** Square pixel size (width = height). Defaults to `20`. */
  size?: number;
  /**
   * Accessible name. Omit (default) for a decorative icon next to a text label —
   * the icon is then `aria-hidden`. Set it for a standalone icon (e.g. an
   * icon-only button) → renders `role="img"` + `aria-label`.
   */
  title?: string;
}
```

`forwardRef` → the `<svg>`. `className`/`style` and any other SVG attrs spread onto the `<svg>`.

## Files

| File                                                                    | Change                                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `packages/design-system/src/components/BrandIcon/BrandIcon.tsx`         | NEW — component + `ICONS` registry                                                                                  |
| `packages/design-system/src/components/BrandIcon/BrandIcon.module.scss` | NEW — minimal `.icon` class                                                                                         |
| `packages/design-system/src/components/BrandIcon/BrandIcon.test.tsx`    | NEW — unit tests                                                                                                    |
| `packages/design-system/src/components/BrandIcon/index.ts`              | NEW — `export { BrandIcon }` + `export type { BrandIconProps, BrandName }`                                          |
| `packages/design-system/src/index.ts`                                   | MODIFY — re-export                                                                                                  |
| `packages/design-system/src/_meta/manifest.ts`                          | MODIFY — `BrandIcon: 'Display'` in `CLUSTERS`                                                                       |
| `packages/design-system/scripts/generate-manifest.mjs`                  | MODIFY — same `BrandIcon: 'Display'` (kept in sync)                                                                 |
| `packages/design-system/src/components.manifest.json`                   | REGEN — `npm run build:manifest`                                                                                    |
| `packages/design-system/src/components/TODO.md`                         | MODIFY — tick `<BrandIcon>`; mark `<AuthScreen>` deferred                                                           |
| `packages/design-system/AGENTS.md`                                      | MODIFY — `<BrandIcon>` TL;DR (Display)                                                                              |
| `packages/playground/src/pages/mockups/Login/Login.tsx`                 | MODIFY — inline Google `<svg>` → `<BrandIcon name="google" size={16} />`; drop the escape-hatch TODO comment        |
| `packages/playground/src/pages/components/BrandIconDemo.tsx`            | NEW — demo                                                                                                          |
| `packages/playground/src/App.tsx`                                       | MODIFY — `/components/brand-icon` route                                                                             |
| `packages/playground/src/layout/AppShell/AppShell.tsx`                  | MODIFY — Display nav entry (a lucide icon, e.g. `Fingerprint` or `BadgeCheck`; plan picks one not already imported) |
| `packages/playground/src/pages/components/ComponentsIndex.tsx`          | MODIFY — overview card                                                                                              |

**`BrandIcon.module.scss`:** `structure.test.ts` requires a `<Name>.module.scss` for every
component, so `BrandIcon` ships one with a single `.icon` class applied to the `<svg>` —
`display: inline-block; vertical-align: middle; flex: none;` (sane inline placement next to text +
no shrink inside a flex SSO button). No `.tokens.scss`: brand colors are inline hex (the documented
exception) and there's no token-styled surface, and `.tokens.scss` isn't one of the four
structure-test-required files.

## Tests (`BrandIcon.test.tsx` minimum)

- `name="google"` renders an `<svg>` (and its 4 colored `<path>`s); `name="yandex"` renders the
  Yandex mark — assert they differ (e.g. distinct path counts / a brand-hex fill present).
- `size` sets the `<svg>` `width` + `height` (default `20`; `size={32}` → 32).
- Decorative by default: no `title` → `aria-hidden="true"`, no `role`.
- `title="Google"` → `role="img"`, `aria-label="Google"`, a `<title>` child, and NOT `aria-hidden`.
- `ref` forwards to the `<svg>`.
- `className` merges; other SVG attrs (e.g. `data-*`) spread onto the `<svg>`.
- Every `BrandName` renders without throwing (guards the registry; `Record<BrandName,…>` already
  enforces completeness at compile time).

## Demo page outline (`BrandIconDemo.tsx`)

1. The marks — `google` + `yandex` at `size` 16 / 20 / 32.
2. In SSO buttons — `<Button variant="secondary"><BrandIcon name="google" size={16} /> Continue with Google</Button>` and the Yandex equivalent (the canonical use).
3. Labeled standalone — `<BrandIcon name="yandex" title="Yandex" />` (shows the `role="img"` path).

## When NOT to use (JSDoc `@remarks` + AGENTS.md)

- Generic UI glyphs (chevrons, search, close) → use `lucide-react`. `BrandIcon` is only for
  third-party **brand** marks.
- Recoloring to match your theme → not supported; brand marks must keep their official colors.
  If you need a monochrome treatment for a dark bar, that's a future variant, not a recolor prop.
- Anti-pattern: ❌ a decorative `BrandIcon` next to visible brand text AND a `title` — that
  double-announces ("Google Continue with Google"). Keep it `aria-hidden` (default) beside a label.

## Out of scope (v1)

- Monochrome / single-color variant.
- Brands beyond Google + Yandex (added later by extending the union + registry).
- `<AuthScreen>` (deferred — see TODO.md).
- A `size` token scale (numeric px only, matching lucide usage).
