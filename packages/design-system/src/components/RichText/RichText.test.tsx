import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n';
import { ru } from '../../i18n/ru';
import { RichText } from './RichText';
import { createBlock, docFromText } from './engine/model';
import type { RichDoc } from './engine/model';

describe('RichText', () => {
  it('renders a document', () => {
    render(<RichText value={docFromText('Hello world')} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders structured blocks', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('heading', 'Title', { level: 2, id: '1' }),
        createBlock('bullet_item', 'item', { id: '2' }),
      ],
    };
    render(<RichText value={doc} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('item');
  });

  it('imageMaxHeight sets the image height cap on the root, merged with consumer style (#644)', () => {
    const { container } = render(
      <RichText value={docFromText('x')} imageMaxHeight={320} style={{ color: 'red' }} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--rich-text-image-max-height')).toBe('320px');
    expect(root.style.color).toBe('red');
  });

  it('forwards ref to the root div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<RichText ref={ref} value={docFromText('x')} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className and spreads props', () => {
    const { container } = render(
      <RichText value={docFromText('x')} className="custom" data-testid="rt" />,
    );
    expect(container.querySelector('.custom')).not.toBeNull();
    expect(screen.getByTestId('rt')).toBeInTheDocument();
  });

  it('renders a default <a> for links when no renderLink is supplied', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'site', marks: [{ type: 'link', href: 'https://a.com' }] }],
        },
      ],
    };
    const { container } = render(<RichText value={doc} />);
    expect(container.querySelector('a')).not.toBeNull();
  });

  it('renderLink substitutes a custom node for a link', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'site', marks: [{ type: 'link', href: 'https://a.com' }] }],
        },
      ],
    };
    const { container } = render(
      <RichText value={doc} renderLink={({ href }) => <span data-chip>{href}</span>} />,
    );
    expect(container.querySelector('[data-chip]')).not.toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('renderMention substitutes a custom node for a mention', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] }],
        },
      ],
    };
    const { container } = render(
      <RichText value={doc} renderMention={({ label }) => <button data-chip>{label}</button>} />,
    );
    expect(container.querySelector('[data-chip]')?.textContent).toBe('Alice');
    expect(container.querySelector('[data-mention]')).toBeNull();
  });
});

describe('prose link styling does not override styled links (#570)', () => {
  it('the prose anchor rule targets bare anchors only', () => {
    const scss = readFileSync(resolve(__dirname, '_prose.scss'), 'utf8');
    // A classed anchor (DS <Link>, EntityChip) must keep its own decoration.
    expect(scss).toMatch(/:where\(a:not\(\[class\]\)\)\s*\{[^}]*text-decoration:\s*underline/);
    expect(scss).not.toMatch(/:where\(a\)\s*\{/);
  });

  it('the default rendered link is a bare anchor, so it still gets prose styling', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'site', marks: [{ type: 'link', href: 'https://a.com' }] }],
        },
      ],
    };
    const { container } = render(<RichText value={doc} />);
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a).not.toHaveAttribute('class');
  });
});

