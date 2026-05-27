# Semantic component tokens

**Status:** approved (design phase) · **Date:** 2026-05-27 · **Branch:** `feat/component-tokens`

## Problem

Today every component's `.module.scss` references global tokens directly:

```scss
.button {
  background: var(--color-accent);
  color: var(--color-accent-fg);
}

.button:hover {
  background: var(--color-accent-hover);
}
```

Two consequences:

1. **No consumer-side theming.** The only way to re-skin a Button without forking the library is to override the global `--color-accent` — which changes _every_ accent surface across the app (Tabs, Links, the focus ring, …). There's no way to say "this app has red buttons but blue links."
2. **Internal SCSS reads as 'where the accent color goes,' not as 'the button's background.'** A reader has to mentally trace which global token is the button's intent. This gets worse for components like Checkbox where `--color-accent` shows up in checked-state bg, checked-state border, and the focus ring — three distinct semantic slots happen to share the same primitive.

The fix: introduce a **component-scoped token layer** between primitives and component SCSS. `--button-bg`, `--button-bg-hover`, etc. — defined at `:root` so consumers can override them, referencing the primitives the library currently uses as values.

## Goal

Every component in `@eocrm/design-system` ships:

1. A `Component.tokens.scss` file alongside its `.module.scss`, defining `--<component>-<part>` CSS custom properties at `:root`. Values reference the existing global primitives (e.g., `--button-bg: var(--color-accent)`).
2. A `.module.scss` that `@use`s the tokens file (so the `:root` block is emitted into the bundled CSS) and references `var(--<component>-*)` instead of the primitives directly.
3. Default appearance is **byte-identical** to today — every component token resolves to the same primitive the SCSS already used.

The migration covers all 57 components in one PR.

## Non-goals

- **Per-instance inline overrides** as an explicit API. Consumers can already write `style={{ '--button-bg': 'red' }}` because the tokens are public — we don't add typed props for this.
- **Dark theme alt tokens.** When dark mode lands, each `Component.tokens.scss` gains a `[data-theme='dark'] :root { ... }` block. Not part of this PR.
- **Renaming primitives.** `--color-accent`, `--color-fg`, `--space-*` etc. stay where they are. Component tokens reference them.
- **Renaming the 30-color palette.** `--color-palette-<name>-bg/-fg` stays — it's a categorical primitive, not a component token.
- **Auto-generated theming docs.** AGENTS.md gains a manual section; per-component tables aren't auto-extracted.
- **Per-component test of every token.** We don't add unit tests asserting "this CSS variable exists." Instead, the visual gate is "every existing test still passes" — defaults are byte-identical.

## Design

### Naming convention

Pattern: `--<component>-<part>[-<state>]`.

- `<component>` is the kebab-cased component name: `button`, `badge`, `checkbox`, `data-table`, `dropdown-menu`, `options-picker`, `page-header`, `person-display`.
- `<part>` is what the value affects: `bg` (background), `fg` (text + icon color), `border-color`, `radius`, `padding-x`, `padding-y`, `height`, `min-width`, `gap`, `ring` (focus ring), `font-size`, `font-weight`, `shadow`. Use short, consistent names — match across components where the meaning is the same.
- `<state>` is optional and only appears when there's a state variant: `hover`, `active`, `focus`, `disabled`, `checked`, `indeterminate`, `selected`, `invalid`, `readonly`.

Examples:

```
--button-bg
--button-bg-hover
--button-bg-active
--button-bg-disabled
--button-fg
--button-fg-disabled
--button-radius
--button-ring

--checkbox-border-color
--checkbox-border-color-hover
--checkbox-border-color-checked
--checkbox-border-color-invalid
--checkbox-bg-checked

--input-bg
--input-bg-disabled
--input-border-color
--input-border-color-focus
--input-border-color-invalid

--badge-radius
--badge-font-size
--badge-bg-neutral
--badge-fg-neutral
--badge-bg-info
--badge-fg-info
... (one per tone)
```

Reserved abbreviations:

- `bg` for `background`
- `fg` for `foreground` (text + icon)
- `ring` for `focus-visible` ring color (the box-shadow color used by the `focus-ring` mixin)

Component names with multi-word PascalCase translate via kebab-case: `DataTable` → `--data-table-*`, `DropdownMenu` → `--dropdown-menu-*`, `OptionsPicker` → `--options-picker-*`, `PersonDisplay` → `--person-display-*`, `PageHeader` → `--page-header-*`.

### File layout

```
packages/design-system/src/components/Button/
  Button.tsx
  Button.module.scss        ← @use './Button.tokens.scss'; (so :root emits)
  Button.tokens.scss        ← :root { --button-bg: var(--color-accent); ... }
  Button.test.tsx
  index.ts
```

