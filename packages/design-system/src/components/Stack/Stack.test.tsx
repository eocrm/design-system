import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Stack, type StackAlign, type StackGap } from './Stack';

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

describe('Stack', () => {
  it('renders its children', () => {
    render(<Stack>Hello</Stack>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies sensible defaults (gap=md, align=stretch)', () => {
    const { container } = render(<Stack>x</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/gapMd/);
    expect(el.className).toMatch(/alignStretch/);
  });

  it.each<StackGap>(['xs', 'sm', 'md', 'lg', 'xl', '2xl'])('applies the %s gap class', (gap) => {
    const { container } = render(<Stack gap={gap}>x</Stack>);
    const expected = gap === '2xl' ? 'gap2xl' : `gap${capitalize(gap)}`;
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expected));
  });

  it.each<StackAlign>(['start', 'center', 'end', 'stretch'])('applies the %s align class', (a) => {
    const { container } = render(<Stack align={a}>x</Stack>);
    expect((container.firstChild as HTMLElement).className).toMatch(
      new RegExp(`align${capitalize(a)}`),
    );
  });

  it('merges the className prop', () => {
    const { container } = render(<Stack className="external">x</Stack>);
    expect((container.firstChild as HTMLElement).className).toMatch(/external/);
  });

  it('forwards refs to the underlying div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Stack ref={ref}>x</Stack>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('applies the minWidth0 class only when the prop is set', () => {
    const { container: off } = render(<Stack>x</Stack>);
    const { container: on } = render(<Stack minWidth0>x</Stack>);
    expect((off.firstChild as HTMLElement).className).not.toMatch(/minWidth0/);
    expect((on.firstChild as HTMLElement).className).toMatch(/minWidth0/);
  });

  it('keeps other variant classes and className merging with minWidth0', () => {
    const { container } = render(
      <Stack minWidth0 gap="xs" className="external">
        x
      </Stack>,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/minWidth0/);
    expect(cls).toMatch(/gapXs/);
    expect(cls).toMatch(/external/);
  });

  it('declares min-width exactly once, inside the minWidth0 rule', () => {
    // jsdom computes no layout, so the stylesheet is the guard. A whole-file
    // count rather than a rule-scoped regex on purpose: a scoped match only
    // finds the FIRST `.stack` block, so appending a second `.stack { min-width:
    // 0; }` at the end of the file — exactly how someone would "add the fix
    // back" — would restore the reverted unconditional behaviour with the test
    // still green. Counting every occurrence cannot be fooled that way, and it
    // also catches a `min-width` leaking in via `.inline` / `.wrap`.
    const scss = readFileSync(resolve(__dirname, 'Stack.module.scss'), 'utf8');
    const declarations = scss.match(/^\s*min-width:/gm) ?? [];
    expect(declarations).toHaveLength(1);
    expect(scss).toMatch(/\.minWidth0\s*\{\s*min-width:\s*0(?:px)?\s*;\s*\}/);
  });
});
