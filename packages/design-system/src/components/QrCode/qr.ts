import qrcode from 'qrcode-generator';

/**
 * Error-correction level — how much of the symbol can be destroyed and still
 * decode. `'L'` ~7%, `'M'` ~15%, `'Q'` ~25%, `'H'` ~30%.
 */
export type QrCodeLevel = 'L' | 'M' | 'Q' | 'H';

/** Quiet-zone width in modules. Four is the ISO/IEC 18004 minimum. */
const QUIET = 4;

/**
 * The share of the symbol's width the centre punch-out occupies. Kept well
 * under level `'H'`'s ~30% recovery budget, since the punch destroys modules
 * outright rather than degrading them.
 */
const PUNCH_RATIO = 0.24;

/**
 * UTF-8 bytes, re-expressed as a latin1 string.
 *
 * `qrcode-generator`'s default `stringToBytes` is `s.charCodeAt(i) & 0xff`,
 * which silently truncates every code point above U+00FF — `'Привет'` encodes
 * to garbage that still scans. Pre-encoding here turns that truncation into an
 * identity function, because every char we hand it is already a single byte.
 *
 * The usual fix, assigning `qrcode.stringToBytes = …`, is shared mutable state
 * on a module-level singleton: it would reach every other consumer of the
 * package inside the host app. This stays local.
 */
export function toByteString(value: string): string {
  return Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join('');
}

/** Characters that would terminate a CSS `url("…")` early. */
const CSS_URL_UNSAFE = /["'()\\\n\r]/g;

/**
 * Wrap a consumer-supplied URL in a CSS `url("…")`, percent-encoding anything
 * that could break out of the declaration. React does not sanitise custom
 * properties, so this is a trust boundary.
 *
 * `encodeURI` is the wrong tool: it double-encodes `%` in already-encoded URLs
 * and in `data:` URIs, which is most of what a logo is.
 */
export function cssUrl(src: string): string {
  const safe = src.replace(
    CSS_URL_UNSAFE,
    (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
  );
  return `url("${safe}")`;
}

/** Geometry for one encoded symbol, in module units. */
export interface QrMatrix {
  /** `viewBox` side — the module count plus both quiet zones. */
  side: number;
  /** A single SVG path covering every dark module, quiet-zone offset applied. */
  path: string;
  /** Side of the centred logo punch-out. Always odd, so it stays on module boundaries. */
  punch: number;
}

/**
 * Encode `value` and flatten it to SVG geometry. Returns `null` when there is
 * nothing to encode (empty value) or the value exceeds the largest version at
 * this level — both are the caller's error branch, never a throw.
 */
export function encodeQr(value: string, level: QrCodeLevel): QrMatrix | null {
  if (value === '') return null;

  try {
    const qr = qrcode(0, level); // 0 = pick the smallest version that fits
    qr.addData(toByteString(value)); // always Byte mode; addData has no auto-detection
    qr.make();

    const count = qr.getModuleCount();
    let path = '';
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) {
          path += `M${col + QUIET} ${row + QUIET}h1v1h-1z`;
        }
      }
    }

    // `| 1` rounds up to the next odd number. The module count is always odd,
    // so an odd punch keeps `(side - punch) / 2` integral. FLOOR, not ceil:
    // double-rounding up puts a v1 symbol's punch at 33% of its width, past
    // level H's budget. Flooring first caps the ratio at 28% for every version.
    return { side: count + QUIET * 2, path, punch: Math.floor(count * PUNCH_RATIO) | 1 };
  } catch {
    return null;
  }
}
