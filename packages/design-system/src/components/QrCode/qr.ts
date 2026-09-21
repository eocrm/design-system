import qrcode from 'qrcode-generator';

/**
 * Error-correction level — how much of the symbol can be destroyed and still
 * decode. `'L'` ~7%, `'M'` ~15%, `'Q'` ~25%, `'H'` ~30%.
 */
export type QrCodeLevel = 'L' | 'M' | 'Q' | 'H';

/** Quiet-zone width in modules. Four is the ISO/IEC 18004 minimum. */
const QUIET = 4;

/**
 * The share of the symbol's WIDTH the centre punch-out occupies.
 *
 * Note the dimensions: level `'H'`'s ~30% recovery budget is a fraction of
 * codewords, i.e. of AREA, so a width ratio is not directly comparable to it.
 * After the odd-rounding below the realised width peaks at 28%, which is 7.8%
 * of the area — nowhere near the limit. The real constraint on this number is
 * visual, not arithmetic: bigger than about a quarter of the width and the
 * mark stops reading as a mark in a code and starts reading as a hole punched
 * through one.
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

/**
 * Characters that would terminate a CSS `url("…")` early. Includes `\f`
 * (U+000C FORM FEED): CSS input preprocessing (CSS Syntax Level 3 §3.3)
 * converts every form feed to a line feed before tokenizing, so it is a
 * newline for this purpose and closes the same breakout as `\n` and `\r`.
 */
const CSS_URL_UNSAFE = /["'()\\\n\r\f]/g;

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
    // double-rounding up puts a v1 symbol's punch at 33% of its width. Both
    // variants sit inside level H's budget on area (7.8% flooring, ~11%
    // ceiling, against ~30%) — flooring wins on looks, not on arithmetic. It
    // caps the width at 28% for every version.
    //
    // Boundary the area maths does NOT cover: from version 7 up (59 bytes at
    // level 'H', which is the default whenever `logo` is set) there is a centre
    // alignment pattern, and the punch lands on it. Reed–Solomon protects data
    // and ECC codewords, not function patterns, so no amount of budget buys
    // that back. Decoders in practice extrapolate the module grid from the
    // finder and timing patterns — which is why every commercial logo-QR
    // generator gets away with it — but it is extrapolation, not recovery, and
    // nothing here would notice it breaking. The playground demo carries an
    // over-v7 logo example so the case is scannable by hand.
    return { side: count + QUIET * 2, path, punch: Math.floor(count * PUNCH_RATIO) | 1 };
  } catch {
    return null;
  }
}

/**
 * The largest painted width, in CSS pixels, that gives every module a whole
 * number of DEVICE pixels — or `null` when that is impossible.
 *
 * A QR symbol only looks sharp at an integer scale. Off it, both rendering
 * modes lose: `shape-rendering: crispEdges` rounds each module's edges to the
 * pixel grid independently, so neighbours come out different widths (a measured
 * 4.878px/module rendered as a mix of 4px and 5px), while default antialiasing
 * keeps the geometry even but spends most of a pixel blending every edge.
 *
 * Returns `null` when there is nothing to measure (`available` of 0, as SSR and
 * jsdom report) or when the box cannot fit even one device pixel per module. In
 * both cases the caller should fall back to fluid width WITHOUT `crispEdges` —
 * unsnapped, `crispEdges` is the worse of the two.
 */
export function snapWidth(available: number, side: number, dpr: number): number | null {
  if (!(available > 0) || !(side > 0) || !(dpr > 0)) return null;
  const scale = Math.floor((available * dpr) / side);
  return scale >= 1 ? (side * scale) / dpr : null;
}
