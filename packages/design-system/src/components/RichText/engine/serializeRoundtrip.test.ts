// @vitest-environment jsdom
import { toHtml } from './toHtml';
import { toMarkdown } from './toMarkdown';
import { fromHtml } from './fromHtml';
import { fromMarkdown } from './fromMarkdown';
import { createBlock } from './model';
import type { RichDoc, Block, Mark } from './model';

// Strip ids (parsers mint fresh ones) and sort marks (order-insensitive equality).
const sortMarks = (marks: Mark[]): Mark[] =>
  [...marks].sort((a, b) => a.type.localeCompare(b.type));
const shape = (d: RichDoc) =>
  d.blocks.map((b: Block) => ({
    type: b.type,
    ...(b.level !== undefined ? { level: b.level } : {}),
    ...(b.depth !== undefined ? { depth: b.depth } : {}),
    ...(b.checked !== undefined ? { checked: b.checked } : {}),
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
      blocks: [
        { id: 'u', type: 'paragraph', inlines: [{ text: 'u', marks: [{ type: 'underline' }] }] },
      ],
    };
    expect(shape(fromHtml(toHtml(withU)))).toEqual(shape(withU));
    expect(shape(fromHtml(toHtml(doc)))).toEqual(shape(doc));
  });

  it('fromMarkdown(toMarkdown(doc)) reproduces the document except underline', () => {
    expect(shape(fromMarkdown(toMarkdown(doc)))).toEqual(shape(doc));
    const withU: RichDoc = {
      blocks: [
        { id: 'u', type: 'paragraph', inlines: [{ text: 'u', marks: [{ type: 'underline' }] }] },
      ],
    };
    expect(shape(fromMarkdown(toMarkdown(withU)))).toEqual([
      { type: 'paragraph', inlines: [{ text: 'u', marks: [] }] },
    ]);
  });

  it('Markdown round-trips link text containing a closing bracket', () => {
    const d: RichDoc = {
      blocks: [
        {
          id: 'a',
          type: 'paragraph',
          inlines: [{ text: 'a]b', marks: [{ type: 'link', href: '/u' }] }],
        },
      ],
    };
    expect(shape(fromMarkdown(toMarkdown(d)))).toEqual(shape(d));
  });

  it('Markdown round-trips a bullet list immediately followed by an ordered list', () => {
    const d: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: 'a', depth: 0 }),
        createBlock('ordered_item', 'b', { id: 'b', depth: 0 }),
      ],
    };
    expect(shape(fromMarkdown(toMarkdown(d)))).toEqual(shape(d));
    expect(toMarkdown(d)).toBe('- a\n\n1. b');
  });

  it.each([
    ['checklist under bullet', 'bullet_item', 'checklist_item'],
    ['bullet under checklist', 'checklist_item', 'bullet_item'],
    ['ordered under checklist', 'checklist_item', 'ordered_item'],
    ['ordered under bullet', 'bullet_item', 'ordered_item'],
  ] as const)('Markdown keeps nesting for %s', (_name, outer, inner) => {
    const d: RichDoc = {
      blocks: [
        createBlock(outer, 'a', {
          id: 'a',
          depth: 0,
          checked: outer === 'checklist_item' ? false : undefined,
        }),
        createBlock(inner, 'b', {
          id: 'b',
          depth: 1,
          checked: inner === 'checklist_item' ? true : undefined,
        }),
      ],
    };
    expect(shape(fromMarkdown(toMarkdown(d)))).toEqual(shape(d));
  });

  it('Markdown keeps a type switch between siblings at depth 1', () => {
    const d: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: 'a', depth: 0 }),
        createBlock('bullet_item', 'b', { id: 'b', depth: 1 }),
        createBlock('ordered_item', 'c', { id: 'c', depth: 1 }),
        createBlock('ordered_item', 'd', { id: 'd', depth: 0 }),
      ],
    };
    expect(shape(fromMarkdown(toMarkdown(d)))).toEqual(shape(d));
  });
});

describe('wave-2 blocks: divider, checklist, code language', () => {
  const strip = (d: RichDoc) =>
    d.blocks.map(({ id: _id, ...rest }) => ({
      ...rest,
      inlines: rest.inlines.map((r) => ({ text: r.text, marks: sortMarks(r.marks) })),
    }));
  const blocksDoc: RichDoc = {
    blocks: [
      createBlock('paragraph', 'intro'),
      createBlock('divider'),
      createBlock('checklist_item', 'Buy milk', { checked: true, depth: 0 }),
      createBlock('checklist_item', 'Whole', { checked: false, depth: 1 }),
      createBlock('checklist_item', 'Call', { checked: false, depth: 0 }),
      createBlock('code_block', 'let a = 1;', { language: 'typescript' }),
      createBlock('code_block', 'plain'),
    ],
  };

  it('round-trips through HTML', () => {
    expect(strip(fromHtml(toHtml(blocksDoc)))).toEqual(strip(blocksDoc));
  });

  it('round-trips through Markdown', () => {
    expect(strip(fromMarkdown(toMarkdown(blocksDoc)))).toEqual(strip(blocksDoc));
  });

  it('imports GitHub-shaped checkbox lists, <hr/> and lang classes', () => {
    const d = fromHtml(
      '<ul><li><input type="checkbox" checked>Done</li></ul><hr/><pre><code class="language-ts">x</code></pre>',
    );
    expect(d.blocks.map((b) => [b.type, b.checked, b.language])).toEqual([
      ['checklist_item', true, undefined],
      ['divider', undefined, undefined],
      ['code_block', undefined, 'typescript'],
    ]);
  });

  it('imports Markdown fences, rules and task items', () => {
    const d = fromMarkdown('```py\nx\n```\n\n***\n\n___\n\n- [X] a\n- [ ] b');
    expect(d.blocks.map((b) => [b.type, b.checked, b.language])).toEqual([
      ['code_block', undefined, 'python'],
      ['divider', undefined, undefined],
      ['divider', undefined, undefined],
      ['checklist_item', true, undefined],
      ['checklist_item', false, undefined],
    ]);
  });

  it('mixed bullet then task item at depth 0 stays bullet then checklist', () => {
    const d = fromMarkdown('- a\n- [ ] b');
    expect(d.blocks.map((b) => b.type)).toEqual(['bullet_item', 'checklist_item']);
  });

  it('hoists an <hr> out of a blockquote as a divider', () => {
    const d = fromHtml('<blockquote><p>a</p><hr><p>b</p></blockquote>');
    expect(d.blocks.map((b) => [b.type, b.inlines[0]?.text])).toEqual([
      ['blockquote', 'a'],
      ['divider', ''],
      ['blockquote', 'b'],
    ]);
  });

  it('an <hr> inside a list item never becomes a text block', () => {
    const d = fromHtml('<ul><li>a<hr>b</li></ul>');
    expect(d.blocks.map((b) => b.type)).toEqual(['bullet_item']);
  });
});
