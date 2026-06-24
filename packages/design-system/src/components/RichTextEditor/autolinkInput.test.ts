import { applyTypeAutolink, atomicLinkDeleteRange } from './autolinkInput';
import type { RichDoc, Inline, Point } from '../RichText/engine/model';

const at = (blockId: string, offset: number): Point => ({ blockId, offset });
const link = (href: string) => ({ type: 'link' as const, href });

function para(id: string, inlines: Inline[]): RichDoc {
  return { blocks: [{ id, type: 'paragraph', inlines }] };
}

describe('applyTypeAutolink', () => {
  it('links the URL that ends at the caret', () => {
    // "see https://a.com" — caret at the end (offset 17).
    const doc = para('b', [{ text: 'see https://a.com', marks: [] }]);
    const result = applyTypeAutolink(doc, at('b', 17), ' ');
    expect(result).not.toBeNull();
    // The link run carries the href.
    const inlines = result!.doc.blocks[0].inlines;
    const linked = inlines.find((r) => r.marks.some((m) => m.type === 'link'));
    expect(linked?.text).toBe('https://a.com');
    expect(linked?.marks).toEqual([link('https://a.com')]);
    // Caret stays at the original caret (the caller inserts the boundary after).
    expect(result!.selection).toEqual({ anchor: at('b', 17), focus: at('b', 17) });
  });

  it('returns null when there is no URL ending at the caret', () => {
    const doc = para('b', [{ text: 'just words', marks: [] }]);
    expect(applyTypeAutolink(doc, at('b', 10), ' ')).toBeNull();
  });

  it('returns null when the caret is already inside an existing link', () => {
    const doc = para('b', [
      { text: 'go ', marks: [] },
      { text: 'https://a.com', marks: [link('https://a.com')] },
    ]);
    expect(applyTypeAutolink(doc, at('b', 16), ' ')).toBeNull();
  });

  it('returns null when the block does not exist', () => {
    const doc = para('b', [{ text: 'see https://a.com', marks: [] }]);
    expect(applyTypeAutolink(doc, at('missing', 17), ' ')).toBeNull();
  });

  it('only considers text up to the caret (URL after the caret is ignored)', () => {
    // Caret at offset 3 ("see"), URL is after it → no URL ends at the caret.
    const doc = para('b', [{ text: 'see https://a.com', marks: [] }]);
    expect(applyTypeAutolink(doc, at('b', 3), ' ')).toBeNull();
  });
});

describe('atomicLinkDeleteRange', () => {
  const resolved = () => true;
  const unresolved = () => false;

  it('caret just after a resolved link (backward) → returns the run range', () => {
    const doc = para('b', [
      { text: 'go ', marks: [] },
      { text: 'https://a.com', marks: [link('https://a.com')] },
    ]);
    // caret at offset 16 = end of the link run.
    const range = atomicLinkDeleteRange(doc, at('b', 16), 'backward', resolved);
    expect(range).toEqual({ anchor: at('b', 3), focus: at('b', 16) });
  });

  it('caret just before a resolved link (forward) → returns the run range', () => {
    const doc = para('b', [
      { text: 'go ', marks: [] },
      { text: 'https://a.com', marks: [link('https://a.com')] },
    ]);
    // caret at offset 3 = start of the link run; forward delete probes offset+1.
    const range = atomicLinkDeleteRange(doc, at('b', 3), 'forward', resolved);
    expect(range).toEqual({ anchor: at('b', 3), focus: at('b', 16) });
  });

  it('returns null when the link is not resolved by renderLink', () => {
    const doc = para('b', [
      { text: 'go ', marks: [] },
      { text: 'https://a.com', marks: [link('https://a.com')] },
    ]);
    expect(atomicLinkDeleteRange(doc, at('b', 16), 'backward', unresolved)).toBeNull();
  });

  it('returns null mid-run (caret inside the link, not at its edge)', () => {
    const doc = para('b', [
      { text: 'go ', marks: [] },
      { text: 'https://a.com', marks: [link('https://a.com')] },
    ]);
    // caret at offset 8 = inside the link run → not at the trailing edge.
    expect(atomicLinkDeleteRange(doc, at('b', 8), 'backward', resolved)).toBeNull();
  });

  it('returns null when there is no link at the probe point', () => {
    const doc = para('b', [{ text: 'plain text', marks: [] }]);
    expect(atomicLinkDeleteRange(doc, at('b', 5), 'backward', resolved)).toBeNull();
    expect(atomicLinkDeleteRange(doc, at('b', 5), 'forward', resolved)).toBeNull();
  });
});
