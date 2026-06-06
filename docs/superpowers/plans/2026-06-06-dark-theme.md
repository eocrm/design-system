# Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dark theme to `@eocrm/design-system` by redefining the color tokens under a `[data-theme]` / `prefers-color-scheme` scope, plus a 3-state (System/Light/Dark) toggle in the playground.

**Architecture:** The token system is already dark-ready — ~40 source-of-truth color primitives in `tokens.scss` (`:root`), and component `*.tokens.scss` files are `var()`-aliases that cascade. Dark mode is therefore a **token-redefinition** exercise: one new SCSS file (`dark.scss`) emits a `dark-tokens` mixin into two scopes (`:root[data-theme='dark']` for forced-dark, and a `prefers-color-scheme: dark` media query for system-dark), so redefining the primitives flips nearly every component for free. The only non-primitive overrides are the literal-hex exceptions — Badge filled tones and the inverted Tooltip — redefined inside the same mixin so the whole dark palette is one reviewable surface. The visible toggle lives in the playground (Rail footer + `localStorage`); the library ships only tokens + docs (no theme component, no React context — per the AppProvider spec).

**Tech Stack:** SCSS (`@use`, `@mixin`), CSS custom properties, `prefers-color-scheme`, `color-scheme`; React + TypeScript (playground `AppShell`), `localStorage`; Playwright (empirical dark-sweep verification).

**Spec:** `docs/superpowers/specs/2026-06-06-dark-theme-design.md`

**Branch:** `feat/dark-theme` (already checked out; the spec commit `0b6e666` is on it).

---

## Notes for the implementer (read first)

- **This is NOT a new component.** The root CLAUDE.md "Core invariant" (tests + demo + 3-way playground wiring + `index.ts` export + manifest entry) applies to _components_. Dark theme adds no component, no export, no demo page, no manifest entry. Do **not** create a demo page or touch `index.ts` / the manifest. A reviewer expecting "where's the demo?" is mis-applying the invariant — the _whole playground_ is the demo surface (verified live under the toggle).
- **No unit tests for token values.** This repo does not unit-test SCSS/CSS token files (`tokens.scss` itself has none, and `structure.test.ts` only checks `components/**`). The verification strategy for this PR is the **gates** (stylelint + build prove the SCSS compiles and resolves) plus an **empirical Playwright dark sweep** (Task 5). Don't fabricate a brittle "does dark.scss contain X" test — follow repo convention.
- **Stylelint comment rules** bite often here. Every `//` comment (except the first node inside a block) needs a blank line before it (`scss/double-slash-comment-empty-line-before`), and a lone `//` separator line is rejected (`scss/comment-no-empty`). Keep comments attached to content.
- **stylelint `declaration-strict-value`** only governs properties matching `/color$/` / background / fill / stroke / `border-*-color` / `border-width` / `opacity`. Custom-property _declarations_ (`--x: #hex`) and `color-scheme` are NOT matched — so raw hex inside `dark.scss` token declarations is allowed (same as `tokens.scss` and `Badge.tokens.scss`).
- **Commit after each task.** Code/config changes here go through a PR (root CLAUDE.md git workflow) — do not push to `main` directly. Pushing happens once, after Task 5, via the PR.

---

## File Structure

| File                                                   | Action     | Responsibility                                                                                                            |
| ------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| `packages/design-system/src/styles/dark.scss`          | **Create** | The `dark-tokens` mixin (entire dark palette) + the three theme scopes.                                                   |
| `packages/design-system/src/styles/global.scss`        | Modify     | `@use 'dark';` after `tokens` (dark blocks follow the light `:root` in source order).                                     |
| `packages/design-system/src/styles/tokens.scss`        | Modify     | Add `color-scheme: light;` to the base `:root` (explicit default).                                                        |
| `packages/design-system/AGENTS.md`                     | Modify     | New `## Dark theme` section: attribute contract, what flips, consumer responsibility, no-flash snippet.                   |
| `packages/playground/index.html`                       | Modify     | No-flash inline `<script>` (sets `data-theme` from `localStorage` before paint).                                          |
| `packages/playground/src/layout/AppShell/AppShell.tsx` | Modify     | `theme` state (System/Light/Dark) + persistence/apply effect + Rail.Footer cycle button + `Monitor`/`Sun`/`Moon` imports. |