`Button.tokens.scss` is plain SCSS containing only one `:root { ... }` block (no mixins, no functions). When `Button.module.scss` `@use`s it, the `:root` block is inlined into the compiled CSS for that module — meaning the tokens are defined wherever the Button component's CSS is shipped. Multiple modules that include the same tokens file emit duplicate `:root` rules; the browser collapses them with last-write-wins semantics — fine because they're identical.

### Default-equality requirement

Every new component token's _initial value_ MUST be exactly the primitive the SCSS used before. Concretely, the migration follows this pattern:

```scss
// Before (Button.module.scss):
.button {
  background: var(--color-accent);
}

// After:
// Button.tokens.scss:
:root {
  --button-bg: var(--color-accent);
}

// Button.module.scss:
@use './Button.tokens.scss';
.button {
  background: var(--button-bg);
}
```

The runtime computed style at `.button { background }` is identical: it resolves through `--button-bg → var(--color-accent) → #0052cc` (or whatever the accent is). No visual diff. The existing test suite (Hard rule 1 minimums + snapshot-y assertions) all pass without modification.

### Tone-aware components — Badge & FilterChip

Badge's existing `--color-badge-<tone>-bg/-fg` tokens (defined in `tokens.scss`) are already semantic Badge tokens — they just live in the global token file. We **rename** them into the new convention:

```scss
// Before (in tokens.scss):
--color-badge-info-bg: #deebff;
--color-badge-info-fg: #0747a6;

// After (in Badge.tokens.scss):
:root {
  --badge-bg-info: #deebff;
  --badge-fg-info: #0747a6;
  // ... 5 other tones
}
```

**Backward-compatibility shim:** We keep the old token names as deprecated aliases in `tokens.scss` so consumer code that references `--color-badge-info-bg` directly still works:

```scss
// tokens.scss (top of file or in a dedicated deprecated block)
:root {
  // DEPRECATED: alias to Badge component tokens. Will be removed in
  // a future major version. Use --badge-bg-* / --badge-fg-* instead.
  --color-badge-neutral-bg: var(--badge-bg-neutral);
  --color-badge-neutral-fg: var(--badge-fg-neutral);
  // ... etc for all 6 tones
}
```

Internal usage (the library itself) drops the old names entirely in this PR — consumers can migrate at their own pace. The shim is a backstop, not the recommended path.

`FilterChip` doesn't have tone-specific token names today (it reuses `--color-palette-*` for the value dot), so no rename — it just gains `--filter-chip-*` for its non-palette concerns (chip bg, border, radius, dismiss button styles).

### Palette tokens

The 60 `--color-palette-<name>-bg/-fg` tokens stay where they are (in `tokens.scss`). They're a **primitive categorical palette** consumed by multiple components (Badge `color`, Checkbox `color`, OptionsPicker group `color`). Don't move them into any single component's `.tokens.scss`.

