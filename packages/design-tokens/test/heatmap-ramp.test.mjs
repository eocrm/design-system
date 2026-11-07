import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { contrast, oklab, toLinear } from './tooling/color-math.mjs';

// The heatmap ramp (heatmap.1..5) is sequential: a viewer reads order from lightness, so it
// must step monotonically away from the surface, every step must be told from its neighbour,
// the lowest step must still read as "a value" against the background, and the highest must
// stand out as a graphic object (WCAG 1.4.11, 3:1). Exact values reach users via tooltip,
// announcement and table, so a per-cell 3:1 is not required. Floors from the DS-18 spec.
const document = JSON.parse(readFileSync(new URL('../src/tokens.json', import.meta.url), 'utf8'));

const MIN_ADJACENT = 0.06;
const MIN_FIRST_FROM_SURFACE = 0.04;
const MIN_LAST_CONTRAST = 3;
// The ramp's length is the documented contract: Heatmap maps up to five buckets onto steps 1..5.
const STEPS = 5;

const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lab = (hex) => oklab(toLinear(hex));
const tokenById = new Map(document.tokens.map((token) => [token.id, token]));
const surface = tokenById.get('color.background').value;

/** Ramp issues for one theme; `light` steps darken from the surface, `dark` steps lighten. */
function rampIssues(hexes, background, theme) {
  const issues = [];
  const labs = hexes.map(lab);
  for (let i = 1; i < labs.length; i++) {
    const [prev, cur] = [labs[i - 1][0], labs[i][0]];
    if (theme === 'light' ? cur >= prev : cur <= prev) {
      issues.push(
        `steps ${i}/${i + 1} lightness not monotonic (${prev.toFixed(3)}, ${cur.toFixed(3)})`,
      );
    }
    const d = deltaE(labs[i - 1], labs[i]);
    if (d < MIN_ADJACENT) issues.push(`steps ${i}/${i + 1} ΔE ${d.toFixed(3)}`);
  }
  const first = deltaE(labs[0], lab(background));
  if (first < MIN_FIRST_FROM_SURFACE) issues.push(`step 1 ΔE ${first.toFixed(3)} from surface`);
  const last = contrast(hexes[hexes.length - 1], background);
  if (last < MIN_LAST_CONTRAST) issues.push(`step ${hexes.length} contrast ${last.toFixed(2)}:1`);
  return issues;
}

const ids = Array.from({ length: STEPS }, (_, i) => `heatmap.${i + 1}`);

test('heatmap ramp defines every step with a web output', () => {
  for (const [i, id] of ids.entries()) {
    const token = tokenById.get(id);
    assert.ok(token, id);
    assert.equal(token.outputs?.web?.name, `--color-heatmap-${i + 1}`);
  }
});

for (const theme of ['light', 'dark']) {
  test(`heatmap ramp (${theme}) is sequential and readable on the surface`, () => {
    const hexes = ids.map((id) => tokenById.get(id)?.value?.[theme]);
    assert.ok(hexes.every(Boolean), 'every step has a value');
    assert.deepEqual(rampIssues(hexes, surface[theme], theme), []);
  });
}

test('catches a ramp that steps back, crowds its neighbours or fades out', () => {
  // Lightness reversal between steps 2 and 3, near-identical steps 4/5, last step under 3:1.
  assert.notDeepEqual(
    rampIssues(['#dbe9ff', '#aac6f2', '#bcd2f5', '#c8daf7', '#c9dbf7'], '#ffffff', 'light'),
    [],
  );
  // Step 1 indistinguishable from the surface.
  assert.ok(
    rampIssues(['#fdfdff', '#aac6f2', '#729fe9', '#407adb', '#1957bb'], '#ffffff', 'light').some(
      (s) => s.startsWith('step 1'),
    ),
  );
});
