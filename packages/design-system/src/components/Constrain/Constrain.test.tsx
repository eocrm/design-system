import { render } from '@testing-library/react';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { parse, type Rule } from 'postcss';
import { compile } from 'sass';
import { Constrain } from './Constrain';
import type { ConstrainHeight, ConstrainWidth } from './Constrain';

describe('Constrain', () => {
  it('falls back to static viewport units before dynamic viewport units', () => {
    const css = compile(resolve(__dirname, 'Constrain.module.scss')).css;
    const root = parse(css);

    for (const [selector, property] of [
      ['h-viewport', 'height'],
      ['minH-viewport', 'min-height'],
      ['maxH-viewport', 'max-height'],
      ['h-viewport-70', 'height'],
      ['minH-viewport-70', 'min-height'],
      ['maxH-viewport-70', 'max-height'],
    ] as const) {
      const className = new RegExp(`(?:^|[^\\w-])\\.${selector}(?![\\w-])`);
      const rules: Rule[] = [];
      root.walkRules((rule) => {
        if (rule.selectors.some((candidate) => className.test(candidate))) rules.push(rule);
      });

      expect(rules).toHaveLength(1);
      expect(rules[0]?.selector).toBe(`.${selector}`);
      expect(rules[0]?.parent?.type).toBe('root');
      expect(rules[0]?.nodes).toHaveLength(2);
      expect(
        rules[0]?.nodes.map((node) =>
          node.type === 'decl' ? [node.prop, node.value, node.important] : [node.type],
        ),
      ).toEqual([
        [property, selector.includes('viewport-70') ? '70vh' : '100vh', undefined],
        [property, selector.includes('viewport-70') ? '70dvh' : '100dvh', undefined],
      ]);
    }
  });

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

  it.each<ConstrainHeight>(['xs', 'sm', 'md', 'lg', 'xl', 'full', 'viewport', 'viewport-70'])(
    'height="%s" applies the h- class',
    (height) => {
      const { container } = render(<Constrain height={height}>x</Constrain>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`h-${height}`));
    },
  );

  it.each<ConstrainHeight>(['xs', 'sm', 'md', 'lg', 'xl', 'full', 'viewport', 'viewport-70'])(
    'minHeight="%s" applies the minH- class',
    (height) => {
      const { container } = render(<Constrain minHeight={height}>x</Constrain>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`minH-${height}`));
    },
  );

  it.each<ConstrainHeight>(['xs', 'sm', 'md', 'lg', 'xl', 'full', 'viewport', 'viewport-70'])(
    'maxHeight="%s" applies the maxH- class',
    (height) => {
      const { container } = render(<Constrain maxHeight={height}>x</Constrain>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`maxH-${height}`));
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
