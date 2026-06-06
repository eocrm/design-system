# AppProvider Token Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a consuming app rebrand `@eocrm/design-system` by passing CSS design-token overrides (`tokens` + optional `darkTokens`) to `<AppProvider>`, applied via a declarative global `<style>` that layers correctly with the dark theme and reaches portaled overlays.

**Architecture:** A pure builder (`src/app/themeTokens.ts`) serializes the override maps into CSS whose scopes mirror `dark.scss` (`:root`, `:root[data-theme='dark']`, `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }`), so `tokens` apply in both themes and `darkTokens` refine dark. `AppProvider` memoizes the builder output and renders `<style>{css}</style>` (only when non-empty) — global injection so portaled `Modal`/`Tooltip`/`Toast` are themed; no imperative DOM mutation.

**Tech Stack:** React 18 + TypeScript, CSS custom properties, Vitest (globals on), the existing `dark.scss` token layer.

**Spec:** `docs/superpowers/specs/2026-06-06-appprovider-token-overrides-design.md`

**Branch:** `feat/appprovider-token-overrides` (already checked out; spec commit `5d8d5b6` is on it).

---

## Notes for the implementer (read first)

- **Not a new component.** AppProvider lives in `src/app/` (not `src/components/`), so the "Core invariant" (demo page, manifest, 4-file component structure, `structure.test.ts`) does NOT apply. Do **not** add a demo page or manifest entry. `structure.test.ts` only scans `components/**`, so a new `src/app/themeTokens.ts` is fine.
- **Vitest globals are on** — tests do NOT import `describe`/`it`/`expect`/`vi`. RTL auto-cleans the DOM between tests.
- **Dev-warning convention** (from `components/Tabs/Tabs.tsx`): `const IS_DEV = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';` then `if (IS_DEV) console.warn('[Prefix] …')`. The builder uses exactly this.
- **`<style>` text is safe to render as a child:** React renders `{cssString}` inside `<style>` verbatim (CSS contains no `<`/`>`/`&` — selectors don't, and values with `{ } < >` are sanitized out). No `dangerouslySetInnerHTML` needed.
- **Commit after each task.** This goes through a PR (root CLAUDE.md) — do not push to `main`. Push once, after Task 4, via the PR.
- This is a library change → run the **Hard rule 8** review loop (Task 4) before the PR.

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `packages/design-system/src/app/themeTokens.ts` | **Create** | `TokenMap` type + pure `buildThemeTokenCss(tokens?, darkTokens?): string \| null` (+ internal sanitize). The whole serialization/precedence logic, unit-testable in isolation. |
| `packages/design-system/src/app/themeTokens.test.ts` | **Create** | Unit tests for the builder (exact CSS, ordering, null cases, key/value rejection). |
| `packages/design-system/src/app/AppProvider.tsx` | Modify | Add `tokens?`/`darkTokens?` props (+ JSDoc), `useMemo` the builder, render `<style data-eocrm-tokens>` when non-null. |
| `packages/design-system/src/app/AppProvider.test.tsx` | Modify | Add cases: renders `<style>` with light+dark scopes when given maps; renders none when omitted. |
| `packages/design-system/src/app/index.ts` | Modify | Re-export `type TokenMap`. |
| `packages/design-system/src/index.ts` | Modify | Re-export `type TokenMap` alongside `AppProviderProps`. |
| `packages/design-system/AGENTS.md` | Modify | Setup section: `tokens`/`darkTokens` example + bullets. Dark theme section: soften the "no DOM side-effects" line + cross-link. |

---

## Task 1: Pure builder `themeTokens.ts` (TDD)

**Files:**
- Create: `packages/design-system/src/app/themeTokens.ts`
- Create: `packages/design-system/src/app/themeTokens.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/design-system/src/app/themeTokens.test.ts`:

```tsx
import { buildThemeTokenCss } from './themeTokens';

describe('buildThemeTokenCss', () => {
  it('returns null when there is nothing to emit', () => {
    expect(buildThemeTokenCss()).toBeNull();
    expect(buildThemeTokenCss({}, {})).toBeNull();
    expect(buildThemeTokenCss(undefined, undefined)).toBeNull();
  });

  it('emits light + dark scopes for a base tokens map (applies to both themes)', () => {
    const css = buildThemeTokenCss({ '--color-accent': '#7c3aed' })!;
    expect(css).toContain(':root {\n  --color-accent: #7c3aed;\n}');
    expect(css).toContain(":root[data-theme='dark'] {\n  --color-accent: #7c3aed;\n}");
    expect(css).toContain('@media (prefers-color-scheme: dark) {');
    expect(css).toContain("  :root:not([data-theme='light']) {\n    --color-accent: #7c3aed;\n  }");
  });

  it('layers darkTokens AFTER tokens within the dark scopes (override wins)', () => {
    const css = buildThemeTokenCss(
      { '--color-accent': '#7c3aed' },
      { '--color-accent': '#a78bfa' },
    )!;
    const darkBlock = css.slice(css.indexOf("[data-theme='dark']"));
    const base = darkBlock.indexOf('#7c3aed');
    const override = darkBlock.indexOf('#a78bfa');
    expect(base).toBeGreaterThan(-1);
    expect(override).toBeGreaterThan(base);
  });

  it('omits the plain :root block when only darkTokens is given', () => {
    const css = buildThemeTokenCss(undefined, { '--color-accent': '#a78bfa' })!;
    expect(css.startsWith(':root {')).toBe(false);
    expect(css).toContain("[data-theme='dark']");
    expect(css).toContain('--color-accent: #a78bfa;');
  });

  it('drops entries whose key is not a valid custom property (no -- prefix / bad chars)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const css = buildThemeTokenCss({ 'color-accent': '#7c3aed', '--bad name': 'red', '--ok': 'blue' } as never);
    expect(css).toContain('--ok: blue;');
    expect(css).not.toContain('color-accent: #7c3aed');
    expect(css).not.toContain('--bad name');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('drops values containing CSS/HTML breakout characters ({ } < >)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const css = buildThemeTokenCss({ '--x': 'red} body{display:none', '--y': 'blue' } as never);
    expect(css).not.toContain('display:none');
    expect(css).toContain('--y: blue;');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('preserves complex valid values verbatim (rgb-alpha, font stack, shadow, calc)', () => {
    const css = buildThemeTokenCss({
      '--ring-accent': 'rgb(87 157 255 / 65%)',
      '--font-family-sans': "'Inter', system-ui, sans-serif",
      '--shadow-sm': '0 1px 2px rgb(0 0 0 / 40%)',
      '--measure-md': 'calc(100% - 8px)',
    })!;
    expect(css).toContain('--ring-accent: rgb(87 157 255 / 65%);');
    expect(css).toContain("--font-family-sans: 'Inter', system-ui, sans-serif;");
    expect(css).toContain('--shadow-sm: 0 1px 2px rgb(0 0 0 / 40%);');
    expect(css).toContain('--measure-md: calc(100% - 8px);');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/themeTokens.test.ts` (from `packages/design-system`)
Expected: FAIL — `buildThemeTokenCss` is not defined (module doesn't exist yet).

- [ ] **Step 3: Implement the builder**

Create `packages/design-system/src/app/themeTokens.ts`:

```ts
/**
 * A flat map of CSS design-token overrides: custom-property name → value.
 * Keys must start with `--` (e.g. `--color-accent`, `--radius-md`,
 * `--font-family-sans`). Consumed by `<AppProvider tokens>` / `darkTokens`.
 */
export type TokenMap = Partial<Record<`--${string}`, string>>;

// Read NODE_ENV defensively so the library never throws at module init
// (mirrors components/Tabs/Tabs.tsx).
const IS_DEV = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

// A valid CSS custom-property name: `--` followed by word chars / dashes.
const KEY_RE = /^--[\w-]+$/;
// Characters that could break out of a CSS declaration or the <style> element.
const UNSAFE_VALUE_RE = /[{}<>]/;

function warn(message: string): void {
  if (IS_DEV) console.warn(`[AppProvider] ${message}`);
}

/**
 * Keep only entries whose key is a valid custom-property name and whose value
 * cannot break out of a CSS declaration / the <style> element. Rejected
 * entries are dropped with a dev warning (the consumer is trusted — this is
 * defensive, not a security boundary). Preserves the map's own key order.
 */
function sanitizeEntries(map: TokenMap | undefined): Array<[string, string]> {
  if (!map) return [];
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(map)) {
    if (value == null) continue;
    if (!KEY_RE.test(key)) {
      warn(`ignoring override with invalid key ${JSON.stringify(key)} (must match --name)`);
      continue;
    }
    if (UNSAFE_VALUE_RE.test(value)) {
      warn(`ignoring override ${key}: value contains an unsafe character ({ } < >)`);
      continue;
    }
    out.push([key, value]);
  }
  return out;
}

function declarations(entries: Array<[string, string]>, indent: string): string {
  return entries.map(([key, value]) => `${indent}${key}: ${value};`).join('\n');
}

/**
 * Build the CSS for consumer token overrides, mirroring `dark.scss`'s scopes so
 * the cascade resolves correctly:
 * - `tokens` → `:root {}` (wins in light by source order) AND re-emitted into
 *   the dark scopes so a single map applies in both themes.
 * - `darkTokens` → layered AFTER `tokens` inside the dark scopes only.
 *
 * Returns `null` when there is nothing to emit, so `<AppProvider>` renders no
 * `<style>` for the no-override case (preserving its zero-side-effect default).
 */
export function buildThemeTokenCss(tokens?: TokenMap, darkTokens?: TokenMap): string | null {
  const base = sanitizeEntries(tokens);
  const dark = sanitizeEntries(darkTokens);
  if (base.length === 0 && dark.length === 0) return null;

  const blocks: string[] = [];

  if (base.length > 0) {
    blocks.push(`:root {\n${declarations(base, '  ')}\n}`);
  }

  // tokens re-emitted into dark so a single map applies in dark too; darkTokens
  // layered after so they win.
  const darkScope = [...base, ...dark];
  if (darkScope.length > 0) {
    blocks.push(`:root[data-theme='dark'] {\n${declarations(darkScope, '  ')}\n}`);
    blocks.push(
      `@media (prefers-color-scheme: dark) {\n` +
        `  :root:not([data-theme='light']) {\n` +
        `${declarations(darkScope, '    ')}\n` +
        `  }\n}`,
    );
  }

  return blocks.join('\n');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/themeTokens.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/app/themeTokens.ts packages/design-system/src/app/themeTokens.test.ts
git commit -m "feat(AppProvider): pure buildThemeTokenCss token-override builder"
```

---

## Task 2: Wire `tokens`/`darkTokens` into AppProvider + exports (TDD)

**Files:**
- Modify: `packages/design-system/src/app/AppProvider.tsx`
- Modify: `packages/design-system/src/app/AppProvider.test.tsx`
- Modify: `packages/design-system/src/app/index.ts`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Write the failing tests**

In `packages/design-system/src/app/AppProvider.test.tsx`, add these two tests inside the `describe('AppProvider', () => { … })` block (e.g. after the `toast config` test, before the closing `});`):

```tsx
  it('renders a <style> with token overrides across light + dark scopes', () => {
    const { container } = render(
      <AppProvider
        locale="en"
        tokens={{ '--color-accent': '#7c3aed' }}
        darkTokens={{ '--color-accent': '#a78bfa' }}
      >
        <span />
      </AppProvider>,
    );
    const style = container.querySelector('style[data-eocrm-tokens]');
    expect(style).not.toBeNull();
    const css = style?.textContent ?? '';
    expect(css).toContain(':root {');
    expect(css).toContain('--color-accent: #7c3aed;');
    expect(css).toContain("[data-theme='dark']");
    expect(css).toContain('--color-accent: #a78bfa;');
    expect(css).toContain('prefers-color-scheme: dark');
  });

  it('renders no <style> when no token overrides are given', () => {
    const { container } = render(
      <AppProvider locale="en">
        <span />
      </AppProvider>,
    );
    expect(container.querySelector('style[data-eocrm-tokens]')).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/AppProvider.test.tsx`
Expected: FAIL — `tokens`/`darkTokens` props don't exist yet, so no `<style data-eocrm-tokens>` is rendered (the first new test fails; the rest still pass).

- [ ] **Step 3: Implement — props, builder call, `<style>` render**

In `packages/design-system/src/app/AppProvider.tsx`:

(a) Update the imports at the top — add `useMemo` and the builder/type:

```tsx
import { type ReactNode, useMemo } from 'react';
import {
  LocaleProvider,
  I18nProvider,
  type DeepPartial,
  type Locale,
  type Messages,
} from '../i18n';
import { ToastViewport, type ToastViewportProps } from '../components/Toast';
import { buildThemeTokenCss, type TokenMap } from './themeTokens';
```

(b) Add the two props to `AppProviderProps` (place them after `toast?` and before `children`):

```tsx
  /**
   * CSS design-token overrides applied in BOTH light and dark — a flat map of
   * token name → value (`{ '--color-accent': '#7c3aed', '--radius-md': '6px' }`).
   * Rebrands the design system globally (reaches portaled Modal/Tooltip/Toast).
   * Emitted as a declarative `<style>`; layers over the dark theme correctly.
   * **Memoize this object** — a fresh literal each render rebuilds the CSS.
   */
  tokens?: TokenMap;
  /**
   * Token overrides applied ONLY in dark (forced `data-theme="dark"` and system
   * `prefers-color-scheme: dark`), merged over `tokens` — use it to tune a token
   * for dark surfaces (e.g. a lighter accent). **Memoize this object.**
   */
  darkTokens?: TokenMap;
```

(c) Update the function signature + body:

```tsx
export function AppProvider({
  locale,
  intlLocale,
  translations,
  toast,
  tokens,
  darkTokens,
  children,
}: AppProviderProps) {
  const tokenCss = useMemo(() => buildThemeTokenCss(tokens, darkTokens), [tokens, darkTokens]);
  return (
    <LocaleProvider locale={intlLocale ?? locale}>
      <I18nProvider locale={locale} overrides={translations}>
        {tokenCss && <style data-eocrm-tokens>{tokenCss}</style>}
        {children}
        {toast !== false && <ToastViewport {...(toast ?? {})} />}
      </I18nProvider>
    </LocaleProvider>
  );
}
```

(d) Add a JSDoc `@example` to the `AppProvider` function doc block (insert after the existing Russian-UI `@example`, before the `@remarks When NOT to use`):

```tsx
 * @example
 * // Rebrand: purple accent everywhere, lighter in dark, larger radius.
 * const tokens = useMemo(() => ({ '--color-accent': '#7c3aed', '--radius-md': '6px' }), []);
 * const darkTokens = useMemo(() => ({ '--color-accent': '#a78bfa' }), []);
 * <AppProvider locale="en" tokens={tokens} darkTokens={darkTokens}>
 *   <App />
 * </AppProvider>;
 *
```

- [ ] **Step 4: Export `TokenMap` from the barrels**

In `packages/design-system/src/app/index.ts`, add the type re-export:

```ts
export { AppProvider } from './AppProvider';
export type { AppProviderProps } from './AppProvider';
export type { TokenMap } from './themeTokens';
```

In `packages/design-system/src/index.ts`, extend the existing AppProvider export line. Change:

```ts
export type { AppProviderProps } from './app';
```

to:

```ts
export type { AppProviderProps, TokenMap } from './app';
```

- [ ] **Step 5: Run the AppProvider tests to verify they pass**

Run: `npx vitest run src/app/AppProvider.test.tsx`
Expected: PASS (all original tests + the 2 new ones).

- [ ] **Step 6: Typecheck the library**

Run: `make build-lib` (from repo root)
Expected: PASS — the new props, the `TokenMap` re-export, and the `useMemo` typecheck cleanly.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/app/AppProvider.tsx \
        packages/design-system/src/app/AppProvider.test.tsx \
        packages/design-system/src/app/index.ts \
        packages/design-system/src/index.ts
git commit -m "feat(AppProvider): tokens/darkTokens props emit a declarative <style>; export TokenMap"
```

---

## Task 3: Docs — AGENTS.md Setup + Dark theme

**Files:**
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Extend the Setup section with the token-override example**

In `packages/design-system/AGENTS.md`, find the bullet list describing `<AppProvider>` props in the "Setup (once per consuming app)" section. It currently ends with the `toast?` bullet:

```markdown
- `toast?` — `<ToastViewport>` config, or `false` to mount it yourself. Omitted ⇒ mounted with defaults.
```

Immediately after that bullet, add two bullets:

```markdown
- `tokens?` — CSS design-token overrides (a flat `{ '--color-accent': '#7c3aed', '--radius-md': '6px' }` map) applied in **both** themes. Rebrands the system globally — including portaled `Modal`/`Tooltip`/`Toast`. Memoize it.
- `darkTokens?` — token overrides applied **only** in dark (forced + system), merged over `tokens` (e.g. a lighter accent on dark surfaces). Memoize it.
```

Then, after the paragraph that begins "It composes `LocaleProvider` + `I18nProvider` …" (the one ending "different locale."), add this example block:

```markdown
**Rebranding via tokens:**

```tsx
const tokens = useMemo(() => ({ '--color-accent': '#7c3aed', '--radius-md': '6px' }), []);
const darkTokens = useMemo(() => ({ '--color-accent': '#a78bfa' }), []);

<AppProvider locale="en" tokens={tokens} darkTokens={darkTokens}>
  <App />
</AppProvider>;
```

`tokens` apply in light **and** dark; `darkTokens` refine the dark scope only. They're emitted as a single declarative `<style>` that layers over the [dark theme](#dark-theme) correctly. Any design token can be overridden — see `src/styles/tokens.scss` for the full set.
```

- [ ] **Step 2: Soften the "no DOM side-effects" line in the Dark theme section**

In `packages/design-system/AGENTS.md`, in the "Dark theme" section's "Your responsibility" list, find the first bullet:

```markdown
- **Set the attribute.** The library reads it; it never writes it (no DOM side-effects — see `<AppProvider>`). Persist the user's choice (e.g. `localStorage`) and apply it: `'light'`/`'dark'` → `document.documentElement.dataset.theme = choice`; `'system'` → remove the attribute.
```

Replace it with:

```markdown
- **Set the attribute.** The library reads it; it never writes it (it performs no _imperative_ DOM mutation — the one thing `<AppProvider>` injects is a declarative `<style>` for `tokens` overrides, see [Setup](#setup-once-per-consuming-app)). Persist the user's choice (e.g. `localStorage`) and apply it: `'light'`/`'dark'` → `document.documentElement.dataset.theme = choice`; `'system'` → remove the attribute.
```

- [ ] **Step 3: Verify formatting**

Run: `npm run format` then `npm run format:check` (from repo root)
Expected: PASS — `All matched files use Prettier code style!`

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "docs(AppProvider): document tokens/darkTokens overrides + dark-theme cross-link"
```

---

## Task 4: Verification — gates, throwaway Playwright, Rule-8

**Files:** none (verification + any fixes get their own commits).

- [ ] **Step 1: Run all gates**

From repo root:
- `make test` → expect PASS (all suites incl. the new builder + AppProvider tests).
- `make build` → expect PASS (typecheck + bundle).
- `make build-lib` → expect PASS.
- `make lint` → expect PASS.
- `npm run format:check` → expect PASS.
- `npm pack --dry-run -w @eocrm/design-system` → expect `src/app/themeTokens.ts` present, NO `*.test.*` files in the tarball.

- [ ] **Step 2: Throwaway Playwright check — does a real override flip the accent in both themes + inside a portal?**

The dev server runs at http://localhost:8080 (start with `make dev` if needed). Temporarily wrap the playground root so the override is live:

In `packages/playground/src/main.tsx`, wrap `<App />` (the wrap is reverted in Step 4):

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@eocrm/design-system/styles/global.scss';
import './playground.css';
import { AppProvider } from '@eocrm/design-system';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider
      locale="en"
      tokens={{ '--color-accent': '#7c3aed' }}
      darkTokens={{ '--color-accent': '#a78bfa' }}
      toast={false}
    >
      <App />
    </AppProvider>
  </StrictMode>,
);
```

(Note `toast={false}` — the playground may already mount toasts; avoid a duplicate viewport during the check.)

Then via Playwright:
- Navigate to a page with accent-colored UI (e.g. `/mockups/dashboard` — "Add contact" primary button, links).
- In **light** (`localStorage['eocrm-playground-theme']='light'`, reload): assert `getComputedStyle(documentElement).getPropertyValue('--color-accent').trim()` === `#7c3aed`, and a primary button's `background-color` ≈ `rgb(124, 58, 237)`.
- In **dark** (`='dark'`, reload): assert `--color-accent` === `#a78bfa`.
- **Portal check:** open a Select or DropdownMenu (e.g. `/components/select`, open the listbox) and confirm the focused/selected accent inside the portaled listbox uses the override (read a portaled element's computed color), proving the global `<style>` reaches `document.body` content.

Expected: all assertions hold.

- [ ] **Step 3: Confirm the no-override path is untouched** (sanity)

Still in Playwright (or by reasoning): the wrapped value is the override; the point of Step 2 is it works. The unit test `renders no <style> when no token overrides are given` already proves the omitted-prop path stays side-effect-free — no extra browser check needed.

- [ ] **Step 4: REVERT the throwaway playground wrap**

```bash
git checkout -- packages/playground/src/main.tsx
git status --short   # must show packages/playground/src/main.tsx is clean
```

Expected: `main.tsx` back to its committed state — no playground change ships in this PR.

- [ ] **Step 5: Library Rule-8 review loop**

Per `packages/design-system/CLAUDE.md` Hard rule 8: gates first (`npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system`), then a fresh-context review agent over the design-system changes (`themeTokens.ts`, `AppProvider.tsx`, the barrels, `AGENTS.md`), briefed on the 10 categories. Fix every Critical + Important, re-run gates, re-review, until `clean enough to stop`.

- [ ] **Step 6: Fix-and-recommit any findings** (focused commits, re-run gates after each).

---

## Task 5: Open the PR

**Files:** none.

- [ ] **Step 1: Push + open the PR**

```bash
git push -u origin feat/appprovider-token-overrides
gh pr create --repo eocrm/design-system --base main \
  --title "feat: AppProvider tokens/darkTokens — consumer CSS token overrides" \
  --body "$(cat <<'EOF'
## Summary
- `<AppProvider>` gains `tokens` (applies to both themes) and `darkTokens` (refines dark) — flat `TokenMap` (`Partial<Record<\`--${string}\`, string>>`) of any design token.
- Pure `buildThemeTokenCss` builder serializes them into CSS whose scopes mirror `dark.scss` (`:root`, `:root[data-theme='dark']`, `prefers-color-scheme`), so `tokens` apply in both themes, `darkTokens` win in dark, and precedence is correct.
- Rendered as a declarative `<style data-eocrm-tokens>` — global (reaches portaled Modal/Tooltip/Toast), no imperative DOM mutation, omitted entirely when no overrides are given.
- `TokenMap` exported; AGENTS.md Setup + Dark theme docs updated.

## Test Plan
- [ ] `make test` (builder unit tests + AppProvider integration), `make build`, `make build-lib`, `make lint`, `npm run format:check`, `npm pack --dry-run`
- [ ] Playwright: override flips `--color-accent` in light (#7c3aed) and dark (#a78bfa), incl. inside a portaled overlay
- [ ] Library Rule-8 review clean

## Notes
- Softens the "no DOM side-effects" stance to "no *imperative* DOM mutation" — the override is a declarative `<style>`.
- No new component/demo/manifest (AppProvider is a root provider). No permanent playground change.
EOF
)"
```

- [ ] **Step 2: Watch the required check, then merge**

```bash
PR=$(gh pr view --repo eocrm/design-system --json number -q .number)
gh pr checks "$PR" --repo eocrm/design-system --watch
```
Expected: `Quality / check` passes. If BEHIND, `gh pr update-branch --repo eocrm/design-system "$PR"` then re-watch. Merge:

```bash
gh pr merge "$PR" --repo eocrm/design-system --squash --delete-branch
```

- [ ] **Step 3: Confirm the auto-release**

```bash
MERGE_SHA=$(gh pr view "$PR" --repo eocrm/design-system --json mergeCommit -q .mergeCommit.oid)
gh run list --repo eocrm/design-system --workflow=Release --commit "$MERGE_SHA"
# gh run watch <id> --repo eocrm/design-system --exit-status
```
Expected: the Release run's `publish` job is `success`. Capture the version: `git fetch --tags --force && git describe --tags --abbrev=0`.

- [ ] **Step 4: Realign local main**

```bash
git checkout main && git fetch origin && git reset --hard origin/main
```

---

## Self-Review (completed by plan author)

**1. Spec coverage:**
- API (`tokens` both themes + optional `darkTokens`, flat `TokenMap`) → Task 2 (props) + Task 1 (`TokenMap`). ✅
- Mechanism (declarative `<style>` mirroring dark.scss's three scopes; tokens re-emitted into dark; darkTokens layered after; null when empty) → Task 1 builder + Task 2 render. ✅
- Isolation (pure `buildThemeTokenCss` returning `string|null`) + safety (`^--[\w-]+$` keys, reject `{ } < >` values, dev-warn) → Task 1. ✅
- `useMemo` + memoize guidance → Task 2 (c) + JSDoc. ✅
- Tests (builder exact CSS/ordering/null/rejection; AppProvider renders/omits `<style>`) → Task 1 Step 1 + Task 2 Step 1. ✅
- Docs (Setup example + props, Dark theme soften + cross-link, export TokenMap) → Task 3 + Task 2 Step 4. ✅
- Verification (gates + throwaway Playwright incl. portal + revert + Rule-8) → Task 4. ✅
- Delivery (PR → auto-release → realign) → Task 5. ✅
- Non-goals respected (no curated object, no permanent playground demo, no per-subtree/JS context, no imperative documentElement) — none introduced. ✅

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows full content; literal `display:none` strings are inside test fixtures by design. ✅

**3. Type/name consistency:** `TokenMap`, `buildThemeTokenCss(tokens?, darkTokens?)`, `sanitizeEntries`, `declarations`, `tokens`/`darkTokens` props, `data-eocrm-tokens` attribute, and `IS_DEV` are used identically across Tasks 1–4 and the tests. The builder signature in Task 1 matches the call in Task 2 (c). ✅
