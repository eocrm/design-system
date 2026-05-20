import { createContext, type ReactNode } from 'react';

export const LocaleContext = createContext<string | null>(null);

export interface LocaleProviderProps {
  /** BCP-47 locale string, e.g. 'en-US', 'ru-RU', 'de-DE'. */
  locale: string;
  children: ReactNode;
}

/**
 * Provides the active locale (BCP-47 string) to every descendant. Any
 * design-system component that needs locale-aware formatting (Calendar
 * primitives, future Input formatters, currency widgets) reads this via
 * `useLocale()`. The Provider is stateless — to switch locale, re-render
 * with a new `locale` prop.
 *
 * @example
 * <LocaleProvider locale="ru-RU">
 *   <App />
 * </LocaleProvider>
 *
 * @example
 * // Nested override for a subtree:
 * <LocaleProvider locale="en-US">
 *   <Dashboard />
 *   <LocaleProvider locale="ja-JP">
 *     <JapaneseSection />
 *   </LocaleProvider>
 * </LocaleProvider>
 */
export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
