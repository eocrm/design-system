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

const CALENDAR_TOKENS = readFileSync(resolve(__dirname, 'Calendar.tokens.scss'), 'utf8');

/**
 * The tones a band can take, resolved THROUGH `Calendar.tokens.scss` rather
 * than named directly. Naming the primitives would have measured the right
 * colours today and kept measuring them after someone re-aimed
 * `--calendar-event-stripe-danger` at a different token — publishing distances
 * for a colour the Calendar no longer paints, which is the exact drift one
 * indirection up from the one this file exists to catch.
 */
const TONES = ['accent', 'success', 'warning', 'danger'] as const;

function bandToken(tone: string): string {
  const all = [
    ...CALENDAR_TOKENS.matchAll(
      new RegExp(`(?:^|[^-a-z0-9])--calendar-event-stripe-${tone}:\\s*var\\(([^)]+)\\)`, 'g'),
    ),
  ].map((m) => m[1].trim());
  if (!all.length) throw new Error(`--calendar-event-stripe-${tone} is not declared as a var()`);
  // Every declaration, not the first — reading only the first is the hole the
  // ring gate in contrast.test.ts already had to close once.
  if (new Set(all).size > 1) {
    throw new Error(`--calendar-event-stripe-${tone} declarations disagree: ${[...new Set(all)]}`);
  }
  return all[0];
}

/**
 * Only pairs at or under this distance are documented. Sits between the closest
 * pair the original hand-measured table listed (`warning` + `amber`, 44.4) and
 * the closest it left out (`warning` + `gold`, 44.7), so this gate expects
 * exactly what that table's author was expecting and does not silently widen
 * or narrow the docs' scope.
 */
const CUTOFF = 44.5;

function literal(name: string): string {
  const raw = new RegExp(`(?:^|[^-a-z0-9])${name}:\\s*([^;\\n]+);`, 'm').exec(TOKENS)?.[1]?.trim();
  if (!raw) throw new Error(`${name} is not declared`);
  if (raw.startsWith('var(')) return literal(raw.slice(4, -1).split(',')[0].trim());
  // Anything that is neither an alias nor a 6-digit hex would NaN its way
  // through distance(), drop silently out of `rows`, and leave the docs passing
  // while describing a pair nothing measures.
  if (!/^#[0-9a-f]{6}$/i.test(raw)) throw new Error(`${name} is not a 6-digit hex: ${raw}`);
  return raw;
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
  return TONES.flatMap((tone) =>
    palette.map((color) => ({
      tone,
      color,
      raw: distance(literal(bandToken(tone)), literal(`--color-palette-${color}-fg`)),
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
  const lower = text.toLowerCase();
  // Both markers must be UNIQUE, not merely present. indexOf takes the first
  // occurrence, so a second "Measured RGB distance" earlier in the file widens
  // the region upstream — and a correct-looking calibration planted up there
  // then satisfies every check while the real table carries none. That is the
  // same failure this region was introduced to stop, one level up.
  const starts = [...lower.matchAll(/measured rgb distance/g)];
  const ends = [...text.matchAll(/Nothing enforces this/g)];
  if (starts.length !== 1 || ends.length !== 1) {
    throw new Error(
      `collision table markers must appear exactly once (found ${starts.length} start, ${ends.length} end)`,
    );
  }
  const [start, end] = [starts[0].index!, ends[0].index!];
  if (end < start) throw new Error('collision table markers are out of order');
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

  it('resolves the palette and every band token', () => {
    // Guards the guard against a RENAME, without coupling to the outcome: a
    // retune that legitimately resolves collisions must not fail here.
    // literal() already throws on a renamed band, and the "documented but no
    // longer collides" loop below catches an empty `rows` from the other side.
    // Only the palette count is assertable here: `rows` is built during
    // describe-body evaluation and already resolves every band, so a renamed or
    // non-hex band token throws before this test can run.
    expect([...TOKENS.matchAll(/--color-palette-([a-z]+)-fg:/g)].length).toBeGreaterThan(20);
  });

  it.each(sources)('%s lists every colliding pair with the right number', (_label, text) => {
    for (const tone of TONES) {
      const docs = documented(text, tone);
      const real = rows.filter((r) => r.tone === tone);
      for (const { color, rounded } of real) {
        expect(docs.get(color), `${tone} + ${color} is documented`).toBeDefined();
        // Exact, not a tolerance. Both sides are integers derived deterministically
        // from the same tokens, so there is no rounding to absorb — and slack here
        // would let the two published copies sit permanently apart from each other,
        // which is the divergence this file exists to prevent.
        expect(docs.get(color), `${tone} + ${color}`).toBe(rounded);
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
    // Assert the CLAIM, not a window around it.
    //
    // Three earlier versions of this check tried to isolate the calibration
    // sentence by slicing near the phrase — 300 characters back, then to the
    // last `)`, then to the last `.` — and each one could be widened back over
    // the numbered table by an ordinary copy-edit. The table contains the right
    // pair by construction, so any window that reaches it passes while the
    // sentence names something else. Widening was never the bug; slicing was.
    //
    // Both copies state the claim in one fixed form, so match that form
    // directly — and match it INSIDE the table region, the way documented()
    // already does. A bare exec() over the file returns the first match
    // anywhere, so planting the correct sentence in unrelated prose (or leaving
    // a stale one above the table) decided the result instead of the real
    // calibration. Every earlier version of this check located the sentence by
    // proximity — and proximity is what an editor changes. Note the region ends
    // at "Nothing enforces this", so a stale claim written BELOW the table is
    // outside it and not caught; only the calibration itself is pinned.
    //
    // matchAll + exactly-one also closes the next variant: a second claim added
    // inside the region — "in dark the worst pair is …" — would otherwise be
    // silently ignored rather than flagged as ambiguous.
    expect(rows.length, 'there is a worst pair to name').toBeGreaterThan(0);
    const region = tableRegion(text.replace(/\s*\n\s*\*?\s*/g, ' '));
    expect(region, 'the calibration sentence exists').toContain('effectively invisible');

    const claims = [...region.matchAll(/worst pair is `(\w+)` \+ `(\w+)` at (\d+)/g)];
    expect(claims.length, 'exactly one calibration claim in the table region').toBe(1);
    const worst = rows[0];
    expect(
      [claims[0][1], claims[0][2], Number(claims[0][3])],
      'the calibration names the actual worst pair',
    ).toEqual([worst.tone, worst.color, worst.rounded]);
  });
});