---

## Task 1: Library dark token layer (`dark.scss` + `global.scss` + `tokens.scss`)

**Files:**

- Create: `packages/design-system/src/styles/dark.scss`
- Modify: `packages/design-system/src/styles/global.scss:4` (add `@use 'dark';` after `@use 'tokens';`)
- Modify: `packages/design-system/src/styles/tokens.scss:5-6` (add `color-scheme: light;` as the first declaration in the base `:root`)

This is the core change. No unit test (see "Notes" above); verified by `make lint` (stylelint compiles `dark.scss`) + `make build` (the playground bundles, proving `@use 'dark'` resolves and the SCSS compiles) + the Playwright sweep in Task 5.

- [ ] **Step 1: Create `dark.scss`**

Create `packages/design-system/src/styles/dark.scss` with EXACTLY this content:

```scss
// dark.scss — Dark theme token overrides.
//
// The entire dark palette lives in ONE mixin, emitted into two scopes so
// forced-dark (:root[data-theme='dark']) and system-dark
// (prefers-color-scheme: dark) stay in lockstep. Component *.tokens.scss
// files are var()-aliases over these primitives, so redefining the primitives
// cascades to nearly every component for free. The only non-primitive
// overrides are the literal-hex exceptions — Badge filled tones and the
// inverted Tooltip — kept here so the whole dark palette is one reviewable
// surface. Values are contrast-targeted for WCAG AA and tunable live via the
// playground toggle.

@mixin dark-tokens {
  // Neutral surfaces & text
  --color-bg: #1d2125;
  --color-bg-subtle: #22272b;
  --color-bg-muted: #282e33;
  --color-bg-sunken: #161a1d;
  --color-bg-danger-subtle: #42201d;
  --color-border: #38414a;
  --color-border-strong: #50585f;
  --color-fg: #dee4ea;
  --color-fg-muted: #9aa7b5;
  --color-fg-subtle: #7e8b9a;
  --color-fg-disabled: #5a6472;

  // Accent — lightened for dark; the bright fill takes dark text
  --color-accent: #579dff;
  --color-accent-hover: #85b8ff;
  --color-accent-pressed: #cce0ff;
  --color-accent-fg: #1d2125;
  --color-accent-subtle-bg: #1c3a5e;
  --color-accent-bg-subtle: #1c3a5e;

  // Semantic — brightened so they read as text on dark; fills take dark text
  --color-danger: #f87168;
  --color-danger-hover: #ff9c8f;
  --color-danger-fg: #1d2125;
  --color-danger-bg-subtle: #42201d;
  --color-success: #4bce97;
  --color-success-hover: #7ee2b8;
  --color-success-fg: #1d2125;
  --color-success-bg-subtle: #1c3d31;
  --color-warning: #f5cd47;
  --color-warning-fg: #1d2125;
  --color-warning-bg-subtle: #3d3216;
  --color-info: #579dff;
  --color-info-bg-subtle: #16324f;

  // Focus rings — brighter + stronger alpha for dark
  --ring-accent: rgb(87 157 255 / 65%);
  --ring-danger: rgb(248 113 104 / 55%);
  --ring-success: rgb(75 206 151 / 55%);

  // Overlays — dark scrim; the blur frost flips from white to dark
  --color-bg-overlay: rgb(0 0 0 / 55%);
  --color-bg-overlay-blur: rgb(0 0 0 / 45%);

  // Shadows — stronger pure-black so elevation reads on dark
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 40%);
  --shadow-md: 0 2px 4px rgb(0 0 0 / 40%), 0 0 1px rgb(0 0 0 / 56%);
  --shadow-lg: 0 4px 12px -2px rgb(0 0 0 / 50%), 0 0 1px rgb(0 0 0 / 56%);
  --shadow-table-pinned-edge: 4px 0 8px -4px rgb(0 0 0 / 50%);
  --shadow-table-pinned-edge-right: -4px 0 8px -4px rgb(0 0 0 / 50%);

  // Badge filled tones — literal-hex exception (Badge.tokens.scss), dark tint
  // bg + light fg. The deprecated --color-badge-*-bg aliases reference these,
  // so they flip automatically.
  --badge-bg-neutral: #2c333a;
  --badge-fg-neutral: #c7d1db;
  --badge-bg-info: #16324f;
  --badge-fg-info: #9dc3ff;
  --badge-bg-success: #1c3d31;
  --badge-fg-success: #7ee2b8;
  --badge-bg-warning: #3d3216;
  --badge-fg-warning: #f5cd47;
  --badge-bg-danger: #42201d;
  --badge-fg-danger: #ff9c8f;
  --badge-bg-purple: #2b2c4d;
  --badge-fg-purple: #b8acf6;

  // Tooltip — inverted-by-design. In light it's var(--color-fg)/var(--color-bg)
  // which would auto-flip to a glaring light chip in dark, so give it a
  // dedicated elevated dark surface. --tooltip-arrow-bg ALSO defaults to
  // var(--color-fg) — override it too or the arrow becomes a light triangle on
  // the dark panel.
  --tooltip-bg: #39424b;
  --tooltip-fg: #f0f3f6;
  --tooltip-arrow-bg: #39424b;
}

// Forced dark — :root[data-theme='dark'] (0,1,1) beats bare :root (0,1,0) and
// beats the system media query below.
:root[data-theme='dark'] {
  color-scheme: dark;
  @include dark-tokens;
}

// System default — applies when the OS is dark AND the user hasn't forced
// light. :root:not([data-theme='light']) (0,2,0) beats bare :root (0,1,0).
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
    @include dark-tokens;
  }
}

// Forced light wins over the media query (0,1,1 > 0,1,0).
:root[data-theme='light'] {
  color-scheme: light;
}
```

