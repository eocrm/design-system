# Dark theme — design

**Date:** 2026-06-06
**Status:** Approved (brainstorm) → ready for implementation plan
**Package:** `@eocrm/design-system` (tokens + docs) + playground (toggle)

## Problem / goal

Add a dark theme. The token system is already dark-ready: ~40 source-of-truth color primitives in `tokens.scss` (`:root`), and ~1,500 lines of component `*.tokens.scss` are `var()`-aliases that cascade. So dark mode is mostly a **token-redefinition** exercise — redefine the primitives (+ a few literal-hex exceptions) under a dark scope and nearly every component flips automatically.

The mechanism is pre-committed by prior specs: `[data-theme='dark']` (component-tokens spec, 2026-05-27) and **CSS-token-based theming, no React context** (AppProvider spec, 2026-06-01).

## Decisions (from brainstorming)

1. **Scope:** core dark palette now (surfaces, text, borders, accent, semantic, shadows, overlays, focus rings, Badge tones, Tooltip, `color-scheme`). The 30-color categorical `--color-palette-*` set (60 tokens) is a **fast-follow** (its own spec/PR). Avatars are theme-independent identity circles — kept as-is (verified by contrast in review).
2. **States:** 3-state — **System** (default; `prefers-color-scheme`), **Light**, **Dark** (forced via `[data-theme]`).
3. **Toggle:** the library ships dark tokens + `color-scheme` + docs (incl. a no-flash snippet); the visible toggle lives in the **playground** (Rail footer) with `localStorage`. No toggle component / React context in the library.

## Mechanism

A single dark token set, written **once** as a SCSS mixin and emitted into both scopes (so System and forced-Dark stay in sync). New file `packages/design-system/src/styles/dark.scss`:

```scss
@mixin dark-tokens {
  // … all dark color overrides (see "Dark tokens" below) …
}

// Forced dark.
:root[data-theme='dark'] {
  color-scheme: dark;
  @include dark-tokens;
}

// System default — applies when the OS is dark AND the user hasn't forced light.
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
    @include dark-tokens;
  }
}

// Forced light wins over the media query (higher specificity than bare :root).
:root[data-theme='light'] {
  color-scheme: light;
}
```

