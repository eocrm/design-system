import { matchInlineCode, applyInlineCode, matchInlineCodeAt } from './inlineCodeRule';
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

describe('matchInlineCodeAt', () => {
  const para = (inlines: RichDoc['blocks'][number]['inlines']): RichDoc => ({
    blocks: [{ id: 'p', type: 'paragraph', inlines }],
  });
  it('matches a plain `x being closed', () => {
    expect(
      matchInlineCodeAt(para([{ text: 'a `b', marks: [] }]), { blockId: 'p', offset: 4 }),
    ).toEqual({ start: 2, end: 5 });
  });
  it('skips when the typed text would be code (caret inside a code run)', () => {
    // "x `y z" all code: typing ` after "z" stays a literal backtick in the code.
    const doc = para([{ text: 'x `y z', marks: [{ type: 'code' }] }]);
    expect(matchInlineCodeAt(doc, { blockId: 'p', offset: 6 })).toBeNull();
  });
  it('skips when the opening backtick sits inside a code run', () => {
    const doc = para([
      { text: 'a `b', marks: [{ type: 'code' }] },
      { text: ' c', marks: [] },
    ]);
    expect(matchInlineCodeAt(doc, { blockId: 'p', offset: 6 })).toBeNull();
  });
  it('ignores code blocks', () => {
    const doc: RichDoc = {
      blocks: [{ id: 'p', type: 'code_block', inlines: [{ text: 'a `b', marks: [] }] }],
    };
    expect(matchInlineCodeAt(doc, { blockId: 'p', offset: 4 })).toBeNull();
  });
});