Component-scoped tokens that wrap palette colors (e.g., the audit-event chip's eventual default color) are NOT defined — that's consumer-side concern, not a library token.

### What lives in `Component.tokens.scss` vs stays in `tokens.scss`

**Move to component tokens:**

- Anything that varies by component identity AND should be overridable per-component (bg, fg, border, radius, hover/focus/disabled states, padding, sizing, shadows).
- Existing `--color-<component>-*` tokens (Badge tones, etc.) get renamed.

**Stay in `tokens.scss`:**

- Color primitives: `--color-accent`, `--color-fg`, `--color-fg-muted`, `--color-bg`, `--color-bg-muted`, `--color-border`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, semantic tone bg-subtle variants.
- Size primitives: `--space-*`, `--radius-*`, `--font-size-*`, `--font-family-*`, `--line-height-*`, `--font-weight-*`, `--letter-spacing-*`, `--border-width*`, `--shadow-*`, `--ring-*`, opacity tokens.
- The 30-color palette: `--color-palette-*-bg/-fg`.
- Avatar background colors (`--color-avatar-1` … `--color-avatar-6`): they're a primitive name-hashed palette, not Avatar-internal style.

### Coverage requirement per component

Every component must define tokens for:

1. Its **default rendered state**: bg / fg / border-color / radius if used.
2. **Every state with a visible style change**: hover, active, focus-visible (ring), disabled, selected, checked/indeterminate, invalid, readonly — whichever apply.
3. **Every size variant**'s sizing tokens (height, padding-x, padding-y, gap, font-size if it varies by size).
4. **Every tone / color / variant** that resolves to a distinct visual: per-tone bg+fg for Badge, per-variant bg for Button.

If a component currently uses a primitive value DIRECTLY in only one place (e.g., `--space-3` for padding in a single SCSS rule), it still gets a component token (`--card-padding`). The token's value resolves to the primitive; the component SCSS references the token. The win: one place to override.

Exceptions (DO use the primitive directly, no token):

- Font family — `var(--font-family-sans)` (theme-wide consistency wins; per-component override doesn't help).
- Border width — `var(--border-width)` (typically uniform across the library; if a component needs a heavier border, it gets a token like `--card-border-width`).
- Animation duration / easing — `var(--motion-duration-fast)` / `var(--motion-easing-*)` (motion is a system concern, not a component concern).

### Naming conflicts

Two components might both want `--bg-hover`. The component prefix disambiguates: `--button-bg-hover` and `--card-bg-hover` are different tokens. **There is no shared-state token across components.** Don't define `--bg-hover` at the global level intending it to apply everywhere — that's what primitives are for, and primitives already cover it (`--color-bg-muted`).

### Cross-component composition

Some components render other components internally (FilterChip uses Text + Link; PersonDisplay uses Avatar + Text + Link; OptionsPicker uses Checkbox + Radio + Badge). When a parent component renders a child, the child's tokens stay in scope and resolve normally — the parent doesn't need to override them. If a parent _wants_ to override a child's style (e.g., the OptionsPicker wants its internal Checkboxes to be a different size), it does so via a child-targeted SCSS rule, not via redefining child tokens.

### File-level conventions

- Each `Component.tokens.scss` file starts with a header comment naming the component and pointing at the migration spec.
- Token order inside `:root` is consistent: surface (bg, fg, border-color) → shape (radius, padding, height) → state variants → tone/color/size variants.
- One blank line between logical groups inside `:root`.
- No comments on individual tokens unless the value is non-obvious. The default-equality rule means most lines look like `--button-bg: var(--color-accent);` — self-explanatory.

### Migration mechanics

For each of the 57 components, the mechanical steps:

1. Read the existing `.module.scss`, list every `var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--font-size-*)`, etc. reference.
2. Group references by part-and-state semantic (e.g., the `background: var(--color-accent)` and the `&:hover { background: var(--color-accent-hover) }` go to `--button-bg` and `--button-bg-hover`).
3. Create `Component.tokens.scss` with the grouped `:root { ... }` block.
4. Add `@use './Component.tokens.scss';` at the top of `Component.module.scss`.
5. Replace every primitive reference inside the SCSS with the new component token.
6. Run `make build` + visual diff (Playwright screenshot a sample page before/after — pages should be byte-identical).

For Badge specifically, additional steps for the tone-bg/-fg rename + the deprecation shim in `tokens.scss`.

For the 57 components in total: ~2000 token references will be touched. The work is mechanical but voluminous. The implementation plan will batch the components into 6 reviewable chunks (one per cluster) within a single PR, with one commit per cluster, to keep diffs scannable.

### AGENTS.md update

Add a new top-level section "Theming via component tokens" right after the existing "Tokens" section. Content:

- Pattern explanation (component tokens are at `:root`, named `--<component>-<part>-<state>`, default to primitives).
- One worked example: "make all Buttons red — override `--button-bg` globally."
- One per-scope example: "make Buttons inside this component red — override on the wrapping selector."
- Pointer to per-component `.tokens.scss` files as the authoritative list.
- Brief note on the Badge deprecation: old `--color-badge-*` tokens still work but are deprecated.

### Tests

No new unit tests for token existence. The visual gate is the existing test suite:

- All 2079+ existing tests pass without modification (defaults are byte-identical).
- `make lint`, `npm run typecheck`, `make build` green.
- Manual Playwright sweep: open each cluster's demo + 2-3 mockups, screenshot. Compare to pre-migration screenshots (the implementation plan will include a baseline capture step).
- One new lint rule (or convention doc) discouraging `var(--color-*)` inside `Component.module.scss` after migration — those should go via the component token now. Codified as an inline comment in CLAUDE.md, not enforced by stylelint in v1.

### Risks & mitigations

- **Token-name collisions** between component tokens and existing primitives. Mitigation: prefix every component token with the component name; primitives don't use component names.
- **SCSS `@use` semantics**: the `@use './Component.tokens.scss'` only emits the `:root { }` block once per consuming module. If multiple module-scss files in the same component directory both `@use` it, the block is emitted multiple times. Acceptable — browsers de-duplicate identical `:root` declarations.
- **Forgetting to `@use`** the tokens file → tokens are undefined → CSS fallback (no value) → broken visual. Mitigation: tasks 1-3 of the plan establish a checked migration template; every component is verified individually.
- **Consumer code that hard-coded primitive token names** (e.g., a CRM-page-level `var(--color-accent)`) — this PR doesn't touch them. Primitives stay. Only the `--color-badge-*-tone-*` tokens are deprecated, and they're aliased.

## Out of scope

1. Dark theme token variants.
2. Per-instance React API for token overrides (no `colorToken` prop on Button etc.).
3. Renaming `--color-accent` / `--color-fg` / palette / Avatar primitives.
4. Auto-generated theming docs from token files.
5. Stylelint rule enforcing "no primitives inside `.module.scss`."
6. A separate Storybook page exposing every component token as a slider (out of scope; manual override is documented).
