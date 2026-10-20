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

/** Space-like grouping chars allowed inside a pasted number (one kind per number). */
const SPACE_GROUP = /[   '’]/g;
// One affix token: currency symbols and/or one letter word ('US$', 'руб.', prefix label 'Total:').
const PREFIX_TOKEN = /^(?:\p{Sc}*\p{L}+[.:]?\p{Sc}*|\p{Sc}+)$/u;
const SUFFIX_TOKEN = /^(?:\p{Sc}*\p{L}+\.?\p{Sc}*|\p{Sc}+)$/u;
const SUFFIX_WORDS = new Set(['руб', 'р']);
let isoCodes: Set<string> | undefined;
/** A real ISO 4217 code (not merely well-formed), so magnitude words ('K', 'bn', 'млн') never pass. */
// Without Intl.supportedValuesOf no suffix word counts as a currency (reject, never throw).
const isIsoCode = (w: string) =>
  (isoCodes ??= new Set(
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : [],
  )).has(w.toUpperCase());

/**
 * Splits one affix side into sign marks; null when anything but symbols / ONE word / sign remains.
 * A prefix word is a free label ('Total', 'Итого:'); a suffix word must be a currency
 * (ISO code or 'руб'/'р') — anything else may be a magnitude ('5 тыс.', '$2 million').
 */
function readAffix(side: string, open: string, signs: string, suffix: boolean) {
  const marks = { open: 0, minus: 0, plus: 0 };
  for (const c of side) {
    if (c === open) marks.open++;
    else if (c === '-' && signs.includes('-')) marks.minus++;
    else if (c === '+' && signs.includes('+')) marks.plus++;
  }
  const rest = side.replace(new RegExp(`[\\${open}${signs.replace('-', '\\-')}]`, 'g'), ' ');
  const tokens = rest.split(/[   ]+/).filter(Boolean);
  if (!tokens.every((tk) => (suffix ? SUFFIX_TOKEN : PREFIX_TOKEN).test(tk))) return null;
  const words = tokens.map((tk) => tk.replace(/[^\p{L}]/gu, '')).filter(Boolean);
  if (words.length > 1) return null;
  if (suffix && words.length && !SUFFIX_WORDS.has(words[0].toLowerCase()) && !isIsoCode(words[0]))
    return null;
  return marks;
}

/**
 * Lenient parse of a PASTED segment: exactly one number, with optional currency symbols / one word
 * per side, a sign ('-', '−', '+', trailing '-') or accounting parentheses. Grouping must be
 * unambiguous (first group 1–3 digits, then exactly 3, one group char kind); the cross-locale rules
 * pick the decimal. Anything doubtful → `'invalid'`; no digits at all → `null`.
 */
export function parseAmount(
  text: string,
  opts: { locale: string; precision: number; allowNegative: boolean },
): AmountDraft | null | 'invalid' {
  const t = text.replace(/−/g, '-').trim().replace(/\.$/, ''); // trailing sentence period
  const first = t.search(/\d/);
  if (first < 0) return null;
  let last = t.length - 1;
  while (!/\d/.test(t[last])) last--;
  // '.5' — but a separator glued to a word belongs to it ('Rs.100', 'руб.10').
  const leadingSep = /[.,]/.test(t[first - 1] ?? '') && !/\p{L}/u.test(t[first - 2] ?? '');
  const from = leadingSep ? first - 1 : first;
  // Letters glued to the number ('5K', '3bn', 'USD5') are magnitudes or noise.
  if (/\p{L}/u.test(t[from - 1] ?? '') || /\p{L}/u.test(t[last + 1] ?? '')) return 'invalid';
  const core = t.slice(from, last + 1);

  const pre = readAffix(t.slice(0, from), '(', '-+', false);
  const post = readAffix(t.slice(last + 1), ')', '-', true);
  if (!pre || !post) return 'invalid';
  const parens = pre.open + post.open;
  const signs = pre.minus + pre.plus + post.minus;
  if (pre.open > 1 || post.open > 1 || parens === 1 || signs > 1 || (parens && signs)) {
    return 'invalid';
  }
  const negative = opts.allowNegative && (parens === 2 || pre.minus + post.minus === 1);

  if (!/^[\d.,]+$/.test(core.replace(SPACE_GROUP, ''))) return 'invalid'; // tab, newline, '-', letters
  const { group: lg, decimal: ld } = localeSeparators(opts.locale);
  const count = (c: string) => core.split(c).length - 1;
  const dots = count('.');
  const commas = count(',');
  let dec: string | null = null;
  let grp: string | null = null;
  if (dots && commas) {
    dec = core.lastIndexOf('.') > core.lastIndexOf(',') ? '.' : ',';
    grp = dec === '.' ? ',' : '.';
    if (count(dec) > 1) return 'invalid';
  } else if (dots > 1 || commas > 1) {
    grp = dots ? '.' : ',';
  } else if (dots || commas) {
    const c = dots ? '.' : ',';
    const fracLen = core.length - core.indexOf(c) - 1;
    if (c === ld) dec = c;
    // Numpad-dot rule: in a comma-decimal locale, a lone '.' + 1..precision digits is a decimal.
    else if (
      c === '.' &&
      ld === ',' &&
      opts.precision <= 2 &&
      fracLen >= 1 &&
      fracLen <= opts.precision
    )
      dec = c;
    // Neither the locale's group nor its decimal + exactly 3 digits (ru '1.234'): don't guess.
    else if (c !== lg && fracLen === 3) return 'invalid';
    else if (c === lg || c === '.') grp = c;
    else dec = c;
    // '1,234' / '1.234' as a decimal below precision 3 could equally be grouping: don't guess.
    if (dec && fracLen === 3 && opts.precision < 3) return 'invalid';
  }
  const spaces = new Set(core.match(SPACE_GROUP) ?? []);
  if (spaces.size) {
    if (grp || spaces.size > 1) return 'invalid'; // one group char kind
    grp = [...spaces][0];
  }

  const at = dec ? core.indexOf(dec) : -1;
  const intPart = at < 0 ? core : core.slice(0, at);
  const fracPart = at < 0 ? null : core.slice(at + 1);
  if (fracPart !== null && !/^\d*$/.test(fracPart)) return 'invalid';
  if (grp) {
    const groups = intPart.split(grp);
    if (!/^\d{1,3}$/.test(groups[0]) || !groups.slice(1).every((g) => /^\d{3}$/.test(g))) {
      return 'invalid';
    }
  } else if (!/^\d*$/.test(intPart)) return 'invalid';

  const int = grp ? intPart.split(grp).join('') : intPart;
  // Full fraction: the caller truncates (whole-value paste) or rejects the overflow (partial paste).
  const frac = fracPart;
  return { negative, int, frac };
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
