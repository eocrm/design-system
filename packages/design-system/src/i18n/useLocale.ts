import { useContext } from 'react';
import { LocaleContext } from './LocaleProvider';

/**
 * Read the active locale. Resolution order:
 * 1. The nearest `<LocaleProvider>` value (if mounted above).
 * 2. `navigator.language` (browser fallback).
 * 3. `'en-US'` (SSR / Node test fallback).
 *
 * Consumers don't need to wrap their app in `<LocaleProvider>` to get a
 * sensible default; mount it only when you want to override the browser
 * default or pin a subtree to a specific locale.
 */
export function useLocale(): string {
  const ctx = useContext(LocaleContext);
  if (ctx !== null) return ctx;
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en-US';
}
