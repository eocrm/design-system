import { render } from '@testing-library/react';
import { I18nProvider } from '../../../i18n';
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
    expect(html(doc)).toContain('<a href="/docs" rel="noopener noreferrer">go</a>');
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

  it('renders ordered-list items into an <ol>', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('ordered_item', 'one', { id: '1' }),
        createBlock('ordered_item', 'two', { id: '2' }),
      ],
    };
    expect(html(doc)).toContain('<ol><li>one</li><li>two</li></ol>');
  });

  it('renders a nested ordered list inside a bullet list (mixed types by depth)', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: '1', depth: 0 }),
        createBlock('ordered_item', 'b', { id: '2', depth: 1 }),
      ],
    };
    expect(html(doc)).toContain('<ul><li>a<ol><li>b</li></ol></li></ul>');
  });

  it('renders three depth levels', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: '1', depth: 0 }),
        createBlock('bullet_item', 'b', { id: '2', depth: 1 }),
        createBlock('bullet_item', 'c', { id: '3', depth: 2 }),
      ],
    };
    expect(html(doc)).toContain('<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ul>');
  });

  it('does NOT drop items when depth jumps non-monotonically (normalizes gaps)', () => {
    // depths [0, 2, 1] used to drop "b" (the deeper run was overwritten). The
    // normalizer clamps to [0, 1, 1], so a is the parent of siblings b and c.
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: '1', depth: 0 }),
        createBlock('bullet_item', 'b', { id: '2', depth: 2 }),
        createBlock('bullet_item', 'c', { id: '3', depth: 1 }),
      ],
    };
    const out = html(doc);
    expect(out).toContain('b');
    expect(out).toContain('c');
    expect(out).toBe('<ul><li>a<ul><li>b</li><li>c</li></ul></li></ul>');
  });

  it('nests multiple marks including a link in deterministic order', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [
            {
              text: 'x',
              marks: [{ type: 'code' }, { type: 'link', href: '/d' }, { type: 'bold' }],
            },
          ],
        },
      ],
    };
    // link outermost, then bold, then code innermost
    expect(html(doc)).toContain(
      '<a href="/d" rel="noopener noreferrer"><strong><code>x</code></strong></a>',
    );
  });

  it('renders heading levels 1 and 3', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('heading', 'One', { level: 1, id: '1' }),
        createBlock('heading', 'Three', { level: 3, id: '2' }),
      ],
    };
    const out = html(doc);
    expect(out).toContain('<h1>One</h1>');
    expect(out).toContain('<h3>Three</h3>');
  });

  it('renders an empty doc as nothing', () => {
    expect(html({ blocks: [] })).toBe('');
  });

  it('sanitizes unsafe link schemes (no href) and keeps safe ones', () => {
    const bad: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'x', marks: [{ type: 'link', href: 'javascript:alert(1)' }] }],
        },
      ],
    };
    const out = html(bad);
    expect(out).toContain('<a rel="noopener noreferrer">x</a>'); // no href attribute
    expect(out).not.toContain('javascript:');

    const good: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'x', marks: [{ type: 'link', href: 'https://x.com' }] }],
        },
      ],
    };
    expect(html(good)).toContain('href="https://x.com"');
    expect(html(good)).toContain('rel="noopener noreferrer"');

    const rel: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'x', marks: [{ type: 'link', href: '/docs' }] }],
        },
      ],
    };
    expect(html(rel)).toContain('href="/docs"');

    const protoRel: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'x', marks: [{ type: 'link', href: '//evil.com' }] }],
        },
      ],
    };
    // protocol-relative URLs are blocked (no href), not treated as relative
    expect(html(protoRel)).toContain('<a rel="noopener noreferrer">x</a>');
    expect(html(protoRel)).not.toContain('evil.com');
  });

  it('renders code_block content as plain text (ignores marks)', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'code_block',
          inlines: [{ text: 'const x = 1', marks: [{ type: 'bold' }] }],
        },
      ],
    };
    expect(html(doc)).toContain('<pre><code>const x = 1</code></pre>');
  });
});

it('renders a mention mark as a data-mention span containing the chip text', () => {
  const doc: RichDoc = {
    blocks: [
      {
        id: 'b',
        type: 'paragraph',
        inlines: [
          { text: 'hi ', marks: [] },
          { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] },
        ],
      },
    ],
  };
  const { container } = render(<>{renderDoc(doc)}</>);
  const chip = container.querySelector('[data-mention]') as HTMLElement;
  expect(chip).not.toBeNull();
  expect(chip.tagName).toBe('SPAN');
  expect(chip).toHaveAttribute('data-mention-id', 'u1');
  expect(chip).toHaveAttribute('data-mention-label', 'Alice');
  expect(chip.textContent).toBe('@Alice');
});

