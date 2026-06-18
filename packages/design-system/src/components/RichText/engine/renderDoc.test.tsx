import { render } from '@testing-library/react';
import { renderDoc } from './renderDoc';
import { createBlock } from './model';
import type { RichDoc } from './model';

function html(doc: RichDoc): string {
  const { container } = render(<>{renderDoc(doc)}</>);
  return container.innerHTML;
}

describe('renderDoc', () => {
  it('renders block types to semantic elements', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('heading', 'H', { level: 2, id: '1' }),
        createBlock('paragraph', 'P', { id: '2' }),
        createBlock('blockquote', 'Q', { id: '3' }),
        createBlock('code_block', 'C', { id: '4' }),
      ],
    };
    const out = html(doc);
    expect(out).toContain('<h2>H</h2>');
    expect(out).toContain('<p>P</p>');
    expect(out).toContain('<blockquote>Q</blockquote>');
    expect(out).toContain('<pre><code>C</code></pre>');
  });

  it('nests inline marks deterministically (link outermost, code innermost)', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'x', marks: [{ type: 'bold' }, { type: 'italic' }] }],
        },
      ],
    };
    expect(html(doc)).toContain('<strong><em>x</em></strong>');
  });

  it('renders a link with href', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'go', marks: [{ type: 'link', href: '/docs' }] }],
        },
      ],
    };
    expect(html(doc)).toContain('<a href="/docs">go</a>');
  });

  it('groups consecutive bullet items into one <ul>', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'one', { id: '1' }),
        createBlock('bullet_item', 'two', { id: '2' }),
        createBlock('paragraph', 'after', { id: '3' }),
      ],
    };
    const out = html(doc);
    expect(out).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(out).toContain('<p>after</p>');
  });

  it('nests deeper-depth items as a child list', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: '1', depth: 0 }),
        createBlock('bullet_item', 'b', { id: '2', depth: 1 }),
      ],
    };
    expect(html(doc)).toContain('<ul><li>a<ul><li>b</li></ul></li></ul>');
  });

  it('renders an empty doc as nothing', () => {
    expect(html({ blocks: [] })).toBe('');
  });
});
