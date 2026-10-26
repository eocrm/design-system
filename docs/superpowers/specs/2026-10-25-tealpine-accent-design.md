# Teal pine accent — second accent token set

## Intent

The eocrm landing page (artifact "eocrm Landing, Direction E") settled on
**Teal pine** (`#17736d`) as the brand accent. The design system should be
able to render in Teal pine **without dropping the current blue**. Blue stays
the default; Teal pine is an opt-in second accent set shipped to both
consumers (web CRM via Sass, mobile via Kotlin Compose).

## Goals

- A second accent set `tealpine` defined in `packages/design-tokens/src/tokens.json`.
- Web: setting `data-accent="tealpine"` on `<html>` swaps the accent tokens,
  correctly in light, forced dark (`data-theme='dark'`), and OS dark
  (`prefers-color-scheme`, not overridden by `data-theme='light'`).
- No attribute = byte-identical blue token output to today (existing generated
  declarations unchanged; only new blocks appended). See the info-as-selection
  decision for the three components that deliberately change.
- Compose: `EocrmTealPineLightTokens` / `EocrmTealPineDarkTokens` objects,
  same shape as `EocrmLightTokens` / `EocrmDarkTokens`, differing only in
  accent colours.
- Playground: an accent toggle next to the existing theme toggle
  (`packages/playground/src/layout/AppShell/AppShell.tsx`) to preview every
  demo and mockup in Teal pine.
- Every Teal pine pair passes the same contrast assertions blue passes.

## Non-goals

- Changing `color.info`, `tone.info.*`, `palette.blue.*`, `avatar.palette.6`,
  `chart.*` — those stay blue (info = neutral notice, not brand).
- Changing `color.success` (`#007e54`), even though it is close in hue to
  Teal pine. Flagged in docs; revisit after visual review.
- More accent sets, a general theming engine, per-tenant or per-user accent
  selection, any picker inside the CRM.

## Anti-goals

- Blue token output changing when no `data-accent` is set (the three repointed selection components excepted).
- Consumers needing a new Sass import to get Teal pine.
- Hand-editing generated Sass/Kotlin.

## Decided (by the user)

- Ships to consumers, web and Compose (not playground-only).
- Info and its tone family stay blue; only the accent family switches.
- Accent is chosen **globally by the app** (CRM sets `data-accent` once on
  `<html>`); DS ships tokens + documents the attribute. No AppProvider
  `accent` prop (AppProvider does not own `data-theme` either).
- **Info-as-selection repointed to accent (user: 1-A).** Components that use
  the info family to mean _selected_ switch to the accent family:
  DropdownMenu checked item (bar, bg, fg), OptionsPicker selected row,
  StagePath done steps. This visibly changes blue output for those three
  (e.g. dark `#579dff` → `#68a7ff`); accepted. The "byte-identical blue"
  anti-goal applies to token output, not these three components. Uses that
  genuinely mean info (TopBar info indicator, Card info stripe, LiquidEditor
  filter) stay on info. Builder: grep every `--color-info*`, `tone-info`,
  `--badge-*-info` use in component `.tokens.scss`/`.module.scss` and classify
  selection vs info; only selection moves.
- **AppProvider overrides beat `data-accent` (user: 2-A).**
  `buildThemeTokenCss` (`packages/design-system/src/app/themeTokens.ts`)
  emits its scopes so they out-specify the accent blocks in every theme
  (e.g. add `:root[data-accent]` / `[data-accent][data-theme='dark']` /
  media-query `[data-accent]:not([data-theme='light'])` selectors alongside
  the existing ones). Tested in `themeTokens.test.ts`; documented in
  `docs/setup.md`.
- **Teal pine logo asset (user asked; variant = Claude's call while user
  AFK).** Add `packages/playground/src/assets/eocrm-logo-tealpine.svg`: same
  three-chevron geometry as `eocrm-logo.svg`, two-tone teal — top chevron
  `#6dcfc4`, middle and bottom `#17736d`. DS still ships no logo. Playground:
  LogoDemo gets an example with it, and the AppShell/Login mockup swap to it
  when the accent toggle is `tealpine`.

## Decided (Claude's calls, approved in conversation)

### Values

| Token id                         | light     | dark      |
| -------------------------------- | --------- | --------- |
| `color.accent`                   | `#0b6d67` | `#6dcfc4` |
| `color.accent.hover`             | `#085752` | `#9ddfd7` |
| `color.accent.pressed`           | `#054440` | `#c6efea` |
| `color.accent.foreground`        | `#ffffff` | `#1d2125` |
| `color.accent.background.subtle` | `#ddeeec` | `#173f3c` |
| `color.accent.subtle.background` | `#ddeeec` | `#173f3c` |
| `ring.accent`                    | `#0b6d67` | `#6dcfc4` |

Measured: accent vs white 5.66, vs dark bg `#1d2125` 8.77; hover 7.47 / 10.44;
pressed 10.06 / 13.06; accent text on subtle tint 4.72 (light) / 6.27 (dark).
Light steps darken, dark steps lighten — same direction as blue.

