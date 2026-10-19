import {
  canonicalToDraft,
  currencyDisplayText,
  currencyName,
  currencyPrecision,
  currencySymbol,
  draftToCanonical,
  formatDraft,
  isValidCurrency,
  localeSeparators,
  parseAmount,
  roundAmount,
} from './currency';

const en = { locale: 'en-US', precision: 2, allowNegative: false };
const de = { locale: 'de-DE', precision: 2, allowNegative: false };
const parse = (t: string, o = en) => draftToCanonical(parseAmount(t, o)!);

describe('currency Intl helpers', () => {
  it('precision', () => {
    expect(currencyPrecision('USD')).toBe(2);
    expect(currencyPrecision('JPY')).toBe(0);
    expect(currencyPrecision('KWD')).toBe(3);
  });
  it('symbol / name / displayText', () => {
    expect(currencySymbol('CAD', 'en')).toBe('CA$');
    expect(currencyName('EUR', 'en')).toBe('Euro');
    expect(currencyDisplayText('EUR', 'code', 'en')).toBe('EUR');
    expect(currencyDisplayText('EUR', 'symbol', 'en')).toBe('€');
    expect(currencyDisplayText('EUR', 'both', 'en')).toBe('EUR €');
  });
  it('isValidCurrency never throws', () => {
    expect(isValidCurrency('EUR')).toBe(true);
    expect(isValidCurrency('XX')).toBe(false);
  });
});

describe('localeSeparators', () => {
  it('resolves group/decimal', () => {
    expect(localeSeparators('en-US')).toEqual({ group: ',', decimal: '.' });
    expect(localeSeparators('de-DE')).toEqual({ group: '.', decimal: ',' });
    const fr = localeSeparators('fr-FR');
    expect(fr.decimal).toBe(',');
    expect(fr.group).toMatch(/\s/u);
  });
});

describe('parseAmount / draftToCanonical', () => {
  it('parses per locale', () => {
    expect(parse('$1,234.56')).toBe('1234.56');
    expect(parse('1 234,56 €', { ...de, locale: 'fr-FR' })).toBe('1234.56');
    expect(parse('1.234,56', de)).toBe('1234.56');
  });
  it('numpad-dot rule', () => {
    expect(parse('12.50', de)).toBe('12.50');
    expect(parse('1.234', { ...de, precision: 3 })).toBe('1234');
    expect(parse('1.234', de)).toBe('1234');
  });
  it('truncates, empties, negatives', () => {
    expect(parse('1.23456')).toBe('1.23');
    expect(parseAmount('', en)).toBeNull();
    expect(parseAmount('  € ', en)).toBeNull();
    expect(parse('-5')).toBe('5');
    expect(parse('-5', { ...en, allowNegative: true })).toBe('-5');
    expect(draftToCanonical({ negative: true, int: '', frac: null })).toBeNull();
  });
  it('canonical edge cases', () => {
    expect(parse('12.')).toBe('12');
    expect(parse('007')).toBe('7');
    expect(parse('0')).toBe('0');
    expect(parse('.5')).toBe('0.5');
  });
});

describe('canonicalToDraft / formatDraft', () => {
  const f = (s: string, o: { locale: string; precision: number; pad: boolean }) =>
    formatDraft(canonicalToDraft(s)!, o);
  it('formats', () => {
    expect(f('1234.5', { locale: 'en-US', precision: 2, pad: true })).toBe('1,234.50');
    expect(f('1234.5', { locale: 'de-DE', precision: 2, pad: false })).toBe('1.234,5');
    expect(
      formatDraft(
        { negative: false, int: '12', frac: '' },
        { locale: 'en-US', precision: 2, pad: false },
      ),
    ).toBe('12.');
    expect(f('12345678901234567890.12', { locale: 'en-US', precision: 2, pad: false })).toBe(
      '12,345,678,901,234,567,890.12',
    );
    expect(f('12', { locale: 'en-US', precision: 0, pad: true })).toBe('12');
  });
  it('null round-trip', () => {
    expect(canonicalToDraft(null)).toBeNull();
  });
});

describe('roundAmount', () => {
  it('rounds half-up on strings', () => {
    expect(roundAmount('12.345', 2)).toBe('12.35');
    expect(roundAmount('9.995', 2)).toBe('10.00');
    expect(roundAmount('12.5', 0)).toBe('13');
    expect(roundAmount('-12.345', 2)).toBe('-12.35');
    expect(roundAmount('12', 2)).toBe('12');
  });
  it('never returns negative zero', () => {
    expect(roundAmount('-0.004', 2)).toBe('0.00');
    expect(roundAmount('-0.4', 0)).toBe('0');
    expect(roundAmount('-0.00', 2)).toBe('0.00');
  });
});

describe('draftToCanonical negative zero', () => {
  it('drops the sign when every digit is zero', () => {
    expect(draftToCanonical({ negative: true, int: '0', frac: null })).toBe('0');
    expect(draftToCanonical({ negative: true, int: '0', frac: '00' })).toBe('0.00');
    expect(draftToCanonical({ negative: true, int: '0', frac: '01' })).toBe('-0.01');
  });
});
