import { createContext, type ReactNode } from 'react';

export const LocaleContext = createContext<string | null>(null);

export interface LocaleProviderProps {
  /** BCP-47 locale string, e.g. 'en-US', 'ru-RU', 'de-DE'. */
  locale: string;
  children: ReactNode;
}

/**
 * Provides the active locale (BCP-47 string) to every descendant.
 * @see docs/components/LocaleProvider.md
 */
export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
