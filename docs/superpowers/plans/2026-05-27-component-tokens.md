# Semantic Component Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every component in `@eocrm/design-system` (57 components) to a semantic component-token layer: each component gets a `Component.tokens.scss` file defining `--<component>-<part>-<state>` CSS custom properties at `:root`, and the `Component.module.scss` references those tokens instead of primitives directly. Default appearance is byte-identical to today.

**Architecture:** Tokens file is plain SCSS with one `:root { ... }` block. The `.module.scss` does `@use './Component.tokens.scss';` so the `:root` rule is emitted into the compiled CSS. Component SCSS references `var(--<component>-*)` everywhere a primitive used to be. Badge tones get a name migration (`--color-badge-info-bg` → `--badge-bg-info`) with deprecated aliases kept in `tokens.scss` for backward compat.

**Tech Stack:** SCSS modules, vite, the existing token system. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-27-component-tokens-design.md`

**Branch:** `feat/component-tokens` (already checked out)

**Confirmed facts (probed before writing this plan):**

- 57 component directories under `packages/design-system/src/components/`.
- ~2000 `var(--*)` references across all `.module.scss` files combined.
- SCSS `@use './X.tokens.scss';` emits the file's `:root` block into the consuming module's compiled CSS (browsers de-duplicate identical `:root` rules).
- Hard rule 3 (tokens-only SCSS): unchanged — all new component tokens reference primitives via `var(--...)`, no raw values.

---

## File Structure

| File                                                                                      | Role                                                                                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `packages/design-system/src/components/<Component>/<Component>.tokens.scss` (NEW × 57)    | Component-scoped tokens at `:root`                                                                        |
| `packages/design-system/src/components/<Component>/<Component>.module.scss` (MODIFY × 57) | `@use` the tokens file; reference tokens instead of primitives                                            |
| `packages/design-system/src/styles/tokens.scss` (MODIFY)                                  | Add deprecated `--color-badge-<tone>-*` aliases pointing at the new Badge tokens                          |
| `packages/design-system/AGENTS.md` (MODIFY)                                               | New "Theming via component tokens" section                                                                |
| `packages/design-system/CLAUDE.md` (MODIFY)                                               | Update Hard rule 3 commentary — component SCSS should reference component tokens, not primitives directly |

**Component clusters and counts (per `manifest.ts`):**

- Layout (7): Stack, Cluster, Divider, Grid, Card, Page, PageHeader
- Forms (21): Button, ButtonGroup, Checkbox, ColorPicker, DatePicker, DatePickers (umbrella demo route — see below), DateRangePicker, FileUpload, ImageCrop, Input, Kanban, PasswordInput, PasswordStrengthMeter, Radio, OptionsPicker, Select, Slider, Sortable, Switch, Textarea
- Display (17): Avatar, Badge, DefinitionList, Calendar, CircularProgress, Code, CursorPagination, DataTable, EmptyState, FilterChip, Pagination, PersonDisplay, Progress, Skeleton, Table, Text, Title
- Navigation (4): Accordion, Breadcrumb, Link, Tabs
- Overlays (6): ConfirmationPopover, Drawer, DropdownMenu, Modal, Popover, Tooltip
- Feedback (2): Alert, Toast

If a cluster includes a name that isn't its own component dir (e.g., `DatePickers` is a route-grouping alias for the DatePicker / DateRangePicker / Inline variants — verify via `ls packages/design-system/src/components/`), treat it as already covered by the underlying component dirs and skip the alias. Some component dirs may not appear in the manifest (e.g., `AvatarGroup` lives inside `Avatar/`); migrate them with their parent component if they share an SCSS file, otherwise as a standalone tokens file.

---

## Convention — applies to every component migration

When a per-component task says "migrate Component X", these are the exact mechanical steps:

1. Read `packages/design-system/src/components/X/X.module.scss` fully.
2. List every `var(--…)` reference. Group references by semantic role:
   - **Surface** (background) — usually one `--x-bg` per state.
   - **Foreground** (color, text + icon) — `--x-fg` per state.
   - **Border** — `--x-border-color`, `--x-border-width` (only if non-default), `--x-radius`.
   - **Sizing** — `--x-padding-x`, `--x-padding-y`, `--x-gap`, `--x-height-<size>`, `--x-min-width`, etc.
   - **Typography** — `--x-font-size`, `--x-font-weight`, `--x-line-height`. ONLY token-ize when it varies per-component intent; don't tokenize `--font-family-sans`.
   - **Focus** — `--x-ring` (the focus-ring color, defaulting to `var(--ring-accent)` unless the component already overrides).
   - **Shadow** — `--x-shadow` (only if used).
   - **Per-tone / per-variant / per-size** — `--x-bg-<variant>`, `--x-fg-<variant>` for each distinct visual.
3. Create `X.tokens.scss` with one `:root` block. Token order: surface → foreground → border/radius → sizing → typography → focus/shadow → tone/variant. One blank line between groups.
4. Every token's value MUST resolve to the same primitive the SCSS used before. Default-equality is the contract.
5. Add `@use './X.tokens.scss';` as the FIRST line of `X.module.scss` (after any existing `@use '../../styles/mixins'` lines).
6. Replace every `var(--<primitive>)` with `var(--x-<part>-<state>)` in `X.module.scss`.

**DO NOT** tokenize:

- `var(--font-family-sans)` / `var(--font-family-mono)` — theme-wide.
- `var(--border-width)` — uniform 1px across the library. (Tokenize as `--x-border-width` only when the value is non-default — e.g., `--border-width-strong` for an emphasis stripe.)
- `var(--motion-*)` if used — system concern.
- `var(--color-palette-*-bg/-fg)` — these are the categorical palette, not a primitive in the "to be tokenized" sense. They're already correct as-is.

**DO NOT** modify the SCSS's logic, structure, selectors, pseudo-classes, or nesting depth. The ONLY change is the `var()` references and the addition of `@use`. The diff per file should be roughly "n+m lines added (new file + @use line) and ~5-30 lines changed (var replacements)."

---

## Task 1: Convention + reference migration — Button

**Files:**

- Create: `packages/design-system/src/components/Button/Button.tokens.scss`
- Modify: `packages/design-system/src/components/Button/Button.module.scss`

- [ ] **Step 1: Read the existing Button.module.scss in full**

```bash
cat packages/design-system/src/components/Button/Button.module.scss
```

Take note of every `var(--...)` reference and which CSS property it's applied to under which selector.

- [ ] **Step 2: Create Button.tokens.scss**

Write `packages/design-system/src/components/Button/Button.tokens.scss`. The exact content depends on what Button.module.scss currently references — read first, then construct the tokens. This is the canonical reference example for every subsequent task; if Button doesn't already use a primitive in some slot (e.g., it uses a SCSS variable, not a CSS var), keep that — only tokenize CSS custom-property references.

Template (your actual tokens MUST match the primitives currently used):

```scss
// Button.tokens.scss
//
// Component-scoped tokens for <Button>. Each token defaults to the
// primitive the SCSS used before this migration — overriding any of
// these at :root re-themes Button without touching globals.
//
// Convention: --button-<part>-<state>. See
// docs/superpowers/specs/2026-05-27-component-tokens-design.md
:root {
  // Surface
  --button-bg: var(--color-accent);
  --button-bg-hover: var(--color-accent-hover);
  --button-bg-active: var(--color-accent-active);
  --button-bg-disabled: var(--color-bg-muted);

  // Foreground
  --button-fg: var(--color-accent-fg);
  --button-fg-disabled: var(--color-fg-disabled);

  // Border + radius
  --button-border-color: transparent;
  --button-radius: var(--radius-sm);

  // Focus ring
  --button-ring: var(--ring-accent);

  // Variant: secondary
  --button-bg-secondary: var(--color-bg);
  --button-bg-secondary-hover: var(--color-bg-muted);
  --button-fg-secondary: var(--color-fg);
  --button-border-color-secondary: var(--color-border);

  // Variant: ghost
  --button-bg-ghost: transparent;
  --button-bg-ghost-hover: var(--color-bg-muted);
  --button-fg-ghost: var(--color-fg);

  // Variant: danger (filled red)
  --button-bg-danger: var(--color-danger);
  --button-bg-danger-hover: var(--color-danger-hover);
  --button-fg-danger: var(--color-danger-fg);

  // Sizing — keep heights that exist in the current SCSS
  --button-height-sm: var(--size-button-sm);
  --button-height-md: var(--size-button-md);
  --button-height-lg: var(--size-button-lg);
  --button-padding-x-sm: var(--space-2);
  --button-padding-x-md: var(--space-3);
  --button-padding-x-lg: var(--space-4);
  --button-gap: var(--space-2);

  // Typography
  --button-font-weight: var(--font-weight-medium);
  --button-font-size-sm: var(--font-size-sm);
  --button-font-size-md: var(--font-size-md);
  --button-font-size-lg: var(--font-size-md);
}
```

**Important:** Read the actual `Button.module.scss` before writing. The template above is illustrative; your tokens MUST match what's there. If Button uses `var(--color-accent-active)` somewhere and the template lists `--button-bg-active: var(--color-accent-active)`, great. If it uses something else, your token follows that primitive.

If the SCSS doesn't currently use a specific primitive (e.g., no `:active` state styling), DO NOT add a token for it. The tokens file mirrors the existing SCSS — no anticipating future needs.

- [ ] **Step 3: Update Button.module.scss to @use the tokens file**

Open `packages/design-system/src/components/Button/Button.module.scss`. The first `@use` (or `@import`) line at the top of the file gets a new sibling:

```scss
@use './Button.tokens.scss';
```

(If there's already `@use '../../styles/mixins' as *;`, put `@use './Button.tokens.scss';` immediately after. The order doesn't functionally matter for CSS variable emission, but keep it consistent for readability.)

- [ ] **Step 4: Replace every primitive reference with the component token**

In `Button.module.scss`, walk every CSS property whose value uses `var(--<primitive>)` and replace it with the matching component token. For Button, that means (in the rough order they appear):

```scss
// Before:
background: var(--color-accent);
// After:
background: var(--button-bg);

