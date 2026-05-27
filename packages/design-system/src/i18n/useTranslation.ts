import { useContext, useMemo } from 'react';
import { I18nContext } from './I18nProvider';
import type { MessageKey } from './messages';
import { lookupKey } from './format';

/**
 * Read the active translations and return a `t(key, params?)` function.
 *
 * - `key` is a dotted path into the `Messages` interface (e.g.
 *   `'alert.dismiss'`). TypeScript narrows the union to whatever keys are
 *   defined in `Messages` — agents can autocomplete every valid key.
 * - String leaves are returned verbatim. Function leaves are invoked with
 *   `params`. Array leaves (months, weekdays) are JSON-stringified so misuse
 *   is loud at runtime — use `useTranslationArray` for those.
 * - A missing key logs a `console.warn` and returns the literal key string so
 *   the UI still renders something.
 *
 * @example
 *   const t = useTranslation();
 *   <button aria-label={t('alert.dismiss')}>×</button>
 */
export function useTranslation() {
  const { messages } = useContext(I18nContext);
  return useMemo(() => {
    return function t<K extends MessageKey>(key: K, params?: Record<string, unknown>): string {
      const leaf = lookupKey(messages as Record<string, unknown>, key as string);
      if (leaf == null) {
        if (typeof console !== 'undefined') console.warn('[i18n] missing key:', key);
        return key as string;
      }
      if (typeof leaf === 'function') {
        return (leaf as (p: Record<string, unknown>) => string)(params ?? {});
      }
      if (typeof leaf === 'string') return leaf;
      // Array leaves (months, weekdays) — caller indexes; we return the raw
      // JSON so misuse via `t()` is loud at runtime. Use `useTranslationArray`.
      return JSON.stringify(leaf);
    };
  }, [messages]);
}

/**
 * Convenience for components that need raw array messages such as
 * `calendar.months` or `calendar.weekdaysShort`. Returns the array directly so
 * the caller can index into it (`months[date.getMonth()]`). If the key isn't
 * an array, returns `[]` and lets the caller render a graceful fallback.
 */
export function useTranslationArray() {
  const { messages } = useContext(I18nContext);
  return useMemo(() => {
    return function ta(key: string): readonly string[] {
      const leaf = lookupKey(messages as Record<string, unknown>, key);
      return Array.isArray(leaf) ? (leaf as readonly string[]) : [];
    };
  }, [messages]);
}
