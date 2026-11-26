import { describe, expect, it } from 'vitest';
import { compareOrder, orderBetween } from './order';

describe('orderBetween', () => {
  it('returns a key for an empty list', () => {
    expect(orderBetween(null, null)).toBeTruthy();
  });

  it.each([
    ['head', (k: string) => [null, k] as const],
    ['tail', (k: string) => [k, null] as const],
  ])('stays strictly ordered across 1000 inserts at the %s', (_n, bounds) => {
    let k = orderBetween(null, null);
    for (let i = 0; i < 1000; i++) {
      const [a, b] = bounds(k);
      const next = orderBetween(a, b);
      if (a === null) expect(next < k).toBe(true);
      else expect(next > k).toBe(true);
      k = next;
    }
    expect(k.length).toBeLessThan(40);
  });

  it('stays strictly between across 1000 same-gap inserts in the middle', () => {
    const lo = orderBetween(null, null);
    let hi = orderBetween(lo, null);
    let maxLen = 0;
    for (let i = 0; i < 1000; i++) {
      const mid = orderBetween(lo, hi);
      expect(mid > lo && mid < hi).toBe(true);
      hi = mid;
      maxLen = Math.max(maxLen, mid.length);
    }
    // Always inserting at the same gap halves it each time: ~1 char per 6 bits.
    expect(maxLen).toBeLessThan(200);
  });

  it('keeps short keys for alternating inserts', () => {
    const keys = [orderBetween(null, null)];
    for (let i = 0; i < 1000; i++) {
      const j = (i * 7919) % keys.length;
      keys.splice(j + 1, 0, orderBetween(keys[j], keys[j + 1] ?? null));
    }
    expect([...keys].sort()).toEqual(keys);
    expect(Math.max(...keys.map((k) => k.length))).toBeLessThan(40);
  });

  it.each([
    ['1', '10'],
    [null, '0'],
    ['A', 'A0'],
  ])('throws on a non-canonical key (trailing 0) rather than leaving the gap: %s, %s', (a, b) => {
    expect(() => orderBetween(a, b)).toThrow(RangeError);
  });
});

describe('compareOrder', () => {
  it('orders by key, then by id on ties', () => {
    expect(compareOrder({ order: 'a', id: 'z' }, { order: 'b', id: 'a' })).toBeLessThan(0);
    expect(compareOrder({ order: 'a', id: 'a' }, { order: 'a', id: 'b' })).toBeLessThan(0);
    expect(compareOrder({ order: 'a', id: 'b' }, { order: 'a', id: 'a' })).toBeGreaterThan(0);
    expect(compareOrder({ order: 'a', id: 'a' }, { order: 'a', id: 'a' })).toBe(0);
  });
});
