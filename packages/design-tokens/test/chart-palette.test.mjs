import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The categorical chart palette (chart.series.N) is read in slot order: adjacent slots
// are what a viewer has to tell apart in a legend or a stacked bar. Gate the base order
// and every accent's re-order on hue separation for normal vision AND protan/deutan CVD.
// Thresholds are the palette's validated design floors (DS-5).
const document = JSON.parse(readFileSync(new URL('../src/tokens.json', import.meta.url), 'utf8'));

const LIGHTNESS = { light: [0.43, 0.77], dark: [0.48, 0.67] };
const MIN_CHROMA = 0.1;
const MIN_ADJACENT_NORMAL = 15;
const MIN_ADJACENT_CVD = 8;

// Machado, Oliveira & Fernandes (2009), severity 1.0, applied to linear sRGB.
const CVD = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};

const toLinear = (hex) =>
  [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

const multiply = (m, v) => m.map((row) => row.reduce((sum, k, i) => sum + k * v[i], 0));
const clamp01 = (v) => v.map((c) => Math.min(1, Math.max(0, c)));

// Linear sRGB -> OKLab (Ottosson).
function oklab([r, g, b]) {
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

const deltaE = (a, b) => 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const seriesIds = document.tokens
  .map((token) => token.id)
  .filter((id) => /^chart\.series\.\d+$/.test(id))
  .sort((a, b) => Number(a.split('.')[2]) - Number(b.split('.')[2]));

const base = Object.fromEntries(
  document.tokens.filter((token) => seriesIds.includes(token.id)).map((t) => [t.id, t.value]),
);

function palettes() {
  return [
    ['base', base],
    ...Object.entries(document.accents ?? {}).map(([accent, overrides]) => [
      accent,
      Object.fromEntries(seriesIds.map((id) => [id, overrides[id] ?? base[id]])),
    ]),
  ];
}

function paletteIssues(hexes, theme) {
  const issues = [];
  const labs = hexes.map((hex) => oklab(toLinear(hex)));
  labs.forEach(([L, a, b], i) => {
    const [min, max] = LIGHTNESS[theme];
    if (L < min || L > max) issues.push(`slot ${i + 1} ${hexes[i]} OKLCH L ${L.toFixed(3)}`);
    if (Math.hypot(a, b) < MIN_CHROMA) issues.push(`slot ${i + 1} ${hexes[i]} chroma too low`);
  });
  const simulated = Object.fromEntries(
    Object.entries(CVD).map(([kind, matrix]) => [
      kind,
      hexes.map((hex) => oklab(clamp01(multiply(matrix, toLinear(hex))))),
    ]),
  );
  for (let i = 1; i < hexes.length; i++) {
    const pair = `slots ${i}/${i + 1} (${hexes[i - 1]}, ${hexes[i]})`;
    const normal = deltaE(labs[i - 1], labs[i]);
    if (normal < MIN_ADJACENT_NORMAL) issues.push(`${pair} normal ΔE ${normal.toFixed(1)}`);
    for (const [kind, sim] of Object.entries(simulated)) {
      const d = deltaE(sim[i - 1], sim[i]);
      if (d < MIN_ADJACENT_CVD) issues.push(`${pair} ${kind} ΔE ${d.toFixed(1)}`);
    }
  }
  return issues;
}

test('chart palette has slots to check, and every accent override names a real slot', () => {
  assert.ok(seriesIds.length > 1);
  for (const [accent, overrides] of Object.entries(document.accents ?? {})) {
    for (const id of Object.keys(overrides).filter((key) => key.startsWith('chart.'))) {
      assert.ok(seriesIds.includes(id), `${accent}: ${id}`);
    }
  }
});

for (const [name, palette] of palettes()) {
  for (const theme of ['light', 'dark']) {
    test(`chart palette (${name}, ${theme}) separates adjacent slots for normal and CVD vision`, () => {
      assert.deepEqual(
        paletteIssues(
          seriesIds.map((id) => palette[id][theme]),
          theme,
        ),
        [],
      );
    });
  }
}

test('catches two close hues placed in adjacent slots', () => {
  // Brand blue next to brand violet: distinct for normal vision, near-identical for protans.
  assert.notDeepEqual(paletteIssues(['#2062ce', '#624bbc'], 'light'), []);
});
