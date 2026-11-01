import { applyInput, voidDelete } from './input';
import { createBlock } from '../RichText/engine/model';
import { runsText } from '../RichText/engine/inlines';
import type { RichDoc, Range } from '../RichText/engine/model';

const p = (text: string, id: string) => createBlock('paragraph', text, { id });
const doc = (...t: [string, string][]): RichDoc => ({ blocks: t.map(([x, id]) => p(x, id)) });
const at = (blockId: string, offset: number) => ({ blockId, offset });
const span = (
  a: { blockId: string; offset: number },
  f: { blockId: string; offset: number },
): Range => ({ anchor: a, focus: f });

describe('applyInput', () => {
  it('insertText at a collapsed caret', () => {
    const r = applyInput(doc(['ac', 'a']), span(at('a', 1), at('a', 1)), 'insertText', 'b')!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('abc');
    expect(r.selection.focus).toEqual(at('a', 2));
  });

  it('insertText over a selection replaces it', () => {
    const r = applyInput(doc(['abcd', 'a']), span(at('a', 1), at('a', 3)), 'insertText', 'X')!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('aXd');
  });

  it('insertText with empty data is a no-op (null)', () => {
    expect(applyInput(doc(['a', 'a']), span(at('a', 0), at('a', 0)), 'insertText', '')).toBeNull();
  });

  it('insertParagraph splits the block', () => {
    const r = applyInput(
      doc(['abcd', 'a']),
      span(at('a', 2), at('a', 2)),
      'insertParagraph',
      null,
    )!;
    expect(r.doc.blocks.map((b) => runsText(b.inlines))).toEqual(['ab', 'cd']);
  });

  it('insertLineBreak also splits (soft breaks deferred)', () => {
    const r = applyInput(
      doc(['abcd', 'a']),
      span(at('a', 2), at('a', 2)),
      'insertLineBreak',
      null,
    )!;
    expect(r.doc.blocks).toHaveLength(2);
  });

  it('deleteContentBackward mid-block deletes the previous char', () => {
    const r = applyInput(
      doc(['abc', 'a']),
      span(at('a', 2), at('a', 2)),
      'deleteContentBackward',
      null,
    )!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('ac');
    expect(r.selection.focus).toEqual(at('a', 1));
  });

  it('deleteContentBackward at block start merges into the previous block', () => {
    const r = applyInput(
      doc(['ab', 'a'], ['cd', 'b']),
      span(at('b', 0), at('b', 0)),
      'deleteContentBackward',
      null,
    )!;
    expect(r.doc.blocks).toHaveLength(1);
    expect(runsText(r.doc.blocks[0].inlines)).toBe('abcd');
  });

  it('deleteContentForward mid-block deletes the next char', () => {
    const r = applyInput(
      doc(['abc', 'a']),
      span(at('a', 1), at('a', 1)),
      'deleteContentForward',
      null,
    )!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('ac');
    expect(r.selection.focus).toEqual(at('a', 1));
  });

  it('deleteContentForward at block end merges the next block back', () => {
    const r = applyInput(
      doc(['ab', 'a'], ['cd', 'b']),
      span(at('a', 2), at('a', 2)),
      'deleteContentForward',
      null,
    )!;
    expect(r.doc.blocks).toHaveLength(1);
    expect(runsText(r.doc.blocks[0].inlines)).toBe('abcd');
  });

  it('deleteContentBackward over a selection deletes the range', () => {
    const r = applyInput(
      doc(['abcd', 'a']),
      span(at('a', 1), at('a', 3)),
      'deleteContentBackward',
      null,
    )!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('ad');
  });

  it('deleteWordBackward removes the previous word', () => {
    const r = applyInput(
      doc(['foo bar', 'a']),
      span(at('a', 7), at('a', 7)),
      'deleteWordBackward',
      null,
    )!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('foo ');
  });

  it('deleteWordForward removes the next word', () => {
    const r = applyInput(
      doc(['foo bar', 'a']),
      span(at('a', 0), at('a', 0)),
      'deleteWordForward',
      null,
    )!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe(' bar');
  });

  it('insertFromPaste inserts plain text', () => {
    const r = applyInput(doc(['ab', 'a']), span(at('a', 1), at('a', 1)), 'insertFromPaste', 'X')!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('aXb');
  });

  it('formatBold and unknown types return null (handled elsewhere)', () => {
    const d = doc(['ab', 'a']);
    const r = span(at('a', 0), at('a', 1));
    expect(applyInput(d, r, 'formatBold', null)).toBeNull();
    expect(applyInput(d, r, 'historyUndo', null)).toBeNull();
  });
});

