import { toMarkdown } from './toMarkdown';
import { createBlock } from './model';
import type { RichDoc, Block, Inline } from './model';

const para = (id: string, inlines: Inline[]): Block => ({ id, type: 'paragraph', inlines });
const link = (href: string) => ({ type: 'link' as const, href });

describe('toMarkdown — blocks', () => {
  it('serializes headings, paragraph, blockquote, code fence', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('heading', 'H', { level: 2, id: 'a' }),
        createBlock('paragraph', 'p', { id: 'b' }),
        createBlock('blockquote', 'q', { id: 'c' }),
        createBlock('code_block', 'code', { id: 'd' }),
      ],
    };
    expect(toMarkdown(doc)).toBe('## H\n\np\n\n> q\n\n```\ncode\n```');
  });

  it('serializes nested lists with 2-space indentation, consecutive items joined', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: '1', depth: 0 }),
        createBlock('bullet_item', 'b', { id: '2', depth: 1 }),
        createBlock('ordered_item', 'c', { id: '3', depth: 0 }),
      ],
    };
    // bullet(0) → bullet(1) same type → single newline; bullet → ordered differs
    // → blank line so the parser doesn't coerce the ordered item to a bullet.
    expect(toMarkdown(doc)).toBe('- a\n  - b\n\n1. c');
  });
});

describe('toMarkdown — inline', () => {
  it('wraps marks and drops underline', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'b', marks: [{ type: 'bold' }] },
          { text: ' ', marks: [] },
          { text: 'i', marks: [{ type: 'italic' }] },
          { text: ' ', marks: [] },
          { text: 's', marks: [{ type: 'strike' }] },
          { text: ' ', marks: [] },
          { text: 'c', marks: [{ type: 'code' }] },
          { text: ' ', marks: [] },
          { text: 'u', marks: [{ type: 'underline' }] },
        ]),
      ],
    };
    expect(toMarkdown(doc)).toBe('**b** *i* ~~s~~ `c` u');
  });

  it('serializes a link with its (safe) href', () => {
    expect(toMarkdown({ blocks: [para('a', [{ text: 'docs', marks: [link('/u')] }])] })).toBe(
      '[docs](/u)',
    );
  });

  it('serializes a mention as plain text (lossy — id dropped)', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: 'b',
          type: 'paragraph',
          inlines: [
            { text: 'cc ', marks: [] },
            { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] },
          ],
        },
      ],
    };
    expect(toMarkdown(doc)).toBe('cc @Alice');
  });

  it('escapes inline markdown specials and a leading block marker', () => {
    expect(toMarkdown({ blocks: [para('a', [{ text: 'a*b_c', marks: [] }])] })).toBe('a\\*b\\_c');
    expect(toMarkdown({ blocks: [para('a', [{ text: '# not a heading', marks: [] }])] })).toBe(
      '\\# not a heading',
    );
  });
});
