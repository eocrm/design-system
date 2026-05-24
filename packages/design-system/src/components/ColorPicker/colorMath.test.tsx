import { hexToHsv, hsvToHex, normalizeHex, type HSV } from './colorMath';

describe('normalizeHex', () => {
  it.each([
    ['#fff', '#FFFFFF'],
    ['FFF', '#FFFFFF'],
    ['#FFFFFF', '#FFFFFF'],
    ['ffffff', '#FFFFFF'],
    ['#4f46e5', '#4F46E5'],
    ['4F46E5', '#4F46E5'],
    ['  #4f46e5  ', '#4F46E5'], // trims whitespace
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeHex(input)).toBe(expected);
  });

  it.each([['orange'], [''], ['#GGG'], ['12345'], ['#12'], ['##FFFFFF']])(
    'returns null for invalid input %s',
    (input) => {
      expect(normalizeHex(input)).toBeNull();
    },
  );
});

describe('hexToHsv', () => {
  it.each<[string, HSV]>([
    ['#FF0000', { h: 0, s: 100, v: 100 }],
    ['#00FF00', { h: 120, s: 100, v: 100 }],
    ['#0000FF', { h: 240, s: 100, v: 100 }],
    ['#FFFFFF', { h: 0, s: 0, v: 100 }],
    ['#000000', { h: 0, s: 0, v: 0 }],
    ['#FFFF00', { h: 60, s: 100, v: 100 }],
    ['#00FFFF', { h: 180, s: 100, v: 100 }],
    ['#FF00FF', { h: 300, s: 100, v: 100 }],
  ])('converts %s to HSV', (hex, expected) => {
    const result = hexToHsv(hex)!;
    expect(result.h).toBeCloseTo(expected.h, 1);
    expect(result.s).toBeCloseTo(expected.s, 1);
    expect(result.v).toBeCloseTo(expected.v, 1);
  });

  it('converts #808080 to approximately (0, 0, 50)', () => {
    const result = hexToHsv('#808080')!;
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.v).toBeCloseTo(50, 0); // 128/255 ≈ 50.2
  });

  it('accepts loose input', () => {
    const result = hexToHsv('fff')!;
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.v).toBe(100);
  });

  it.each([['orange'], [''], ['#GGG'], ['12345']])('returns null for invalid input %s', (input) => {
    expect(hexToHsv(input)).toBeNull();
  });
});

describe('hsvToHex', () => {
  it.each<[HSV, string]>([
    [{ h: 0, s: 100, v: 100 }, '#FF0000'],
    [{ h: 120, s: 100, v: 100 }, '#00FF00'],
    [{ h: 240, s: 100, v: 100 }, '#0000FF'],
    [{ h: 0, s: 0, v: 100 }, '#FFFFFF'],
    [{ h: 0, s: 0, v: 0 }, '#000000'],
    [{ h: 60, s: 100, v: 100 }, '#FFFF00'],
    [{ h: 180, s: 100, v: 100 }, '#00FFFF'],
    [{ h: 300, s: 100, v: 100 }, '#FF00FF'],
  ])('converts %o to %s', (hsv, expected) => {
    expect(hsvToHex(hsv)).toBe(expected);
  });

  it('outputs uppercase #RRGGBB', () => {
    const result = hsvToHex({ h: 219, s: 69, v: 90 });
    expect(result).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('clamps out-of-range saturation and value', () => {
    expect(hsvToHex({ h: 0, s: -10, v: 100 })).toBe('#FFFFFF');
    expect(hsvToHex({ h: 0, s: 150, v: 100 })).toBe('#FF0000');
    expect(hsvToHex({ h: 0, s: 100, v: 150 })).toBe('#FF0000');
  });

  it('wraps out-of-range hue', () => {
    expect(hsvToHex({ h: 360, s: 100, v: 100 })).toBe('#FF0000');
    expect(hsvToHex({ h: 720, s: 100, v: 100 })).toBe('#FF0000');
    expect(hsvToHex({ h: -120, s: 100, v: 100 })).toBe('#0000FF');
  });
});

describe('round-trip stability', () => {
  const palette = [
    '#FF0000',
    '#4F46E5',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#FFFFFF',
    '#000000',
    '#808080',
    '#FFFF00',
    '#00FFFF',
    '#FF00FF',
    '#123456',
  ];

  it.each(palette)('hsvToHex(hexToHsv(%s)) === %s', (hex) => {
    expect(hsvToHex(hexToHsv(hex)!)).toBe(hex);
  });
});