- `global.scss` gains `@use 'dark';` **after** `tokens` (so the dark blocks follow the light `:root` in cascade order). `tokens.scss`'s base `:root` gains `color-scheme: light;` (explicit default).
- `:root[data-theme='dark']` (specificity 0,1,1) beats the bare `:root` (0,1,0); `:root:not([data-theme='light'])` (0,2,0) beats bare `:root` inside the media query. So: no attr → System; `[data-theme='light']` → Light; `[data-theme='dark']` → Dark.
- Because component tokens are `var()`-aliases, redefining the **primitives** cascades. The only non-primitive overrides needed are the literal-hex exceptions: **Badge** filled tones and **Tooltip** (inverted-by-design) — both redefined inside the same `dark-tokens` mixin (cross-file token override is valid; keeps the whole dark palette in one reviewable place).
- `--color-table-*`, `--color-presence-*`, deprecated `--color-badge-*` aliases, Skeleton, Code, Alert tints, Card stripe, all chain to primitives → flip for free (NOT redefined).
- **Left as-is (theme-independent / intentional):** BrandIcon brand marks; ColorPicker HSV/spectrum literals; ImageCrop scrim; accent/semantic `*-fg` whites where the fill stays bright→see below; avatar palette; the playground `eocrm-logo.svg` (`#0052CC`, `<img>` — can't CSS-recolor; stays blue, acceptable; the Logo wordmark text flips via `--color-fg`).

## Dark tokens (concrete values — contrast-targeted AA, tunable live in the playground)

The `dark-tokens` mixin redefines exactly these (light → dark):

**Surfaces & text**

```
--color-bg            #ffffff → #1d2125
--color-bg-subtle     #fafbfc → #22272b
--color-bg-muted      #f4f5f7 → #282e33
--color-bg-sunken     #ebecf0 → #161a1d
--color-bg-danger-subtle #ffebe6 → #42201d
--color-border        #dfe1e6 → #38414a
--color-border-strong #c1c7d0 → #50585f
--color-fg            #172b4d → #dee4ea
--color-fg-muted      #5e6c84 → #9aa7b5
--color-fg-subtle     #6b778c → #7e8b9a
--color-fg-disabled   #a5adba → #5a6472
```

**Accent** (lightened for dark; the fill takes dark text)

```
--color-accent          #0052cc → #579dff
--color-accent-hover    #0747a6 → #85b8ff
--color-accent-pressed  #053585 → #cce0ff
--color-accent-fg       #ffffff → #1d2125   (dark text on the bright accent fill)
--color-accent-subtle-bg #deebff → #1c3a5e  (dark blue tint)
--color-accent-bg-subtle #deebff → #1c3a5e
```

**Semantic** (brightened so they read as text on dark; fills take dark text)

```
--color-danger          #de350b → #f87168
--color-danger-hover    #bf2600 → #ff9c8f
--color-danger-fg       #ffffff → #1d2125
--color-danger-bg-subtle #ffebe6 → #42201d
--color-success         #00875a → #4bce97
--color-success-hover   #006644 → #7ee2b8
--color-success-fg      #ffffff → #1d2125
--color-success-bg-subtle #e3fcef → #1c3d31
--color-warning         #ff991f → #f5cd47
--color-warning-fg      #ffffff → #1d2125
--color-warning-bg-subtle #fff7ed → #3d3216
--color-info            #0052cc → #579dff
--color-info-bg-subtle  #ebf3ff → #16324f
```

**Focus rings** (brighter + stronger alpha for dark)

```
--ring-accent  rgb(76 154 255 / 50%) → rgb(87 157 255 / 65%)
--ring-danger  rgb(222 53 11 / 40%)  → rgb(248 113 104 / 55%)
--ring-success rgb(0 135 90 / 40%)   → rgb(75 206 151 / 55%)
```

**Overlays** (dark scrim; the blur frost flips from white→dark)

```
--color-bg-overlay      rgb(15 23 42 / 35%)    → rgb(0 0 0 / 55%)
--color-bg-overlay-blur  rgb(255 255 255 / 30%) → rgb(0 0 0 / 45%)
```

**Shadows** (near-black navy → stronger pure-black so elevation reads on dark)

```
--shadow-sm  → 0 1px 2px rgb(0 0 0 / 40%)
--shadow-md  → 0 2px 4px rgb(0 0 0 / 40%), 0 0 1px rgb(0 0 0 / 56%)
--shadow-lg  → 0 4px 12px -2px rgb(0 0 0 / 50%), 0 0 1px rgb(0 0 0 / 56%)
--shadow-table-pinned-edge       → 4px 0 8px -4px rgb(0 0 0 / 50%)
--shadow-table-pinned-edge-right → -4px 0 8px -4px rgb(0 0 0 / 50%)
```

**Badge filled tones** (the 12 literal hexes from `Badge.tokens.scss`, overridden in the dark mixin → dark tint bg + light fg)

```
--badge-bg-neutral #f4f5f7 → #2c333a   --badge-fg-neutral #42526e → #c7d1db
--badge-bg-info    #deebff → #16324f   --badge-fg-info    #0747a6 → #9dc3ff
--badge-bg-success #e3fcef → #1c3d31   --badge-fg-success #006644 → #7ee2b8
--badge-bg-warning #fffae6 → #3d3216   --badge-fg-warning #974f00 → #f5cd47
--badge-bg-danger  #ffebe6 → #42201d   --badge-fg-danger  #bf2600 → #ff9c8f
--badge-bg-purple  #eae6ff → #2b2c4d   --badge-fg-purple  #403294 → #b8acf6
```

**Tooltip** (inverted-by-design: light `--tooltip-bg=var(--color-fg)` would auto-flip to a glaring light chip → give it a dedicated elevated dark surface)

```
--tooltip-bg var(--color-fg) → #39424b   (elevated dark surface)
--tooltip-fg var(--color-bg) → #f0f3f6   (light text)
```

(Exact hex will be contrast-verified and may be nudged during the build; the playground toggle is the live tuning surface.)

## Toggle (playground — `AppShell` is tooling, Rule 6/7 N/A)

- `AppShell.tsx` holds `theme: 'system' | 'light' | 'dark'` in `useState`, initialized from `localStorage['eocrm-playground-theme']` (default `'system'`) with the existing `typeof window === 'undefined'` SSR guard, and persisted via `useEffect` (mirrors the `SIDEBAR_COLLAPSED_KEY` pattern). An effect applies it: `'light'`/`'dark'` → `document.documentElement.dataset.theme = theme`; `'system'` → remove the attribute (the media query decides).
- A **cycle button** in `Rail.Footer` (system → light → dark → system), icon = current state (lucide `Monitor` / `Sun` / `Moon`) with an `aria-label`. Compact — works collapsed.
- **No-flash:** an inline `<script>` in `packages/playground/index.html` `<head>` (beside the existing SPA-routing script) runs before first paint: read `localStorage['eocrm-playground-theme']`; if `'light'`/`'dark'`, set `document.documentElement.dataset.theme`. (`'system'`/unset → no attribute → the CSS media query handles it with no flash.)

## Library docs

`AGENTS.md` gains a **"Dark theme"** section: the attribute contract (`<html data-theme="dark"|"light">`, or none = follow OS), that `color-scheme` is set automatically, what flips for free vs. the consumer's responsibility, and the copy-paste **no-flash inline snippet** for consumer apps (the library can't inject it — per the AppProvider spec, no DOM side-effects).

