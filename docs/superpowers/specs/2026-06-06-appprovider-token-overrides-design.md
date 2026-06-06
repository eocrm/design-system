# AppProvider token overrides — design

**Date:** 2026-06-06
**Status:** Approved (brainstorm) → ready for implementation plan
**Package:** `@eocrm/design-system` (AppProvider + docs)
**Builds on:** the dark theme (`v0.1.21`, `src/styles/dark.scss` — `data-theme` / `prefers-color-scheme` token layer).

## Problem / goal

Let a consuming app rebrand the design system by overriding CSS design tokens (accent color, surfaces, radii, fonts, …) through `<AppProvider>`, without forking the library or hand-writing a global stylesheet. The override must:

- Reach **portaled** content (`Modal`, `Tooltip`, `Select` listbox, `DropdownMenu`, `Popover`, `Toast`, date pickers) — these `createPortal(..., document.body)`, i.e. render **outside** the AppProvider React subtree, so a scoped wrapper `<div style>` would NOT theme them. Overrides therefore must be applied **globally**.
- Layer **correctly with the dark theme**: the dark layer redefines primitives at selector specificity `(0,2,0)` (`:root[data-theme='dark']`, and `:root:not([data-theme='light'])` inside `@media (prefers-color-scheme: dark)`). A naïve consumer override at `:root` `(0,1,0)` would lose to dark for any token dark also defines (accent, surfaces, semantic, …).

## Decisions (from brainstorming)

1. **Shape:** `tokens` (applies to **both** themes) + optional `darkTokens` (refines dark only). So "use our brand accent" works everywhere with one map; a lighter dark-mode accent is a small addition when needed.
2. **Key surface:** any CSS token — a flat `Partial<Record<\`--${string}\`, string>>`. Tiny API, max flexibility (the tokens are already the documented public surface). The `--` prefix is validated.
3. **Mechanism:** a **declarative `<style>`** rendered by AppProvider (not imperative `documentElement` mutation, not a wrapper). Global (reaches portals), composes with the cascade/dark layer via normal specificity + source order, auto-cleans on unmount, SSR-safe.

## API

```ts
/** A flat map of CSS custom property → value. Keys must start with `--`. */
export type TokenMap = Partial<Record<`--${string}`, string>>;

interface AppProviderProps {
  // … existing: locale, intlLocale, translations, toast, children …

  /**
   * CSS design-token overrides applied in BOTH light and dark. Keyed by token
   * name (`--color-accent`, `--radius-md`, `--font-family-sans`, …). Memoize.
   */
  tokens?: TokenMap;

  /**
   * Token overrides applied only in dark (forced `data-theme="dark"` AND
   * system `prefers-color-scheme: dark`). Merged OVER `tokens` in the dark
   * scopes — use it to tune a token for dark (e.g. a lighter accent). Memoize.
   */
  darkTokens?: TokenMap;
}
```

Usage:

```tsx
<AppProvider
  locale="en"
  tokens={{ '--color-accent': '#7c3aed', '--radius-md': '6px' }}
  darkTokens={{ '--color-accent': '#a78bfa' }}
>
  <App />
</AppProvider>
```

Both omitted ⇒ AppProvider renders no extra `<style>` and behaves exactly as today (the zero-side-effect path is preserved for the no-override case).

## Mechanism — generated CSS

AppProvider renders one `<style>` whose blocks mirror `dark.scss`'s scopes, so precedence is correct by construction:

```css
:root {
  /* …tokens… */
}
:root[data-theme='dark'] {
  /* …tokens… then …darkTokens… (darkTokens wins) */
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    /* …tokens… then …darkTokens… */
  }
}
```

- The `:root` block (`0,1,0`) overrides the bundled base `:root` via **source order** (the `<style>` mounts after the imported `global.scss`).
- The dark blocks (`0,2,0`) match `dark.scss`'s own specificity and, being rendered later in the DOM, win the tie — so the consumer's brand value (and `darkTokens`) beat the library's dark defaults.
- Re-emitting `tokens` into the dark scopes is what makes a single `tokens` map apply in dark too; `darkTokens` is layered after it within those scopes.
- Blocks are emitted **only** for non-empty maps. If `tokens` is empty/undefined and `darkTokens` is empty/undefined → the builder returns `null` and no `<style>` is rendered. If only `darkTokens` is given, the plain `:root` block is omitted but the dark blocks are emitted.

