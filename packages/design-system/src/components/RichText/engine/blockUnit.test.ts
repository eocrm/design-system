import { createBlock } from './model';
import type { Block, RichDoc } from './model';
import {
  blockUnitRange,
  prevSiblingAnchor,
  moveBlockUnit,
  duplicateBlockUnit,
  removeBlockUnit,
  insertEmptyBlockBelow,
  moveBlockUnitToIndex,
} from './blockUnit';

const p = (id: string) => createBlock('paragraph', id, { id });
const li = (id: string, depth: number) => createBlock('bullet_item', id, { id, depth });
const doc = (blocks: Block[]): RichDoc => ({ blocks });
const ids = (d: RichDoc) => d.blocks.map((b) => b.id);

describe('blockUnitRange', () => {
  it('a non-list block is its own unit', () => {
    expect(blockUnitRange([p('a'), p('b')], 0)).toEqual({ start: 0, end: 1 });
  });
  it('a list item carries its deeper descendant run', () => {
    const blocks = [li('a', 0), li('b', 1), li('c', 2), li('d', 0)];
    expect(blockUnitRange(blocks, 0)).toEqual({ start: 0, end: 3 });
    expect(blockUnitRange(blocks, 1)).toEqual({ start: 1, end: 3 });
    expect(blockUnitRange(blocks, 3)).toEqual({ start: 3, end: 4 });
  });
  it('stops at a sibling of equal depth', () => {
    expect(blockUnitRange([li('a', 0), li('b', 1), li('c', 0)], 0)).toEqual({ start: 0, end: 2 });
  });
  it('stops at a non-list block', () => {
    expect(blockUnitRange([li('a', 0), p('b')], 0)).toEqual({ start: 0, end: 1 });
  });
});

describe('prevSiblingAnchor', () => {
  it('returns the previous top-level block for a paragraph', () => {
    expect(prevSiblingAnchor([p('a'), p('b')], 1)).toBe(0);
  });
  it('skips a previous sibling subtree to find the sibling anchor', () => {
    expect(prevSiblingAnchor([li('a', 0), li('b', 1), li('c', 0)], 2)).toBe(0);
  });
  it('returns -1 for a first child (no prev sibling at its depth)', () => {
    expect(prevSiblingAnchor([li('a', 0), li('b', 1)], 1)).toBe(-1);
  });
});

describe('moveBlockUnit', () => {
  it('moves a paragraph down past the next unit', () => {
    expect(ids(moveBlockUnit(doc([p('a'), p('b'), p('c')]), 'a', 1).doc)).toEqual(['b', 'a', 'c']);
  });
  it('moves a paragraph up past the previous unit', () => {
    expect(ids(moveBlockUnit(doc([p('a'), p('b'), p('c')]), 'c', -1).doc)).toEqual(['a', 'c', 'b']);
  });
  it('is a no-op at the top edge (same ref)', () => {
    const d = doc([p('a'), p('b')]);
    expect(moveBlockUnit(d, 'a', -1).doc).toBe(d);
  });
  it('is a no-op at the bottom edge (same ref)', () => {
    const d = doc([p('a'), p('b')]);
    expect(moveBlockUnit(d, 'b', 1).doc).toBe(d);
  });
  it('carries a list subtree when swapping with a sibling subtree', () => {
    const d = doc([li('a', 0), li('a1', 1), li('b', 0), li('b1', 1)]);
    expect(ids(moveBlockUnit(d, 'a', 1).doc)).toEqual(['b', 'b1', 'a', 'a1']);
  });
  it('moves a nested item among its siblings only', () => {
    expect(ids(moveBlockUnit(doc([li('a', 0), li('x', 1), li('y', 1)]), 'x', 1).doc)).toEqual([
      'a',
      'y',
      'x',
    ]);
  });
  it('caret lands on the moved anchor', () => {
    expect(moveBlockUnit(doc([p('a'), p('b')]), 'a', 1).selection.anchor.blockId).toBe('a');
  });
});

