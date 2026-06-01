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
