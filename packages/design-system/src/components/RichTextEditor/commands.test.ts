import {
  activeMarks,
  currentBlock,
  runToggleMark,
  runSetBlock,
  runToggleList,
  runIndent,
} from './commands';
import { createBlock } from '../RichText/engine/model';
import type { RichDoc, Range, Inline } from '../RichText/engine/model';

const at = (blockId: string, offset: number) => ({ blockId, offset });
const span = (
  a: { blockId: string; offset: number },
  f: { blockId: string; offset: number },
): Range => ({ anchor: a, focus: f });
const bold = { type: 'bold' as const };

function para(id: string, inlines: Inline[]): RichDoc['blocks'][number] {
  return { id, type: 'paragraph', inlines };
}

describe('activeMarks', () => {
  it('returns marks present on EVERY char of the selection (intersection)', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'ab', marks: [bold] },
          { text: 'cd', marks: [] },
        ]),
      ],
    };
    expect(activeMarks(doc, span(at('a', 0), at('a', 2)), null)).toEqual(['bold']);
    expect(activeMarks(doc, span(at('a', 0), at('a', 4)), null)).toEqual([]); // not all bold
  });

  it('collapsed → marks of the char before the caret', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'ab', marks: [bold] }])] };
    expect(activeMarks(doc, span(at('a', 1), at('a', 1)), null)).toEqual(['bold']);
    expect(activeMarks(doc, span(at('a', 0), at('a', 0)), null)).toEqual([]); // start → none
  });

  it('collapsed + pending → the pending marks', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'ab', marks: [] }])] };
    expect(activeMarks(doc, span(at('a', 0), at('a', 0)), [bold])).toEqual(['bold']);
  });
});

describe('currentBlock', () => {
  it('single block → its type (+ level)', () => {
    const doc: RichDoc = { blocks: [createBlock('heading', 'H', { level: 2, id: 'a' })] };
    expect(currentBlock(doc, span(at('a', 0), at('a', 1)))).toEqual({ type: 'heading', level: 2 });
  });
  it('multi-block same type → that type', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('paragraph', 'a', { id: 'a' }),
        createBlock('paragraph', 'b', { id: 'b' }),
      ],
    };
    expect(currentBlock(doc, span(at('a', 0), at('b', 1)))).toEqual({ type: 'paragraph' });
  });
  it('multi-block mixed → null', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('paragraph', 'a', { id: 'a' }),
        createBlock('heading', 'b', { level: 1, id: 'b' }),
      ],
    };
    expect(currentBlock(doc, span(at('a', 0), at('b', 1)))).toBeNull();
  });
});

describe('runners', () => {
  it('runToggleMark toggles over the selection', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'abcd', { id: 'a' })] };
    const r = runToggleMark(doc, span(at('a', 0), at('a', 4)), bold);
    expect(r.doc.blocks[0].inlines[0].marks).toEqual([bold]);
  });

  it('runSetBlock applies to every block in the selection', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('paragraph', 'a', { id: 'a' }),
        createBlock('paragraph', 'b', { id: 'b' }),
      ],
    };
    const r = runSetBlock(doc, span(at('a', 0), at('b', 1)), { type: 'heading', level: 2 });
    expect(r.doc.blocks.map((b) => b.type)).toEqual(['heading', 'heading']);
    expect(r.doc.blocks.map((b) => b.level)).toEqual([2, 2]);
  });

  it('runToggleList: not-list → list; all-list → paragraph', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'a', { id: 'a' })] };
    const on = runToggleList(doc, span(at('a', 0), at('a', 1)), 'bullet_item');
    expect(on.doc.blocks[0].type).toBe('bullet_item');
    expect(on.doc.blocks[0].depth).toBe(0);
    const off = runToggleList(on.doc, span(at('a', 0), at('a', 1)), 'bullet_item');
    expect(off.doc.blocks[0].type).toBe('paragraph');
    expect(off.doc.blocks[0].depth).toBeUndefined();
  });

  it('runIndent in/out clamps depth at 0 and only affects list items', () => {
    const doc: RichDoc = { blocks: [createBlock('bullet_item', 'a', { id: 'a', depth: 0 })] };
    const indented = runIndent(doc, span(at('a', 0), at('a', 1)), 'in');
    expect(indented.doc.blocks[0].depth).toBe(1);
    const out = runIndent(indented.doc, span(at('a', 0), at('a', 1)), 'out');
    expect(out.doc.blocks[0].depth).toBe(0);
    const clamped = runIndent(out.doc, span(at('a', 0), at('a', 1)), 'out');
    expect(clamped.doc.blocks[0].depth).toBe(0);
  });
});
