import qrcode from 'qrcode-generator';
import { cssUrl, encodeQr, snapWidth, toByteString } from './qr';

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

describe('snapWidth', () => {
  it('paints the largest exact multiple that fits', () => {
    // 41 modules in a 320px box at dpr 1: 7px/module fits (287), 8 would not.
    expect(snapWidth(320, 41, 1)).toBe(287);
    expect(snapWidth(320, 21, 1)).toBe(315); // 15px/module
  });

  it('refuses a snap that would cost more than an eighth of the width', () => {
    // Scannability tracks the ABSOLUTE module size, so the shrink is bounded.
    // Each of these would snap happily without the budget:
    expect(snapWidth(200, 41, 1)).toBeNull(); // would be 164 — 18% given up
    expect(snapWidth(120, 41, 1)).toBeNull(); // would be 82 — 32%
    expect(snapWidth(320, 177, 1)).toBeNull(); // would be 177 — 45%
  });

  it('pins the eighth from both sides', () => {
    // 21 modules, dpr 1, scale 4 -> 84px painted. The budget allows a
    // shortfall of exactly available/8, so the break-even box is 96px.
    expect(snapWidth(96, 21, 1)).toBe(84); // 12 of 96 given up — exactly 1/8
    expect(snapWidth(96.5, 21, 1)).toBeNull(); // 12.5 of 96.5 — just over
  });

  it('never paints wider than the box it was given', () => {
    for (const available of [120, 199.5, 200, 321.7, 480]) {
      for (const side of [21, 41, 57, 177]) {
        const painted = snapWidth(available, side, 1);
        if (painted !== null) expect(painted).toBeLessThanOrEqual(available);
      }
    }
  });

  it('counts DEVICE pixels, not CSS pixels', () => {
    // At dpr 2 a 320px box holds 640 device px: 15px/module = 615 device px
    // = 307.5 CSS px. A dpr-blind implementation would answer 287.
    expect(snapWidth(320, 41, 2)).toBe(307.5);
  });

  it('gives every module a whole number of device pixels', () => {
    for (const dpr of [1, 1.5, 2, 3]) {
      for (const side of [21, 41, 57, 177]) {
        const painted = snapWidth(320, side, dpr);
        if (painted === null) continue;
        const devicePxPerModule = (painted * dpr) / side;
        expect(devicePxPerModule).toBe(Math.round(devicePxPerModule));
      }
    }
  });

  it('returns null when it cannot measure or cannot fit a single pixel', () => {
    expect(snapWidth(0, 41, 1)).toBeNull(); // SSR / jsdom report 0
    expect(snapWidth(40, 41, 1)).toBeNull(); // under 1 device px per module
    expect(snapWidth(-10, 41, 1)).toBeNull();
    expect(snapWidth(320, 0, 1)).toBeNull();
    expect(snapWidth(320, 41, 0)).toBeNull();
    expect(snapWidth(Number.NaN, 41, 1)).toBeNull();
  });
});