describe('duplicateBlockUnit', () => {
  it('clones a paragraph right after itself with a fresh id', () => {
    const r = duplicateBlockUnit(doc([p('a'), p('b')]), 'a');
    expect(r.doc.blocks.length).toBe(3);
    expect(r.doc.blocks[1].id).not.toBe('a');
    expect(ids(r.doc)[2]).toBe('b');
  });
  it('clones a list subtree with fresh ids and same depths', () => {
    const r = duplicateBlockUnit(doc([li('a', 0), li('a1', 1), p('z')]), 'a');
    expect(r.doc.blocks.map((b) => b.type)).toEqual([
      'bullet_item',
      'bullet_item',
      'bullet_item',
      'bullet_item',
      'paragraph',
    ]);
    expect(r.doc.blocks[2].depth).toBe(0);
    expect(r.doc.blocks[3].depth).toBe(1);
    expect(r.doc.blocks[2].id).not.toBe('a');
  });
  it('caret lands on the clone anchor', () => {
    const r = duplicateBlockUnit(doc([p('a')]), 'a');
    expect(r.selection.anchor.blockId).toBe(r.doc.blocks[1].id);
  });
});

describe('removeBlockUnit', () => {
  it('removes a paragraph; caret to the next block', () => {
    const r = removeBlockUnit(doc([p('a'), p('b')]), 'a');
    expect(ids(r.doc)).toEqual(['b']);
    expect(r.selection.anchor.blockId).toBe('b');
  });
  it('removes a list subtree as a unit', () => {
    expect(ids(removeBlockUnit(doc([li('a', 0), li('a1', 1), p('z')]), 'a').doc)).toEqual(['z']);
  });
  it('removing the last block leaves one empty paragraph', () => {
    const r = removeBlockUnit(doc([p('a')]), 'a');
    expect(r.doc.blocks.length).toBe(1);
    expect(r.doc.blocks[0].type).toBe('paragraph');
    expect(r.doc.blocks[0].id).not.toBe('a');
  });
  it('caret falls back to the previous block when removing the last unit', () => {
    expect(removeBlockUnit(doc([p('a'), p('b')]), 'b').selection.anchor.blockId).toBe('a');
  });
});

describe('insertEmptyBlockBelow', () => {
  it('inserts an empty paragraph after the block unit; caret in it', () => {
    const r = insertEmptyBlockBelow(doc([p('a'), p('b')]), 'a');
    expect(ids(r.doc)[0]).toBe('a');
    expect(r.doc.blocks[1].type).toBe('paragraph');
    expect(r.doc.blocks[1].id).toBe(r.selection.anchor.blockId);
    expect(ids(r.doc)[2]).toBe('b');
  });
  it('inserts after a list subtree, not inside it', () => {
    const r = insertEmptyBlockBelow(doc([li('a', 0), li('a1', 1)]), 'a');
    expect(r.doc.blocks.length).toBe(3);
    expect(r.doc.blocks[2].type).toBe('paragraph');
  });
});

describe('moveBlockUnitToIndex', () => {
  it('moves a paragraph to a later gap', () => {
    expect(ids(moveBlockUnitToIndex(doc([p('a'), p('b'), p('c')]), 'a', 3).doc)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });
  it('moves a paragraph to an earlier gap', () => {
    expect(ids(moveBlockUnitToIndex(doc([p('a'), p('b'), p('c')]), 'c', 0).doc)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });
  it('no-op when target is inside the moving unit (same ref)', () => {
    const d = doc([li('a', 0), li('a1', 1), p('z')]);
    expect(moveBlockUnitToIndex(d, 'a', 1).doc).toBe(d);
  });
  it('clamps a dropped list item depth when it lands among non-list blocks', () => {
    const r = moveBlockUnitToIndex(doc([li('a', 1), p('z')]), 'a', 2);
    expect(r.doc.blocks.find((b) => b.id === 'a')!.depth).toBe(0);
  });
  it('no-op (same ref) when dropped back onto its own slot', () => {
    const d = doc([p('a'), p('b')]);
    expect(moveBlockUnitToIndex(d, 'a', 0).doc).toBe(d);
  });
});

describe('unknown blockId', () => {
  it('every transform is a no-op returning the same doc ref', () => {
    const d = doc([p('a')]);
    expect(moveBlockUnit(d, 'nope', 1).doc).toBe(d);
    expect(duplicateBlockUnit(d, 'nope').doc).toBe(d);
    expect(removeBlockUnit(d, 'nope').doc).toBe(d);
    expect(insertEmptyBlockBelow(d, 'nope').doc).toBe(d);
    expect(moveBlockUnitToIndex(d, 'nope', 0).doc).toBe(d);
  });
});