describe('renderDoc editable option', () => {
  it('adds data-block-id to block elements when editable', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'hi', { id: 'b1' })] };
    const { container } = render(<>{renderDoc(doc, { editable: true })}</>);
    expect(container.querySelector('[data-block-id="b1"]')?.tagName).toBe('P');
  });

  it('renders an empty editable block with a <br>', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', '', { id: 'b1' })] };
    const { container } = render(<>{renderDoc(doc, { editable: true })}</>);
    expect(container.querySelector('[data-block-id="b1"]')?.innerHTML).toBe('<br>');
  });

  it('puts data-block-id on each list item when editable', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: 'l1' }),
        createBlock('bullet_item', 'b', { id: 'l2' }),
      ],
    };
    const { container } = render(<>{renderDoc(doc, { editable: true })}</>);
    expect(container.querySelectorAll('li[data-block-id]')).toHaveLength(2);
  });

  it('read-only output is unchanged (no data-block-id)', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'hi', { id: 'b1' })] };
    expect(html(doc)).toBe('<p>hi</p>');
  });
});

describe('renderDoc renderLink option', () => {
  it('renderLink substitutes a link node in the viewer', () => {
    const doc = {
      blocks: [createBlock('paragraph', 'x', { marks: [{ type: 'link', href: 'https://a.com' }] })],
    };
    const { container } = render(
      <div>{renderDoc(doc, { renderLink: ({ href }) => <span data-chip>{href}</span> })}</div>,
    );
    expect(container.querySelector('[data-chip]')).not.toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('editable mode wraps a custom link return in an atomic widget; a fallback return is not wrapped', () => {
    const doc = {
      blocks: [
        createBlock('paragraph', 'abc', { marks: [{ type: 'link', href: 'https://a.com' }] }),
      ],
    };
    const custom = render(
      <div>
        {renderDoc(doc, {
          editable: true,
          renderLink: ({ href }) => <span data-chip>{href}</span>,
        })}
      </div>,
    );
    const w = custom.container.querySelector('[data-rich-link]');
    expect(w).not.toBeNull();
    expect(w!.getAttribute('data-len')).toBe('3'); // model run text length
    expect(w!.getAttribute('contenteditable')).toBe('false');

    const fb = render(
      <div>{renderDoc(doc, { editable: true, renderLink: (_l, fallback) => fallback })}</div>,
    );
    expect(fb.container.querySelector('[data-rich-link]')).toBeNull(); // plain link stays editable
    expect(fb.container.querySelector('a')).not.toBeNull();
  });

  it('coalesces a same-href link split across runs into ONE chip', () => {
    // Two adjacent runs share the same link href (e.g. internal bold, or HTML import).
    const doc = {
      blocks: [
        {
          id: 'b1',
          type: 'paragraph' as const,
          inlines: [
            { text: 'ab', marks: [{ type: 'link' as const, href: 'https://a.com' }] },
            {
              text: 'cd',
              marks: [{ type: 'link' as const, href: 'https://a.com' }, { type: 'bold' as const }],
            },
          ],
        },
      ],
    };
    let calls = 0;
    const chips = render(
      <div>
        {renderDoc(doc, {
          renderLink: ({ href, text }) => {
            calls += 1;
            return (
              <span data-chip data-text={text}>
                {href}
              </span>
            );
          },
        })}
      </div>,
    );
    // One chip for the whole span, with the concatenated text — not one per run.
    expect(chips.container.querySelectorAll('[data-chip]')).toHaveLength(1);
    expect(chips.container.querySelector('[data-chip]')!.getAttribute('data-text')).toBe('abcd');
    expect(calls).toBe(1);

    // Editable: a single widget whose data-len is the full span length (4).
    const ed = render(
      <div>
        {renderDoc(doc, {
          editable: true,
          renderLink: ({ href }) => <span data-chip>{href}</span>,
        })}
      </div>,
    );
    const widgets = ed.container.querySelectorAll('[data-rich-link]');
    expect(widgets).toHaveLength(1);
    expect(widgets[0].getAttribute('data-len')).toBe('4');
  });
});

describe('renderDoc renderMention option', () => {
  // A doc with one mention run ("hi " + "@Alice").
  const mentionDoc = () => ({
    blocks: [
      {
        id: 'b',
        type: 'paragraph' as const,
        inlines: [
          { text: 'hi ', marks: [] },
          { text: '@Alice', marks: [{ type: 'mention' as const, id: 'u1', label: 'Alice' }] },
        ],
      },
    ],
  });

  it('renderMention substitutes a custom node (read-only)', () => {
    const { container } = render(
      <>{renderDoc(mentionDoc(), { renderMention: ({ label }) => <button>{label}!</button> })}</>,
    );
    expect(container.querySelector('button')?.textContent).toBe('Alice!');
  });

  it('renderMention declining (returns defaultNode) keeps the default mention span', () => {
    const { container } = render(
      <>{renderDoc(mentionDoc(), { renderMention: (_m, def) => def })}</>,
    );
    expect(container.querySelector('[data-mention]')).toBeTruthy();
    expect(container.querySelector('button')).toBeNull();
  });

  it('on the editable surface a substituted mention is an atomic widget with data-len', () => {
    const { container } = render(
      <>
        {renderDoc(mentionDoc(), {
          editable: true,
          renderMention: ({ label }) => <button>{label}</button>,
        })}
      </>,
    );
    const w = container.querySelector('[data-rich-mention]')!;
    expect(w).toHaveAttribute('contenteditable', 'false');
    expect(w).toHaveAttribute('data-len', '6'); // '@Alice'.length
  });

  it('coalesces a same-id/label mention split across runs into ONE widget', () => {
    const doc = {
      blocks: [
        {
          id: 'b',
          type: 'paragraph' as const,
          inlines: [
            { text: '@Al', marks: [{ type: 'mention' as const, id: 'u1', label: 'Alice' }] },
            {
              text: 'ice',
              marks: [
                { type: 'mention' as const, id: 'u1', label: 'Alice' },
                { type: 'bold' as const },
              ],
            },
          ],
        },
      ],
    };
    let calls = 0;
    const { container } = render(
      <>
        {renderDoc(doc, {
          renderMention: ({ id }) => {
            calls += 1;
            return <button data-id={id}>chip</button>;
          },
        })}
      </>,
    );
    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(calls).toBe(1);

    const ed = render(
      <>{renderDoc(doc, { editable: true, renderMention: () => <button>chip</button> })}</>,
    );
    const widgets = ed.container.querySelectorAll('[data-rich-mention]');
    expect(widgets).toHaveLength(1);
    expect(widgets[0].getAttribute('data-len')).toBe('6'); // "@Alice"
  });

  it('renderMention composes with renderLink', () => {
    const doc = {
      blocks: [
        {
          id: 'b',
          type: 'paragraph' as const,
          inlines: [
            { text: 'x', marks: [{ type: 'link' as const, href: 'https://a' }] },
            { text: '@Bob', marks: [{ type: 'mention' as const, id: 'u2', label: 'Bob' }] },
          ],
        },
      ],
    };
    const { container } = render(
      <>
        {renderDoc(doc, {
          renderLink: (_l, def) => def,
          renderMention: ({ label }) => <button>{label}</button>,
        })}
      </>,
    );
    expect(container.querySelector('a')).toBeTruthy();
    expect(container.querySelector('button')?.textContent).toBe('Bob');
  });
});

describe('renderDoc color marks', () => {
  const colorDoc = (mark: { type: 'textColor' | 'bgColor'; color: string }): RichDoc => ({
    blocks: [{ id: '1', type: 'paragraph', inlines: [{ text: 'x', marks: [mark] }] }],
  });

  it('renders a textColor mark as a span with the resolved color var (read-only)', () => {
    const { container } = render(<>{renderDoc(colorDoc({ type: 'textColor', color: 'red' }))}</>);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.style.color).toBe('var(--color-danger)');
    expect(span!.textContent).toBe('x');
  });

  it('renders a bgColor mark as a span with the resolved background var (read-only)', () => {
    const { container } = render(<>{renderDoc(colorDoc({ type: 'bgColor', color: 'green' }))}</>);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.style.backgroundColor).toBe('var(--color-success-bg-subtle)');
  });

  it('renders color spans on the editable surface too', () => {
    const { container } = render(
      <>{renderDoc(colorDoc({ type: 'textColor', color: 'red' }), { editable: true })}</>,
    );
    expect(container.querySelector('span')!.style.color).toBe('var(--color-danger)');
    const bg = render(
      <>{renderDoc(colorDoc({ type: 'bgColor', color: 'green' }), { editable: true })}</>,
    );
    expect(bg.container.querySelector('span')!.style.backgroundColor).toBe(
      'var(--color-success-bg-subtle)',
    );
  });

  it('an unknown color key renders no wrapper span (no empty style)', () => {
    const { container } = render(<>{renderDoc(colorDoc({ type: 'textColor', color: 'mauve' }))}</>);
    expect(container.querySelector('span')).toBeNull();
    expect(container.textContent).toBe('x');
  });
});

