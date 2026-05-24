/**
 * Hue-saturation-value color representation. h is 0–360 (degrees, wraps),
 * s and v are 0–100 (percentages).
 *
 * HSV is the internal model used by the SV square (S+V axes) and the hue
 * strip (H axis). HEX (`#RRGGBB`) is the storage format exposed to consumers.
 */
export interface HSV {
  /** Hue in degrees, 0–360 (0 = red, 120 = green, 240 = blue). */
  h: number;
  /** Saturation as a percentage, 0 (gray) to 100 (full color). */
  s: number;
  /** Value (brightness) as a percentage, 0 (black) to 100 (full brightness). */
  v: number;
}

// Loose hex pattern: optional leading #, then 3 or 6 hex characters. We
// canonicalize on output to `#RRGGBB` (uppercase, full 6 chars, with hash).
const HEX_PATTERN = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * Normalize a loose hex string to the canonical `#RRGGBB` form (uppercase,
 * full 6 chars, with leading `#`). Accepts:
 * - `#FFF` / `FFF` (3-char shorthand, expanded by doubling each digit)
 * - `#FFFFFF` / `FFFFFF` / `#ffffff` (6-char)
 *
 * @returns the normalized string, or `null` if the input doesn't match.
 *
 * @example
 * normalizeHex('#fff')      // '#FFFFFF'
 * normalizeHex('FFF')       // '#FFFFFF'
 * normalizeHex('#4f46e5')   // '#4F46E5'
 * normalizeHex('orange')    // null
 * normalizeHex('')          // null
 */
export function normalizeHex(input: string): string | null {
  const match = HEX_PATTERN.exec(input.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${hex.toUpperCase()}`;
}

/**
 * Convert a hex color string to HSV. Accepts the same loose input forms as
 * `normalizeHex`. Returns `null` for invalid input — callers should fall
 * back to a known-good HSV (e.g. `{ h: 0, s: 0, v: 0 }`) when this returns
 * `null`.
 *
 * @example
 * hexToHsv('#FF0000')  // { h: 0,   s: 100, v: 100 }
 * hexToHsv('#000000')  // { h: 0,   s: 0,   v: 0   }
 * hexToHsv('orange')   // null
 */
export function hexToHsv(input: string): HSV | null {
  const normalized = normalizeHex(input);
  if (!normalized) return null;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

/**
 * Convert HSV to a canonical `#RRGGBB` hex string. Out-of-range inputs are
 * clamped silently (hue wraps modulo 360, s/v clamp to [0, 100]).
 *
 * @example
 * hsvToHex({ h: 0,   s: 100, v: 100 })  // '#FF0000'
 * hsvToHex({ h: 120, s: 100, v: 100 })  // '#00FF00'
 * hsvToHex({ h: 0,   s: 0,   v: 0   })  // '#000000'
 */
export function hsvToHex({ h, s, v }: HSV): string {
  // NOTE: ColorPickerPanel's local-HSV-state-of-truth model depends on
  // (localHsv → hex → localHsv) being a fixed point. If you change the
  // rounding strategy (e.g., switch Math.round to Math.floor below), the
  // useEffect([value]) external-write detection in ColorPickerPanel.tsx
  // can flip from "no-op" to "infinite re-sync" because the round-trip
  // hex no longer matches what we just emitted. Test the round-trip on
  // colorMath.test.tsx's palette before merging changes here.

  // Clamp / wrap inputs so consumers passing slightly out-of-range values
  // (e.g. from a slider that overshoots by floating-point) get sane output.
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const val = Math.max(0, Math.min(100, v)) / 100;

  const c = val * sat;
  const hp = hue / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) {
    r1 = c;
    g1 = x;
  } else if (hp < 2) {
    r1 = x;
    g1 = c;
  } else if (hp < 3) {
    g1 = c;
    b1 = x;
  } else if (hp < 4) {
    g1 = x;
    b1 = c;
  } else if (hp < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  const m = val - c;
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`.toUpperCase();
}