- [ ] **Step 2: Wire `dark.scss` into `global.scss`**

In `packages/design-system/src/styles/global.scss`, add `@use 'dark';` immediately after `@use 'tokens';` so the dark blocks follow the light `:root` in source order. Result:

```scss
// Single global entry. Import this once from main.tsx.
// Component-specific styles do NOT belong here — they go in *.module.scss next to the component.

@use 'tokens';
@use 'dark';
@use 'reset';
@use 'typography';
```

- [ ] **Step 3: Add explicit `color-scheme: light` to the base `:root` in `tokens.scss`**

In `packages/design-system/src/styles/tokens.scss`, add `color-scheme: light;` as the first declaration inside the base `:root` block (the one that starts at line 5 with the `// Neutral surfaces & text` comment). Change:

```scss
:root {
  // Neutral surfaces & text (Atlassian-inspired N palette)
  --color-bg: #ffffff;
```

to:

```scss
:root {
  color-scheme: light;

  // Neutral surfaces & text (Atlassian-inspired N palette)
  --color-bg: #ffffff;
```

(The blank line before the `//` comment keeps `scss/double-slash-comment-empty-line-before` happy.)

- [ ] **Step 4: Run lint to verify the SCSS compiles cleanly**

Run: `make lint`
Expected: PASS — stylelint reports no errors. (If it flags `scss/double-slash-comment-empty-line-before` or `scss/comment-no-empty`, a `//` comment is missing its leading blank line or is an empty separator — fix and re-run.)

- [ ] **Step 5: Run the library typecheck + the full build to verify `@use 'dark'` resolves**

