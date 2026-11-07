// Colour math shared by the palette validators (chart-palette, heatmap-ramp).

/** `#rrggbb` -> linear sRGB [r, g, b]. */
export const toLinear = (hex) =>
  [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

export const multiply = (m, v) => m.map((row) => row.reduce((sum, k, i) => sum + k * v[i], 0));
export const clamp01 = (v) => v.map((c) => Math.min(1, Math.max(0, c)));

/** Linear sRGB -> OKLab [L, a, b] (Ottosson). */
export function oklab([r, g, b]) {
  const [l, m, s] = multiply(
    [
      [0.4122214708, 0.5363325363, 0.0514459929],
      [0.2119034982, 0.6806995451, 0.1073969566],
      [0.0883024619, 0.2817188376, 0.6299787005],
    ],
    [r, g, b],
  ).map(Math.cbrt);
  return multiply(
    [
      [0.2104542553, 0.793617785, -0.0040720468],
      [1.9779984951, -2.428592205, 0.4505937099],
      [0.0259040371, 0.7827717662, -0.808675766],
    ],
    [l, m, s],
  );
}

/** WCAG 2 contrast ratio of two `#rrggbb` colours. */
export function contrast(a, b) {
  const lum = (hex) => multiply([[0.2126, 0.7152, 0.0722]], toLinear(hex))[0];
  const [lo, hi] = [lum(a), lum(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}
