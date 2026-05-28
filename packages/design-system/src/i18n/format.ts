import type { DeepPartial } from './messages';

/**
 * Recursively merge `override` over `base`, returning a new object.
 *
 * Rules:
 * - Plain-object leaves on both sides recurse.
 * - Anything else (string / function / array / primitive) on `override`
 *   replaces the corresponding `base` value wholesale.
 * - `undefined` values on `override` are ignored (so a partial override
 *   doesn't blank out a base key just by being mentioned).
 *
 * The function is pure: `base` is not mutated. Used by `<I18nProvider>` to
 * combine the locale defaults with the consumer's `overrides` prop.
 */
export function deepMerge<T extends Record<string, unknown>>(base: T, override: DeepPartial<T>): T {
  const result: Record<string, unknown> = { ...base };
  for (const key in override) {
    const baseV = result[key];
    const overV = override[key];
    if (
      baseV != null &&
      overV != null &&
      typeof baseV === 'object' &&
      typeof overV === 'object' &&
      !Array.isArray(baseV) &&
      !Array.isArray(overV) &&
      typeof baseV !== 'function' &&
      typeof overV !== 'function'
    ) {
      result[key] = deepMerge(
        baseV as Record<string, unknown>,
        overV as DeepPartial<Record<string, unknown>>,
      );
    } else if (overV !== undefined) {
      result[key] = overV;
    }
  }
  return result as T;
}

/**
 * Walk a dotted-path key (`'alert.dismiss'`) into a nested message object and
 * return the leaf — string, function, array, or `undefined` if any segment is
 * missing. The hook layer interprets the leaf type; `lookupKey` only does the
 * traversal.
 */
export function lookupKey(messages: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc != null && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, messages);
}

/**
 * Russian plural rule. CLDR categories: one / few / many. Used inside `ru.ts`
 * for any message that varies by count.
 *
 * @example
 *   ruPlural(1,  ['файл', 'файла', 'файлов']) // → 'файл'
 *   ruPlural(3,  ['файл', 'файла', 'файлов']) // → 'файла'
 *   ruPlural(11, ['файл', 'файла', 'файлов']) // → 'файлов'
 *   ruPlural(22, ['файл', 'файла', 'файлов']) // → 'файла'
 */
export function ruPlural(n: number, forms: readonly [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
}
