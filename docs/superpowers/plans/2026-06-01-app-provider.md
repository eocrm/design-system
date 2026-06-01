# `<AppProvider>` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<AppProvider>` — a single root component that composes the design-system's app-level contexts (`LocaleProvider` + `I18nProvider` + an auto-mounted `<ToastViewport>`), parameterized by `locale` / `intlLocale` / `translations` / `toast` props — and dogfood it via the playground root.

**Architecture:** A pure provider composition in `src/app/` (provider infra, like `src/i18n/` — not a gallery component, so no `.module.scss`, no manifest cluster, no `structure.test` 4-file set). `LocaleProvider` (outermost, gets `intlLocale ?? locale`) → `I18nProvider` (`locale` + `translations` overrides) → `children` + `<ToastViewport>` (inside the providers, after children; skipped when `toast === false`).

**Tech Stack:** React 18 + TypeScript, Vitest + React Testing Library (globals on; jsdom), npm workspaces.

**Branch:** `feat/app-provider` (already created off `main`; the spec doc is committed there).

---

## Conventions every task follows

- **Library gates** (Task 1, from `packages/design-system/`): `npm test && npm run typecheck && npm run lint:css && npm run build`. TDD single-file run: `npx vitest run src/app/AppProvider.test.tsx`.
- **Playground gates** (Task 2, from repo root): `make build && make lint`.
- No `forwardRef` / no `{...rest}` — `AppProvider` is a provider composition, not a DOM element (consistent with `I18nProvider`/`LocaleProvider`). Full JSDoc on the component + every prop (Rule 7).
- No i18n strings of its own (props-driven; all copy is consumer-supplied).
- Commit messages end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## File structure

- `packages/design-system/src/app/AppProvider.tsx` — the component + props + JSDoc.
- `packages/design-system/src/app/index.ts` — barrel: `export { AppProvider }` + `export type { AppProviderProps }`.
- `packages/design-system/src/app/AppProvider.test.tsx` — unit tests (context probes + toast).
- `packages/design-system/src/index.ts` — MODIFY: re-export.
- `packages/design-system/AGENTS.md` — MODIFY: "Setup" section.
- `packages/playground/src/App.tsx` — MODIFY (dogfood).

---

## Task 1: `<AppProvider>` (component + tests + exports + AGENTS Setup)

**Files:**

- Create: `packages/design-system/src/app/AppProvider.tsx`
- Create: `packages/design-system/src/app/index.ts`
- Create: `packages/design-system/src/app/AppProvider.test.tsx`
- Modify: `packages/design-system/src/index.ts` (after the i18n export block, ~line 431)
- Modify: `packages/design-system/AGENTS.md` ("## Setup (once per consuming app)", ~lines 19–28)

- [ ] **Step 1: Write the failing test** — `packages/design-system/src/app/AppProvider.test.tsx`

```tsx
import { render, screen, act } from '@testing-library/react';
import { AppProvider } from './AppProvider';
import { useLocale } from '../i18n/useLocale';
import { useTranslation } from '../i18n/useTranslation';
import { toast, _setViewportConfig } from '../components/Toast/api';
import { store } from '../components/Toast/store';

function LocaleProbe() {
  return <span data-testid="locale">{useLocale()}</span>;
}
function AlertDismiss() {
  const t = useTranslation();
  return <span data-testid="alert-dismiss">{t('alert.dismiss')}</span>;
}
function ToastDismiss() {
  const t = useTranslation();
  return <span data-testid="toast-dismiss">{t('toast.dismiss')}</span>;
}
function ToastNotifications() {
  const t = useTranslation();
  return <span data-testid="toast-notifications">{t('toast.notifications')}</span>;
}

describe('AppProvider', () => {
  // Mirror Toast.test.tsx hygiene: clear the global toast store + reset the
  // viewport config baseline, and use fake timers so the 4s auto-dismiss
  // timer a toast schedules doesn't leak across tests.
  beforeEach(() => {
    store._reset();
    _setViewportConfig({ position: 'bottom-right', duration: 4000 });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    store._reset();
  });

  it('renders children', () => {
    render(
      <AppProvider locale="en">
        <span data-testid="child">hi</span>
      </AppProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('hi');
  });

  it('useLocale() returns intlLocale when provided', () => {
    render(
      <AppProvider locale="en" intlLocale="en-US">
        <LocaleProbe />
      </AppProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('en-US');
  });

  it('useLocale() falls back to locale when intlLocale is omitted', () => {
    render(
      <AppProvider locale="ru">
        <LocaleProbe />
      </AppProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('ru');
  });

  it('useTranslation() reflects locale (en vs ru)', () => {
    const { rerender } = render(
      <AppProvider locale="en">
        <AlertDismiss />
      </AppProvider>,
    );
    expect(screen.getByTestId('alert-dismiss')).toHaveTextContent('Dismiss');
    rerender(
      <AppProvider locale="ru">
        <AlertDismiss />
      </AppProvider>,
    );
    expect(screen.getByTestId('alert-dismiss')).toHaveTextContent('Закрыть');
  });

  it('translations overrides deep-merge over built-in messages', () => {
    render(
      <AppProvider locale="en" translations={{ toast: { dismiss: 'Hide' } }}>
        <ToastDismiss />
        <ToastNotifications />
      </AppProvider>,
    );
    // overridden key wins…
    expect(screen.getByTestId('toast-dismiss')).toHaveTextContent('Hide');
    // …and the sibling key in the SAME section keeps its built-in default
    // (proves deep-merge, not whole-bundle replace).
    expect(screen.getByTestId('toast-notifications')).toHaveTextContent('Notifications');
  });

  it('auto-mounts the toast viewport (toasts render)', () => {
    render(
      <AppProvider locale="en">
        <span />
      </AppProvider>,
    );
    act(() => {
      toast('Saved successfully');
    });
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('toast={false} mounts no viewport', () => {
    render(
      <AppProvider locale="en" toast={false}>
        <span />
      </AppProvider>,
    );
    act(() => {
      toast('Should not appear');
    });
    expect(screen.queryByText('Should not appear')).toBeNull();
  });

  it('toast config (position) is forwarded to the viewport', () => {
    render(
      <AppProvider locale="en" toast={{ position: 'top-right' }}>
        <span />
      </AppProvider>,
    );
    act(() => {
      toast('Positioned toast');
    });
    const ol = screen.getByText('Positioned toast').closest('ol');
    expect(ol).toHaveAttribute('data-position', 'top-right');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/app/AppProvider.test.tsx`