Run: `make build-lib`
Expected: PASS (library typecheck — unaffected by SCSS, but confirms nothing broke).

Run: `make build`
Expected: PASS — the playground bundles. This is the real proof the SCSS compiles: Vite processes `global.scss` → `@use 'dark'` → the mixin + scopes, and a Sass error here fails the build.

- [ ] **Step 6: Run the unit tests (confirm nothing regressed)**

Run: `make test`
Expected: PASS — no test touches styles, so this should be green; it confirms the new file didn't perturb `structure.test.ts` (which only scans `components/**`).

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/styles/dark.scss \
        packages/design-system/src/styles/global.scss \
        packages/design-system/src/styles/tokens.scss
git commit -m "feat(theme): dark token layer (dark.scss mixin + data-theme/prefers-color-scheme scopes)"
```

---

## Task 2: Library docs — AGENTS.md "Dark theme" section

**Files:**

- Modify: `packages/design-system/AGENTS.md` (insert a `## Dark theme` section after the i18n section, before `## Components — TL;DR`)

Documents the consumer-facing contract: the `<html data-theme>` attribute, automatic `color-scheme`, what flips for free vs. the consumer's job, and the copy-paste no-flash snippet (the library can't inject it — no DOM side-effects, per the AppProvider spec).

- [ ] **Step 1: Insert the Dark theme section**

In `packages/design-system/AGENTS.md`, find the boundary between the Localization section and the components list — it looks like this (around line 95-98):

```markdown
5. Never inline an English string — `aria-label="Close"` is a Hard rule 9 violation.

---

## Components — TL;DR
```

Insert the new section so it sits BETWEEN the i18n section's `---` and `## Components — TL;DR`. The result must read:

````markdown
5. Never inline an English string — `aria-label="Close"` is a Hard rule 9 violation.

---

## Dark theme

The library ships a full dark palette, driven entirely by CSS. There is **no theme component, no React context, no JS API** — you control it with one attribute on `<html>`:

| `<html>` attribute   | Result                                                 |
| -------------------- | ------------------------------------------------------ |
| _(none)_             | **System** — follows the OS via `prefers-color-scheme` |
| `data-theme="light"` | **Forced light** (wins over a dark OS)                 |
| `data-theme="dark"`  | **Forced dark** (wins over a light OS)                 |

```html
<html data-theme="dark">
  …
</html>
```
````

`color-scheme` is set automatically for each state, so native form controls, scrollbars, and the browser chrome match the theme.

**What flips for free:** every component whose colors resolve through the design tokens — which is all of them. Surfaces, text, borders, the accent and semantic palettes, shadows, overlays, focus rings, Badge tones, and Tooltip all redefine under dark with zero markup changes.

**Your responsibility:**

- **Set the attribute.** The library reads it; it never writes it (no DOM side-effects — see `<AppProvider>`). Persist the user's choice (e.g. `localStorage`) and apply it: `'light'`/`'dark'` → `document.documentElement.dataset.theme = choice`; `'system'` → remove the attribute.
- **Add the no-flash snippet** (below) so a forced light/dark choice doesn't flash the default theme before your bundle boots.
- **Theme-aware images.** Raw `<img>` assets with baked-in colors (e.g. a logo SVG) can't be recolored by CSS — swap the `src` per theme if it matters. The `<Logo>` wordmark _text_ flips automatically (`--color-fg`); the image mark does not.

**Out of scope (theme-independent by design):** the 30-color categorical `--color-palette-*` set (a dark variant is a planned fast-follow), avatar identity colors, and BrandIcon brand marks.

### No-flash snippet

Inline this in your app's `<head>` **before** your bundle loads. It applies the persisted choice before first paint. `'system'`/unset writes nothing → the CSS media query handles it with no flash either way.

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('your-theme-key');
      if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    } catch (e) {
      /* localStorage blocked (private mode) — fall back to System */
    }
  })();
