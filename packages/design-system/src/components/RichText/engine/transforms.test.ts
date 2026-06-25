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
  insertMention,
} from './transforms';
import { createBlock } from './model';
import { runsText } from './inlines';
import type { RichDoc, Range, Block } from './model';

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

describe('insertMention', () => {
  const docWith = (text: string): RichDoc => ({
    blocks: [{ id: 'b', type: 'paragraph', inlines: [{ text, marks: [] }] }],
  });

  it('replaces the trigger+query with a chip run + trailing space, caret after', () => {
    // "hi @al" — trigger at offset 3, caret at offset 6
    const { doc, selection } = insertMention(docWith('hi @al'), 'b', { from: 3, to: 6 }, '@', {
      id: 'u1',
      label: 'Alice',
    });
    const runs = doc.blocks[0].inlines;
    expect(runs[0]).toEqual({ text: 'hi ', marks: [] });
    expect(runs[1]).toEqual({
      text: '@Alice',
      marks: [{ type: 'mention', id: 'u1', label: 'Alice' }],
    });
    expect(runs[2].text).toBe(' ');
    // caret after "hi " (3) + "@Alice" (6) + " " (1) = 10
    expect(selection.anchor).toEqual({ blockId: 'b', offset: 10 });
    expect(selection.focus).toEqual({ blockId: 'b', offset: 10 });
  });

  it('handles a bare trigger with no query (from===to-1)', () => {
    const { doc } = insertMention(docWith('@'), 'b', { from: 0, to: 1 }, '@', {
      id: 'u1',
      label: 'Bob',
    });
    expect(doc.blocks[0].inlines[0]).toEqual({
      text: '@Bob',
      marks: [{ type: 'mention', id: 'u1', label: 'Bob' }],
    });
  });

  it('typed text right after a chip does not inherit the mention mark', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: 'b',
          type: 'paragraph',
          inlines: [{ text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] }],
        },
      ],
    };
    const { doc: out } = insertText(doc, { blockId: 'b', offset: 6 }, 'x');
    const runs = out.blocks[0].inlines;
    const last = runs[runs.length - 1];
    expect(last.text).toBe('x');
    expect(last.marks).toEqual([]);
  });
});

describe('deleteRange — mention snapping', () => {
  const docWithChip = (): RichDoc => ({
    blocks: [
      {
        id: 'b',
        type: 'paragraph',
        inlines: [
          { text: 'hi ', marks: [] },
          { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] },
          { text: ' ok', marks: [] },
        ],
      },
    ],
  });

  it('a one-char delete at the chip right edge removes the WHOLE chip (backspace)', () => {
    // chip spans [3,9); caret at 9, backspace deletes [8,9] → snaps to [3,9]
    const { doc, selection } = deleteRange(docWithChip(), {
      anchor: { blockId: 'b', offset: 8 },
      focus: { blockId: 'b', offset: 9 },
    });
    expect(runsText(doc.blocks[0].inlines)).toBe('hi  ok');
    expect(selection.anchor).toEqual({ blockId: 'b', offset: 3 });
  });

  it('a one-char delete at the chip left edge removes the WHOLE chip (forward delete)', () => {
    // caret at 3, forward delete [3,4] → snaps to [3,9]
    const { doc } = deleteRange(docWithChip(), {
      anchor: { blockId: 'b', offset: 3 },
      focus: { blockId: 'b', offset: 4 },
    });
    expect(runsText(doc.blocks[0].inlines)).toBe('hi  ok');
  });

  it('a selection that partially overlaps the chip removes the whole chip', () => {
    // select [5,7] (inside the chip) → snaps to [3,9]
    const { doc } = deleteRange(docWithChip(), {
      anchor: { blockId: 'b', offset: 5 },
      focus: { blockId: 'b', offset: 7 },
    });
    expect(runsText(doc.blocks[0].inlines)).toBe('hi  ok');
  });

  it('a delete entirely outside the chip is unaffected', () => {
    // delete "hi" [0,2]
    const { doc } = deleteRange(docWithChip(), {
      anchor: { blockId: 'b', offset: 0 },
      focus: { blockId: 'b', offset: 2 },
    });
    expect(runsText(doc.blocks[0].inlines)).toBe(' @Alice ok');
  });

  it('snaps the END endpoint when a cross-block selection ends inside a chip', () => {
    const doc: RichDoc = {
      blocks: [
        { id: 'a', type: 'paragraph', inlines: [{ text: 'hello', marks: [] }] },
        {
          id: 'b',
          type: 'paragraph',
          inlines: [{ text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] }],
        },
      ],
    };
    // select from a:2 to b:3 (inside the chip [0,6)) → end snaps to 6 → whole chip gone
    const { doc: out } = deleteRange(doc, {
      anchor: { blockId: 'a', offset: 2 },
      focus: { blockId: 'b', offset: 3 },
    });
    expect(out.blocks).toHaveLength(1);
    expect(runsText(out.blocks[0].inlines)).toBe('he');
  });
});