Expected: FAIL — `Failed to resolve import './AppProvider'`.

- [ ] **Step 3: Create the component** — `packages/design-system/src/app/AppProvider.tsx`

```tsx
import { type ReactNode } from 'react';
import {
  LocaleProvider,
  I18nProvider,
  type DeepPartial,
  type Locale,
  type Messages,
} from '../i18n';
import { ToastViewport, type ToastViewportProps } from '../components/Toast';

export interface AppProviderProps {
  /**
   * UI-string locale — selects the built-in message bundle. v1 ships `'en'`
   * and `'ru'`. Drives every design-system component's copy via `useTranslation`.
   */
  locale: Locale;
  /**
   * BCP-47 locale for Intl-facing formatting (Calendar, dates, numbers), read
   * by components via `useLocale`. Optional — defaults to `locale` verbatim
   * (`'en'` / `'ru'` are valid language tags). Set it for a region, e.g.
   * `'en-US'` / `'ru-RU'` / `'en-GB'`.
   */
  intlLocale?: string;
  /**
   * Deep-partial overrides deep-merged over the built-in messages for `locale`.
   * Supply only the keys you rebrand/retext; the rest fall back to the shipped
   * defaults. Memoize this object — passing a fresh literal every render
   * rebuilds the merged messages each time.
   */
  translations?: DeepPartial<Messages>;
  /**
   * Toast viewport configuration (`position`, `duration`, …), or `false` to
   * NOT mount a viewport (place `<ToastViewport>` yourself). Omitted ⇒ a
   * viewport is mounted with the library defaults.
   */
  toast?: ToastViewportProps | false;
  children: ReactNode;
}

/**
 * Root provider for a consuming app. Wrap your tree once to get the
 * design-system's app-level contexts wired in one place — instead of nesting
 * `LocaleProvider` + `I18nProvider` and remembering to mount `<ToastViewport>`.
 *
 * Composes (outermost → in): `LocaleProvider` (Intl locale = `intlLocale ?? locale`)
 * → `I18nProvider` (`locale` + `translations` overrides) → `children`, plus a
 * `<ToastViewport>` rendered inside the providers (so toast chrome is translated)
 * unless `toast={false}`.
 *
 * Routing is the app's own concern (`AppProvider` ships no router), and the
 * stylesheet import (`@eocrm/design-system/styles/global.scss`) is still
 * required at your entry point.
 *
 * @example
 * import '@eocrm/design-system/styles/global.scss';
 * import { AppProvider } from '@eocrm/design-system';
 *
 * <AppProvider locale="en" intlLocale="en-US">
 *   <YourRouter />
 * </AppProvider>;
 *
 * @example
 * // Russian UI + a couple of rebranded strings + top-right toasts:
 * const translations = useMemo(() => ({ alert: { dismiss: 'Скрыть' } }), []);
 * <AppProvider locale="ru" translations={translations} toast={{ position: 'top-right' }}>
 *   <App />
 * </AppProvider>;
 *
 * @remarks When NOT to use
 * - **Per-subtree locale / i18n override** → nest `LocaleProvider` /
 *   `I18nProvider` directly. `AppProvider` is the single app root; don't nest a
 *   second `AppProvider`.
 * - **A tiny embed / isolated test that only needs strings** → use
 *   `I18nProvider` alone (or pass `toast={false}` here) so you don't get an
 *   unwanted toast viewport.
 */
export function AppProvider({
  locale,
  intlLocale,
  translations,
  toast,
  children,
}: AppProviderProps) {
  return (
    <LocaleProvider locale={intlLocale ?? locale}>
      <I18nProvider locale={locale} overrides={translations}>
        {children}
        {toast !== false && <ToastViewport {...(toast ?? {})} />}
      </I18nProvider>
    </LocaleProvider>
  );
}
```