</script>
```

---

## Components — TL;DR

````

- [ ] **Step 2: Verify the docs render and the gates are unaffected**

Run: `npm run format:check`
Expected: PASS (or, if prettier reformats markdown tables, run `npm run format` then re-check). Markdown is not typechecked or built, so no other gate applies to this file.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "docs(theme): AGENTS.md Dark theme section + no-flash snippet"
````

---

## Task 3: Playground 3-state toggle (`index.html` no-flash + `AppShell` state & footer button)

**Files:**

- Modify: `packages/playground/index.html` (add the no-flash `<script>`)
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` (theme state + persistence/apply effect + Rail.Footer cycle button + `Monitor`/`Sun`/`Moon` imports)

`AppShell` is playground tooling (NOT a mockup), so Rule 6 / Rule 7 do not apply. No unit test (AppShell has none today); verified by `make build` (typecheck) + the Playwright cycle test in Task 5.

- [ ] **Step 1: Add the no-flash script to `index.html`**

In `packages/playground/index.html`, add a second `<script>` immediately AFTER the existing SPA-routing `<script>` block (after its closing `</script>` on line 29, still inside `<head>`):

```html
<script>
  // No-flash theme — applied before first paint so a forced light/dark
  // choice doesn't flash the default. 'system'/unset writes no attribute →
  // the CSS prefers-color-scheme media query decides (no flash either way).
  (function () {
    try {
      var t = localStorage.getItem('eocrm-playground-theme');
      if (t === 'light' || t === 'dark') {
        document.documentElement.dataset.theme = t;
      }
    } catch (e) {
      /* localStorage unavailable — fall back to system */
    }
  })();
</script>
```

- [ ] **Step 2: Add `Monitor`, `Sun`, `Moon` to the lucide-react import in `AppShell.tsx`**

In `packages/playground/src/layout/AppShell/AppShell.tsx`, the big `lucide-react` import block ends with `type LucideIcon,` (line ~83). Add the three theme icons to that block (anywhere inside the `{ ... }` — keep it alphabetical-ish, e.g. near `Minus` / `MoreHorizontal`). Add these three identifiers:

```tsx
  Monitor,
  Sun,
  Moon,
```

- [ ] **Step 3: Add the theme constants + types above the `AppShell` component**

In `AppShell.tsx`, just below the existing `const SIDEBAR_COLLAPSED_KEY = 'eocrm-playground-sidebar-collapsed';` line (line 90), add:

```tsx
const THEME_KEY = 'eocrm-playground-theme';

type Theme = 'system' | 'light' | 'dark';

// Cycle order for the footer toggle: System → Light → Dark → System.
const THEME_ORDER: Theme[] = ['system', 'light', 'dark'];

// Icon + label per state. Icon doubles as the collapsed-rail tooltip trigger;
// the label is the accessible name (expanded) and the tooltip text (collapsed).
const THEME_META: Record<Theme, { icon: LucideIcon; label: string }> = {
  system: { icon: Monitor, label: 'Theme: System' },
  light: { icon: Sun, label: 'Theme: Light' },
  dark: { icon: Moon, label: 'Theme: Dark' },
};
```

- [ ] **Step 4: Add the theme state, persistence/apply effect, and cycle handler inside `AppShell`**

In `AppShell.tsx`, the component currently opens with the collapsed-state hooks (lines ~288-299). Add the theme hooks immediately AFTER the collapsed `useEffect` (after line 299, BEFORE the `if (FULL_BLEED_PATHS.has(pathname))` early return — hooks must run unconditionally, and the apply-effect must also run on full-bleed routes like `/mockups/login` so they respect the theme). Insert:

