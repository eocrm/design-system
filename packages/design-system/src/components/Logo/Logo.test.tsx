import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Logo } from './Logo';

const SRC = '/logo.svg';

describe('Logo', () => {
  it('renders the mark <img> with src and forwards ref to the wrapper <div>', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Logo ref={ref} src={SRC} />);
    expect(container.firstChild?.nodeName).toBe('DIV');
    expect(ref.current).toBe(container.firstChild);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', SRC);
  });

  it('renders the wordmark and the mark is decorative (alt="") when text is present', () => {
    const { container } = render(<Logo src={SRC} text="eocrm" />);
    expect(screen.getByText('eocrm')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('uses label as the mark alt (accessible name) when there is no text', () => {
    render(<Logo src={SRC} label="eocrm" />);
    expect(screen.getByRole('img', { name: 'eocrm' })).toBeInTheDocument();
  });

  it('mark is decorative (alt="") with neither text nor label', () => {
    const { container } = render(<Logo src={SRC} />);
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('does not use label as alt when text is also passed (text wins)', () => {
    const { container } = render(<Logo src={SRC} text="eocrm" label="ignored" />);
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.queryByRole('img', { name: 'ignored' })).not.toBeInTheDocument();
  });

  it.each(['sm', 'md', 'lg'] as const)('size="%s" applies the size class', (size) => {
    const { container } = render(<Logo src={SRC} size={size} />);
    expect((container.firstChild as HTMLElement).className).toMatch(
      new RegExp(`size${size[0].toUpperCase()}${size.slice(1)}`),
    );
  });

  it('textPlacement="bottom" applies the bottom class; default does not', () => {
    const { container, rerender } = render(<Logo src={SRC} text="eocrm" textPlacement="bottom" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/bottom/);
    rerender(<Logo src={SRC} text="eocrm" />);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/bottom/);
  });

  it('renders subtext under the wordmark when text is present', () => {
    render(<Logo src={SRC} text="eocrm" subtext="Free trial" />);
    expect(screen.getByText('eocrm')).toBeInTheDocument();
    expect(screen.getByText('Free trial')).toBeInTheDocument();
  });

  describe('wordmark text-box edge', () => {
    // Which edge the wordmark is trimmed to is the only observable output of
    // getTextMetric, and `ex` crops any glyph that reaches above the x-height.
    // `cap` is always safe; `ex` must be reserved for wordmarks that earn it.
    const edgeOf = (text: string) => {
      render(<Logo src={SRC} text={text} />);
      return /textEx/.test(screen.getByText(text).className) ? 'ex' : 'cap';
    };

    it.each(['eocrm', 'acme', 'nexus', 'osmo'])('x-height-only wordmark %s trims to ex', (text) => {
      expect(edgeOf(text)).toBe('ex');
    });

    it.each([
      ['EOCRM', 'all caps'],
      ['Acme', 'leading capital'],
      ['lockbox', 'the b/k ascenders'],
      ['dropbox', 'the d/b ascenders'],
      ['flow', 'the f/l ascenders'],
      ['minio', 'the dotted i'],
      ['web3', 'a digit'],
      ['мойсклад', 'a non-Latin script'],
    ])('wordmark %s trims to cap (%s)', (text) => {
      expect(edgeOf(text)).toBe('cap');
    });

    it('falls back to cap for a non-string wordmark', () => {
      const { container } = render(<Logo src={SRC} text={<i>eocrm</i>} />);
      const span = container.querySelector('span[class*="text"]:not([class*="textBlock"])');
      expect(span?.className).toMatch(/textCap/);
      expect(span?.className).not.toMatch(/textEx/);
    });
  });

  it('ignores subtext when there is no text', () => {
    render(<Logo src={SRC} subtext="Free trial" />);
    expect(screen.queryByText('Free trial')).not.toBeInTheDocument();
  });

  it('merges className and spreads other attrs onto the wrapper', () => {
    const { container } = render(<Logo src={SRC} className="brand" data-foo="bar" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/brand/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
