import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The `color` + `tone` collision table is published TWICE — in the `color`
 * JSDoc on `CalendarEvent` and in AGENTS.md — and both are read by the agents
 * that pick category colours for a tenant. Neither was computed from anything;
 * both were measured once by hand and pasted.
 *
 * Then #484 raised `danger`, `success` and `accent` to clear WCAG AA, which
 * moved three of the four band colours and silently invalidated both copies in
 * the UNDER-warning direction: `success` + `mint` went 18 -> 11, becoming the
 * worst pair in the library, while the docs still rated it mid-table and still
 * named a different pair as the worst. An agent reading that would have picked
 * `mint` for a category whose events go `success` and shipped an invisible band.
 *
 * So the table is recomputed here from the shipped tokens and both copies are
 * checked against it. The numbers in the docs are now a claim this file tests,
 * not a memory.
 */

const TOKENS = readFileSync(
  resolve(__dirname, '../../../../design-tokens/generated/web/tokens.scss'),
  'utf8',
);

/** The four band colours, as `Calendar.tokens.scss` resolves them. */
const BANDS = {
  accent: '--color-accent',
  success: '--color-success',
  warning: '--color-warning-strong',
  danger: '--color-danger',
} as const;

/**
 * Only pairs at or under this distance are documented. Sits between the closest
 * pair the original hand-measured table listed (`warning` + `amber`, 44.4) and
 * the closest it left out (`warning` + `gold`, 44.7), so this gate expects
 * exactly what that table's author was expecting and does not silently widen
 * or narrow the docs' scope.
 */
const CUTOFF = 44.5;

function literal(name: string): string {
  const raw = new RegExp(`(?:^|[^-a-z0-9])${name}:\\s*([^;]+);`, 'm').exec(TOKENS)?.[1]?.trim();
  if (!raw) throw new Error(`${name} is not declared`);
  return raw.startsWith('var(') ? literal(raw.slice(4, -1).split(',')[0].trim()) : raw;
}

/**
 * Plain RGB distance, deliberately. This gate is not asking "can a person tell
 * these apart" — the contrast suite owns that question and answers it in OKLab.
 * It is asking whether two published numbers still equal the measurement they
 * were derived from, so it has to use the metric the docs were written in.
 */
function distance(a: string, b: string): number {
  const channels = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16));
  const [x, y] = [channels(a), channels(b)];
  return Math.hypot(...x.map((v, i) => v - y[i]));
}

/** Every band/category pair at or under the cutoff, worst first. */
function measured(): { tone: string; color: string; rounded: number }[] {
  const palette = [
    ...new Set([...TOKENS.matchAll(/--color-palette-([a-z]+)-fg:/g)].map((m) => m[1])),
  ];
  return Object.entries(BANDS)
    .flatMap(([tone, token]) =>
      palette.map((color) => ({
        tone,
        color,
        raw: distance(literal(token), literal(`--color-palette-${color}-fg`)),
      })),
    )
    .filter((p) => p.raw <= CUTOFF)
    .sort((a, b) => a.raw - b.raw)
    .map(({ tone, color, raw }) => ({ tone, color, rounded: Math.round(raw) }));
}

/**
 * Narrows a doc to just the collision table. Both copies mention these tone
 * names elsewhere, so anchoring on the measurement sentence is what keeps the
 * parse from wandering into unrelated prose.
 */
function tableRegion(text: string): string {
  const start = text.toLowerCase().indexOf('measured rgb distance');
  const end = text.indexOf('Nothing enforces this', start);
  if (start < 0 || end < 0) throw new Error('collision table region not found');
  return text.slice(start, end);
}

/**
 * Pulls the `tone` -> [color, n] mapping out of a table region. The two copies
 * are formatted differently — a bullet per tone in the JSDoc, one running
 * sentence in AGENTS.md — so this splits on whichever tone name comes next
 * rather than on layout.
 */
function documented(text: string, tone: string): Map<string, number> {
  const region = tableRegion(text);
  const anchors = [...region.matchAll(/`(?:tone: ')?(accent|success|warning|danger)'?`/g)];
  const found = new Map<string, number>();
  for (const [i, anchor] of anchors.entries()) {
    if (anchor[1] !== tone) continue;
    const from = anchor.index! + anchor[0].length;
    const segment = region.slice(from, anchors[i + 1]?.index ?? region.length);
    for (const [, color, n] of segment.matchAll(/`([a-z]+)`\s*\((\d+)\)/g)) {
      found.set(color, Number(n));
    }
  }
  return found;
}

describe('the documented color/tone collision table matches the shipped tokens', () => {
  const rows = measured();
  const sources: [label: string, text: string][] = [
    ['CalendarEvent.color JSDoc', readFileSync(resolve(__dirname, 'types.ts'), 'utf8')],
    ['AGENTS.md', readFileSync(resolve(__dirname, '../../../AGENTS.md'), 'utf8')],
  ];

  it('finds pairs to document at all', () => {
    // Guards the guard: if the palette or the band tokens are ever renamed,
    // every assertion below would vacuously pass on an empty list.
    expect(rows.length).toBeGreaterThan(8);
  });

  it.each(sources)('%s lists every colliding pair with the right number', (_label, text) => {
    for (const tone of Object.keys(BANDS)) {
      const docs = documented(text, tone);
      const real = rows.filter((r) => r.tone === tone);
      for (const { color, rounded } of real) {
        expect(docs.get(color), `${tone} + ${color} is documented`).toBeDefined();
        // ±1 absorbs rounding at the boundary, nothing more. #484 moved these
        // by 5-19, which is what this needs to catch.
        expect(
          Math.abs((docs.get(color) ?? 0) - rounded),
          `${tone} + ${color}`,
        ).toBeLessThanOrEqual(1);
      }
      for (const color of docs.keys()) {
        expect(
          real.some((r) => r.color === color),
          `${tone} + ${color} is documented but no longer collides`,
        ).toBe(true);
      }
    }
  });

  it.each(sources)('%s names the actual worst pair as effectively invisible', (_label, text) => {
    // The calibration sentence is the part a reader anchors on, and it named
    // the wrong pair for the whole of #484 until this gate existed.
    const worst = rows[0];
    // Flattened first: prettier rewraps the JSDoc copy, so the phrase can land
    // across a line break with a ` * ` in the middle of it.
    const flat = text.replace(/\n\s*\*?\s*/g, ' ');
    const at = flat.indexOf('effectively invisible');
    expect(at, 'the calibration sentence exists').toBeGreaterThan(-1);
    const sentence = flat.slice(at - 300, at + 100);
    expect(sentence).toContain(`\`${worst.color}\``);
    expect(sentence).toContain(`\`${worst.tone}\``);
  });
});
