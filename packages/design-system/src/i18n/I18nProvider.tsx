import { createContext, useEffect, useMemo, type ReactNode } from 'react';
import type { DeepPartial, Locale, Messages } from './messages';
import { en } from './en';
import { deepMerge } from './format';

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
}

/**
 * Default context = English with no overrides. Components used WITHOUT a
 * provider still work and render English copy. Importing this directly is
 * advanced — most callers should use `useTranslation()` instead.
 */
export const I18nContext = createContext<I18nContextValue>({ locale: 'en', messages: en });

export interface I18nProviderProps {
  /** Locale code. English is built in; any other locale needs `messages`. */
  locale: Locale;
  /**
   * Message catalog for `locale` (e.g. `ru` from the package). Omitted ⇒
   * English. A non-`en` locale without `messages` logs an error and renders
   * English. Memoize or hoist it — it is a dependency of the merged value.
   */
  messages?: Messages;
  /**
   * Optional deep-partial overrides applied over `messages` (or English). The
   * consumer is responsible for memoizing this object — passing a fresh
   * literal on every render will rebuild the merged messages each time.
   */
  overrides?: DeepPartial<Messages>;
  children: ReactNode;
}

/**
 * Provides the message catalog (`locale` plus optional `overrides`) to descendants.
 * @see docs/i18n.md
 */
export function I18nProvider({
  locale,
  messages: provided,
  overrides,
  children,
}: I18nProviderProps) {
  const missing = provided === undefined && locale !== 'en';
  useEffect(() => {
    if (missing) {
      console.error(
        `[i18n] I18nProvider locale="${locale}" has no messages — falling back to English. Pass messages={${locale}}.`,
      );
    }
  }, [locale, missing]);
  const value = useMemo<I18nContextValue>(() => {
    const base = provided ?? en;
    // The cast is needed because TS `interface` declarations lack an index
    // signature; `deepMerge` is typed against `Record<string, unknown>`.
    // Safe at runtime — `Messages` is always a plain nested object literal.
    const messages = overrides
      ? (deepMerge(
          base as unknown as Record<string, unknown>,
          overrides as DeepPartial<Record<string, unknown>>,
        ) as unknown as Messages)
      : base;
    return { locale, messages };
  }, [locale, provided, overrides]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
