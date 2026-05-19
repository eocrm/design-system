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
});
