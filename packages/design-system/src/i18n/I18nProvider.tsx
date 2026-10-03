import { createContext, useMemo, type ReactNode } from 'react';
import type { DeepPartial, Locale, Messages } from './messages';
import { en } from './en';
import { ru } from './ru';
import { deepMerge } from './format';

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
}

const LOCALE_MAP: Record<Locale, Messages> = { en, ru };

/**
 * Default context = English with no overrides. Components used WITHOUT a
 * provider still work and render English copy. Importing this directly is
 * advanced — most callers should use `useTranslation()` instead.
 */
export const I18nContext = createContext<I18nContextValue>({ locale: 'en', messages: en });

export interface I18nProviderProps {
  /** Locale code. v1 ships 'en' and 'ru'. */
  locale: Locale;
  /**
   * Optional deep-partial overrides applied over the locale defaults. The
   * consumer is responsible for memoizing this object — passing a fresh
   * literal on every render will rebuild the merged messages each time.
   */
  overrides?: DeepPartial<Messages>;
  children: ReactNode;
}

/**
 * Provides the message catalog (`locale` plus optional `overrides`) to descendants.
 * @see AI-PRIMER.md#localization-i18n
 */
export function I18nProvider({ locale, overrides, children }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(() => {
    const base = LOCALE_MAP[locale];
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
  }, [locale, overrides]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