- [ ] **Step 4: Create the barrel** — `packages/design-system/src/app/index.ts`

```ts
export { AppProvider } from './AppProvider';
export type { AppProviderProps } from './AppProvider';
```

- [ ] **Step 5: Re-export from `src/index.ts`.** Find the i18n export block (around line 425–431, the `// i18n — translated UI strings.` group ending with `export type { I18nProviderProps, Locale, Messages, MessageKey, DeepPartial } from './i18n';`). Immediately after it, add:

```ts
// App root — bundles the locale + i18n + toast contexts for a consuming app.
export { AppProvider } from './app';
export type { AppProviderProps } from './app';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/app/AppProvider.test.tsx`
Expected: PASS (all 8 cases).

- [ ] **Step 7: Update the AGENTS.md Setup section.** Replace the current "## Setup (once per consuming app)" block (the stylesheet-only version, ~lines 19–28, ending with "Everything else flows from it." and the `---`) with:

````markdown
## Setup (once per consuming app)

Two steps at your app root:

```tsx
// 1. Import the stylesheet once (tokens, modern reset, base typography).
import '@eocrm/design-system/styles/global.scss';

// 2. Wrap your tree in <AppProvider>.
import { AppProvider } from '@eocrm/design-system';

<AppProvider locale="en" intlLocale="en-US">
  <App />
</AppProvider>;
```

`<AppProvider>` bundles the app-level contexts so you don't wire them by hand:

- `locale` (`'en' | 'ru'`) — selects the built-in UI-string bundle.
- `intlLocale?` (BCP-47, e.g. `'en-US'`) — locale for Intl formatting (Calendar, dates, numbers). Defaults to `locale`.
- `translations?` — deep-partial overrides merged over the built-in strings (rebrand a few keys; memoize the object).
- `toast?` — `<ToastViewport>` config, or `false` to mount it yourself. Omitted ⇒ mounted with defaults.

It composes `LocaleProvider` + `I18nProvider` and mounts the toast viewport. **Routing is yours** (`<AppProvider>` ships no router), and the stylesheet import above is still required. The individual providers (`LocaleProvider`, `I18nProvider`, `ToastViewport`) remain exported for advanced cases like pinning a subtree to a different locale.

---
````

- [ ] **Step 8: Run the full library gates**

Run: `cd packages/design-system && npm test && npm run typecheck && npm run lint:css && npm run build`
Expected: all green. (`structure.test` does not scan `src/app/`, so no `.module.scss` is required; the manifest does not include `src/app/`.)

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/app packages/design-system/src/index.ts packages/design-system/AGENTS.md
git commit -m "feat: add <AppProvider> root provider

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Dogfood — refactor the playground root onto `<AppProvider>`

**Files:**

- Modify: `packages/playground/src/App.tsx` (import line 84; provider open line 88; toast + closes lines 181–183)

- [ ] **Step 1: Swap the import.** In `packages/playground/src/App.tsx`, change line 84 from:

```tsx
import { I18nProvider, ToastViewport } from '@eocrm/design-system';
```

to:

```tsx
import { AppProvider } from '@eocrm/design-system';
```

- [ ] **Step 2: Replace the provider wrapper.** The current structure is:

```tsx
<I18nProvider locale="en">
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <AppShell>{/* …routes… */}</AppShell>
    <ToastViewport position="bottom-right" />
  </BrowserRouter>
</I18nProvider>
```

Change the opening `<I18nProvider locale="en">` (line 88) to:

```tsx
    <AppProvider locale="en" intlLocale="en-US" toast={{ position: 'bottom-right' }}>
```

Delete the standalone `<ToastViewport position="bottom-right" />` line (line 181) — the viewport is now auto-mounted by `AppProvider`.

Change the closing `</I18nProvider>` (line 183) to:

