import {
  insertText,
  deleteRange,
  splitBlock,
  mergeBlockBackward,
  applyMark,
  removeMark,
  toggleMark,
  setBlockType,
  insertFragment,
} from './transforms';
import { createBlock } from './model';
import { runsText } from './inlines';
import type { RichDoc, Range } from './model';

const p = (text: string, id: string) => createBlock('paragraph', text, { id });
const doc = (...texts: [string, string][]): RichDoc => ({
  blocks: texts.map(([t, id]) => p(t, id)),
});
const at = (blockId: string, offset: number) => ({ blockId, offset });
const span = (
  a: { blockId: string; offset: number },
  f: { blockId: string; offset: number },
): Range => ({ anchor: a, focus: f });

describe('transforms', () => {
  it('insertText inserts mid-run and moves the caret', () => {
    const r = insertText(doc(['ac', 'a']), at('a', 1), 'b');
    expect(runsText(r.doc.blocks[0].inlines)).toBe('abc');
    expect(r.selection.focus).toEqual(at('a', 2));
  });

  it('insertText inherits the marks of the char before the caret', () => {
    const d: RichDoc = {
      blocks: [{ id: 'a', type: 'paragraph', inlines: [{ text: 'X', marks: [{ type: 'bold' }] }] }],
    };
    const r = insertText(d, at('a', 1), 'y');
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'Xy', marks: [{ type: 'bold' }] }]);
  });

  it('deleteRange within a block removes the span', () => {
    const r = deleteRange(doc(['abcd', 'a']), span(at('a', 1), at('a', 3)));
    expect(runsText(r.doc.blocks[0].inlines)).toBe('ad');
    expect(r.selection.focus).toEqual(at('a', 1));
  });

  it('deleteRange across blocks merges the partial first + last', () => {
    const r = deleteRange(doc(['hello', 'a'], ['world', 'b']), span(at('a', 2), at('b', 3)));
    expect(r.doc.blocks).toHaveLength(1);
    expect(runsText(r.doc.blocks[0].inlines)).toBe('held');
  });

  it('deleteRange collapsed is a no-op', () => {
    const d = doc(['ab', 'a']);
    const r = deleteRange(d, span(at('a', 1), at('a', 1)));
    expect(r.doc).toBe(d);
  });

  it('splitBlock splits into two same-typed blocks', () => {
    const r = splitBlock(doc(['abcd', 'a']), at('a', 2));
    expect(r.doc.blocks.map((b) => runsText(b.inlines))).toEqual(['ab', 'cd']);
    expect(r.selection.focus.offset).toBe(0);
    expect(r.doc.blocks[1].type).toBe('paragraph');
  });

  it('mergeBlockBackward joins a block into the previous one', () => {
    const r = mergeBlockBackward(doc(['ab', 'a'], ['cd', 'b']), 'b');
    expect(r.doc.blocks).toHaveLength(1);
    expect(runsText(r.doc.blocks[0].inlines)).toBe('abcd');
    expect(r.selection.focus).toEqual(at('a', 2));
  });

  it('mergeBlockBackward on the first block is a no-op', () => {
    const d = doc(['ab', 'a']);
    expect(mergeBlockBackward(d, 'a').doc).toBe(d);
  });

  it('applyMark splits runs and marks the range', () => {
    const r = applyMark(doc(['abcd', 'a']), span(at('a', 1), at('a', 3)), { type: 'bold' });
    expect(r.doc.blocks[0].inlines).toEqual([
      { text: 'a', marks: [] },
      { text: 'bc', marks: [{ type: 'bold' }] },
      { text: 'd', marks: [] },
    ]);
  });

  it('toggleMark removes when the whole range already has the mark, else adds', () => {
    const bolded = applyMark(doc(['abcd', 'a']), span(at('a', 0), at('a', 4)), {
      type: 'bold',
    }).doc;
    const r = toggleMark(bolded, span(at('a', 0), at('a', 4)), { type: 'bold' });
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'abcd', marks: [] }]);
    const r2 = toggleMark(doc(['abcd', 'a']), span(at('a', 0), at('a', 2)), { type: 'bold' });
    expect(r2.doc.blocks[0].inlines[0]).toEqual({ text: 'ab', marks: [{ type: 'bold' }] });
  });

  it('removeMark clears a mark over the range', () => {
    const bolded = applyMark(doc(['abcd', 'a']), span(at('a', 0), at('a', 4)), {
      type: 'bold',
    }).doc;
    const r = removeMark(bolded, span(at('a', 1), at('a', 3)), 'bold');
    expect(r.doc.blocks[0].inlines).toEqual([
      { text: 'a', marks: [{ type: 'bold' }] },
      { text: 'bc', marks: [] },
      { text: 'd', marks: [{ type: 'bold' }] },
    ]);
  });

  it('setBlockType changes type + attrs, preserving content and dropping irrelevant attrs', () => {
    const r = setBlockType(doc(['title', 'a']), 'a', { type: 'heading', level: 2 });
    expect(r.doc.blocks[0].type).toBe('heading');
    expect(r.doc.blocks[0].level).toBe(2);
    const back = setBlockType(r.doc, 'a', { type: 'paragraph' });
    expect(back.doc.blocks[0].level).toBeUndefined();
  });
});

