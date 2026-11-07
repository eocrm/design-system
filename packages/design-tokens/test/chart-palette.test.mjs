import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { clamp01, contrast, multiply, oklab, toLinear } from './tooling/color-math.mjs';

// The categorical chart palette (chart.series.N) is read in slot order: adjacent slots
// are what a viewer has to tell apart in a legend or a stacked bar, and the first few
// slots are what most charts use. Gate the base order and every accent's re-order on
// hue separation for normal vision AND protan/deutan CVD.
// Thresholds are the palette's validated design floors (DS-5).
const document = JSON.parse(readFileSync(new URL('../src/tokens.json', import.meta.url), 'utf8'));

const LIGHTNESS = { light: [0.43, 0.77], dark: [0.48, 0.67] };
const MIN_CHROMA = 0.1;
const MIN_NORMAL = 15;
const MIN_CVD = 8;
// Series-cap rule: a chart with up to this many series must have every pair distinct.
const HEAD = 3;
// Moss leads with green, and green collapses against every warm hue for deutans; the best
// head (green, violet, magenta) reaches ~5.9 light / 6.2 dark. Accepted, like moss sitting
// close to --color-success (README "Known issue"); this floor keeps it from getting worse.
const HEAD_CVD_EXCEPTIONS = { moss: 5.5 };
// A hue under 3:1 on the light surface (gold) must not be one of the slots most charts use.
const FIRST_LOW_CONTRAST_SLOT = 6;

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

const deltaE = (a, b) => 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const tokenById = new Map(document.tokens.map((token) => [token.id, token]));
const surface = tokenById.get('color.background').value;

const seriesIds = document.tokens
  .map((token) => token.id)
  .filter((id) => /^chart\.series\.\d+$/.test(id))
  .sort((a, b) => Number(a.split('.')[2]) - Number(b.split('.')[2]));

const base = Object.fromEntries(seriesIds.map((id) => [id, tokenById.get(id).value]));

const palettes = [
  ['base', base],
  ...Object.entries(document.accents ?? {}).map(([accent, overrides]) => [
    accent,
    Object.fromEntries(seriesIds.map((id) => [id, overrides[id] ?? base[id]])),
  ]),
];

/** Pairs of slot indexes that fall under the normal-vision or CVD floor. */
function separationIssues(hexes, pairs, minCvd) {
  const normal = hexes.map((hex) => oklab(toLinear(hex)));
  const simulated = Object.entries(CVD).map(([kind, matrix]) => [
    kind,
    hexes.map((hex) => oklab(clamp01(multiply(matrix, toLinear(hex))))),
  ]);
  const issues = [];
  for (const [i, j] of pairs) {
    const pair = `slots ${i + 1}/${j + 1} (${hexes[i]}, ${hexes[j]})`;
    const d = deltaE(normal[i], normal[j]);
    if (d < MIN_NORMAL) issues.push(`${pair} normal ΔE ${d.toFixed(1)}`);
    for (const [kind, labs] of simulated) {
      const dc = deltaE(labs[i], labs[j]);
      if (dc < minCvd) issues.push(`${pair} ${kind} ΔE ${dc.toFixed(1)}`);
    }
  }
  return issues;
}

function paletteIssues(name, hexes, theme) {
  const issues = [];
  hexes.forEach((hex, i) => {
    const [L, a, b] = oklab(toLinear(hex));
    const [min, max] = LIGHTNESS[theme];
    if (L < min || L > max) issues.push(`slot ${i + 1} ${hex} OKLCH L ${L.toFixed(3)}`);
    if (Math.hypot(a, b) < MIN_CHROMA) issues.push(`slot ${i + 1} ${hex} chroma too low`);
    if (theme === 'light' && i + 1 < FIRST_LOW_CONTRAST_SLOT && contrast(hex, surface.light) < 3) {
      issues.push(`slot ${i + 1} ${hex} is under 3:1 on the surface but before slot 6`);
    }
  });
  const adjacent = hexes.slice(1).map((_, i) => [i, i + 1]);
  issues.push(...separationIssues(hexes, adjacent, MIN_CVD));
  const head = [];
  for (let i = 0; i < HEAD; i++) for (let j = i + 1; j < HEAD; j++) head.push([i, j]);
  issues.push(
    ...separationIssues(hexes, head, HEAD_CVD_EXCEPTIONS[name] ?? MIN_CVD).map((s) => `head ${s}`),
  );
  return issues;
}

test('chart palette has slots to check, and every accent override names a real slot', () => {
  assert.ok(seriesIds.length >= HEAD);
  for (const [accent, overrides] of Object.entries(document.accents ?? {})) {
    for (const id of Object.keys(overrides).filter((key) => key.startsWith('chart.'))) {
      assert.ok(seriesIds.includes(id), `${accent}: ${id}`);
    }
  }
});

test('every accent re-orders the base colours, light and dark kept as pairs', () => {
  const pairs = (palette) =>
    seriesIds.map((id) => `${palette[id].light}/${palette[id].dark}`).sort();
  for (const [name, palette] of palettes) {
    assert.deepEqual(pairs(palette), pairs(base), name);
  }
});

for (const [name, palette] of palettes) {
  for (const theme of ['light', 'dark']) {
    test(`chart palette (${name}, ${theme}) separates its slots for normal and CVD vision`, () => {
      assert.deepEqual(
        paletteIssues(
          name,
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
  assert.notDeepEqual(separationIssues(['#2062ce', '#624bbc'], [[0, 1]], MIN_CVD), []);
});
