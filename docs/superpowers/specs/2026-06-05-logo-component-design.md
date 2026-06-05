# `<Logo>` component — design

**Date:** 2026-06-05
**Status:** Approved (brainstorm) → ready for implementation plan
**Package:** `@eocrm/design-system` (+ playground consumer refactor)

## Problem / goal

Mockups and the AppShell kept needing the eocrm brand logo, but the library has no way to render it: `Image` reserves a full-width box with skeleton/fallback (wrong for a small chrome mark), `Avatar` is circular, `BrandIcon` is a closed third-party set (`google`/`yandex`). The Login mockup currently renders the logo via a raw `<img>` Rule-6 escape hatch (tracked in `TODO.md`).

Ship a `<Logo>` primitive: the eocrm mark, with or without a wordmark, the wordmark beside (default) or below. Then refactor the consumers (Login mockup, AppShell), delete the playground asset, and tick the `TODO.md` `<Logo>` entry.

## Decision: bake the mark in

`<Logo>` bakes the eocrm mark as inline SVG — consistent with `BrandIcon` (which ships brand SVGs inline; its own JSDoc notes "brand hex is inline, the documented exception to token-only color"). This is `@eocrm/design-system` (the brand's own system), so shipping its mark is appropriate, and it removes asset-juggling from every consumer. _(Rejected: a generic `src` prop — that's just `Image` minus the skeleton, and consumers would still manage the asset.)_

The mark is **themeable**: its 3 paths use `fill="currentColor"`, and the component sets `color: var(--logo-color)`, which defaults to `var(--color-accent)` (= the brand `#0052CC`). So the resolved default is the brand blue, but a consumer can recolor it (e.g. on a dark surface) via `color`.

## API

```ts
export type LogoSize = 'sm' | 'md' | 'lg';
export type LogoTextPlacement = 'end' | 'bottom';

export interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  /** Wordmark beside/below the mark (consumers pass "eocrm"). Omit → mark only. */
  text?: ReactNode;
  /** Where the wordmark sits relative to the mark. Defaults to 'end' (beside). */
  textPlacement?: LogoTextPlacement;
  /** Mark size: sm 24 / md 32 (default) / lg 40 — the shared --size-* scale. */
  size?: LogoSize;
  /**
   * Accessible name for the mark when there is no `text`. Omit for a decorative
   * mark (aria-hidden) or when `text` is present (the text is the name).
   */
  label?: string;
}
```

