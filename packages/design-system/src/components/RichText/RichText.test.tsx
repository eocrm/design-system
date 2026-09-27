import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
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
