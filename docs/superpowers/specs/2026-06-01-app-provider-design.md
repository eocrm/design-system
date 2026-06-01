# `<AppProvider>` — root provider that wires the design-system contexts

## Goal

A single root component a consuming app (the CRM) wraps around its tree to get all the design-system's
**app-level contexts** in one place, parameterized by props — instead of hand-wiring `LocaleProvider` +
`I18nProvider` + `ToastViewport` and risking forgetting one (the playground currently skips
`LocaleProvider` entirely).

```tsx
import '@eocrm/design-system/styles/global.scss';
import { AppProvider } from '@eocrm/design-system';

<AppProvider locale="en" intlLocale="en-US" translations={brandOverrides}>
  <YourRouter />
</AppProvider>;
```

## Locked-in decisions (brainstorm)

1. **Name:** `AppProvider`.
2. **Translations = partial overrides (merge).** The `translations` prop is a `DeepPartial<Messages>`
   deep-merged over the built-in en/ru bundle (exactly `I18nProvider`'s `overrides` model). The library
   ships the defaults; the consumer supplies only the keys they rebrand/retext.
3. **Two explicit locale props.** `locale: 'en' | 'ru'` selects the UI-string bundle; `intlLocale?:
string` (BCP-47) drives Intl formatting. No magic `en→en-US` mapping.
4. **`intlLocale` optional, defaults to `locale` verbatim.** Omitting it passes the language tag through
   to `LocaleProvider` (`'en'`/`'ru'` are valid BCP-47 language tags); set it for a region (`'en-US'`).
5. **Auto-mounts the toast viewport.** A `toast?: ToastViewportProps | false` prop: omitted ⇒ mount with
   library defaults; object ⇒ forward as config; `false` ⇒ don't mount (consumer places it themselves).
6. **Lives in `src/app/`, not `src/components/`.** It's provider infrastructure (like `src/i18n/`), so
   it's exempt from the component-gallery rules — no `.module.scss`, no `structure.test` 4-file set, no
   manifest cluster, no gallery demo card. Re-exported from `src/index.ts` and documented in AGENTS.md.
7. **Out of scope:** routing (`react-router` is playground-only), the `global.scss` import (an
   entry-point CSS side-effect a component can't do for the consumer), a theme/color-scheme provider
   (theming is CSS-token based — no React context), and any new playground gallery page.

## Architecture

`AppProvider` is a pure composition of three existing exports — no DOM node of its own, no styles, no
i18n strings.

```tsx
import { type ReactNode } from 'react';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { I18nProvider } from '../i18n/I18nProvider';
import { ToastViewport, type ToastViewportProps } from '../components/Toast';
import type { DeepPartial, Locale, Messages } from '../i18n/messages';

export interface AppProviderProps {
  /**
   * UI-string locale — selects the built-in message bundle. v1 ships `'en'` and `'ru'`.
   */
  locale: Locale;
  /**
   * BCP-47 locale for Intl-facing formatting (Calendar, number/date). Optional —
   * defaults to `locale` verbatim (`'en'` / `'ru'` are valid language tags). Set it
   * for a region, e.g. `'en-US'` / `'ru-RU'`.
   */
  intlLocale?: string;
  /**
   * Deep-partial overrides deep-merged over the built-in messages for `locale`.
   * Memoize this object — a fresh literal each render rebuilds the merged messages.
   */
  translations?: DeepPartial<Messages>;
  /**
   * Toast viewport configuration, or `false` to NOT mount it (place `<ToastViewport>`
   * yourself). Omitted ⇒ mounts with library defaults.
   */
  toast?: ToastViewportProps | false;
  children: ReactNode;
}

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

### Why this nesting

- `LocaleProvider` is outermost (Intl locale is the broadest context). `I18nProvider` inside it.
- `<ToastViewport>` renders **inside** `I18nProvider` (and `LocaleProvider`) so toast chrome (e.g. a
  dismiss button's `aria-label`) resolves translated strings, and any locale-aware toast content
  formats correctly. It's a sibling of `children`, after it, so toasts paint above app content.
- `toast` accepted as `ToastViewportProps | false`: `false` short-circuits the mount; otherwise spread
  `(toast ?? {})` so omitted ⇒ all `ToastViewport` defaults, object ⇒ the consumer's config.

### Props notes

- **No `forwardRef`.** `AppProvider` renders only providers — there is no single DOM node to forward a
  ref to. (Rule 6's forwardRef requirement is about DOM components; a provider composition is exempt,
  like `I18nProvider`/`LocaleProvider`, which also don't forward refs.)
- **No `{...rest}` spread.** Its surface is exactly the five props above; it is not an HTML element.

## Files

| File                                                  | Change                                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/design-system/src/app/AppProvider.tsx`      | NEW — component + props + JSDoc                                                                                                       |
| `packages/design-system/src/app/index.ts`             | NEW — `export { AppProvider }; export type { AppProviderProps }`                                                                      |
| `packages/design-system/src/app/AppProvider.test.tsx` | NEW — unit tests                                                                                                                      |
| `packages/design-system/src/index.ts`                 | MODIFY — `export { AppProvider } from './app'; export type { AppProviderProps } from './app';`                                        |
| `packages/design-system/AGENTS.md`                    | MODIFY — update the "Setup (once per consuming app)" section to recommend `<AppProvider>`                                             |
| `packages/playground/src/App.tsx`                     | MODIFY (dogfood) — replace manual `<I18nProvider>` + standalone `<ToastViewport>` with `<AppProvider locale="en" intlLocale="en-US">` |

`structure.test` only scans `src/components/`, so `src/app/` needs no `.module.scss`. The manifest only
scans `src/components/`, so no cluster entry. No gallery demo page (consistent with the i18n providers).

## Tests (`AppProvider.test.tsx`)

Use small probe components that read the contexts and render their values.

- **Renders children.**
- **`useLocale()` returns `intlLocale` when provided** (e.g. `intlLocale="en-US"` → `"en-US"`).
- **`useLocale()` falls back to `locale` when `intlLocale` omitted** (`locale="ru"` with no `intlLocale`
  → `"ru"`).
- **`useTranslation()` reflects `locale`** — a known built-in key differs between `locale="en"` and
  `locale="ru"` (e.g. a shipped Alert/Toast dismiss label).
- **`translations` overrides merge** — passing `translations={{ <section>: { <key>: 'X' } }}` makes that
  key resolve to `'X'` while a sibling key keeps its built-in default (verifies deep-merge, not replace).
- **Toast auto-mounts by default** — after `toast(...)` the toast text appears in the document.
- **`toast={false}` mounts no viewport** — no toast region in the DOM; a `toast(...)` call renders
  nothing.
- **`toast={{ position }}` forwards config** — the rendered viewport reflects the passed prop (assert on
  the position class / data attribute the viewport applies).

(The exact built-in keys + the viewport's position class are read from `src/i18n/en.ts` / `ru.ts` and
`ToastViewport.tsx` when writing the tests, not guessed.)

## Dogfood — playground refactor

`packages/playground/src/App.tsx` today:

```tsx
<I18nProvider locale="en">
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <AppShell>…</AppShell>
  </BrowserRouter>
  <ToastViewport position="bottom-right" />
</I18nProvider>
```

becomes:

```tsx
<AppProvider locale="en" intlLocale="en-US" toast={{ position: 'bottom-right' }}>
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <AppShell>…</AppShell>
  </BrowserRouter>
</AppProvider>
```

Net effect: the standalone `<ToastViewport>` is gone (auto-mounted inside `AppProvider`), and the
playground now mounts `LocaleProvider` for the first time (`intlLocale="en-US"`), so Calendar/date
formatting gets a real locale. Routing (`BrowserRouter`) stays exactly where it is — inside the
provider, owned by the app. Imports updated (`AppProvider` in, `I18nProvider`/`ToastViewport` out).

## AGENTS.md — Setup section update

Update the existing "Setup (once per consuming app)" section to lead with `<AppProvider>`:

```tsx
// 1. Import the stylesheet once at your entry point.
import '@eocrm/design-system/styles/global.scss';

// 2. Wrap your app in <AppProvider>.
import { AppProvider } from '@eocrm/design-system';

<AppProvider locale="en" intlLocale="en-US">
  <App />
</AppProvider>;
```

Document the props (`locale`, `intlLocale`, `translations`, `toast`), that it bundles
`LocaleProvider` + `I18nProvider` + the toast viewport, and that routing + the stylesheet import remain
the app's responsibility. Keep a short note that the individual providers are still exported for advanced
nesting (per-subtree locale overrides).

## When NOT to use (JSDoc `@remarks` + AGENTS.md)

- **Per-subtree locale/i18n override** → nest `LocaleProvider` / `I18nProvider` directly. `AppProvider`
  is the single app root; don't nest a second `AppProvider`.
- **A non-app context (Storybook story, isolated test, an embedded widget)** that only needs strings →
  use `I18nProvider` alone. `AppProvider` also mounts a toast viewport, which a tiny embed may not want
  (pass `toast={false}`, or just use the lower-level providers).

## Out of scope (v1)

- Routing, the stylesheet import, a theme/color-scheme React provider.
- A `direction`/RTL provider (no RTL support in the library yet).
- Accepting a **full** replacement message bundle (overrides-merge only, per the brainstorm).
- A playground gallery demo card (the root dogfood + AGENTS Setup are the documentation).