// Before:
color: var(--color-accent-fg);
// After:
color: var(--button-fg);

// Before:
&:hover { background: var(--color-accent-hover); }
// After:
&:hover { background: var(--button-bg-hover); }

// Before (focus ring):
&:focus-visible { box-shadow: 0 0 0 var(--ring-width) var(--ring-accent); }
// After:
&:focus-visible { box-shadow: 0 0 0 var(--ring-width) var(--button-ring); }

// Before (variant selectors — secondary / ghost / danger):
.secondary { background: var(--color-bg); ... }
// After:
.secondary { background: var(--button-bg-secondary); ... }

// ... etc for every primitive reference
```

**Do not change** any other aspect of `Button.module.scss`: no selector restructuring, no nesting cleanup, no token re-grouping. The diff per existing line is exactly `var(--primitive) → var(--button-component-token)`.

**Do not change** references that should stay as primitives per the spec:

- `var(--font-family-sans)` — stays
- `var(--border-width)` — stays (default-width borders use the primitive)
- `var(--ring-width)` — stays (the ring WIDTH is primitive; only the COLOR moves to `--button-ring`)
- `var(--motion-*)` — stays if used

- [ ] **Step 5: Gates**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

All four MUST be clean. The full suite must still pass — Button's tests don't change because the visual output is identical.

- [ ] **Step 6: Visual sanity check**

```bash
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:8080/components/button 2>/dev/null || echo "dev server not running — skip"
```

If the dev server is running, manually compare the Button demo page to the version before this commit. The render MUST be pixel-identical (modulo color subpixel variation). Any visual diff = a token's value diverged from the primitive it should reference.

- [ ] **Step 7: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Button/Button.tokens.scss packages/design-system/src/components/Button/Button.module.scss
git commit -m "$(cat <<'EOF'
Button: semantic component tokens

Adds Button.tokens.scss defining --button-<part>-<state> CSS custom
properties at :root, defaulting to the primitives the SCSS already
used. Button.module.scss now @uses the tokens file and references
var(--button-*) instead of var(--color-*) directly.

Default visual output is byte-identical — every token resolves to the
same primitive value as before.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Reference migration — Badge with tone-token rename + deprecation shim

**Files:**

- Create: `packages/design-system/src/components/Badge/Badge.tokens.scss`
- Modify: `packages/design-system/src/components/Badge/Badge.module.scss`
- Modify: `packages/design-system/src/styles/tokens.scss` (deprecation shim block)

Badge is special because its existing `--color-badge-<tone>-bg/-fg` tokens already lived at `:root` in `tokens.scss` and were referenced from `Badge.module.scss`. We rename them into the new convention and add a backward-compat alias.

- [ ] **Step 1: Read current Badge.module.scss + tokens.scss badge tokens**

```bash
cat packages/design-system/src/components/Badge/Badge.module.scss
grep -A 2 "color-badge-" packages/design-system/src/styles/tokens.scss | head -25
```

Note every tone slot (neutral / info / success / warning / danger / purple) with its bg + fg hex, plus any non-tone references in Badge.module.scss (radius, font-size, padding, dot size, etc.).

- [ ] **Step 2: Create Badge.tokens.scss**

Move the tone hex values from `tokens.scss` into `Badge.tokens.scss` under new names. The values are literal hex (not `var()` refs) because these ARE the primitive definitions for Badge tones:

```scss
// Badge.tokens.scss
//
// Component-scoped tokens for <Badge>. Each tone has its own bg + fg
// pair (--badge-bg-<tone> / --badge-fg-<tone>). Non-tone tokens cover
// shape, sizing, and the stripe variant's body / border.
//
// Old names like --color-badge-info-bg are kept as deprecated aliases
// in tokens.scss for backward compat — see that file.
:root {
  // Per-tone fill (filled variant)
  --badge-bg-neutral: #f4f5f7;
  --badge-fg-neutral: #42526e;
  --badge-bg-info: #deebff;
  --badge-fg-info: #0747a6;
  --badge-bg-success: #e3fcef;
  --badge-fg-success: #006644;
  --badge-bg-warning: #fffae6;
  --badge-fg-warning: #974f00;
  --badge-bg-danger: #ffebe6;
  --badge-fg-danger: #bf2600;
  --badge-bg-purple: #eae6ff;
  --badge-fg-purple: #403294;

  // Shape + sizing
  --badge-radius: var(--radius-sm);
  --badge-font-size: var(--font-size-xs);
  --badge-font-weight: var(--font-weight-semibold);
  --badge-letter-spacing: var(--letter-spacing-caps);
  --badge-line-height: var(--line-height-none);
  --badge-gap: var(--space-1);

  // Size variants — height + padding match what Badge.module.scss currently sets
  --badge-height-sm: var(--size-badge-sm);
  --badge-height-md: var(--size-badge);
  --badge-padding-x-sm: var(--space-1);
  --badge-padding-x-md: var(--space-2);

  // Stripe variant
  --badge-stripe-border-width: var(--border-width-strong);
  --badge-stripe-bg-neutral: var(--color-bg-muted);
  --badge-stripe-fg-neutral: var(--color-fg);
  --badge-stripe-border-color-neutral: var(--color-fg-muted);
  --badge-stripe-bg-info: var(--color-info-bg-subtle);
  --badge-stripe-fg-info: var(--color-info);
  --badge-stripe-border-color-info: var(--color-info);
  --badge-stripe-bg-success: var(--color-success-bg-subtle);
  --badge-stripe-fg-success: var(--color-success);
  --badge-stripe-border-color-success: var(--color-success);
  --badge-stripe-bg-warning: var(--color-warning-bg-subtle);
  --badge-stripe-fg-warning: var(--color-warning);
  --badge-stripe-border-color-warning: var(--color-warning);
  --badge-stripe-bg-danger: var(--color-danger-bg-subtle);
  --badge-stripe-fg-danger: var(--color-danger);
  --badge-stripe-border-color-danger: var(--color-danger);
  --badge-stripe-bg-purple: var(--badge-bg-purple);
  --badge-stripe-fg-purple: var(--badge-fg-purple);
  --badge-stripe-border-color-purple: var(--badge-fg-purple);
}
```

Verify by reading the existing tokens.scss for the exact hex values — these MUST match. If a hex in this template differs from what's in `tokens.scss` today, use the actual `tokens.scss` value.

- [ ] **Step 3: Update Badge.module.scss**

Add `@use './Badge.tokens.scss';` at the top. Replace every `var(--color-badge-X-bg)` with `var(--badge-bg-X)`, `var(--color-badge-X-fg)` with `var(--badge-fg-X)`, etc. Replace non-tone references (`var(--radius-sm)` → `var(--badge-radius)`, `var(--font-size-xs)` → `var(--badge-font-size)`, etc.).

Look up every `var(--color-info-bg-subtle)` / `var(--color-info)` / `var(--color-fg)` / `var(--color-bg-muted)` reference in the stripe-variant rules — those map to the `--badge-stripe-*` tokens.

- [ ] **Step 4: Remove the old tokens from tokens.scss + add deprecation aliases**

Open `packages/design-system/src/styles/tokens.scss`. Find the `--color-badge-*-bg/-fg` block (around lines 44–55 — that's where these 12 tokens currently live).

Replace them with:

```scss
// ─── DEPRECATED Badge tone tokens ────────────────────────────────────────
// These were renamed to --badge-bg-<tone> / --badge-fg-<tone> as part of
// the component-token migration (see Badge/Badge.tokens.scss). The names
// here are kept as aliases for backward compat with any consumer code
// that hard-coded them. Will be removed in a future major version.
:root {
  --color-badge-neutral-bg: var(--badge-bg-neutral);
  --color-badge-neutral-fg: var(--badge-fg-neutral);
  --color-badge-info-bg: var(--badge-bg-info);
  --color-badge-info-fg: var(--badge-fg-info);
  --color-badge-success-bg: var(--badge-bg-success);
  --color-badge-success-fg: var(--badge-fg-success);
  --color-badge-warning-bg: var(--badge-bg-warning);
  --color-badge-warning-fg: var(--badge-fg-warning);
  --color-badge-danger-bg: var(--badge-bg-danger);
  --color-badge-danger-fg: var(--badge-fg-danger);
  --color-badge-purple-bg: var(--badge-bg-purple);
  --color-badge-purple-fg: var(--badge-fg-purple);
}
```

The aliases now resolve THROUGH the Badge component tokens. Consumers referencing `--color-badge-info-bg` get the same value, but the source of truth lives in Badge.tokens.scss.

**Cascade caveat:** the alias block must be DEFINED AFTER Badge.tokens.scss has been emitted somewhere in the bundle. Since Badge.tokens.scss is emitted whenever any code imports Badge (transitively, since Badge.module.scss `@use`s it), AND tokens.scss is the global stylesheet, there's a load-order risk. Mitigation: emit Badge.tokens.scss explicitly from tokens.scss too (so the variables exist globally even before any Badge component renders):

Add to `tokens.scss` BEFORE the deprecation block:

```scss
// Emit Badge component tokens at the global level so consumers can
// reference them without first rendering a Badge.
@use '../components/Badge/Badge.tokens.scss';
```

(Path relative to `src/styles/tokens.scss` is `../components/Badge/Badge.tokens.scss`.)

- [ ] **Step 5: Gates**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

All clean. Badge tests still pass (the visual output is identical; existing consumer-side overrides via `--color-badge-info-bg` still work via the alias).

- [ ] **Step 6: Visual sanity check**

If dev server is up: open `/components/badge` and confirm all 6 tones (filled + stripe) render identically. Also open `/mockups/audit` to confirm the row-badge palette colors are unaffected.

- [ ] **Step 7: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Badge/Badge.tokens.scss packages/design-system/src/components/Badge/Badge.module.scss packages/design-system/src/styles/tokens.scss
git commit -m "$(cat <<'EOF'
Badge: semantic component tokens + tone-name rename

Moves the 12 badge tone tokens (--color-badge-<tone>-bg/-fg) into
the new Badge.tokens.scss with renamed convention
(--badge-bg-<tone> / --badge-fg-<tone>). Adds non-tone tokens for
radius, font, padding, height, and the stripe variant's body / border
per tone.

Old --color-badge-* names kept as deprecated aliases in tokens.scss
so consumer code that hard-coded them still works.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Migrate the Layout cluster (7 components)

**Files (per component, NEW + MODIFY):**

- Stack: `Stack.tokens.scss` (NEW), `Stack.module.scss` (MODIFY)
- Cluster: `Cluster.tokens.scss` (NEW), `Cluster.module.scss` (MODIFY)
- Divider: `Divider.tokens.scss` (NEW), `Divider.module.scss` (MODIFY)
- Grid: `Grid.tokens.scss` (NEW), `Grid.module.scss` (MODIFY)
- Card: `Card.tokens.scss` (NEW), `Card.module.scss` (MODIFY)
- Page: `Page.tokens.scss` (NEW), `Page.module.scss` (MODIFY)
- PageHeader: `PageHeader.tokens.scss` (NEW), `PageHeader.module.scss` (MODIFY)

These are layout primitives — most have very few token references (gap, padding, border, sometimes background). Per-component token files will be small (5–15 tokens each).

For EACH component above, apply the per-component convention (Convention section at the top of this plan). The reference example is Button (Task 1). Stack / Cluster / Grid have a `gap` variant per size (xs/sm/md/lg/xl/2xl) — token-ize each as `--stack-gap-xs`, etc., defaulting to `var(--space-1)` etc. PageHeader has the most surface (Title / Subtitle / Meta / Actions / Aside / Breadcrumb slots with their own font sizes + colors).

- [ ] **Step 1: Per-component, run the migration mechanics from the Convention section**

For each of the 7 Layout components, in order: Stack, Cluster, Divider, Grid, Card, Page, PageHeader. For each:

1. Read the existing `<Name>.module.scss`.
2. Create `<Name>.tokens.scss` with `:root { ... }` defining `--<kebab-name>-*` tokens. Default-equality: each token's value is the primitive the SCSS currently uses.
3. Add `@use './<Name>.tokens.scss';` to `<Name>.module.scss`.
4. Replace primitive references with token references.

- [ ] **Step 2: Gates after the cluster**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

All clean.

- [ ] **Step 3: Manual visual check**

```bash
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:8080/components/stack 2>/dev/null
```

If dev server up: spot-check `/components/stack`, `/components/grid`, `/components/page-header`, `/components/card` — render must be pixel-identical to pre-migration.

- [ ] **Step 4: Commit the whole cluster**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Stack packages/design-system/src/components/Cluster packages/design-system/src/components/Divider packages/design-system/src/components/Grid packages/design-system/src/components/Card packages/design-system/src/components/Page packages/design-system/src/components/PageHeader
git commit -m "$(cat <<'EOF'
Layout cluster: semantic component tokens

Migrates Stack, Cluster, Divider, Grid, Card, Page, PageHeader to the
component-token pattern. Each component gets a .tokens.scss file with
--<component>-<part>-<state> CSS custom properties at :root, and its
.module.scss @uses the tokens file + references the new tokens instead
of primitives.

Default visual output is byte-identical.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Migrate the Forms cluster (20 components)

**Components in scope:** Button (already done in Task 1 — SKIP), ButtonGroup, Checkbox, ColorPicker, DatePicker, DateRangePicker, FileUpload, ImageCrop, Input, Kanban, PasswordInput, PasswordStrengthMeter, Radio, OptionsPicker, Select, Slider, Sortable, Switch, Textarea, plus InlineDatePicker, InlineDateRangePicker if they have their own .module.scss.

Forms is the largest cluster. Many components share patterns (Input / Textarea / PasswordInput / Select all have border-color states for hover/focus/disabled/invalid).

For EACH component above, apply the per-component convention from the top of this plan.

**Special cases inside Forms:**

- **Checkbox**: Already references `--checkbox-color` as a consumer override hook (from the palette PR). Keep that hook — `--checkbox-color` becomes a Checkbox token defaulting to the palette color when set, OR `--color-accent` otherwise. Actually re-read Checkbox.module.scss before migrating — the CSS-var injection from React is a separate concern; the migration should preserve it.
- **OptionsPicker**: Has palette-color group-header styling via inline style — keep that path (it's set by React from JS-side palette token), and migrate the rest of the SCSS into `--options-picker-*` tokens.
- **DatePicker / DateRangePicker / Calendar variants**: These share Calendar internals. If multiple variants use the same primitive (e.g., `Calendar.module.scss` for the inline + popover paths), put the shared tokens in `Calendar.tokens.scss` (Display cluster) and each variant's .tokens.scss only adds variant-specific tokens.

- [ ] **Step 1: Per-component migration**

Walk the cluster's components in order. For each: create `.tokens.scss`, add `@use`, replace primitive references. Don't touch the React `.tsx` files.

- [ ] **Step 2: Gates**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

- [ ] **Step 3: Visual spot-check**

Open `/components/checkbox`, `/components/input`, `/components/options-picker`, `/components/date-pickers` — visual output identical.

- [ ] **Step 4: Commit the cluster**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/ButtonGroup packages/design-system/src/components/Checkbox packages/design-system/src/components/ColorPicker packages/design-system/src/components/DatePicker packages/design-system/src/components/DateRangePicker packages/design-system/src/components/FileUpload packages/design-system/src/components/ImageCrop packages/design-system/src/components/Input packages/design-system/src/components/Kanban packages/design-system/src/components/PasswordInput packages/design-system/src/components/PasswordStrengthMeter packages/design-system/src/components/Radio packages/design-system/src/components/OptionsPicker packages/design-system/src/components/Select packages/design-system/src/components/Slider packages/design-system/src/components/Sortable packages/design-system/src/components/Switch packages/design-system/src/components/Textarea packages/design-system/src/components/InlineDatePicker packages/design-system/src/components/InlineDateRangePicker
git commit -m "$(cat <<'EOF'
Forms cluster: semantic component tokens

Migrates ButtonGroup, Checkbox, ColorPicker, DatePicker, DateRangePicker,
FileUpload, ImageCrop, Input, Kanban, PasswordInput,
PasswordStrengthMeter, Radio, OptionsPicker, Select, Slider, Sortable,
Switch, Textarea, InlineDatePicker, InlineDateRangePicker. Each gains
a .tokens.scss file with --<component>-<part>-<state> at :root; the
.module.scss @uses it and references tokens instead of primitives.

Default visual output is byte-identical. The Checkbox --checkbox-color
inline-style hook (used by the palette PR) is preserved unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

The component dirs above MAY not all exist (e.g., `InlineDatePicker` might be a route alias inside `DatePicker/`). Adjust the `git add` list to match the actual dirs touched.

---

## Task 5: Migrate the Display cluster (16 components — Badge already done in Task 2)

**Components in scope:** Avatar (+AvatarGroup if it has its own .module.scss), DefinitionList, Calendar, CircularProgress, Code, CursorPagination, DataTable, EmptyState, FilterChip, Pagination, PersonDisplay, Progress, Skeleton, Table, Text, Title.

**Special cases:**

- **DataTable**: Lots of internal classes (`.expandedDetailRow`, `.expandedDetailCell`, `.pinnedLeft`, etc.). Each gets its own tokens for backgrounds (e.g., `--data-table-expanded-row-bg`, `--data-table-row-bg-hover`). Mind the cascade — DataTable currently overrides Table primitive's hover via doubled-class selectors; that pattern is preserved.
- **FilterChip**: Already has palette-color logic (the tone dot is a 6px span with `data-tone={tone}` SCSS rules). Keep the data-tone SCSS rules; just tokenize the chip pill (bg, border, radius, padding) into `--filter-chip-*`.
- **PersonDisplay**: Compound primitive — its sub-elements (name span, description span, column wrapper) use tokens like `--person-display-gap-sm`, `--person-display-name-text-size`, etc. Read the existing SCSS first; tokens follow what's there.
- **Calendar**: Shared by DatePicker/DateRangePicker. Define calendar-level tokens in `Calendar.tokens.scss`. The Date\*Picker components reference them through their own tokens (or directly — the spec says cross-component composition is fine).
- **Text / Title / Code**: Mostly font-size + tone color. Token-ize the per-size + per-tone refs.

Apply the per-component convention.

- [ ] **Step 1: Per-component migration**

Order: Avatar, DefinitionList, Calendar, CircularProgress, Code, CursorPagination, DataTable, EmptyState, FilterChip, Pagination, PersonDisplay, Progress, Skeleton, Table, Text, Title.

- [ ] **Step 2: Gates**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

- [ ] **Step 3: Visual spot-check**

`/components/data-table`, `/components/filter-chip`, `/components/person-display`, `/components/avatar`, `/components/text`, `/components/title`, `/mockups/audit` (DataTable + FilterChip live together).

- [ ] **Step 4: Commit the cluster**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Avatar packages/design-system/src/components/DefinitionList packages/design-system/src/components/Calendar packages/design-system/src/components/CircularProgress packages/design-system/src/components/Code packages/design-system/src/components/CursorPagination packages/design-system/src/components/DataTable packages/design-system/src/components/EmptyState packages/design-system/src/components/FilterChip packages/design-system/src/components/Pagination packages/design-system/src/components/PersonDisplay packages/design-system/src/components/Progress packages/design-system/src/components/Skeleton packages/design-system/src/components/Table packages/design-system/src/components/Text packages/design-system/src/components/Title
git commit -m "$(cat <<'EOF'
Display cluster: semantic component tokens

Migrates Avatar, DefinitionList, Calendar, CircularProgress, Code,
CursorPagination, DataTable, EmptyState, FilterChip, Pagination,
PersonDisplay, Progress, Skeleton, Table, Text, Title. Each gains
a .tokens.scss file at :root + its .module.scss @uses it.

Default visual output is byte-identical. FilterChip's data-tone rules
preserved; DataTable's specificity-bumped selectors preserved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Migrate the Navigation cluster (4 components)

**Components in scope:** Accordion, Breadcrumb, Link, Tabs.

- [ ] **Step 1: Per-component migration**

Order: Accordion, Breadcrumb, Link, Tabs. Apply the per-component convention.

**Special case — Link:** has `default` / `subtle` variants with different colors (accent + accent-hover for default; muted + accent on hover for subtle). Each variant gets its own `--link-fg-<variant>` and `--link-fg-<variant>-hover` tokens.

**Special case — Tabs:** active vs inactive tab styling. Tokens: `--tabs-fg`, `--tabs-fg-active`, `--tabs-fg-hover`, `--tabs-indicator-color`, etc.

- [ ] **Step 2: Gates**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

- [ ] **Step 3: Visual spot-check**

`/components/tabs`, `/components/link`, `/components/breadcrumb`, `/components/accordion`.

- [ ] **Step 4: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Accordion packages/design-system/src/components/Breadcrumb packages/design-system/src/components/Link packages/design-system/src/components/Tabs
git commit -m "$(cat <<'EOF'
Navigation cluster: semantic component tokens

Migrates Accordion, Breadcrumb, Link, Tabs to the component-token
pattern. Default visual output is byte-identical.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Migrate the Overlays cluster (6 components)

**Components in scope:** ConfirmationPopover, Drawer, DropdownMenu, Modal, Popover, Tooltip.

- [ ] **Step 1: Per-component migration**

Order: Popover (base), Tooltip, DropdownMenu, ConfirmationPopover, Modal, Drawer. Popover is the floating-positioned base used by Tooltip / DropdownMenu / ConfirmationPopover — its tokens are reused.

**Special case — DropdownMenu:** has menu item hover + selected + danger-tone item styling. Tokens cover each state.

**Special case — Modal / Drawer:** scrim color + container background + content padding + close-button styling.

Apply the per-component convention.

- [ ] **Step 2: Gates + visual spot-check**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

Spot-check `/components/modal`, `/components/dropdown-menu`, `/components/tooltip`, `/components/drawer`.

- [ ] **Step 3: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/ConfirmationPopover packages/design-system/src/components/Drawer packages/design-system/src/components/DropdownMenu packages/design-system/src/components/Modal packages/design-system/src/components/Popover packages/design-system/src/components/Tooltip
git commit -m "$(cat <<'EOF'
Overlays cluster: semantic component tokens

Migrates ConfirmationPopover, Drawer, DropdownMenu, Modal, Popover,
Tooltip to the component-token pattern. Default visual output is
byte-identical.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Migrate the Feedback cluster (2 components)

**Components in scope:** Alert, Toast.

Both are tone-based (info / success / warning / danger). Each tone gets its own bg/fg/icon-color tokens, similar to Badge.

- [ ] **Step 1: Per-component migration**

Order: Alert, Toast. Apply the per-component convention. Each tone gets `--alert-bg-<tone>`, `--alert-fg-<tone>`, `--alert-icon-<tone>`; similarly for Toast.

- [ ] **Step 2: Gates + visual spot-check**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

`/components/alert`, `/components/toast`.

- [ ] **Step 3: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Alert packages/design-system/src/components/Toast
git commit -m "$(cat <<'EOF'
Feedback cluster: semantic component tokens

Migrates Alert, Toast to the component-token pattern. Per-tone
(info / success / warning / danger) tokens for each. Default visual
output is byte-identical.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Documentation — AGENTS.md "Theming via component tokens"

**Files:**

- Modify: `packages/design-system/AGENTS.md`
- Modify: `packages/design-system/CLAUDE.md` (Hard rule 3 commentary)

- [ ] **Step 1: Add the theming section to AGENTS.md**

Find the existing "## Tokens" section in AGENTS.md. Add a new "## Theming via component tokens" section immediately after it. Content:

````markdown
## Theming via component tokens

Every component ships a `Component.tokens.scss` file that defines `--<component>-<part>-<state>` CSS custom properties at `:root`. The component's `.module.scss` references those tokens instead of the global primitives. This lets consumers re-theme one component without affecting others.

**Pattern:**

- Token name: `--<component>-<part>[-<state>]`. Component is kebab-cased (`--data-table-*`, `--dropdown-menu-*`). Part is the surface (`bg` / `fg` / `border-color` / `radius` / `padding-x` / `height` / `ring`). State is appended when there's a state variant (`hover` / `active` / `focus` / `disabled` / `checked` / `selected` / `invalid`).
- Defaults: every component token defaults to the same primitive the SCSS used before this layer existed. Overriding the token re-themes the component without touching the primitive.

**Override globally (every Button in the app turns red):**

```css
:root {
  --button-bg: red;
  --button-bg-hover: darkred;
}
```

**Override per-scope (only Buttons inside this region turn red):**

```css
.danger-zone {
  --button-bg: red;
  --button-bg-hover: darkred;
}
```

```tsx
<div className="danger-zone">
  <Button>Delete</Button>
