import {
  getCountryOptions,
  parseE164,
  formatNational,
  toE164,
  isValidPhone,
  isoToFlag,
  countryDisplayLabel,
} from './phone';
import type { CountryOption } from './phone';

describe('phone engine', () => {
  describe('getCountryOptions', () => {
    it('returns every country with a calling code, sorted by name', () => {
      const all = getCountryOptions('en');
      expect(all.length).toBeGreaterThan(200);
      const gb = all.find((c) => c.iso === 'GB');
      const us = all.find((c) => c.iso === 'US');
      expect(gb).toMatchObject({ iso: 'GB', callingCode: '44' });
      expect(us).toMatchObject({ iso: 'US', callingCode: '1' });
      expect(gb!.name.length).toBeGreaterThan(0);
      // sorted by name (ascending)
      const names = all.map((c) => c.name);
      expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
    });

    it('restricts to a provided country subset', () => {
      const some = getCountryOptions('en', ['GB', 'US']);
      expect(some.map((c) => c.iso).sort()).toEqual(['GB', 'US']);
    });

    it('ignores unknown ISO codes in the subset', () => {
      const some = getCountryOptions('en', ['US', 'ZZ']);
      expect(some.map((c) => c.iso)).toEqual(['US']);
    });
  });

  describe('parseE164', () => {
    it('parses a valid E.164 into country + national', () => {
      const r = parseE164('+12025550123');
      expect(r).not.toBeNull();
      expect(r!.country).toBe('US');
      expect(r!.national).toContain('202');
    });
    it('returns null for an unparseable string', () => {
      expect(parseE164('not a phone')).toBeNull();
    });
    it('resolves the country from the calling code when not directly inferable', () => {
      const r = parseE164('+447700900123');
      expect(r).not.toBeNull();
      expect(r!.country).toBe('GB');
    });
  });

  describe('formatNational (as-you-type)', () => {
    it('formats a US national number progressively', () => {
      expect(formatNational('2025550123', 'US')).toBe('(202) 555-0123');
    });
  });

  describe('toE164', () => {
    it('produces canonical E.164 from a national input', () => {
      expect(toE164('(202) 555-0123', 'US')).toBe('+12025550123');
    });
    it('returns null for an empty input', () => {
      expect(toE164('', 'US')).toBeNull();
    });
    it('returns null for a partial (not-yet-complete) input', () => {
      expect(toE164('202', 'US')).toBeNull();
    });
    it('emits E.164 only once the number is possibly complete', () => {
      expect(toE164('2025550123', 'US')).toBe('+12025550123');
    });
  });

  describe('isValidPhone', () => {
    it('accepts a valid E.164 number', () => {
      expect(isValidPhone('+12025550123')).toBe(true);
    });
    it('rejects too-short, empty, and null', () => {
      expect(isValidPhone('+1202')).toBe(false);
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone(null)).toBe(false);
    });
  });

  describe('isoToFlag', () => {
    it('maps an ISO alpha-2 code to its emoji flag', () => {
      expect(isoToFlag('US')).toBe('🇺🇸');
      expect(isoToFlag('gb')).toBe('🇬🇧');
    });
    it('strips non-letters and never throws on junk input', () => {
      expect(isoToFlag('')).toBe('');
      expect(isoToFlag('1')).toBe('');
      // junk-in/junk-out but safe: the stray digit is dropped, leaving one indicator
      expect(isoToFlag('U1')).toBe(String.fromCodePoint(0x1f1fa));
    });
  });

  describe('countryDisplayLabel', () => {
    const us: CountryOption = { iso: 'US', name: 'United States', callingCode: '1' };
    it('formats each display mode', () => {
      expect(countryDisplayLabel(us, 'code')).toBe('+1');
      expect(countryDisplayLabel(us, 'iso')).toBe('US +1');
      expect(countryDisplayLabel(us, 'name')).toBe('United States +1');
      expect(countryDisplayLabel(us, 'flag')).toBe('🇺🇸 +1');
    });
  });
});
