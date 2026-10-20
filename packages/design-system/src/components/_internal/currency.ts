/** Shared currency parse/format helpers for MoneyInput / CurrencySelect. Amounts stay strings (never JS numbers). */

export type CurrencyDisplay = 'code' | 'symbol' | 'both';

/** Parsed, in-progress amount. `frac === null` → no decimal point typed; `''` → trailing point. */
export interface AmountDraft {
  negative: boolean;
  int: string;
  frac: string | null;
}

// Callers must guard codes with isValidCurrency; the Intl helpers below assume a valid code.
export function currencyPrecision(code: string): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
    .maximumFractionDigits!;
}

export function currencySymbol(code: string, locale: string): string {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    currencyDisplay: 'symbol',
  }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? code;
}

export function currencyName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames(locale, { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function currencyDisplayText(
  code: string,
  display: CurrencyDisplay,
  locale: string,
): string {
  if (display === 'code') return code;
  const symbol = currencySymbol(code, locale);
  return display === 'symbol' ? symbol : `${code} ${symbol}`;
}

export function isValidCurrency(code: string): boolean {
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: code });
    return true;
  } catch {
    return false;
  }
}

export function localeSeparators(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.5);
  return {
    group: parts.find((p) => p.type === 'group')?.value ?? ',',
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
  };
}

const SP = '[\\s\\u00a0\\u202f]*';
// Currency affix: an ISO code ('USD') or an optional 1–2 letter prefix + symbol ('$', 'US$', 'CA$').
const AFFIX = `(?:[A-Z]{3}|[A-Z]{0,2}\\p{Sc})`;
// One numeric core: digits with '.', ',', spaces/NBSP/narrow NBSP and apostrophes as separators.
const CORE = `((?:\\d|[.,]\\d)[\\d.,'\\u2019\\s\\u00a0\\u202f]*?)`;
const SIGNED = new RegExp(
  `^(?:${AFFIX}${SP})?(-)?${SP}(?:${AFFIX}${SP})?${CORE}${SP}(?:${AFFIX})?${SP}(-)?$`,
  'u',
);
const PARENS = new RegExp(
  `^(?:${AFFIX}${SP})?\\(${SP}(?:${AFFIX}${SP})?${CORE}${SP}(?:${AFFIX})?${SP}\\)${SP}(?:${AFFIX})?$`,
  'u',
);

/**
 * Lenient parse of a PASTED segment. It must be exactly one number with optional currency
 * symbols/codes, a leading/trailing minus (incl. U+2212) or accounting parentheses — anything
 * else (words, a second number, stray parentheses) is `'invalid'`; no digits at all is `null`.
 * Inside the core, cross-locale separators are resolved (see below).
 */
export function parseAmount(
  text: string,
  opts: { locale: string; precision: number; allowNegative: boolean },
): AmountDraft | null | 'invalid' {
  const t = text
    .replace(/−/g, '-')
    .trim()
    .replace(/(\d)\.$/, '$1'); // trailing sentence period
  if (!/\d/.test(t)) return null;
  const m = SIGNED.exec(t);
  const p = m ? null : PARENS.exec(t);
  if (!m && !p) return 'invalid';
  if (m && m[1] && m[3]) return 'invalid'; // both leading and trailing minus
  const negative = opts.allowNegative && (p ? true : !!(m![1] || m![3]));
  let s = (m ? m[2] : p![1]).replace(/[\s  '’]/g, '');

  let { group, decimal } = localeSeparators(opts.locale);
  // Cross-locale: a separator repeated more than once groups (the other one is the decimal);
  // else with both '.' and ',' present, the LAST one is the decimal and the other groups.
  const dots = s.split('.').length - 1;
  const commas = s.split(',').length - 1;
  if (dots > 1 || commas > 1) {
    group = dots > 1 ? '.' : ',';
    decimal = group === '.' ? ',' : '.';
  } else if (dots && commas) {
    decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    group = decimal === '.' ? ',' : '.';
  } else if (decimal === ',' && opts.precision <= 2 && dots === 1) {
    // Numpad-dot rule: in a comma-decimal locale, a lone '.' followed by 1..precision digits is a decimal point.
    const frac = s.slice(s.indexOf('.') + 1);
    if (frac.length >= 1 && frac.length <= opts.precision) s = s.replace('.', ',');
  }

  return toDraft(s.split(group).join(''), decimal, opts.precision, negative);
}

/**
 * Strict parse of the field's OWN text: only the locale group char is stripped and only the
 * locale decimal is a decimal. No cross-locale or numpad guessing.
 */
export function parseLocalAmount(
  text: string,
  opts: { locale: string; precision: number; allowNegative: boolean },
): AmountDraft | null {
  const { group, decimal } = localeSeparators(opts.locale);
  const s = [...text.split(group).join('')]
    .filter((c) => (c >= '0' && c <= '9') || c === decimal || c === '-')
    .join('');
  if (!s) return null;
  const negative = opts.allowNegative && s.startsWith('-');
  return toDraft(s.replace(/-/g, ''), decimal, opts.precision, negative);
}

function toDraft(s: string, decimal: string, precision: number, negative: boolean) {
  const at = s.indexOf(decimal);
  const digits = (v: string) => v.replace(/\D/g, '');
  const int = digits(at < 0 ? s : s.slice(0, at));
  const frac = at < 0 ? null : digits(s.slice(at + 1)).slice(0, precision);
  if (!int && frac === null && !negative) return null;
  return { negative, int, frac };
}

/** Prefix '-' only for a negative with a non-zero digit (never '-0' / '-0.00'). */
const signed = (negative: boolean, body: string) =>
  (negative && /[1-9]/.test(body) ? '-' : '') + body;

export function draftToCanonical(d: AmountDraft): string | null {
  if (!d.int && d.frac === null) return null;
  const int = d.int.replace(/^0+(?=\d)/, '') || '0';
  const body = `${int}${d.frac ? `.${d.frac}` : ''}`;
  return signed(d.negative, body);
}

export function canonicalToDraft(s: string | null): AmountDraft | null {
  if (s === null || s === '') return null;
  const negative = s.startsWith('-');
  const [int, frac] = (negative ? s.slice(1) : s).split('.');
  return { negative, int, frac: frac ?? null };
}

export function formatDraft(
  d: AmountDraft,
  opts: { locale: string; precision: number; pad: boolean },
): string {
  const { group, decimal } = localeSeparators(opts.locale);
  const sign = d.negative ? '-' : '';
  if (!d.int && d.frac === null) return sign;
  const int = (d.int || '0').replace(/\B(?=(\d{3})+$)/g, group);
  if (opts.precision === 0) return sign + int;
  let frac = d.frac === null ? null : d.frac.slice(0, opts.precision);
  if (opts.pad) frac = (frac ?? '').padEnd(opts.precision, '0');
  return sign + int + (frac === null ? '' : decimal + frac);
}

/** String half-up (away from zero) rounding; never pads. */
export function roundAmount(canonical: string, precision: number): string {
  const negative = canonical.startsWith('-');
  const [int, frac = ''] = (negative ? canonical.slice(1) : canonical).split('.');
  if (frac.length <= precision) return signed(negative, canonical.slice(negative ? 1 : 0));
  let n = BigInt(int + frac.slice(0, precision));
  if (frac[precision] >= '5') n += 1n;
  const s = n.toString().padStart(precision + 1, '0');
  const cut = s.length - precision;
  return signed(negative, precision ? `${s.slice(0, cut)}.${s.slice(cut)}` : s);
}