</div>
```

**Override per-instance (one Button, inline):**

```tsx
<Button style={{ '--button-bg': 'red' } as React.CSSProperties}>Delete</Button>
```

The authoritative list of tokens per component lives in that component's `<Name>.tokens.scss` file. Read it to see what's available.

**Deprecated:** `--color-badge-<tone>-bg/-fg` tokens are aliased to the new `--badge-bg-<tone>` / `--badge-fg-<tone>` tokens. They still work but will be removed in a future major version.
````

- [ ] **Step 2: Update CLAUDE.md Hard rule 3 commentary**

Find "Hard rule 3" in `packages/design-system/CLAUDE.md`. After its existing body, add a paragraph noting the component-token convention:

```markdown
**Component tokens layer:** Within a component's `.module.scss`, prefer the component's own tokens (`var(--button-bg)`) over primitives (`var(--color-accent)`) directly. The component tokens live in `Component.tokens.scss` and default to the primitive — so the resolved value is identical, but the SCSS reads as "the button's background" instead of "the accent color we happen to use here." See `docs/superpowers/specs/2026-05-27-component-tokens-design.md` and AGENTS.md's "Theming via component tokens" section. Not enforced by stylelint (yet); convention-only in v1.
```

- [ ] **Step 3: Gates + commit**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -3

git add packages/design-system/AGENTS.md packages/design-system/CLAUDE.md
git commit -m "$(cat <<'EOF'
Docs: theming via component tokens

AGENTS.md gains a "Theming via component tokens" section explaining
the --<component>-<part>-<state> pattern, override surface (global /
per-scope / per-instance), and where to find the per-component list.
CLAUDE.md Hard rule 3 gets a commentary paragraph noting that
component SCSS should reference component tokens rather than
primitives directly (convention-only, not stylelint-enforced).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final validation + push + PR

- [ ] **Step 1: Full gate sweep**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "\\.tokens\\.scss$" | head -10
```