## Isolation & safety

- **Pure builder** `src/app/themeTokens.ts`:
  - `buildThemeTokenCss(tokens?: TokenMap, darkTokens?: TokenMap): string | null` — returns the CSS string, or `null` when there is nothing to emit.
  - Internally: a `sanitizeEntries(map)` that keeps only entries whose **key** matches `^--[\w-]+$` and whose **value** contains none of `{ } < >` (the characters that could break out of a declaration / the `<style>` element). Rejected entries are dropped and `console.warn`-ed (dev signal; the consumer is trusted, this is defensive, not a security boundary). Legitimate values pass: `rgb(87 157 255 / 65%)`, `calc(100% - 8px)`, `0 1px 2px rgb(0 0 0 / 40%)`, `'Inter', system-ui, sans-serif`.
  - Serialization is deterministic: declarations in the map's own key order; `darkTokens` declarations appended after `tokens` within the dark scopes.
- **AppProvider** calls the builder inside `useMemo([tokens, darkTokens])` and renders `{css && <style>{css}</style>}` as the first child inside the providers. No imperative DOM, no effect, no cleanup logic.
- JSDoc instructs consumers to **memoize** `tokens` / `darkTokens` (a fresh object literal each render rebuilds the CSS) — same guidance the `translations` prop already carries.

## Tests

- `src/app/themeTokens.test.ts` (pure builder):
  - light-only `tokens` → emits `:root {}` + dark scopes (tokens re-emitted), no `darkTokens` lines.
  - `tokens` + `darkTokens` → dark scopes contain tokens then darkTokens (order asserted).
  - `darkTokens` only → no plain `:root` block; dark scopes present.
  - both empty / undefined → `null`.
  - key rejection (`color-accent` without `--`, `--bad name`) and value rejection (`red} body{display:none`, contains `<`) → dropped + warned.
  - valid complex values (rgb-with-alpha, calc, font stack, shadow) → preserved verbatim.
- `src/app/AppProvider.test.tsx` (integration, extends existing):
  - given `tokens`, renders a `<style>` whose text includes `:root` and the declaration; given `darkTokens`, includes `[data-theme='dark']`.
  - given neither, renders **no** `<style>` (assert none added).
  - still composes Locale/I18n/Toast and renders children as before.

## Docs

- `AGENTS.md` **Setup** section: add a `tokens` / `darkTokens` example after the existing `<AppProvider>` snippet; document both props.
- `AGENTS.md` **Dark theme** section: cross-link ("rebrand via `<AppProvider tokens>` — see Setup") and **soften** the "no DOM side-effects" line to "no _imperative_ DOM mutation; `<AppProvider>` token overrides emit a declarative `<style>`."
- Full JSDoc on `tokens` / `darkTokens` (+ `@example`) and on the exported `TokenMap` type. Export `TokenMap` from `src/index.ts` alongside `AppProviderProps`.

## Verification

- Gates: `make test`, `make build`, `make build-lib`, `make lint`, `npm run format:check`, `npm pack --dry-run`.
- **Playwright** (throwaway): temporarily wrap the playground root (`packages/playground/src/main.tsx`) in `<AppProvider locale="en" tokens={{ '--color-accent': '#7c3aed' }} darkTokens={{ '--color-accent': '#a78bfa' }}>`, confirm the accent flips across light/dark **and inside a portaled overlay** (open a Modal / Select), then **revert** the wrap. No permanent playground change.
- Library Rule-8 review loop.

## Non-goals

- A curated/abstracted brand object (`{ accent, surface }`) — flat token passthrough only.
- A permanent playground "brand" demo/control (AppProvider is a root provider with no demo page; a global override doesn't fit the per-page demo model).
- Per-subtree theming, runtime theme objects, or a JS theming context — overrides are CSS, applied once at the root.
- Imperative `documentElement` mutation.

## Branch

`feat/appprovider-token-overrides`, off `main` (post-dark-theme, `86368a8`). Its own PR (touches `packages/design-system/**` → publishes a library version).