it('renders an attachment block as a contenteditable=false figure', () => {
  const doc = {
    blocks: [
      {
        id: 'a',
        type: 'attachment' as const,
        status: 'ready' as const,
        src: 'http://u/p.png',
        mime: 'image/png',
        name: 'p.png',
        inlines: [],
      },
    ],
  };
  const { container } = render(
    <I18nProvider locale="en">{renderDoc(doc, { editable: true })}</I18nProvider>,
  );
  const fig = container.querySelector('figure[data-block-id="a"]');
  expect(fig).toBeTruthy();
  expect(fig).toHaveAttribute('contenteditable', 'false');
  expect(fig).toHaveAttribute('data-attachment');
});

it('stamps data-align on a centered attachment figure', () => {
  const doc = {
    blocks: [
      {
        id: 'a',
        type: 'attachment' as const,
        status: 'ready' as const,
        src: 'http://u/p.png',
        mime: 'image/png',
        name: 'p',
        align: 'center' as const,
        inlines: [],
      },
    ],
  };
  const { container } = render(
    <I18nProvider locale="en">{renderDoc(doc, { editable: true })}</I18nProvider>,
  );
  expect(container.querySelector('figure[data-block-id="a"]')).toHaveAttribute(
    'data-align',
    'center',
  );
});