describe('voidDelete', () => {
  // [p "ab"] [image v] [q "cd"]
  const d: RichDoc = {
    blocks: [
      p('ab', 'p'),
      { id: 'v', type: 'attachment', name: 'f.png', status: 'ready', inlines: [] },
      p('cd', 'q'),
    ],
  };
  const texts = (r: { doc: RichDoc }) =>
    r.doc.blocks.map((b) => (b.type === 'attachment' ? '[img]' : runsText(b.inlines)));

  it('Backspace from after / Delete from before remove the image', () => {
    expect(texts(voidDelete(d, 'v', 'after', 'backward')!)).toEqual(['ab', 'cd']);
    expect(texts(voidDelete(d, 'v', 'before', 'forward')!)).toEqual(['ab', 'cd']);
  });
  it('Backspace from before / Delete from after just move the caret into the text neighbor', () => {
    const back = voidDelete(d, 'v', 'before', 'backward')!;
    expect(back.doc).toBe(d);
    expect(back.selection.anchor).toEqual(at('p', 2));
    const fwd = voidDelete(d, 'v', 'after', 'forward')!;
    expect(fwd.doc).toBe(d);
    expect(fwd.selection.anchor).toEqual(at('q', 0));
  });
  it('an EMPTY neighbor in that direction is removed (only that block)', () => {
    const e: RichDoc = {
      blocks: [
        d.blocks[1],
        { id: 'li', type: 'bullet_item', depth: 0, inlines: [{ text: '', marks: [] }] },
        { id: 'kid', type: 'bullet_item', depth: 1, inlines: [{ text: 'x', marks: [] }] },
      ],
    };
    // An orphaned depth-1 item is fine: renderDoc/toHtml/toMarkdown normalize
    // depths gap-free via effectiveDepths.
    const r = voidDelete(e, 'v', 'after', 'forward')!;
    expect(r.doc.blocks.map((b) => b.id)).toEqual(['v', 'kid']);
    // Removing a neighbor leaves the caret where it was: AFTER the void.
    expect(r).toMatchObject({ selection: { anchor: at('v', 0) }, caretAfterVoid: true });
  });
  it('removing a neighbor never moves the caret past it (a 2nd Backspace must not eat text)', () => {
    const e: RichDoc = { blocks: [p('ab', 'p'), p('', 'empty'), d.blocks[1]] };
    const r = voidDelete(e, 'v', 'before', 'backward')!;
    expect(r.doc.blocks.map((b) => b.id)).toEqual(['p', 'v']);
    expect(r.selection.anchor).toEqual(at('v', 0));
    expect(r.caretAfterVoid).toBeFalsy(); // still BEFORE the void
  });
  it('Backspace removing an empty previous block keeps the caret on the void', () => {
    const e: RichDoc = { blocks: [p('', 'empty'), d.blocks[1]] };
    const r = voidDelete(e, 'v', 'before', 'backward')!;
    expect(r.doc.blocks.map((b) => b.id)).toEqual(['v']);
    expect(r.selection.anchor).toEqual(at('v', 0));
  });
  it('a void neighbor in that direction is removed (caret between two images)', () => {
    const two: RichDoc = {
      blocks: [d.blocks[1], { ...d.blocks[1], id: 'w' }, p('cd', 'q')],
    };
    // Caret between them resolves to {w, before}: Backspace removes v, keeps w.
    expect(voidDelete(two, 'w', 'before', 'backward')!.doc.blocks.map((b) => b.id)).toEqual([
      'w',
      'q',
    ]);
  });
  it('the caret continues in the delete direction, never back onto the far side of an image', () => {
    const img = (id: string) => ({ ...d.blocks[1], id });
    // [v][w], caret between (resolves before w): Delete removes w → caret AFTER v.
    const r1 = voidDelete({ blocks: [img('v'), img('w')] }, 'w', 'before', 'forward')!;
    expect(r1.doc.blocks.map((b) => b.id)).toEqual(['v']);
    expect(r1).toMatchObject({ selection: { anchor: at('v', 0) }, caretAfterVoid: true });
    // ["ab"][v], caret after v: Backspace removes v → caret at the end of "ab".
    const r2 = voidDelete({ blocks: [p('ab', 'p'), img('v')] }, 'v', 'after', 'backward')!;
    expect(r2.selection.anchor).toEqual(at('p', 2));
    expect(r2.caretAfterVoid).toBeFalsy();
    // Lone image removed → an empty paragraph remains.
    const r3 = voidDelete({ blocks: [img('v')] }, 'v', 'after', 'backward')!;
    expect(r3.doc.blocks.map((b) => b.type)).toEqual(['paragraph']);
  });
  it('no neighbor in that direction → null (no-op)', () => {
    const solo: RichDoc = { blocks: [d.blocks[1]] };
    expect(voidDelete(solo, 'v', 'after', 'forward')).toBeNull();
    expect(voidDelete(solo, 'v', 'before', 'backward')).toBeNull();
  });
});
