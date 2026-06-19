import { getCountryOptions, parseE164, formatNational, toE164, isValidPhone } from './phone';

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
});