describe('insertFragment', () => {
  const fpara = (id: string, text: string) => createBlock('paragraph', text, { id });
  const fat = (blockId: string, offset: number) => ({ blockId, offset });
  const fcollapsed = (blockId: string, offset: number) => ({
    anchor: fat(blockId, offset),
    focus: fat(blockId, offset),
  });

  it('single-block fragment → inline splice with caret after it', () => {
    const doc: RichDoc = { blocks: [fpara('a', 'abcd')] };
    const frag: RichDoc = { blocks: [createBlock('paragraph', 'XY', { id: 'f' })] };
    const r = insertFragment(doc, fcollapsed('a', 2), frag);
    expect(r.doc.blocks.length).toBe(1);
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'abXYcd', marks: [] }]);
    expect(r.selection).toEqual(fcollapsed('a', 4));
  });

  it('multi-block fragment → split current block and merge ends', () => {
    const doc: RichDoc = { blocks: [fpara('a', 'abcd')] };
    const frag: RichDoc = {
      blocks: [
        createBlock('paragraph', 'X', { id: 'f0' }),
        createBlock('heading', 'Y', { id: 'f1', level: 2 }),
        createBlock('paragraph', 'Z', { id: 'f2' }),
      ],
    };
    const r = insertFragment(doc, fcollapsed('a', 2), frag);
    expect(r.doc.blocks.map((b) => [b.type, b.inlines.map((i) => i.text).join('')])).toEqual([
      ['paragraph', 'abX'],
      ['heading', 'Y'],
      ['paragraph', 'Zcd'],
    ]);
    expect(r.selection.anchor.offset).toBe(1);
    expect(r.selection.anchor.blockId).toBe(r.doc.blocks[2].id);
  });

  it('non-collapsed range is deleted first, then the fragment inserted', () => {
    const doc: RichDoc = { blocks: [fpara('a', 'abcd')] };
    const frag: RichDoc = { blocks: [createBlock('paragraph', 'X', { id: 'f' })] };
    const r = insertFragment(doc, { anchor: fat('a', 1), focus: fat('a', 3) }, frag);
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'aXd', marks: [] }]);
  });

  it('an empty fragment is a no-op (collapsed caret returned)', () => {
    const doc: RichDoc = { blocks: [fpara('a', 'abcd')] };
    const r = insertFragment(doc, fcollapsed('a', 2), {
      blocks: [createBlock('paragraph', '', { id: 'e' })],
    });
    expect(r.doc).toBe(doc);
    expect(r.selection).toEqual(fcollapsed('a', 2));
  });
});
