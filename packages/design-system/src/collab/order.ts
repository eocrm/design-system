// Fractional ordering keys for collaborative block lists: base-62 digit strings compared
// lexicographically, with no trailing '0' (so a key can always be split further).
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = DIGITS.length;

const digit = (s: string) => (s ? DIGITS.indexOf(s[0]) : 0);

function between(a: string, b: string | null): string {
  if (b !== null) {
    let n = 0;
    while ((a[n] ?? '0') === b[n]) n++;
    if (n > 0) return b.slice(0, n) + between(a.slice(n), b.slice(n));
  }
  const da = digit(a);
  const db = b === null ? BASE : digit(b);
  if (db - da > 1) {
    // Open ends step by one digit (appends/prepends grow ~1 char per 60 inserts);
    // a bounded gap is bisected.
    if (b === null) return a ? DIGITS[da + 1] : 'V';
    return DIGITS[a ? (da + db) >> 1 : db - 1];
  }
  if (b !== null && b.length > 1) return b[0];
  return DIGITS[da] + between(a.slice(1), null);
}

/**
 * A key strictly between `a` and `b` (`null` = open end). Inputs must be keys this module
 * produced; they arrive from other clients' docs, so a non-canonical key (e.g. a trailing
 * '0') or `a >= b` throws a RangeError instead of returning an out-of-range key — callers
 * catch it and repair the ordering.
 * @internal
 */
export function orderBetween(a: string | null, b: string | null): string {
  if (a !== null && b !== null && a >= b) throw new RangeError(`orderBetween: ${a} >= ${b}`);
  const key = between(a ?? '', b);
  if ((a !== null && key <= a) || (b !== null && key >= b))
    throw new RangeError(`orderBetween: no key between ${a} and ${b}`);
  return key;
}

/**
 * Sort comparator: by `order`, ties (concurrent same-gap inserts) broken by `id`.
 * @internal
 */
export function compareOrder(
  a: { order: string; id: string },
  b: { order: string; id: string },
): number {
  return a.order === b.order
    ? a.id < b.id
      ? -1
      : a.id > b.id
        ? 1
        : 0
    : a.order < b.order
      ? -1
      : 1;
}
