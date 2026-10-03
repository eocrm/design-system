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
  children: ReactNode;
}

/**
 * App root: composes `LocaleProvider` + `I18nProvider` and mounts the toast viewport.
 * @see docs/setup.md
 */
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
