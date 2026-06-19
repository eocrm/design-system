import { toHtml } from './toHtml';
import { createBlock } from './model';
import type { RichDoc, Block, Inline } from './model';

const para = (id: string, inlines: Inline[]): Block => ({ id, type: 'paragraph', inlines });
const link = (href: string) => ({ type: 'link' as const, href });

describe('toHtml — blocks', () => {
  it('serializes headings, paragraph, blockquote, code_block', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('heading', 'H', { level: 2, id: 'a' }),
        createBlock('paragraph', 'p', { id: 'b' }),
        createBlock('blockquote', 'q', { id: 'c' }),
        createBlock('code_block', 'a < b', { id: 'd' }),
      ],
    };
    expect(toHtml(doc)).toBe(
      '<h2>H</h2><p>p</p><blockquote>q</blockquote><pre><code>a &lt; b</code></pre>',
    );
  });

  it('groups nested list items into ul/ol with nested li', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: '1', depth: 0 }),
        createBlock('bullet_item', 'b', { id: '2', depth: 1 }),
        createBlock('bullet_item', 'c', { id: '3', depth: 0 }),
      ],
    };
    expect(toHtml(doc)).toBe('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>');
  });

  it('uses <ol> for ordered items', () => {
    expect(toHtml({ blocks: [createBlock('ordered_item', 'a', { id: '1' })] })).toBe(
      '<ol><li>a</li></ol>',
    );
  });

  it('handles 3-level deep nesting then outdent (depths 0,1,2,1,0)', () => {
    const doc: RichDoc = {
      blocks: [0, 1, 2, 1, 0].map((depth, n) =>
        createBlock('bullet_item', String.fromCharCode(97 + n), { id: String(n), depth }),
      ),
    };
    expect(toHtml(doc)).toBe(
      '<ul><li>a<ul><li>b<ul><li>c</li></ul></li><li>d</li></ul></li><li>e</li></ul>',
    );
  });

  it('serializes an empty paragraph as <p></p>', () => {
    expect(toHtml({ blocks: [createBlock('paragraph', '', { id: 'a' })] })).toBe('<p></p>');
  });
});

describe('toHtml — inline marks', () => {
  it('nests marks link-outermost, code-innermost', () => {
    const doc: RichDoc = {
      blocks: [para('a', [{ text: 'x', marks: [link('/u'), { type: 'bold' }, { type: 'code' }] }])],
    };
    expect(toHtml(doc)).toBe(
      '<p><a href="/u" rel="noopener noreferrer"><strong><code>x</code></strong></a></p>',
    );
  });

  it('maps every mark tag including underline', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'b', marks: [{ type: 'bold' }] },
          { text: 'i', marks: [{ type: 'italic' }] },
          { text: 'u', marks: [{ type: 'underline' }] },
          { text: 's', marks: [{ type: 'strike' }] },
        ]),
      ],
    };
    expect(toHtml(doc)).toBe('<p><strong>b</strong><em>i</em><u>u</u><s>s</s></p>');
  });

  it('escapes text and the href, and drops an unsafe-href anchor (keeping text)', () => {
    expect(toHtml({ blocks: [para('a', [{ text: 'a<b>&"', marks: [] }])] })).toBe(
      '<p>a&lt;b&gt;&amp;"</p>',
    );
    expect(
      toHtml({ blocks: [para('a', [{ text: 't', marks: [link('javascript:alert(1)')] }])] }),
    ).toBe('<p>t</p>');
    expect(toHtml({ blocks: [para('a', [{ text: 't', marks: [link('/a b')] }])] })).toBe(
      '<p><a href="/a b" rel="noopener noreferrer">t</a></p>',
    );
  });
});
