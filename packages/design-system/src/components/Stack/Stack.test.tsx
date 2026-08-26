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

  it('declares a horizontal min-size exactly once, inside the minWidth0 rule', () => {
    // jsdom computes no layout, so the stylesheet is the guard — and it has to
    // be an unanchored, comment-stripped count, because every cheaper version
    // was defeated in review:
    //   - a rule-scoped regex only sees the FIRST `.stack` block, so appending a
    //     second one at the end of the file went unnoticed;
    //   - a `/^\s*min-width:/gm` count misses `.stack { min-width: 0; }` written
    //     on ONE line, which is prettier-clean inside a comment-free file;
    //   - counting only `min-width` misses `min-inline-size`, its exact logical
    //     equivalent in horizontal-tb, which a logical-properties refactor would
    //     reasonably introduce.
    // Comments must be stripped first or the prose above (which names both
    // properties) inflates the count. If a second horizontal min-size is ever
    // legitimately needed on a modifier, bump this count deliberately — the
    // failure is the prompt to think about it, not a lint to silence.
    const scss = readFileSync(resolve(__dirname, 'Stack.module.scss'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(scss.match(/min-(?:width|inline-size)\s*:/g) ?? []).toHaveLength(1);
    expect(scss).toMatch(/\.minWidth0\s*\{[^}]*min-width:\s*0(?:px)?\s*;/);
  });
});
