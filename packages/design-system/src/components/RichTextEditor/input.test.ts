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
  it('Backspace from before deletes from the end of the previous block', () => {
    const r = voidDelete(d, 'v', 'before', 'backward')!;
    expect(texts(r)).toEqual(['a', '[img]', 'cd']);
    expect(r.selection.anchor).toEqual(at('p', 1));
  });
  it('Delete from after deletes from the start of the next block', () => {
    const r = voidDelete(d, 'v', 'after', 'forward')!;
    expect(texts(r)).toEqual(['ab', '[img]', 'd']);
    expect(r.selection.anchor).toEqual(at('q', 0));
  });
  it('no neighbor in that direction → null (no-op)', () => {
    const solo: RichDoc = { blocks: [d.blocks[1]] };
    expect(voidDelete(solo, 'v', 'after', 'forward')).toBeNull();
    expect(voidDelete(solo, 'v', 'before', 'backward')).toBeNull();
  });
});
