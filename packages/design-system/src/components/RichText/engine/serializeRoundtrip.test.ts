import { toHtml } from './toHtml';
import { toMarkdown } from './toMarkdown';
import { fromHtml } from './fromHtml';
import { fromMarkdown } from './fromMarkdown';
import { createBlock } from './model';
import type { RichDoc, Block, Mark } from './model';

// Strip ids (parsers mint fresh ones) and sort marks (order-insensitive equality).
const sortMarks = (marks: Mark[]): Mark[] => [...marks].sort((a, b) => a.type.localeCompare(b.type));
const shape = (d: RichDoc) =>
  d.blocks.map((b: Block) => ({
    type: b.type,
    ...(b.level !== undefined ? { level: b.level } : {}),
    ...(b.depth !== undefined ? { depth: b.depth } : {}),
    inlines: b.inlines.map((r) => ({ text: r.text, marks: sortMarks(r.marks) })),
  }));

const doc: RichDoc = {
  blocks: [
    createBlock('heading', 'Title', { level: 2, id: 'a' }),
    {
      id: 'b',
      type: 'paragraph',
      inlines: [
        { text: 'see ', marks: [] },
        { text: 'docs', marks: [{ type: 'link', href: '/x' }, { type: 'bold' }] },
        { text: ' and ', marks: [] },
        { text: 'code', marks: [{ type: 'code' }] },
      ],
    },
    createBlock('blockquote', 'quote', { id: 'c' }),
    createBlock('bullet_item', 'a', { id: 'd', depth: 0 }),
    createBlock('bullet_item', 'b', { id: 'e', depth: 1 }),
    createBlock('code_block', 'x = 1', { id: 'f' }),
  ],
};

describe('serialize round-trip', () => {
  it('fromHtml(toHtml(doc)) reproduces the document (underline included)', () => {
    const withU: RichDoc = {
      blocks: [{ id: 'u', type: 'paragraph', inlines: [{ text: 'u', marks: [{ type: 'underline' }] }] }],
    };
    expect(shape(fromHtml(toHtml(withU)))).toEqual(shape(withU));
    expect(shape(fromHtml(toHtml(doc)))).toEqual(shape(doc));
  });

  it('fromMarkdown(toMarkdown(doc)) reproduces the document except underline', () => {
    expect(shape(fromMarkdown(toMarkdown(doc)))).toEqual(shape(doc));
    const withU: RichDoc = {
      blocks: [{ id: 'u', type: 'paragraph', inlines: [{ text: 'u', marks: [{ type: 'underline' }] }] }],
    };
    expect(shape(fromMarkdown(toMarkdown(withU)))).toEqual([
      { type: 'paragraph', inlines: [{ text: 'u', marks: [] }] },
    ]);
  });
});
