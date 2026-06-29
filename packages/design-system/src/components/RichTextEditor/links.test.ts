import { linkAt, setLink, removeLink } from './links';
import { createBlock } from '../RichText/engine/model';
import type { RichDoc, Range, Inline } from '../RichText/engine/model';

const at = (blockId: string, offset: number) => ({ blockId, offset });
const span = (
  a: { blockId: string; offset: number },
  f: { blockId: string; offset: number },
): Range => ({ anchor: a, focus: f });
const bold = { type: 'bold' as const };
const link = (href: string) => ({ type: 'link' as const, href });

function para(id: string, inlines: Inline[]): RichDoc['blocks'][number] {
  return { id, type: 'paragraph', inlines };
}

describe('linkAt', () => {
  it('caret inside a link → its href + full contiguous extent', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'go ', marks: [] },
          { text: 'home', marks: [link('/home')] },
          { text: ' now', marks: [] },
        ]),
      ],
    };
    expect(linkAt(doc, at('a', 5))).toEqual({ href: '/home', range: span(at('a', 3), at('a', 7)) });
  });

  it('caret outside any link → null', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'plain', marks: [] }])] };
    expect(linkAt(doc, at('a', 2))).toBeNull();
  });

  it('caret at the link trailing boundary (block end) resolves to the link', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'x', marks: [] },
          { text: 'link', marks: [link('/p')] },
        ]),
      ],
    };
    expect(linkAt(doc, at('a', 5))).toEqual({ href: '/p', range: span(at('a', 1), at('a', 5)) });
  });

  it('two adjacent links with different hrefs stay separate', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'aa', marks: [link('/1')] },
          { text: 'bb', marks: [link('/2')] },
        ]),
      ],
    };
    expect(linkAt(doc, at('a', 1))).toEqual({ href: '/1', range: span(at('a', 0), at('a', 2)) });
    expect(linkAt(doc, at('a', 3))).toEqual({ href: '/2', range: span(at('a', 2), at('a', 4)) });
  });

  it('caret at offset 0 of a leading non-link run → null', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'hi', marks: [] }])] };
    expect(linkAt(doc, at('a', 0))).toBeNull();
  });

  it('unknown block id → null', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'x', { id: 'a' })] };
    expect(linkAt(doc, at('zzz', 0))).toBeNull();
  });
});

describe('removeLink', () => {
  it('strips the link over the range, keeping other marks', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'hi', marks: [link('/p'), bold] }])] };
    const r = removeLink(doc, span(at('a', 0), at('a', 2)));
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'hi', marks: [bold] }]);
    expect(r.selection).toEqual(span(at('a', 0), at('a', 2)));
  });
});

describe('setLink', () => {
  it('case 1 — non-collapsed selection gets the link mark', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'abcd', { id: 'a' })] };
    const r = setLink(doc, span(at('a', 0), at('a', 4)), '/p');
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'abcd', marks: [link('/p')] }]);
    expect(r.selection).toEqual(span(at('a', 0), at('a', 4)));
  });

  it('case 1 — re-applying replaces the href (no stacking)', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'abcd', marks: [link('/old')] }])] };
    const r = setLink(doc, span(at('a', 0), at('a', 4)), '/new');
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'abcd', marks: [link('/new')] }]);
  });

  it('case 2 — collapsed caret in a link re-links its full extent', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'go ', marks: [] },
          { text: 'home', marks: [link('/old')] },
        ]),
      ],
    };
    const r = setLink(doc, span(at('a', 5), at('a', 5)), '/new');
    expect(r.doc.blocks[0].inlines).toEqual([
      { text: 'go ', marks: [] },
      { text: 'home', marks: [link('/new')] },
    ]);
    expect(r.selection).toEqual(span(at('a', 3), at('a', 7)));
  });

  it('case 3 — collapsed caret elsewhere inserts the href as linked text', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'go ', { id: 'a' })] };
    const r = setLink(doc, span(at('a', 3), at('a', 3)), '/p');
    expect(r.doc.blocks[0].inlines).toEqual([
      { text: 'go ', marks: [] },
      { text: '/p', marks: [link('/p')] },
    ]);
    expect(r.selection).toEqual(span(at('a', 3), at('a', 5)));
  });

  it('empty href — removes an existing link at a collapsed caret', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'home', marks: [link('/p')] }])] };
    const r = setLink(doc, span(at('a', 2), at('a', 2)), '  ');
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'home', marks: [] }]);
  });

  it('empty href — no-op when there is nothing to link', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'plain', { id: 'a' })] };
    const r = setLink(doc, span(at('a', 2), at('a', 2)), '');
    expect(r.doc).toBe(doc);
  });

  it('empty href — non-collapsed selection removes the link', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'hi', marks: [link('/p')] }])] };
    const r = setLink(doc, span(at('a', 0), at('a', 2)), '');
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'hi', marks: [] }]);
  });
});

describe('linkAt — void blocks (issue #261)', () => {
  // An external / image-attachment doc can carry an attachment block with NO
  // `inlines` field at all. The toolbar recomputes the active link from the caret
  // block on every selection change, so linkAt must resolve "no link" for a void
  // block instead of crashing on `block.inlines` being undefined.
  const attachment = { id: 'img', type: 'attachment', src: 'x.png' } as RichDoc['blocks'][number];

  it('returns null (does not throw) for a point on an attachment with no inlines', () => {
    const doc: RichDoc = { blocks: [attachment] };
    expect(() => linkAt(doc, at('img', 0))).not.toThrow();
    expect(linkAt(doc, at('img', 0))).toBeNull();
  });

  it('still resolves links in sibling text blocks when an attachment is present', () => {
    const doc: RichDoc = {
      blocks: [attachment, para('a', [{ text: 'home', marks: [link('/home')] }])],
    };
    expect(linkAt(doc, at('a', 2))).toEqual({ href: '/home', range: span(at('a', 0), at('a', 4)) });
  });
});
