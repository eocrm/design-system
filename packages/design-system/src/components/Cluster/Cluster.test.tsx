import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Cluster, type ClusterAlign, type ClusterGap, type ClusterJustify } from './Cluster';

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

describe('Cluster', () => {
  it('renders its children', () => {
    render(<Cluster>Hello</Cluster>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies sensible defaults (gap=md, justify=start, align=center, wrap=true)', () => {
    const { container } = render(<Cluster>x</Cluster>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/gapMd/);
    expect(el.className).toMatch(/justifyStart/);
    expect(el.className).toMatch(/alignCenter/);
    expect(el.className).toMatch(/wrap/);
  });

  it.each<ClusterGap>(['xs', 'sm', 'md', 'lg', 'xl', '2xl'])('applies the %s gap class', (gap) => {
    const { container } = render(<Cluster gap={gap}>x</Cluster>);
    const expected = gap === '2xl' ? 'gap2xl' : `gap${capitalize(gap)}`;
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expected));
  });

  it.each<ClusterJustify>(['start', 'center', 'end', 'between'])(
    'applies the %s justify class',
    (j) => {
      const { container } = render(<Cluster justify={j}>x</Cluster>);
      expect((container.firstChild as HTMLElement).className).toMatch(
        new RegExp(`justify${capitalize(j)}`),
      );
    },
  );

  it.each<ClusterAlign>(['start', 'center', 'end', 'baseline'])(
    'applies the %s align class',
    (a) => {
      const { container } = render(<Cluster align={a}>x</Cluster>);
      expect((container.firstChild as HTMLElement).className).toMatch(
        new RegExp(`align${capitalize(a)}`),
      );
    },
  );

  it('omits the wrap class when wrap={false}', () => {
    const { container } = render(<Cluster wrap={false}>x</Cluster>);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/wrap/);
  });

  it('merges the className prop', () => {
    const { container } = render(<Cluster className="external">x</Cluster>);
    expect((container.firstChild as HTMLElement).className).toMatch(/external/);
  });

  it('forwards refs to the underlying div', () => {
    const ref = createRef<HTMLElement>();
    render(<Cluster ref={ref}>x</Cluster>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('renders a div by default', () => {
    const { container } = render(<Cluster>x</Cluster>);
    expect((container.firstChild as HTMLElement).tagName).toBe('DIV');
  });

  it.each(['span', 'section', 'aside'] as const)('renders as %s when as is set', (as) => {
    const { container } = render(<Cluster as={as}>x</Cluster>);
    expect((container.firstChild as HTMLElement).tagName).toBe(as.toUpperCase());
  });

  it('applies the inline class only for as="span"', () => {
    const { container: asSpan } = render(<Cluster as="span">x</Cluster>);
    expect((asSpan.firstChild as HTMLElement).className).toMatch(/inline/);
    const { container: asDiv } = render(<Cluster>x</Cluster>);
    expect((asDiv.firstChild as HTMLElement).className).not.toMatch(/inline/);
    const { container: asSection } = render(<Cluster as="section">x</Cluster>);
    expect((asSection.firstChild as HTMLElement).className).not.toMatch(/inline/);
    const { container: asAside } = render(<Cluster as="aside">x</Cluster>);
    expect((asAside.firstChild as HTMLElement).className).not.toMatch(/inline/);
  });

  it.each([
    ['span', HTMLSpanElement],
    ['section', HTMLElement],
    ['aside', HTMLElement],
  ] as const)('forwards the ref to the chosen element for as="%s"', (as, expected) => {
    const ref = createRef<HTMLElement>();
    render(
      <Cluster as={as} ref={ref}>
        x
      </Cluster>,
    );
    expect(ref.current).toBeInstanceOf(expected);
    expect(ref.current!.tagName).toBe(as.toUpperCase());
  });

  it('nests validly inside a <button> with as="span" (the #266 acceptance criterion)', () => {
    // React logs validateDOMNesting console.error for block content inside a
    // button — the exact failure as="span" exists to avoid.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <button type="button">
        <Cluster as="span" gap="xs">
          x
        </Cluster>
      </button>,
    );
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('keeps variant classes and className merging with as="span"', () => {
    const { container } = render(
      <Cluster as="span" gap="xs" justify="between" className="external">
        x
      </Cluster>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/gapXs/);
    expect(el.className).toMatch(/justifyBetween/);
    expect(el.className).toMatch(/external/);
  });

  it('applies the minWidth0 class only when the prop is set', () => {
    const { container: off } = render(<Cluster>x</Cluster>);
    const { container: on } = render(<Cluster minWidth0>x</Cluster>);
    expect((off.firstChild as HTMLElement).className).not.toMatch(/minWidth0/);
    expect((on.firstChild as HTMLElement).className).toMatch(/minWidth0/);
  });

  it('keeps other variant classes and className merging with minWidth0', () => {
    const { container } = render(
      <Cluster minWidth0 gap="xs" className="external">
        x
      </Cluster>,
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
    //   - a rule-scoped regex only sees the FIRST `.cluster` block, so appending a
    //     second one at the end of the file went unnoticed;
    //   - a `/^\s*min-width:/gm` count misses `.cluster { min-width: 0; }` written
    //     on ONE line, which is prettier-clean inside a comment-free file;
    //   - counting only `min-width` misses `min-inline-size`, its exact logical
    //     equivalent in horizontal-tb, which a logical-properties refactor would
    //     reasonably introduce.
    // Comments must be stripped first or the prose above (which names both
    // properties) inflates the count. If a second horizontal min-size is ever
    // legitimately needed on a modifier, bump this count deliberately — the
    // failure is the prompt to think about it, not a lint to silence.
    const scss = readFileSync(resolve(__dirname, 'Cluster.module.scss'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(scss.match(/min-(?:width|inline-size)\s*:/g) ?? []).toHaveLength(1);
    expect(scss).toMatch(/\.minWidth0\s*\{[^}]*min-width:\s*0(?:px)?\s*;/);
  });
});