describe('void-aware merge/split', () => {
  const att = (id: string): Block => ({
    id,
    type: 'attachment',
    name: 'f',
    status: 'ready',
    inlines: [],
  });
  it('mergeBlockBackward removes a preceding void instead of concatenating text', () => {
    const d: RichDoc = {
      blocks: [att('v'), { id: 'p', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
    };
    const r = mergeBlockBackward(d, 'p');
    expect(r.doc.blocks.map((b) => b.id)).toEqual(['p']);
    expect(r.doc.blocks[0].inlines[0].text).toBe('hi');
  });
  it('mergeBlockBackward removes a following void (cur is void), caret to end of prev', () => {
    const d: RichDoc = {
      blocks: [{ id: 'p', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }, att('v')],
    };
    const r = mergeBlockBackward(d, 'v');
    expect(r.doc.blocks.map((b) => b.id)).toEqual(['p']);
    expect(r.selection.anchor).toEqual({ blockId: 'p', offset: 2 });
  });
  it('splitBlock on a void is a no-op (same ref)', () => {
    const d: RichDoc = { blocks: [att('v')] };
    expect(splitBlock(d, { blockId: 'v', offset: 0 }).doc).toBe(d);
  });
  it('insertText into a void block is a no-op (never corrupts it with text)', () => {
    const d: RichDoc = { blocks: [att('v')] };
    const r = insertText(d, { blockId: 'v', offset: 0 }, 'Z');
    expect(r.doc).toBe(d);
    expect(r.doc.blocks[0].inlines).toEqual([]);
  });
  it('deleteRange from a void into following text yields a TEXT survivor (no attachment-with-text)', () => {
    const d: RichDoc = {
      blocks: [att('v'), { id: 'p', type: 'paragraph', inlines: [{ text: 'hello', marks: [] }] }],
    };
    // select from the image (v,0) into the middle of the paragraph (p,3)
    const r = deleteRange(d, {
      anchor: { blockId: 'v', offset: 0 },
      focus: { blockId: 'p', offset: 3 },
    });
    expect(r.doc.blocks).toHaveLength(1);
    const survivor = r.doc.blocks[0];
    expect(survivor.type).toBe('paragraph'); // NOT 'attachment'
    expect(survivor.id).toBe('v'); // caret target id preserved
    expect(survivor.inlines[0].text).toBe('lo'); // 'hello' minus first 3
    expect(r.selection.anchor).toEqual({ blockId: 'v', offset: 0 });
  });
  it('deleteRange across two voids collapses to an empty paragraph', () => {
    const d: RichDoc = { blocks: [att('v1'), att('v2')] };
    const r = deleteRange(d, {
      anchor: { blockId: 'v1', offset: 0 },
      focus: { blockId: 'v2', offset: 0 },
    });
    expect(r.doc.blocks).toHaveLength(1);
    expect(r.doc.blocks[0].type).toBe('paragraph');
  });
});
