import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import {
  Cluster,
  type ClusterAlign,
  type ClusterGap,
  type ClusterJustify,
} from './Cluster';

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

  it.each<ClusterGap>(['xs', 'sm', 'md', 'lg', 'xl', '2xl'])(
    'applies the %s gap class',
    (gap) => {
      const { container } = render(<Cluster gap={gap}>x</Cluster>);
      const expected = gap === '2xl' ? 'gap2xl' : `gap${capitalize(gap)}`;
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expected));
    },
  );

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
    const ref = createRef<HTMLDivElement>();
    render(<Cluster ref={ref}>x</Cluster>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