## Files

- **Create** `packages/design-system/src/styles/dark.scss` (the `dark-tokens` mixin + the three scopes).
- **Modify** `packages/design-system/src/styles/global.scss` (add `@use 'dark';` after `tokens`).
- **Modify** `packages/design-system/src/styles/tokens.scss` (add `color-scheme: light;` to the base `:root`).
- **Modify** `packages/design-system/package.json` exports only if `dark.scss` needs individual exposure — it does NOT (consumed via `global.scss`).
- **Modify** `packages/design-system/AGENTS.md` (Dark theme section + snippet).
- **Modify** `packages/playground/index.html` (no-flash script), `packages/playground/src/layout/AppShell/AppShell.tsx` (theme state + Rail.Footer cycle button + lucide `Monitor`/`Sun`/`Moon` imports).

## Verification

- Gates: `make test`, `make build`, `make build-lib`, `make lint`, `npm run format:check`.
- **Playwright dark sweep** (the core verification): toggle dark, then visit **every** `/components/*` demo + the key mockups (dashboard, contacts, login, custom-fields, members) and check for light-baked surfaces (any element still rendering a near-white bg or dark-on-dark text), broken shadows/overlays, and that the toggle persists + no-flash works.
- **WCAG-AA contrast** spot-checks on the core dark pairs: `fg`/`bg`, `fg-muted`/`bg`, `accent-fg`/`accent`, each semantic `*-fg`/`*` fill, Badge tone fg/bg, border visibility.
- Manual: cycle System/Light/Dark in the rail; confirm System follows the OS and Light forces light on a dark OS.

## Non-goals

- The 30-color categorical `--color-palette-*` dark set (60 tokens) — **fast-follow** spec/PR.
- A library theme toggle component / React theme context (AppProvider spec excludes it).
- Per-consumer no-flash automation (documented snippet only).
- Recoloring the playground logo asset / BrandIcon brand marks / ColorPicker spectrum.

## Branch

`feat/dark-theme`, off `main`. Its own PR. (Touches `packages/design-system/**` → publishes a library version.)