```tsx
// Persisted theme: 'system' (follow OS) | 'light' | 'dark' (forced).
const [theme, setTheme] = useState<Theme>(() => {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
});
useEffect(() => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_KEY, theme);
  const root = document.documentElement;
  if (theme === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
}, [theme]);

const cycleTheme = () =>
  setTheme((prev) => THEME_ORDER[(THEME_ORDER.indexOf(prev) + 1) % THEME_ORDER.length]);
const ThemeIcon = THEME_META[theme].icon;
```

- [ ] **Step 5: Add the cycle button to `Rail.Footer`**

In `AppShell.tsx`, the `Rail.Footer` currently holds the switch link + `Rail.CollapseToggle` (lines ~349-354). Add the theme cycle button between the switch link and the collapse toggle. `Rail.Item as="button"` auto-wraps in a Tooltip showing the label when the rail is collapsed (string children), so it works collapsed too. Result:

```tsx
<Rail.Footer>
  <Rail.Item as={NavLink} to={switchLink.to} icon={<switchLink.icon size={16} />}>
    {switchLink.label}
  </Rail.Item>
  <Rail.Item as="button" type="button" icon={<ThemeIcon size={16} />} onClick={cycleTheme}>
    {THEME_META[theme].label}
  </Rail.Item>
  <Rail.CollapseToggle />
</Rail.Footer>
```

- [ ] **Step 6: Typecheck + build the playground**

Run: `make build`
Expected: PASS — typecheck (the new `Theme` type, `THEME_META`, the `as="button"` Rail.Item, the lucide imports) + bundle both succeed.

- [ ] **Step 7: Run lint (the index.html script is plain JS; AppShell is TSX — lint covers SCSS only, but run for completeness)**

Run: `make lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/playground/index.html \
        packages/playground/src/layout/AppShell/AppShell.tsx
git commit -m "feat(playground): 3-state theme toggle in Rail footer + no-flash script"
```

---

## Task 4: Manual smoke + persistence check (dev server)

**Files:** none (verification only).

A quick human-loop check before the heavier Playwright sweep, to catch obvious breakage early.

- [ ] **Step 1: Start the dev server**

Run: `make dev`
Expected: playground serves at http://localhost:8080.

- [ ] **Step 2: Cycle the toggle and confirm behavior**

In the browser:

- The Rail footer shows a theme button (Monitor icon, "Theme: System"). Click it → Sun / "Theme: Light"; click → Moon / "Theme: Dark"; click → back to Monitor / "Theme: System".
- In **Dark**, the whole app goes dark (surfaces, text, borders, sidebar, top bar). In **Light**, it stays light even if the OS is dark. In **System**, it follows the OS.
- Reload the page on **Dark** → it loads dark with **no white flash** (the `index.html` script applied `data-theme` pre-paint).
- Collapse the rail (collapse toggle) → the theme button shows only its icon; hovering shows the "Theme: …" tooltip.

Expected: all of the above hold. If the toggle doesn't apply, confirm `document.documentElement.dataset.theme` changes in DevTools when clicking.

- [ ] **Step 3: Stop the dev server** (Ctrl-C, or leave it running for Task 5).

(No commit — verification only.)

---

## Task 5: Playwright dark sweep + AA contrast + library Rule-8 review

**Files:** none (verification + any fixes that fall out — those get their own commits).

This is the core empirical verification. Run via the Workflow tool (controller-driven), not a code subagent. Rule 7 (mockup review) does NOT apply — no files under `packages/playground/src/pages/mockups/**` changed. Rule 8 (library review) DOES apply — Task 1 + Task 2 touched `packages/design-system/**`.

- [ ] **Step 1: Ensure the dev server is up**

Run: `make dev` (if not already running). Playwright targets http://localhost:8080.

- [ ] **Step 2: Force dark theme via localStorage, then sweep every component demo**

