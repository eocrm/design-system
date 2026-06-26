import { render } from '@testing-library/react';
import { createRef } from 'react';
import { Sticky } from './Sticky';
import type { StickyTop } from './Sticky';

describe('Sticky', () => {
  it('renders children in a <div> and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Sticky ref={ref}>
        <span data-testid="child">x</span>
      </Sticky>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
  });

  it('always applies the base sticky class', () => {
    const { container } = render(<Sticky>x</Sticky>);
    // The base class carries position:sticky + align-self:start.
    expect((container.firstChild as HTMLElement).className).toMatch(/sticky/);
  });

  it('defaults to top="none"', () => {
    const { container } = render(<Sticky>x</Sticky>);
    expect((container.firstChild as HTMLElement).className).toMatch(/top-none/);
  });

  it.each<StickyTop>(['none', 'xs', 'sm', 'md', 'lg', 'xl'])(
    'top="%s" applies the top- class',
    (t) => {
      const { container } = render(<Sticky top={t}>x</Sticky>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`top-${t}`));
    },
  );

  it('applies the scroll class only when scroll is set', () => {
    const { container, rerender } = render(<Sticky top="lg">x</Sticky>);
    // default: no scroll-viewport class
    expect((container.firstChild as HTMLElement).className).not.toMatch(/scroll/);
    rerender(
      <Sticky top="lg" scroll>
        x
      </Sticky>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/scroll/);
  });

  it('merges className and spreads other attrs', () => {
    const { container } = render(
      <Sticky className="my-cls" data-foo="bar">
        x
      </Sticky>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/my-cls/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