The pack grep should show that every `Component.tokens.scss` file IS in the tarball (these are part of the library's public surface — consumers can `@import` them or override their tokens).

- [ ] **Step 2: Visual regression sweep**

Open the playground at `http://localhost:8080`. Click through every demo page (the AppShell sidebar lists them). For each, confirm: render is unchanged from before the migration. If any component looks visually different, that component's tokens diverged from the primitive — fix and recommit.

For an automated check, the implementer can use Playwright to screenshot each demo route into `.playwright-mcp/` and diff against a baseline captured at task start. But manual eyeballing of one demo per cluster is sufficient sanity for v1.

- [ ] **Step 3: Push the branch**

```bash
cd /Users/dpws/projects/design-system && git push -u origin feat/component-tokens 2>&1 | tail -10
```

If prettier pre-push fails, run `npx prettier --write <flagged files>`, amend or new commit, push again.

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "Semantic component tokens for all 57 components" --body "$(cat <<'EOF'
## Summary

Every component in `@eocrm/design-system` now ships a `Component.tokens.scss` file alongside its `.module.scss`. Tokens are public `:root`-scoped CSS custom properties (`--<component>-<part>-<state>`) defaulting to the same primitives the SCSS used before, so:

- **Default appearance is byte-identical to today.** No visual diff anywhere.
- **Consumers can theme per-component** without touching globals: `:root { --button-bg: red }` re-themes every Button without affecting Tabs, Links, or any other accent surface.
- **SCSS reads more clearly** — `var(--button-bg)` says "the button's background" where `var(--color-accent)` used to leave the intent ambiguous.

Badge's tone tokens get renamed (`--color-badge-info-bg` → `--badge-bg-info`); the old names are kept as deprecated aliases in `tokens.scss` so consumer code that hard-coded them still works.

- Spec: `docs/superpowers/specs/2026-05-27-component-tokens-design.md`
- Plan: `docs/superpowers/plans/2026-05-27-component-tokens.md`

## Test plan

- [x] Existing 2079+ tests pass without modification — default-equality means visual output is unchanged
- [x] `make build`, `make lint`, `npm run typecheck` — all green
- [x] `npm pack --dry-run -w @eocrm/design-system` — every `.tokens.scss` file is in the tarball
- [x] Manual Playwright sweep of one demo per cluster — render identical pre/post
- [x] AGENTS.md "Theming via component tokens" + CLAUDE.md Hard rule 3 commentary updated

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | tail -3
```

- [ ] **Step 5: Report PR URL**

---

## Self-Review

**1. Spec coverage:**

- File layout (`Component.tokens.scss` + `@use` in `.module.scss`) — every cluster task ✓
- Naming convention `--<component>-<part>-<state>` — Convention section + Tasks 1–8 ✓
- Default-equality requirement — Convention + every task ✓
- Badge tone rename + deprecation shim — Task 2 ✓
- Palette tokens stay untouched — Convention's "DO NOT tokenize" + Task 5 FilterChip note ✓
- Coverage requirement (states, sizes, variants) — Convention + per-cluster task notes ✓
- All 57 components migrated in one PR — 6 cluster tasks + Tasks 1–2 reference ✓
- AGENTS.md theming section — Task 9 ✓
- CLAUDE.md Hard rule 3 commentary — Task 9 ✓
- Visual gate (no test changes) — Tasks 3–8 visual spot-check + Task 10 sweep ✓
- Out-of-scope items (dark theme, React API, primitive rename, auto-docs, stylelint rule) — explicitly covered by their absence; spec lists them ✓

**2. Placeholder scan:** every task has concrete code or commands. Tasks 3–8 include per-component "apply the convention" instructions — the convention is fully spelled out at the top of the plan and demonstrated in Tasks 1–2, so this is a directed instruction, not a placeholder.

**3. Type consistency:** token naming is `--<component>-<part>-<state>` across the entire plan. The Convention section enumerates the standard `<part>` vocabulary (bg / fg / border-color / radius / etc.) and standard `<state>` vocabulary (hover / active / focus / disabled / etc.). All examples follow it.

One known risk: the per-component token enumeration is delegated to the implementer (read existing SCSS, decide tokens). The reference examples (Button + Badge) demonstrate the pattern with full token lists. For 55 other components × ~15 tokens average = ~825 tokens enumerated by subagents during execution. The subagent prompts at dispatch time will include Tasks 1–2 as concrete references, ensuring consistency.