Using Playwright: navigate to the app, `localStorage.setItem('eocrm-playground-theme','dark')`, reload, and confirm `document.documentElement.dataset.theme === 'dark'`. Then visit **every** `/components/*` route (the full list is in `AppShell.tsx`'s `componentGroups` + `componentOverview` + `tokensReference` + `architectureReference`). For each:

- Screenshot.
- Scan for **light-baked surfaces**: any element rendering a near-white background (`rgb` all channels > ~230) or dark-on-dark / light-on-light text. Use `browser_evaluate` with `getComputedStyle` to spot offenders programmatically where a screenshot is ambiguous.
- Check shadows/overlays read correctly (open a Modal, Drawer, Tooltip, DropdownMenu, Popover, Select listbox in dark — verify the scrim is a dark scrim and the floating surface is a dark elevated panel, Tooltip arrow matches its panel).

- [ ] **Step 3: Sweep the key mockups in dark**

Visit `/mockups/dashboard`, `/mockups/contacts`, `/mockups/login`, `/mockups/custom-fields`, `/mockups/members` in dark. Confirm they read as a coherent dark CRM (no light-baked panels, readable text, the login screen's `eocrm` wordmark text flips — the logo _image_ mark staying blue is expected/acceptable).

- [ ] **Step 4: WCAG-AA contrast spot-checks**

Via `browser_evaluate`, compute contrast ratios for the core dark pairs and assert AA (≥ 4.5:1 for normal text, ≥ 3:1 for large text / UI borders):

- `--color-fg` on `--color-bg`; `--color-fg-muted` on `--color-bg`.
- `--color-accent-fg` on `--color-accent` (button primary).
- each semantic `*-fg` on its `*` fill (danger/success/warning/info).
- each Badge tone `--badge-fg-*` on `--badge-bg-*`.
- `--color-border` visibility against `--color-bg` (≥ 3:1 is ideal; note any that read as too faint).

Record the ratios. Any pair below AA gets its hex nudged in `dark.scss` (the spec authorizes live tuning) — re-run lint/build, re-screenshot, re-commit.

- [ ] **Step 5: Confirm toggle cycle + persistence empirically**

Click the footer theme button 3× and assert `dataset.theme` goes `dark`→(removed for system)→… matching `THEME_ORDER`, and that `localStorage['eocrm-playground-theme']` tracks it. Reload on each forced state and confirm no flash (compare the first painted frame's background to the settled background).

- [ ] **Step 6: Run the library Rule-8 review loop**

Per `packages/design-system/CLAUDE.md` Hard rule 8: gates first (`npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system`), then a fresh-context review agent over `packages/design-system/` (the dark.scss + global.scss + tokens.scss + AGENTS.md changes), briefed on the 10 categories. Fix every Critical + Important, re-run gates, re-review, until `clean enough to stop`.

- [ ] **Step 7: Fix-and-recommit any findings**

For each contrast miss or review finding, edit `dark.scss` (or the relevant file), re-run `make lint && make build`, re-verify in Playwright, and commit with a focused message (e.g. `fix(theme): bump --badge-fg-warning for AA on --badge-bg-warning`).

---

## Task 6: Open the PR

**Files:** none.

- [ ] **Step 1: Push the branch and open the PR**

```bash
git push -u origin feat/dark-theme
gh pr create --repo eocrm/design-system --base main \
  --title "feat: dark theme (data-theme / prefers-color-scheme token layer + playground toggle)" \
  --body "$(cat <<'EOF'
## Summary
- New `src/styles/dark.scss` — a `dark-tokens` SCSS mixin emitted into `:root[data-theme='dark']` and a `prefers-color-scheme: dark` media query, so System / forced-Light / forced-Dark all work and component `var()`-alias tokens flip for free.
- `global.scss` `@use 'dark'` after `tokens`; `tokens.scss` base `:root` gets explicit `color-scheme: light`.
- Literal-hex exceptions (Badge filled tones, inverted Tooltip incl. arrow) overridden inside the same mixin.
- `AGENTS.md` Dark theme section + copy-paste no-flash snippet.
- Playground: 3-state (System/Light/Dark) cycle toggle in the Rail footer (`localStorage`-persisted) + a no-flash `index.html` script.

## Test Plan
- [ ] `make test`, `make build`, `make build-lib`, `make lint`, `npm run format:check` all green
- [ ] Playwright dark sweep across every `/components/*` demo + key mockups — no light-baked surfaces, shadows/overlays/tooltips correct
- [ ] WCAG-AA contrast spot-checks on core dark pairs pass
- [ ] Toggle cycles System→Light→Dark, persists across reload, no flash
- [ ] Library Rule-8 review loop clean

## Out of scope (fast-follow)
- 30-color categorical `--color-palette-*` dark variants
- Avatar / BrandIcon recoloring (theme-independent by design)
EOF
)"
```

- [ ] **Step 2: Watch the required check and merge**

```bash
PR=$(gh pr view --repo eocrm/design-system --json number -q .number)
gh pr checks "$PR" --repo eocrm/design-system --watch
```

Expected: `Quality / check` passes. If the branch goes BEHIND (another PR merged first), run `gh pr update-branch --repo eocrm/design-system "$PR"` and re-watch. Then merge:

```bash
gh pr merge "$PR" --repo eocrm/design-system --squash --delete-branch
```

- [ ] **Step 3: Confirm the auto-release published**

The `Release` workflow auto-runs on merge to `main` touching `packages/**` (patch-bump from the newest `v*` tag). Poll it:

```bash
MERGE_SHA=$(gh pr view "$PR" --repo eocrm/design-system --json mergeCommit -q .mergeCommit.oid)
gh run list --repo eocrm/design-system --workflow=Release --commit "$MERGE_SHA"
# then: gh run watch <run-id> --repo eocrm/design-system
```

Expected: the Release run's `publish` job is `success`. Capture the new version: `git fetch --tags --force && git describe --tags --abbrev=0`.

- [ ] **Step 4: Realign local main**

```bash
git checkout main && git fetch origin && git reset --hard origin/main
```

---

## Self-Review (completed by plan author)

**1. Spec coverage:**

- Mechanism (mixin → `:root[data-theme='dark']` + media query + `[data-theme='light']`, `color-scheme`, `global.scss` `@use`, `tokens.scss` `color-scheme: light`) → Task 1. ✅
- Every concrete dark token value (surfaces, text, accent, semantic, rings, overlays, shadows, Badge tones, Tooltip) → Task 1 Step 1, verbatim from the spec. ✅ Plus `--tooltip-arrow-bg` (required for arrow/panel match — a correctness addition the spec's prose implies via "elevated dark surface").
- Library docs (attribute contract, `color-scheme` auto, what-flips vs consumer-job, no-flash snippet) → Task 2. ✅
- Playground toggle (`AppShell` state from `localStorage` default `'system'`, SSR guard, persistence effect, apply via `dataset.theme`, Rail.Footer cycle button with `Monitor`/`Sun`/`Moon`, no-flash `index.html` script) → Task 3. ✅
- Verification (gates + Playwright dark sweep across all demos + key mockups + AA contrast + cycle/persistence/no-flash + Rule-8) → Tasks 4–5. ✅
- Delivery via PR → auto-release → realign → Task 6. ✅
- Non-goals (palette fast-follow, no library toggle/context, logo/BrandIcon untouched) → respected; called out in "Notes" + PR body + AGENTS "Out of scope". ✅

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows full content. The only literal `TODO` strings are inside quoted file content where intended (none here). ✅

**3. Type/name consistency:** `Theme`, `THEME_KEY` (`'eocrm-playground-theme'`), `THEME_ORDER`, `THEME_META`, `ThemeIcon`, `cycleTheme`, `setTheme`/`theme` are used identically across Task 3 steps and the no-flash script + apply-effect all reference the same `'eocrm-playground-theme'` key. The mixin name `dark-tokens` matches between definition and both `@include` sites. ✅
