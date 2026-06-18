import {
  blockLength,
  findBlockIndex,
  clampPoint,
  comparePoints,
  isCollapsed,
  orderedRange,
} from './position';
import { createBlock } from './model';
import type { RichDoc } from './model';

const doc: RichDoc = {
  blocks: [
    createBlock('paragraph', 'hello', { id: 'a' }),
    createBlock('paragraph', 'world', { id: 'b' }),
  ],
};

describe('position', () => {
  it('blockLength = total run length', () => {
    expect(blockLength(doc.blocks[0])).toBe(5);
  });

  it('findBlockIndex returns index or -1', () => {
    expect(findBlockIndex(doc, 'b')).toBe(1);
    expect(findBlockIndex(doc, 'zzz')).toBe(-1);
  });

  it('clampPoint clamps offset into [0, blockLength]', () => {
    expect(clampPoint(doc, { blockId: 'a', offset: 99 })).toEqual({ blockId: 'a', offset: 5 });
    expect(clampPoint(doc, { blockId: 'a', offset: -3 })).toEqual({ blockId: 'a', offset: 0 });
  });

  it('comparePoints orders within and across blocks', () => {
    expect(comparePoints(doc, { blockId: 'a', offset: 1 }, { blockId: 'a', offset: 3 })).toBe(-1);
    expect(comparePoints(doc, { blockId: 'a', offset: 3 }, { blockId: 'a', offset: 3 })).toBe(0);
    expect(comparePoints(doc, { blockId: 'b', offset: 0 }, { blockId: 'a', offset: 9 })).toBe(1);
  });

  it('isCollapsed when anchor == focus', () => {
    expect(
      isCollapsed({ anchor: { blockId: 'a', offset: 2 }, focus: { blockId: 'a', offset: 2 } }),
    ).toBe(true);
    expect(
      isCollapsed({ anchor: { blockId: 'a', offset: 2 }, focus: { blockId: 'a', offset: 3 } }),
    ).toBe(false);
  });

  it('orderedRange returns start ≤ end regardless of anchor/focus order', () => {
    const r = { anchor: { blockId: 'b', offset: 1 }, focus: { blockId: 'a', offset: 1 } };
    expect(orderedRange(doc, r)).toEqual({
      start: { blockId: 'a', offset: 1 },
      end: { blockId: 'b', offset: 1 },
    });
  });
});
