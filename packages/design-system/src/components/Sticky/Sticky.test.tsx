import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { Sticky } from './Sticky';
import type { StickyTop } from './Sticky';

describe('Sticky', () => {
  const scss = readFileSync(resolve(__dirname, 'Sticky.module.scss'), 'utf8');

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

  it('lets the scroll cap override its bottom gap without changing the symmetric default', () => {
    const normalizedScss = scss
      .replace(/\s+/g, ' ')
      .replaceAll('calc( ', 'calc(')
      .replaceAll(' );', ');');
    const bottomGap = 'var(--sticky-bottom-gap, var(--sticky-offset, 0px))';
    expect(normalizedScss).toContain(
      `max-height: calc(100vh - var(--sticky-offset, 0px) - ${bottomGap});`,
    );
    expect(normalizedScss).toContain(
      `max-height: calc(100dvh - var(--sticky-offset, 0px) - ${bottomGap});`,
    );
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
