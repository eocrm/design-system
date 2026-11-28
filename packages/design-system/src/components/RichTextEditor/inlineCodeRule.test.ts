import { matchInlineCode, applyInlineCode } from './inlineCodeRule';
import type { RichDoc } from '../RichText/engine/model';

describe('matchInlineCode', () => {
  it('matches `x` closed by the typed backtick', () => {
    expect(matchInlineCode('a `b`', 5)).toEqual({ start: 2, end: 5 });
    expect(matchInlineCode('`code`', 6)).toEqual({ start: 0, end: 6 });
  });
  it('rejects empty, space-padded, mid-word and non-backtick cases', () => {
    expect(matchInlineCode('``', 2)).toBeNull();
    expect(matchInlineCode('a ` b`', 6)).toBeNull();
    expect(matchInlineCode('a `b `', 6)).toBeNull();
    expect(matchInlineCode('a`b`', 4)).toBeNull();
    expect(matchInlineCode('```', 3)).toBeNull();
    expect(matchInlineCode('a `b', 4)).toBeNull();
  });
});

describe('applyInlineCode', () => {
  it('drops the opening backtick and marks the content code, stripping bold', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: 'p',
          type: 'paragraph',
          inlines: [
            { text: 'a ', marks: [] },
            { text: '`b', marks: [{ type: 'bold' }] },
            { text: ' z', marks: [] },
          ],
        },
      ],
    };
    // Caret after "`b" (offset 4); the closing backtick is the one being typed.
    const r = applyInlineCode(doc, { blockId: 'p', offset: 4 }, { start: 2, end: 5 });
    expect(r.doc.blocks[0].inlines).toEqual([
      { text: 'a ', marks: [] },
      { text: 'b', marks: [{ type: 'code' }] },
      { text: ' z', marks: [] },
    ]);
    expect(r.selection).toEqual({
      anchor: { blockId: 'p', offset: 3 },
      focus: { blockId: 'p', offset: 3 },
    });
  });
});
