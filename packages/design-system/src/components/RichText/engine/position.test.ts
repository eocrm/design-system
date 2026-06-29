import {
  blockLength,
  findBlockIndex,
  comparePoints,
  isCollapsed,
  orderedRange,
  wholeBlockRange,
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

  it('blockLength is 0 for a void block with no inlines (attachment) — never throws', () => {
    // External / image-attachment docs can carry an attachment block with no
    // `inlines`. blockLength (→ runsLength) must treat it as zero, not crash — this
    // is the render/caret-recompute path that previously threw on such docs.
    const attachment = { id: 'img', type: 'attachment', src: 'x.png' } as RichDoc['blocks'][number];
    expect(() => blockLength(attachment)).not.toThrow();
    expect(blockLength(attachment)).toBe(0);
  });

  it('findBlockIndex returns index or -1', () => {
    expect(findBlockIndex(doc, 'b')).toBe(1);
    expect(findBlockIndex(doc, 'zzz')).toBe(-1);
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

  it('wholeBlockRange spans the entire block; null for an unknown id', () => {
    expect(wholeBlockRange(doc, 'b')).toEqual({
      anchor: { blockId: 'b', offset: 0 },
      focus: { blockId: 'b', offset: blockLength(doc.blocks[1]) },
    });
    expect(wholeBlockRange(doc, 'zzz')).toBeNull();
  });
});
