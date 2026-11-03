# Setup (once per consuming app)

Wire the provider, styles and tokens into a consuming app once.

Two steps at your app root:

```tsx
// 1. Import the stylesheet once (tokens, modern reset, base typography).
import '@eocrm/design-system/styles/global.css';

// 2. Wrap your tree in <AppProvider>.
import { AppProvider } from '@eocrm/design-system';

<AppProvider locale="en" intlLocale="en-US">
  <App />
</AppProvider>;
```

`<AppProvider>` bundles the app-level contexts so you don't wire them by hand:

- `locale` (`'en'`, `'ru'` or any other code) — UI-string locale. English is built in; for any other locale pass `messages` (`import { ru } from '@eocrm/design-system'`, or your own `Messages` catalog). A non-`en` locale without `messages` logs an error and renders English.
- `messages?` — the catalog for `locale`. Omitted ⇒ English.
- `intlLocale?` (BCP-47, e.g. `'en-US'`) — locale for Intl formatting (Calendar, dates, numbers). Defaults to `locale`.
- `translations?` — deep-partial overrides merged over the built-in strings (rebrand a few keys; memoize the object).
- `toast?` — `<ToastViewport>` config, or `false` to mount it yourself. Omitted ⇒ mounted with defaults.
- `tokens?` — CSS design-token overrides (a flat `{ '--color-accent': '#7c3aed', '--radius-md': '6px' }` map) applied in **both** themes. Rebrands the system globally — including portaled `Modal`/`Tooltip`/`Toast`. Memoize it.
- `darkTokens?` — token overrides applied **only** in dark (forced + system), merged over `tokens` (e.g. a lighter accent on dark surfaces). Memoize it.

```tsx
// import { ru } from '@eocrm/design-system'
// Russian UI + a couple of rebranded strings + top-right toasts:
const translations = useMemo(() => ({ alert: { dismiss: 'Скрыть' } }), []);
<AppProvider
  locale="ru"
  messages={ru}
  translations={translations}
  toast={{ position: 'top-right' }}
>
  <App />
</AppProvider>;
```

It composes `LocaleProvider` + `I18nProvider` and mounts the toast viewport. **Routing is yours** (`<AppProvider>` ships no router), and the stylesheet import above is still required. The individual providers (`LocaleProvider`, `I18nProvider`, `ToastViewport`) remain exported for advanced cases like pinning a subtree to a different locale.

**Next.js app router (React Server Components):** the `ru` catalog contains functions, which a Server Component cannot pass to a Client Component. Mount the provider from your own `'use client'` file and use that from `layout.tsx`:

```tsx
// app/providers.tsx
'use client';
import { AppProvider, ru } from '@eocrm/design-system';
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider locale="ru" messages={ru}>
      {children}
    </AppProvider>
  );
}

// app/layout.tsx (Server Component): <body><Providers>{children}</Providers></body>
```

Components themselves can be imported directly from Server Components. Controlled overlays (`Modal`, `Drawer`) need state and a function `onOpenChange`, so render them from a client component; static and compound parts render from Server Components fine.

**When NOT to use:** for a per-subtree locale / i18n override, nest `LocaleProvider` / `I18nProvider` directly — `AppProvider` is the single app root, so don't nest a second one. For a tiny embed or isolated test that only needs strings, use `I18nProvider` alone (or pass `toast={false}`) to avoid the toast viewport.

**Rebranding via tokens:**

```tsx
const tokens = useMemo(() => ({ '--color-accent': '#7c3aed', '--radius-md': '6px' }), []);
const darkTokens = useMemo(() => ({ '--color-accent': '#a78bfa' }), []);

<AppProvider locale="en" tokens={tokens} darkTokens={darkTokens}>
  <App />
</AppProvider>;
```

`tokens` apply in light **and** dark; `darkTokens` refine the dark scope only. They're emitted as a single declarative `<style>` that layers over the [dark theme](theming.md#dark-theme) correctly, and they win over a `data-accent` preset's token blocks. One exception to "override the accent and everything follows": a preset may set the link colour apart from its accent (`tealpine`, `indigo` and `berry` do), so when rebranding the accent on top of a preset, also override `--color-link-fg` / `--color-link-fg-hover`. Any design token can be overridden — see the generated `@eocrm/design-tokens` Sass contract for the full CSS custom-property set. Contributors change shared values only in `packages/design-tokens/src/tokens.json`; consumers import the compiled `@eocrm/design-system/styles/tokens.css`.
