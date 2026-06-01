import { render } from '@testing-library/react';
import { createRef } from 'react';
import { Constrain } from './Constrain';
import type { ConstrainWidth } from './Constrain';

describe('Constrain', () => {
  it('renders children in a <div> and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Constrain ref={ref}>
        <span data-testid="child">x</span>
      </Constrain>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
  });

  it('no props → no width/flex modifier classes', () => {
    const { container } = render(<Constrain>x</Constrain>);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/maxW-|minW-|\bw-|flex-/);
  });

  it.each<ConstrainWidth>(['xs', 'sm', 'md', 'lg', 'xl', 'full'])(
    'width="%s" applies the w- class',
    (w) => {
      const { container } = render(<Constrain width={w}>x</Constrain>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`w-${w}`));
    },
  );

  it.each<ConstrainWidth>(['xs', 'sm', 'md', 'lg', 'xl', 'full'])(
    'minWidth="%s" applies the minW- class',
    (w) => {
      const { container } = render(<Constrain minWidth={w}>x</Constrain>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`minW-${w}`));
    },
  );

  it.each<ConstrainWidth>(['xs', 'sm', 'md', 'lg', 'xl', 'full'])(
    'maxWidth="%s" applies the maxW- class',
    (w) => {
      const { container } = render(<Constrain maxWidth={w}>x</Constrain>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`maxW-${w}`));
    },
  );

  it('flex applies the right class for each value', () => {
    const { container, rerender } = render(<Constrain flex="grow">x</Constrain>);
    expect((container.firstChild as HTMLElement).className).toMatch(/flex-grow/);
    for (const f of ['shrink', 'auto', 'none'] as const) {
      rerender(<Constrain flex={f}>x</Constrain>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`flex-${f}`));
    }
  });

  it('composes multiple constraints', () => {
    const { container } = render(
      <Constrain maxWidth="lg" flex="grow">
        x
      </Constrain>,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/maxW-lg/);
    expect(cls).toMatch(/flex-grow/);
  });

  it('merges className and spreads other attrs', () => {
    const { container } = render(
      <Constrain className="my-cls" data-foo="bar">
        x
      </Constrain>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/my-cls/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