- `forwardRef<HTMLDivElement>` (wrapper), spreads `HTMLAttributes` (Pattern A — props last; it's consumer-overridable chrome).
- **a11y (mirrors `BrandIcon`):** when `text` is present → the inline `<svg>` is `aria-hidden` (the text conveys the name). When no `text` but `label` is set → the `<svg>` gets `role="img"` + `aria-label={label}`. When neither → `aria-hidden` (decorative). Never both a visible `text` and a `label` (avoids "eocrm eocrm").

## Visual / SCSS

- Wrapper `.logo`: `inline-flex; align-items: center; gap: var(--logo-gap)`. `textPlacement="bottom"` → `flex-direction: column` (mark above, text centered below).
- `.mark`: `color: var(--logo-color)`; width/height by size (`--size-sm/md/lg`); paths inherit via `currentColor`. `flex-shrink: 0`.
- `.text`: `color: var(--color-fg)`; `font-weight: var(--font-weight-bold)`; font-size by size (sm → `--font-size-lg` 16, md → `--font-size-xl` 20, lg → a Logo token ≈ 24 since there's no `--font-size-2xl`). `line-height: 1`.
- Component tokens in `Logo.tokens.scss`: `--logo-color: var(--color-accent)`, `--logo-gap: var(--space-2)`, `--logo-text-size-lg` (≈24px) — referencing primitives, no raw color.
- Layout-owning is fine here (it's a brand chrome primitive); the SCSS uses only allowed properties (no `margin`/`flex-grow`/`flex-basis`).

## Components / files (Core invariant)

- **Create** `src/components/Logo/`: `Logo.tsx` (forwardRef + inline SVG + JSDoc), `Logo.tokens.scss`, `Logo.module.scss`, `Logo.test.tsx`, `index.ts`.
- **Modify** `src/index.ts` — `export { Logo }` + `export type { LogoProps, LogoSize, LogoTextPlacement }`.
- **Modify** both manifest CLUSTERS maps (`src/_meta/manifest.ts` + `scripts/generate-manifest.mjs`): `Logo: 'Display'` (next to `BrandIcon`); then `npm run build:manifest`.
- **Modify** `AGENTS.md` — a `### <Logo>` TL;DR near `BrandIcon`.
- **Create** the playground demo `packages/playground/src/pages/components/LogoDemo.tsx` (real component: mark-only, text-end, text-bottom, the three sizes, a recolored example) + wire into `App.tsx` (route `/components/logo`), `AppShell.tsx` (Display nav group), `ComponentsIndex.tsx` (card). Add `Logo` to the registry `ComponentName` union only if a mockup lists it (Login will — see below).

## Tests (Logo.test.tsx)

- Renders an `<svg>` (the mark) and forwards `ref` to the wrapper `<div>`.
- `text` present → renders the wordmark text; mark `<svg>` is `aria-hidden`.
- No `text`, `label` set → `<svg>` has `role="img"` + `aria-label={label}`; no text node.
- No `text`, no `label` → `<svg>` `aria-hidden`, no accessible name.
- `size` → applies the right size class (sm/md/lg).
- `textPlacement="bottom"` → applies the column/bottom class; `'end'` default does not.
- `className` merged; other attrs spread onto the wrapper.

## Consumer refactor (same PR — ticks the TODO)

- **Login mockup** (`pages/mockups/Login/Login.tsx`):
  - Replace the brand block (`<Cluster>` with the escape-hatch `<img>` + `<Text>eocrm</Text>` + the inline TODO comment) with `<Logo text="eocrm" size="lg" />`.
  - **Wrap the `<Card>` in `<Constrain width="sm">`** (fixed 320px) so step 2 no longer shrinks to its (narrower) content. Add `Constrain` to the imports.
  - **Remove the `PasswordInput` `placeholder="••••••••"`.**
  - Drop the now-unused `eocrmLogo` import; drop `Text` from imports if it becomes unused (it's still used elsewhere — keep if so).
  - Update `registry.ts` Login `usesComponents`: add `Logo` + `Constrain`; the logo is no longer a raw `<img>`. Extend the `ComponentName` union with `Logo` if absent.
- **AppShell** (`layout/AppShell/AppShell.tsx` + `.module.scss`, tooling): replace the `<img className={styles.brandLogo}>` with `<Logo size="sm" />` (mark only), keeping the `eocrm` / `Free trial` text block; collapsed → mark-only `<Logo>`. Drop the `eocrmLogo` import and the `.brandLogo` SCSS rule (Logo owns its sizing).
- **Delete** `packages/playground/src/assets/eocrm-logo.svg` (no remaining importers).
- **Tick** the `### [ ] <Logo>` entry in `packages/design-system/src/components/TODO.md` → `[x]`, noting it shipped + the refactor is done.

## Verification

- Library gates: `npm run typecheck`, `make build-lib`, `make lint`, `make test`, `npm run format:check`, `npm pack --dry-run` (0 test leaks).
- Playground gate: `make build`.
- **Library Hard rule 8** review-fix loop (component correctness, a11y, rules, tokens) until clean.
- **Playground Hard rule 7** review for the Login mockup change (the escape-hatch `<img>` is gone → that finding clears; the card no longer shrinks; placeholder removed).
- Manual/Playwright smoke: `/components/logo` shows all variants; `/mockups/login` shows the `<Logo>` above the card, the card width is stable between steps, the password field has no placeholder; the AppShell rail shows the `<Logo>` mark.

## Non-goals

- No generic image/logo renderer (baked mark only). No per-path multicolor theming (the mark is single-color via `currentColor`).
- No change to `BrandIcon` (third-party marks stay separate).

## Branch

`feat/logo-component`, off `main`. Its own PR. (Touches `packages/design-system/**` → merging publishes a new library version.)