```tsx
    </AppProvider>
```

The resulting structure:

```tsx
<AppProvider locale="en" intlLocale="en-US" toast={{ position: 'bottom-right' }}>
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <AppShell>{/* …routes… (unchanged) */}</AppShell>
  </BrowserRouter>
</AppProvider>
```

(Net effect: the manual `<ToastViewport>` is gone — `AppProvider` mounts it — and `LocaleProvider` is now in the tree for the first time via `intlLocale="en-US"`, so Calendar/date formatting gets a real locale. Routing stays inside, owned by the app.)

- [ ] **Step 3: Run the playground gates**

Run (from repo root): `make build && make lint`
Expected: green. (Typecheck confirms `AppProvider` resolves from the library and `I18nProvider`/`ToastViewport` are no longer referenced. No unused imports.)

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/App.tsx
git commit -m "refactor(playground): wire root via <AppProvider>

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Final gates + library review-fix loop + finish

- [ ] **Step 1: Repo-wide gates.** From repo root:

```bash
make test && make build && make lint
( cd packages/design-system && npm run typecheck && npm run lint:css && npm pack --dry-run -w @eocrm/design-system )
```

Expected: all green; `npm pack --dry-run` ships `src/app/AppProvider.tsx` + `src/app/index.ts` and does NOT include `src/app/AppProvider.test.tsx`.

- [ ] **Step 2: Library review-fix loop (Hard rule 8).** Spawn a fresh-context `general-purpose` reviewer scoped to the library changes (`src/app/`, `src/index.ts`, `AGENTS.md`). Brief it on the 10 categories (bugs, a11y, API inconsistencies, type safety, Rules 1–7, test coverage, token discipline, SCSS, cross-package leakage, package/distribution); tell it to read `CLAUDE.md` + `AGENTS.md` first; note that `AppProvider` is provider infra (no `forwardRef`/`.module.scss`/manifest entry by design, like `I18nProvider`). Fix every Critical + Important; document any deliberate skip; re-run gates; re-review until `clean enough to stop`.

  (The mockup review loop, Hard rule 7, does NOT apply — this branch changes no files under `packages/playground/src/pages/mockups/`. `App.tsx` is playground tooling, not a mockup.)

- [ ] **Step 3: Finish the branch.** Use `superpowers:finishing-a-development-branch` → verify tests, push `feat/app-provider`, open a PR. PR summary: new `<AppProvider>` root provider (bundles LocaleProvider + I18nProvider + ToastViewport; `locale`/`intlLocale`/`translations`/`toast` props), AGENTS Setup update, playground dogfood. Wait for `Quality / check` before merging.

---

## Self-review (against the spec)

**Spec coverage:**

- `AppProvider` in `src/app/`, composition of LocaleProvider + I18nProvider + ToastViewport → Task 1 (Step 3). ✓
- Props `locale` / `intlLocale?` (defaults to `locale`) / `translations?` (overrides) / `toast?` (`ToastViewportProps | false`) → Task 1 props + tests. ✓
- Nesting order + ToastViewport inside providers + `toast !== false` guard → Task 1 Step 3. ✓
- No forwardRef / no spread / full JSDoc / no i18n strings → Task 1 Step 3 (documented in component + plan conventions). ✓
- Re-export from `src/index.ts` → Task 1 Step 5. ✓
- Tests: renders children; useLocale intlLocale + fallback; useTranslation en/ru; deep-merge overrides; toast auto-mount; `toast={false}`; position forwarding → Task 1 Step 1. ✓
- AGENTS "Setup" update → Task 1 Step 7. ✓
- Dogfood playground root (removes standalone ToastViewport; adds LocaleProvider via intlLocale) → Task 2. ✓
- Out-of-scope items (routing, stylesheet, theme provider, full-bundle replace, gallery page) → none implemented. ✓

**Placeholder scan:** No TBD/"handle X"/"similar to". Concrete code in every step. Real message values verified (`alert.dismiss` = `Dismiss`/`Закрыть`; `toast.dismiss`/`toast.notifications` = `Dismiss`/`Notifications`). Real test-cleanup API verified (`store._reset` at store.ts:107, `_setViewportConfig` from Toast/api). Real `<ol data-position>` attribute verified in `ToastViewport.tsx`.

**Type consistency:** `AppProviderProps` fields match the destructure in `AppProvider`, the test prop usage, and the AGENTS prose. `Locale` ('en'|'ru'), `DeepPartial<Messages>`, `ToastViewportProps` are the real exported types (from `../i18n` and `../components/Toast`). The `translations` → `I18nProvider overrides` mapping and `intlLocale ?? locale` → `LocaleProvider locale` mapping match the spec's architecture snippet.
