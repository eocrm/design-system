import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    // Which class getTextMetric picks is genuinely asserted here. What is NOT:
    // whether the class exists in the stylesheet. vitest processes no CSS, so
    // `styles.<anything>` resolves to a synthesized name — a renamed or deleted
    // .textEx rule would leave every case below green. The SCSS-source pins at
    // the end of this block cover that half.
    // Queried out of the container rather than by text: getByText normalizes
    // whitespace, so the whitespace-only case below is unfindable that way.
    const edgeOf = (text: string) => {
      const { container } = render(<Logo src={SRC} text={text} />);
      const span = container.querySelector('span[class*="textBlock"] > span');
      return /textEx/.test(span?.className ?? '') ? 'ex' : 'cap';
    };

    it.each(['eocrm', 'acme', 'nexus', 'osmo'])('x-height-only wordmark %s trims to ex', (text) => {
      expect(edgeOf(text)).toBe('ex');
    });

    it.each([
      ['   ', 'whitespace only'],
      ['—', 'punctuation only'],
    ])('wordmark "%s" trims to cap (%s)', (text) => {
      expect(edgeOf(text)).toBe('cap');
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

  describe('trim stylesheet (SCSS source pins)', () => {
    // The other half of the coverage: vitest processes no CSS, so nothing above
    // would notice these rules being renamed, deleted, or having their edges
    // flipped. Reading the source is the same fallback Rail.test.tsx uses.
    const scss = readFileSync(resolve(__dirname, 'Logo.module.scss'), 'utf8');

    it('gates every trim declaration behind @supports', () => {
      // Firefox ships neither text-box property. Ungated, the trim would drop
      // while `line-height: 1` stuck, collapsing the line box to the font size
      // so ascenders/descenders overflow and get clipped by Rail.Header.
      const body = scss.replace(/\/\/.*$/gm, ''); // comments name these too
      const start = body.indexOf('@supports (text-box-trim: trim-both)');
      expect(start).toBeGreaterThan(-1);

      // Walk braces to the gate's own close — rules follow it in this file, so
      // "everything to the last }" would swallow them and prove nothing.
      let depth = 0;
      let end = body.length;
      for (let i = body.indexOf('{', start); i < body.length; i++) {
        if (body[i] === '{') depth++;
        else if (body[i] === '}' && --depth === 0) {
          end = i + 1;
          break;
        }
      }
      const outside = body.slice(0, start) + body.slice(end);

      for (const decl of [
        'text-box-trim:',
        'text-box-edge:',
        'var(--logo-text-gap)',
        'line-height: 1;', // the semicolon keeps 1.1 / 1.2 out of it
      ]) {
        expect({ decl, outsideGate: outside.includes(decl) }).toEqual({ decl, outsideGate: false });
      }
    });

    it('trims the subtext to the cap edge, not the x-height edge', () => {
      // A subtext is sentence-case far more often than not ("Free trial"), and
      // the x-height edge puts the capital's ink outside its own box, pulling
      // the line up into the wordmark's descenders.
      expect(scss).toMatch(/\.subtext\s*\{[^}]*text-box-edge:\s*cap alphabetic/);
      expect(scss).not.toMatch(/\.subtext\s*\{[^}]*text-box-edge:\s*ex /);
    });

    it('puts the wordmark descenders inside its box only when a subtext follows', () => {
      // The `alphabetic` under-edge stops at the baseline, so descender ink
      // hangs outside the box and eats the gap below it — measured at size lg
      // the overhang (5px) exceeds --logo-text-gap (4px) and the tails cross
      // into the subtext. A lone wordmark stays on its baseline so it still
      // centers against the mark.
      expect(scss).toMatch(/\.textCap:has\(\+ \.subtext\)\s*\{[^}]*text-box-edge:\s*cap text/);
      expect(scss).toMatch(/\.textEx:has\(\+ \.subtext\)\s*\{[^}]*text-box-edge:\s*ex text/);
      expect(scss).toMatch(/^\s{2}\.textCap\s*\{[^}]*text-box-edge:\s*cap alphabetic/m);
      expect(scss).toMatch(/^\s{2}\.textEx\s*\{[^}]*text-box-edge:\s*ex alphabetic/m);
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
