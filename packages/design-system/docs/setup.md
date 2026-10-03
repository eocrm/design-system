# Setup (once per consuming app)

Wire the provider, styles and tokens into a consuming app once.

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
- `tokens?` — CSS design-token overrides (a flat `{ '--color-accent': '#7c3aed', '--radius-md': '6px' }` map) applied in **both** themes. Rebrands the system globally — including portaled `Modal`/`Tooltip`/`Toast`. Memoize it.
- `darkTokens?` — token overrides applied **only** in dark (forced + system), merged over `tokens` (e.g. a lighter accent on dark surfaces). Memoize it.

It composes `LocaleProvider` + `I18nProvider` and mounts the toast viewport. **Routing is yours** (`<AppProvider>` ships no router), and the stylesheet import above is still required. The individual providers (`LocaleProvider`, `I18nProvider`, `ToastViewport`) remain exported for advanced cases like pinning a subtree to a different locale.

**When NOT to use:** for a per-subtree locale / i18n override, nest `LocaleProvider` / `I18nProvider` directly — `AppProvider` is the single app root, so don't nest a second one. For a tiny embed or isolated test that only needs strings, use `I18nProvider` alone (or pass `toast={false}`) to avoid the toast viewport.

**Rebranding via tokens:**

```tsx
const tokens = useMemo(() => ({ '--color-accent': '#7c3aed', '--radius-md': '6px' }), []);
const darkTokens = useMemo(() => ({ '--color-accent': '#a78bfa' }), []);

<AppProvider locale="en" tokens={tokens} darkTokens={darkTokens}>
  <App />
</AppProvider>;
```

`tokens` apply in light **and** dark; `darkTokens` refine the dark scope only. They're emitted as a single declarative `<style>` that layers over the [dark theme](theming.md#dark-theme) correctly. Any design token can be overridden — see the generated `@eocrm/design-tokens` Sass contract for the full CSS custom-property set. Contributors change shared values only in `packages/design-tokens/src/tokens.json`; `src/styles/tokens.scss` remains the stable consumer entry point.
