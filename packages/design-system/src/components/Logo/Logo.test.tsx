import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders the mark <svg> and forwards ref to the wrapper <div>', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Logo ref={ref} />);
    expect(container.firstChild?.nodeName).toBe('DIV');
    expect(ref.current).toBe(container.firstChild);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the wordmark and marks the svg aria-hidden when text is present', () => {
    const { container } = render(<Logo text="eocrm" />);
    expect(screen.getByText('eocrm')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('labels the mark when there is no text but a label', () => {
    render(<Logo label="eocrm" />);
    const img = screen.getByRole('img', { name: 'eocrm' });
    expect(img.tagName.toLowerCase()).toBe('svg');
  });

  it('mark is decorative (aria-hidden, no name) with neither text nor label', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
  });

  it('does not label the mark when both text and label are passed (text wins)', () => {
    const { container } = render(<Logo text="eocrm" label="ignored" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it.each(['sm', 'md', 'lg'] as const)('size="%s" applies the size class', (size) => {
    const { container } = render(<Logo size={size} />);
    expect((container.firstChild as HTMLElement).className).toMatch(
      new RegExp(`size${size[0].toUpperCase()}${size.slice(1)}`),
    );
  });

  it('textPlacement="bottom" applies the bottom class; default does not', () => {
    const { container, rerender } = render(<Logo text="eocrm" textPlacement="bottom" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/bottom/);
    rerender(<Logo text="eocrm" />);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/bottom/);
  });

  it('merges className and spreads other attrs onto the wrapper', () => {
    const { container } = render(<Logo className="brand" data-foo="bar" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/brand/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
