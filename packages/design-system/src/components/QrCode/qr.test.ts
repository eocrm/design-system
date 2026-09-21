import qrcode from 'qrcode-generator';
import { cssUrl, encodeQr, toByteString } from './qr';

const URL_VALUE = 'https://example.com/invoice/42';

describe('toByteString', () => {
  it('passes ASCII through unchanged', () => {
    expect(toByteString('HELLO')).toBe('HELLO');
  });

  it('expands non-ASCII to its UTF-8 bytes', () => {
    // U+041F -> 0xD0 0x9F. The encoder's default stringToBytes is
    // `charCodeAt(i) & 0xff`, which would turn this single char into 0x1F.
    expect(toByteString('П')).toBe('Ð\u009f');
    expect(toByteString('Привет')).toHaveLength(12);
  });
});

describe('cssUrl', () => {
  it('wraps a plain URL', () => {
    expect(cssUrl('/logo.svg')).toBe('url("/logo.svg")');
  });

  it('percent-encodes characters that would break out of the declaration', () => {
    expect(cssUrl('a"b')).toBe('url("a%22b")');
    expect(cssUrl("a'b")).toBe('url("a%27b")');
    expect(cssUrl('a(b')).toBe('url("a%28b")');
    expect(cssUrl('a)b')).toBe('url("a%29b")');
    expect(cssUrl('a\\b')).toBe('url("a%5cb")');
    expect(cssUrl('a\nb')).toBe('url("a%0ab")');
    expect(cssUrl('a\fb')).toBe('url("a%0cb")');
  });

  it('leaves an already-encoded data URI alone', () => {
    const uri = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4%3D';
    expect(cssUrl(uri)).toBe(`url("${uri}")`);
  });
});

describe('encodeQr', () => {
  it('returns null for an empty value', () => {
    expect(encodeQr('', 'M')).toBeNull();
  });

  it('returns null when the value exceeds the largest version', () => {
    expect(encodeQr('x'.repeat(5000), 'H')).toBeNull();
  });

  it('surrounds the modules with a 4-module quiet zone on every side', () => {
    const reference = qrcode(0, 'M');
    reference.addData(URL_VALUE);
    reference.make();

    expect(encodeQr(URL_VALUE, 'M')!.side).toBe(reference.getModuleCount() + 8);
  });

  it('emits exactly one path command per dark module', () => {
    const reference = qrcode(0, 'M');
    reference.addData(URL_VALUE);
    reference.make();

    const count = reference.getModuleCount();
    let dark = 0;
    for (let r = 0; r < count; r += 1) {
      for (let c = 0; c < count; c += 1) {
        if (reference.isDark(r, c)) dark += 1;
      }
    }

    expect(encodeQr(URL_VALUE, 'M')!.path.match(/M/g)).toHaveLength(dark);
  });

  it('offsets every module by the quiet zone', () => {
    // No command may address a coordinate below 4.
    const { path } = encodeQr(URL_VALUE, 'M')!;
    const coords = [...path.matchAll(/M(\d+) (\d+)h/g)].flatMap((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
    expect(Math.min(...coords)).toBeGreaterThanOrEqual(4);
  });

  it('encodes non-ASCII as UTF-8, not latin1', () => {
    // Regression guard. qrcode-generator's default stringToBytes truncates
    // every code point above U+00FF, so an unescaped value encodes fewer
    // bytes — a smaller, WRONG symbol that still renders and still scans,
    // just to garbage.
    const value = 'Привет, мир! Это тестовая строка.';

    const correct = qrcode(0, 'M');
    correct.addData(toByteString(value));
    correct.make();

    const lossy = qrcode(0, 'M');
    lossy.addData(value);
    lossy.make();

    expect(correct.getModuleCount()).toBeGreaterThan(lossy.getModuleCount());
    expect(encodeQr(value, 'M')!.side).toBe(correct.getModuleCount() + 8);
  });

  it('gives the logo punch an odd side so it lands on module boundaries', () => {
    const { side, punch } = encodeQr(URL_VALUE, 'H')!;
    expect(punch % 2).toBe(1);
    expect((side - punch) / 2).toBe(Math.floor((side - punch) / 2));
  });

  it('keeps the punch far inside level H error-correction budget at every symbol size', () => {
    // Level H's ~30% recovers a fraction of CODEWORDS, so the comparable
    // quantity is the punch's share of the symbol's AREA, not of its width.
    // The short value produces a 21-module v1 symbol, the small-end case the
    // URL never reaches — and the one where a double round-up overshoots
    // (ceil peaks at ~11% of the area there, flooring at 7.8%).
    for (const value of ['hi', URL_VALUE, 'x'.repeat(900)]) {
      const { side, punch } = encodeQr(value, 'H')!;
      const count = side - 8;

      expect((punch * punch) / (count * count)).toBeLessThan(0.1);
      expect(punch % 2).toBe(1);
    }
  });
});
