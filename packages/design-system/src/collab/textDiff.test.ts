// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { keptIndices } from './textDiff';

// Longest common subsequence length (DP), the size a shortest edit script keeps.
function lcs(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}

function check(a: string, b: string) {
  const keep = [...keptIndices(a, b)];
  const kept = keep.map((j, i) => [i, j]).filter(([, j]) => j >= 0);
  for (const [i, j] of kept) expect(b[j]).toBe(a[i]);
  for (let k = 1; k < kept.length; k++) expect(kept[k][1]).toBeGreaterThan(kept[k - 1][1]);
  expect(kept.length).toBe(lcs(a, b));
}

describe('keptIndices', () => {
  it('maps kept characters across separate edits', () => {
    expect([...keptIndices('hello world', 'Xhello worldY')]).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect([...keptIndices('abcdef', 'aXcYf')]).toEqual([0, -1, 2, -1, -1, 4]);
    expect([...keptIndices('', 'abc')]).toEqual([]);
    expect([...keptIndices('abc', '')]).toEqual([-1, -1, -1]);
  });

  it('keeps a longest common subsequence (random strings)', () => {
    let s = 7;
    const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const str = () =>
      Array.from({ length: Math.floor(rnd() * 14) }, () => 'abc'[Math.floor(rnd() * 3)]).join('');
    for (let i = 0; i < 300; i++) check(str(), str());
  });

  it('past maxD leaves the middle unmatched instead of searching on', () => {
    const keep = [...keptIndices('aXYZb', 'aPQRb', 1)];
    expect(keep).toEqual([0, -1, -1, -1, 4]);
  });
});
