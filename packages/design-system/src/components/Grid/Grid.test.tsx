import { render, screen } from '@testing-library/react';
import { createRef, type CSSProperties } from 'react';
import { Grid, type GridAlignItems, type GridGap, type GridJustifyItems } from './Grid';

const capitalize = (s: string) => s[0]!.toUpperCase() + s.slice(1);

describe('<Grid>', () => {
  it('renders its children', () => {
    render(<Grid>Hello</Grid>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('defaults to auto-fit with minColumnWidth=240px', () => {
    const { container } = render(<Grid>x</Grid>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--grid-columns')).toBe(
      'repeat(auto-fit, minmax(240px, 1fr))',
    );
  });

  it('applies the default gap (md) when no gap prop is given', () => {
    const { container } = render(<Grid>x</Grid>);
    expect((container.firstChild as HTMLElement).className).toMatch(/gapMd/);
  });

  it('columns={4} sets --grid-columns to repeat(4, minmax(0, 1fr))', () => {
    const { container } = render(<Grid columns={4}>x</Grid>);
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--grid-columns')).toBe(
      'repeat(4, minmax(0, 1fr))',
    );
  });

  it('minColumnWidth="200px" sets --grid-columns to repeat(auto-fit, minmax(200px, 1fr))', () => {
    const { container } = render(<Grid minColumnWidth="200px">x</Grid>);
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--grid-columns')).toBe(
      'repeat(auto-fit, minmax(200px, 1fr))',
    );
  });

  it.each<GridGap>(['xs', 'sm', 'md', 'lg', 'xl', '2xl'])('applies the %s gap class', (gap) => {
    const { container } = render(<Grid gap={gap}>x</Grid>);
    const expected = gap === '2xl' ? 'gap2xl' : `gap${capitalize(gap)}`;
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expected));
  });

  it.each<GridAlignItems>(['start', 'center', 'end', 'stretch'])(
    'applies alignItems=%s class when set',
    (a) => {
      const { container } = render(<Grid alignItems={a}>x</Grid>);
      expect((container.firstChild as HTMLElement).className).toMatch(
        new RegExp(`alignItems${capitalize(a)}`),
      );
    },
  );

  it.each<GridJustifyItems>(['start', 'center', 'end', 'stretch'])(
    'applies justifyItems=%s class when set',
    (j) => {
      const { container } = render(<Grid justifyItems={j}>x</Grid>);
      expect((container.firstChild as HTMLElement).className).toMatch(
        new RegExp(`justifyItems${capitalize(j)}`),
      );
    },
  );

  it('applies no alignItems/justifyItems class when those props are omitted', () => {
    const { container } = render(<Grid>x</Grid>);
    const className = (container.firstChild as HTMLElement).className;
    expect(className).not.toMatch(/alignItems/);
    expect(className).not.toMatch(/justifyItems/);
  });

  it('renders as <div> by default', () => {
    const { container } = render(<Grid>x</Grid>);
    expect((container.firstChild as HTMLElement).tagName).toBe('DIV');
  });

  it('renders as the element specified by `as`', () => {
    const { container } = render(<Grid as="section">x</Grid>);
    expect((container.firstChild as HTMLElement).tagName).toBe('SECTION');
  });

  it('renders as <ul>', () => {
    const { container } = render(
      <Grid as="ul">
        <li>a</li>
      </Grid>,
    );
    expect((container.firstChild as HTMLElement).tagName).toBe('UL');
  });

  it('merges the className prop', () => {
    const { container } = render(<Grid className="external">x</Grid>);
    expect((container.firstChild as HTMLElement).className).toMatch(/external/);
  });

  it('merges consumer style with the internal --grid-columns', () => {
    const { container } = render(<Grid style={{ backgroundColor: 'red' }}>x</Grid>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.backgroundColor).toBe('red');
    expect(el.style.getPropertyValue('--grid-columns')).toBeTruthy();
  });

  it('internal --grid-columns wins when consumer style sets the same custom prop', () => {
    const { container } = render(
      <Grid
        columns={3}
        style={{ ['--grid-columns' as string]: 'repeat(99, 1fr)' } as CSSProperties}
      >
        x
      </Grid>,
    );
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--grid-columns')).toBe(
      'repeat(3, minmax(0, 1fr))',
    );
  });

  it('forwards ref to the underlying element', () => {
    const ref = createRef<HTMLElement>();
    render(<Grid ref={ref}>x</Grid>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('forwards ref to a <section> when as="section"', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Grid ref={ref} as="section">
        x
      </Grid>,
    );
    expect(ref.current?.tagName).toBe('SECTION');
  });

  // TypeScript-level: passing both `columns` and `minColumnWidth` must be a type error.
  // This is enforced by the @ts-expect-error directive below — if the directive is
  // ever ignored (because the constraint slipped), tsc will error on the unused directive.
  it('TS: columns and minColumnWidth are mutually exclusive', () => {
    // @ts-expect-error — passing both should be a type error.
    const ConflictingGrid = <Grid columns={2} minColumnWidth="240px" />;
    // Reference the value so the variable isn't reported as unused.
    expect(ConflictingGrid).toBeDefined();
  });

  it('TS: collapseBelow is invalid on an auto-fit (minColumnWidth) grid', () => {
    // @ts-expect-error — collapseBelow requires `columns`; auto-fit grids already reflow.
    const InvalidCollapse = <Grid minColumnWidth="200px" collapseBelow="md" />;
    expect(InvalidCollapse).toBeDefined();
  });
});