describe('onImageActivate (#739)', () => {
  const imageDoc = (over: Partial<RichDoc['blocks'][number]> = {}): RichDoc => ({
    blocks: [
      {
        id: 'img',
        type: 'attachment',
        inlines: [],
        status: 'ready',
        src: 'https://x.test/chart.png',
        mime: 'image/png',
        name: 'chart.png',
        alt: 'Q3 chart',
        width: 320,
        ...over,
      },
    ],
  });

  it('unset: renders the plain <img> as the only figure child, no button', () => {
    const { container } = render(<RichText value={imageDoc()} />);
    expect(container.querySelector('button')).toBeNull();
    const figure = container.querySelector('figure')!;
    expect(figure.children).toHaveLength(1);
    const img = figure.firstElementChild!;
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', 'https://x.test/chart.png');
    expect(img).toHaveAttribute('alt', 'Q3 chart');
    expect(img).toHaveAttribute('width', '320');
    expect(img.closest('button')).toBeNull();
  });

  it('unset: honours an empty alt (decorative) with ??', () => {
    const { container } = render(<RichText value={imageDoc({ alt: '' })} />);
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('set: wraps the image in a named native button; inner img has alt=""', () => {
    render(<RichText value={imageDoc()} onImageActivate={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Open image: Q3 chart' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('set: an empty alt falls back to the file name for the button name (||)', () => {
    render(<RichText value={imageDoc({ alt: '' })} onImageActivate={() => {}} />);
    expect(screen.getByRole('button', { name: 'Open image: chart.png' })).toBeInTheDocument();
  });

  it('set: click, Enter and Space each call the handler once with { src, alt } and the button', async () => {
    const user = userEvent.setup();
    const onImageActivate = vi.fn();
    render(<RichText value={imageDoc()} onImageActivate={onImageActivate} />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    expect(onImageActivate).toHaveBeenCalledTimes(1);
    expect(onImageActivate).toHaveBeenLastCalledWith(
      { src: 'https://x.test/chart.png', alt: 'Q3 chart' },
      btn,
    );
    btn.focus();
    await user.keyboard('{Enter}');
    expect(onImageActivate).toHaveBeenCalledTimes(2);
    await user.keyboard(' ');
    expect(onImageActivate).toHaveBeenCalledTimes(3);
  });

  it('set: the trigger is focused when the handler runs (Safari: click does not focus)', () => {
    let focusedInHandler: Element | null = null;
    render(
      <RichText
        value={imageDoc()}
        onImageActivate={() => (focusedInHandler = document.activeElement)}
      />,
    );
    const btn = screen.getByRole('button');
    // fireEvent.click (unlike user.click) does not move focus — the Safari case.
    fireEvent.click(btn);
    expect(focusedInHandler).toBe(btn);
  });

  it('set: a non-image attachment (file chip) gets no trigger', () => {
    render(
      <RichText
        value={imageDoc({ mime: 'application/pdf', src: 'https://x.test/d.pdf', name: 'd.pdf' })}
        onImageActivate={() => {}}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('link', { name: /d\.pdf/ })).toBeInTheDocument();
  });

  it('ru locale provides the label', () => {
    render(
      <I18nProvider locale="ru" messages={ru}>
        <RichText value={imageDoc()} onImageActivate={() => {}} />
      </I18nProvider>,
    );
    expect(
      screen.getByRole('button', { name: 'Открыть изображение: Q3 chart' }),
    ).toBeInTheDocument();
  });
});

describe('RichText — code blocks and checklists (DS-99/104)', () => {
  const codeDoc = (language?: string): RichDoc => ({
    blocks: [createBlock('code_block', 'const a = 1;', { id: 'c1', language })],
  });

  it('a typescript code block eventually renders highlight token spans, same text', async () => {
    const { container } = render(<RichText value={codeDoc('typescript')} />);
    const code = container.querySelector('pre > code')!;
    expect(code).toHaveClass('language-typescript');
    expect(code.textContent).toBe('const a = 1;');
    await vi.waitFor(() => expect(code.querySelector('[data-token="keyword"]')).not.toBeNull());
    expect(code.textContent).toBe('const a = 1;');
  });

  it('read-only Copy button copies the raw code text', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<RichText value={codeDoc()} />);
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('const a = 1;');
  });

  it('onToggleCheck makes checklist checkboxes operable', () => {
    const onToggleCheck = vi.fn();
    const doc: RichDoc = { blocks: [createBlock('checklist_item', 'Ship', { id: 'k1' })] };
    render(<RichText value={doc} onToggleCheck={onToggleCheck} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ship' }));
    expect(onToggleCheck).toHaveBeenCalledWith('k1', true);
  });

  it('two documents with colliding block ids name each checkbox from its own text', () => {
    const mk = (text: string): RichDoc => ({
      blocks: [createBlock('checklist_item', text, { id: 'rt1' })],
    });
    const { container } = render(
      <>
        <RichText value={mk('First doc')} />
        <RichText value={mk('Second doc')} />
      </>,
    );
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes[0]).toHaveAccessibleName('First doc');
    expect(boxes[1]).toHaveAccessibleName('Second doc');
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Review Focus 5: a rejected highlight import leaves plain code and throws nothing', async () => {
    vi.resetModules();
    vi.doMock('../CodeBlock/highlight', () => {
      throw new Error('chunk load failed');
    });
    try {
      const { RichText: Fresh } = await import('./RichText');
      const { useHighlight } = await import('./useHighlight');
      const { container } = render(<Fresh value={codeDoc('typescript')} />);
      // Let the import settle, then confirm nothing was highlighted.
      await new Promise((r) => setTimeout(r, 50));
      const code = container.querySelector('pre > code')!;
      expect(code.textContent).toBe('const a = 1;');
      expect(code.querySelector('[data-token]')).toBeNull();
      expect(useHighlight).toBeTypeOf('function');
    } finally {
      vi.doUnmock('../CodeBlock/highlight');
      vi.resetModules();
    }
  });
});