**As shipped (updated during implementation):** the light family was darkened from the mockup's `#17736d` to `#0b6d67` to pass the WidgetPreview accent-mix floor, and both hovers were nudged to clear the 0.065 hover gate; the logo keeps `#17736D`. Original note —
**Hover values were provisional:** both hover steps fail the existing
"every -hover stays a visible step from its base" gate in `contrast.test.ts`
(light 0.0641, dark 0.0581 vs floor 0.065). Builder nudges `hover` light
(darker) and dark (lighter) to the nearest values clearing 0.065 while
keeping the WCAG ratios; the gate is NOT lowered. Pressed must stay a further
step past hover. Teal pine also runs through every other accent-keyed check
in that file (table accent-cell hover, `--widget-preview-accent` mix,
ring-on-event-fill, the AI-PRIMER ratio binding) — if docs gain Teal pine
ratios, wire them into that binding test.
`accent`, light `hover` (mockup's `--accent-ink`), dark `accent`
(`--accent-light`) and light subtle (`--accent-soft`) come from the mockup;
the rest are derived.

### Source shape

New optional top-level key in `tokens.json`:

```json
"accents": {
  "tealpine": {
    "color.accent": { "light": "#17736d", "dark": "#6dcfc4" },
    ...
  }
}
```

- `schema.json` gains `accents`: map of accent name (`^[a-z][a-z0-9]*$`) →
  map of token id → themeValue.
- Validator (`scripts/lib/validate-tokens.mjs`) rejects: unknown token ids;
  overriding a non-`color` token; overriding a token whose base value is not
  themed (light/dark); values that are not valid colour literals. Aliases in
  overrides are not needed — reject them to keep resolution simple.
- Rejected alternative: per-token `accents` field (spreads the set over 7
  tokens, changes every token's shape).

### Web output (`scripts/lib/render-web.mjs`)

Append to the existing generated files (no new export subpath):

- `tokens.scss`: `:root[data-accent='tealpine'] { <light overrides> }`
- `dark.scss`:
  - `:root[data-accent='tealpine'][data-theme='dark'] { <dark overrides> }`
  - inside the existing `@media (prefers-color-scheme: dark)`:
    `:root[data-accent='tealpine']:not([data-theme='light']) { … }`

Specificity: the accent dark selectors carry one more attribute than the base
dark selectors, so they win regardless of file order; the light accent block
(0,2,0 with `:root`) must not beat dark accent blocks — verify cascade
explicitly in a generator/compat test. Tokens that alias accent tokens
(e.g. `table.color.row.background.selected` → `color.accent.background.subtle`)
follow automatically via `var()`.

### Compose output (`scripts/lib/render-compose.mjs`)

`EocrmTokenContract.kt` gains `EocrmTealPineLightTokens` and
`EocrmTealPineDarkTokens` objects (generated per accent name, PascalCase),
identical to the base theme objects except `colors` uses accent overrides.
`ring.accent` has no Compose output — skip overrides lacking a Compose output.
Add a case to `compose/src/commonTest/.../TokenContractTest.kt` if that test
enumerates the token objects.

### Tests

- `packages/design-tokens/test`: schema + validation cases for `accents`
  (valid set, each rejection above), web generator snapshot/contains for the
  three selector blocks, Compose generator for the new objects, determinism.
- `packages/design-system/src/styles/contrast.test.ts`: re-run the existing
  accent pair rows against Teal pine in light and dark. **Caveat:** its
  `tokenValue` regex takes the first declaration in a file — appended accent
  blocks come after `:root`, so base resolution is unaffected, but resolving
  Teal pine needs a scope extracted by selector (the file already has a
  helper for reading declarations from a scope — reuse it).
- `npm run tokens:check` clean.

### Playground

Accent toggle beside the theme toggle in `AppShell.tsx`, persisted in
`localStorage` like `THEME_KEY`; sets/removes `document.documentElement.dataset.accent`.
Uses DS components only (e.g. an icon button with Tooltip, matching the theme
toggle).

### Docs

- `packages/design-system/README.md`: "Accent" section — set
  `data-accent="tealpine"` on `<html>`; omit for blue; works with
  `data-theme`. Compose: use `EocrmTealPine{Light,Dark}Tokens`.
- `packages/design-system/AI-PRIMER.md`: one line pointing to it.
- Note that `success` is close in hue to Teal pine.

## Process constraints

- One branch + PR off fresh `main`; library-touching, so the
  `pre-push-review` skill's review-fix loop is mandatory.
- Release workflow auto-bumps on merge; tokens package version handled by its
  existing scripts.

## Left to the builder

- Exact test file placement (follow "Test placement" in
  `packages/design-system/CLAUDE.md`).
- Toggle icon choice and label copy.
- `schemaVersion` stays 1 (additive change) — Claude's call.
- Known issue to document (not fix): Teal pine vs `color.success` light gap
  is 0.060, under the repo's 0.065 distinguishability floor. Visual review
  before the CRM switches.
- Whether the Compose accent objects are generated via a shared helper with
  the base theme objects.