describe('Grid.Item (#314)', () => {
  it('renders a div by default with merged className and no span (auto)', () => {
    const { container } = render(<Grid.Item className="ext">cell</Grid.Item>);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el.className).toContain('ext');
    // Explicit 'auto' (not unset) — custom properties inherit, so leaving it
    // unset would let a nested span-less item resolve an ancestor's span.
    expect(el.style.getPropertyValue('--grid-item-span')).toBe('auto');
  });

  it('a span-less Grid.Item nested inside a spanned one gets its own auto, not the inherited span', () => {
    render(
      <Grid.Item span="50%">
        <Grid columns={2}>
          <Grid.Item data-testid="inner">nested cell</Grid.Item>
        </Grid>
      </Grid.Item>,
    );
    expect(screen.getByTestId('inner').style.getPropertyValue('--grid-item-span')).toBe('auto');
  });

  it.each([
    [2, 'span 2'],
    ['25%', 'span 3'],
    ['33%', 'span 4'],
    ['50%', 'span 6'],
    ['67%', 'span 8'],
    ['75%', 'span 9'],
    ['100%', '1 / -1'],
    ['full', '1 / -1'],
  ] as const)('span=%s sets --grid-item-span: %s', (span, expected) => {
    const { container } = render(<Grid.Item span={span}>cell</Grid.Item>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--grid-item-span')).toBe(expected);
  });

  it('renders as="li" and forwards the ref to it', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Grid as="ul">
        <Grid.Item as="li" ref={ref} span="50%">
          cell
        </Grid.Item>
      </Grid>,
    );
    expect(ref.current?.tagName).toBe('LI');
  });

  it('spreads HTML attributes', () => {
    render(
      <Grid.Item data-testid="w" aria-label="widget">
        cell
      </Grid.Item>,
    );
    expect(screen.getByTestId('w')).toHaveAttribute('aria-label', 'widget');
  });

  it('merges consumer style with the injected --grid-item-span', () => {
    const { container } = render(
      <Grid.Item style={{ opacity: 0.5 }} span="50%">
        cell
      </Grid.Item>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.opacity).toBe('0.5');
    expect(el.style.getPropertyValue('--grid-item-span')).toBe('span 6');
  });
});

describe('Grid collapseBelow (#314)', () => {
  it('adds the collapsible + breakpoint classes when set', () => {
    const { container } = render(
      <Grid columns={12} collapseBelow="md">
        <div>a</div>
      </Grid>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/collapsible/);
    expect(el.className).toMatch(/collapseMd/);
  });

  it('adds no collapse classes when unset', () => {
    const { container } = render(
      <Grid columns={2}>
        <div>a</div>
      </Grid>,
    );
    expect((container.firstChild as HTMLElement).className).not.toMatch(/collaps/i);
  });
});
