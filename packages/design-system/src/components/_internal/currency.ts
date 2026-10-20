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

const escapeRe = (s: string) => s.replace(/[\\^$.*+?()[\]{}|-]/g, '\\$&');

export function parseAmount(
  text: string,
  opts: { locale: string; precision: number; allowNegative: boolean },
): AmountDraft | null {
  let { group, decimal } = localeSeparators(opts.locale);
  const keep = new RegExp(`[^0-9\\-.,${escapeRe(group)}${escapeRe(decimal)}]`, 'g');
  // Sign forms: U+2212 minus, accounting parentheses '(1,234.50)', trailing minus '5-'.
  const t = text.replace(/\u2212/g, '-');
  const parens = /\(.*\)/.test(t);
  let s = t.replace(keep, '');
  if (!s) return null;

  const negative = opts.allowNegative && (s.startsWith('-') || s.endsWith('-') || parens);
  s = s.replace(/-/g, '');

  // Cross-locale paste: a separator repeated more than once groups (the other one is the decimal);
  // else with both '.' and ',' present, the LAST one is the decimal and the other groups.
  const dots = s.split('.').length - 1;
  const commas = s.split(',').length - 1;
  if (dots > 1 || commas > 1) {
    group = dots > 1 ? '.' : ',';
    decimal = group === '.' ? ',' : '.';
  } else if (dots && commas) {
    decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    group = decimal === '.' ? ',' : '.';
  }

  // Numpad-dot rule: in a comma-decimal locale, a lone '.' followed by 1..precision digits is a decimal point.
  if (decimal === ',' && opts.precision <= 2 && !s.includes(',')) {
    const m = /^[^.]*\.(\d+)$/.exec(s);
    if (m && m[1].length <= opts.precision) s = s.replace('.', ',');
  }

  s = s.split(group).join('');
  const at = s.indexOf(decimal);
  const digits = (v: string) => v.replace(/\D/g, '');
  const int = digits(at < 0 ? s : s.slice(0, at));
  const frac = at < 0 ? null : digits(s.slice(at + 1)).slice(0, opts.precision);
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
