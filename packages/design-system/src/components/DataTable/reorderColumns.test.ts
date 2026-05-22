import { reorderRespectingPins, sameSide } from './reorderColumns';
import type { ColumnPinningState } from './types';

const noPin: ColumnPinningState = { left: [], right: [] };

describe('sameSide', () => {
  it('returns true when both columns are unpinned', () => {
    expect(sameSide('a', 'b', noPin)).toBe(true);
  });
  it('returns true when both columns are left-pinned', () => {
    expect(sameSide('a', 'b', { left: ['a', 'b'], right: [] })).toBe(true);
  });
  it('returns true when both columns are right-pinned', () => {
    expect(sameSide('a', 'b', { left: [], right: ['a', 'b'] })).toBe(true);
  });
  it('returns false when one is left-pinned and the other unpinned', () => {
    expect(sameSide('a', 'b', { left: ['a'], right: [] })).toBe(false);
  });
  it('returns false when one is right-pinned and the other unpinned', () => {
    expect(sameSide('a', 'b', { left: [], right: ['a'] })).toBe(false);
  });
  it('returns false when one is left-pinned and the other right-pinned', () => {
    expect(sameSide('a', 'b', { left: ['a'], right: ['b'] })).toBe(false);
  });
});

describe('reorderRespectingPins', () => {
  it('returns null when active and over are on different pin sides', () => {
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'a',
      overId: 'b',
      visibleIds: ['a', 'b', 'c'],
      pinning: { left: ['a'], right: [] },
    });
    expect(result).toBeNull();
  });

  it('reorders unpinned columns when both are unpinned', () => {
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'a',
      overId: 'c',
      visibleIds: ['a', 'b', 'c'],
      pinning: noPin,
    });
    expect(result).toEqual(['b', 'c', 'a']);
  });

  it('reorders within left-pinned set', () => {
    // Drag b before a in the left-pinned group; c stays unpinned and last.
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'b',
      overId: 'a',
      visibleIds: ['a', 'b', 'c'],
      pinning: { left: ['a', 'b'], right: [] },
    });
    expect(result).toEqual(['b', 'a', 'c']);
  });

  it('reorders within right-pinned set', () => {
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'c',
      overId: 'b',
      visibleIds: ['a', 'b', 'c'],
      pinning: { left: [], right: ['b', 'c'] },
    });
    expect(result).toEqual(['a', 'c', 'b']);
  });

  it('preserves hidden columns at their absolute positions', () => {
    // 'hidden' is in columnOrder but not visible (so dnd-kit doesn't see it).
    const result = reorderRespectingPins({
      prev: ['a', 'hidden', 'b', 'c'],
      activeId: 'a',
      overId: 'c',
      visibleIds: ['a', 'b', 'c'],
      pinning: noPin,
    });
    expect(result).toEqual(['b', 'hidden', 'c', 'a']);
  });

  it('returns null when active equals over (no-op)', () => {
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'a',
      overId: 'a',
      visibleIds: ['a', 'b', 'c'],
      pinning: noPin,
    });
    expect(result).toBeNull();
  });

  it('returns null when active or over not in prev', () => {
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'ghost',
      overId: 'a',
      visibleIds: ['a', 'b', 'c'],
      pinning: noPin,
    });
    expect(result).toBeNull();
  });
});
