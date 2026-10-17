import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { Sparkline } from '../Sparkline';
import { StatGroup, StatTile } from './index';

const UP = { label: '12.4% vs previous period', direction: 'up' } as const;

describe('StatGroup', () => {
  it('renders a list of tiles, forwards ref, merges className, spreads props (Pattern A)', () => {
    const ref = createRef<HTMLUListElement>();
    render(
      <StatGroup ref={ref} aria-label="Key metrics" className="mine" data-x="1">
        <StatTile label="Pipeline value" value="€1.24M" />
        <StatTile label="Open deals" value="48" />
      </StatGroup>,
    );
    const list = screen.getByRole('list', { name: 'Key metrics' });
    expect(ref.current).toBe(list);
    expect(list.tagName).toBe('UL');
    expect(list).toHaveAttribute('role', 'list');
    expect(list).toHaveClass('mine');
    expect(list).toHaveAttribute('data-x', '1');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Pipeline value€1.24M', 'Open deals48']);
  });

  it('clamps the auto-fit min column to the container (default 11rem, custom value)', () => {
    const { rerender } = render(
      <StatGroup aria-label="g">
        <StatTile label="a" value="1" />
      </StatGroup>,
    );
    const list = screen.getByRole('list');
    expect(list.style.getPropertyValue('--grid-columns')).toBe(
      'repeat(auto-fit, minmax(min(11rem, 100%), 1fr))',
    );
    rerender(
      <StatGroup aria-label="g" minColumnWidth="200px">
        <StatTile label="a" value="1" />
      </StatGroup>,
    );
    expect(list.style.getPropertyValue('--grid-columns')).toBe(
      'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
    );
  });

  it('loading: labels and icons kept, value/trend/footnote replaced by skeletons + hidden text', () => {
    render(
      <StatGroup aria-label="g" loading>
        <StatTile
          label="Pipeline value"
          value="€1.24M"
          trend={UP}
          footnote="2 deals excluded"
          icon={<svg data-testid="icon" />}
        />
        <StatTile label="Open deals" value={undefined} />
      </StatGroup>,
    );
    const list = screen.getByRole('list');
    expect(list).not.toHaveAttribute('aria-busy');
    const [first, second] = within(list).getAllByRole('listitem');
    expect(first).toHaveTextContent('Pipeline value');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(first).not.toHaveTextContent('€1.24M');
    expect(first).not.toHaveTextContent('12.4%');
    expect(first).not.toHaveTextContent('2 deals excluded');
    expect(within(first).getByText('Loading…')).toBeInTheDocument();
    // trend skeleton present even when the consumer has no trend yet (no layout jump)
    expect(second.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
    expect(within(second).getByText('Loading…')).toBeInTheDocument();
  });

  it('not loading: no loading text', () => {
    render(
      <StatGroup aria-label="g">
        <StatTile label="a" value="1" />
      </StatGroup>,
    );
    expect(screen.queryByText('Loading…')).toBeNull();
  });
});

describe('StatTile', () => {
  const inGroup = (tile: React.ReactNode) => render(<StatGroup aria-label="g">{tile}</StatGroup>);

  it('reads label, value, trend, footnote in order; forwards ref; merges className', () => {
    const ref = createRef<HTMLLIElement>();
    inGroup(
      <StatTile
        ref={ref}
        className="t"
        label="Pipeline value"
        value="€1.24M"
        trend={UP}
        footnote="2 deals in other currencies not included"
      />,
    );
    const li = screen.getByRole('listitem');
    expect(ref.current).toBe(li);
    expect(li).toHaveClass('t');
    expect(li).toHaveTextContent(
      'Pipeline value€1.24MIncrease 12.4% vs previous period2 deals in other currencies not included',
    );
  });

  it.each([null, undefined])(
    'value=%s → visible dash (aria-hidden) + hidden "No data"',
    (value) => {
      inGroup(<StatTile label="Win rate" value={value} />);
      const li = screen.getByRole('listitem');
      expect(within(li).getByText('—')).toHaveAttribute('aria-hidden', 'true');
      expect(within(li).getByText('No data')).toBeInTheDocument();
    },
  );

  it('value={0} is data, not "no data"', () => {
    inGroup(<StatTile label="Overdue" value={0} />);
    const li = screen.getByRole('listitem');
    expect(li).toHaveTextContent('Overdue0');
    expect(within(li).queryByText('No data')).toBeNull();
  });

  it.each([
    ['up', undefined, 'positive', 'Increase'],
    ['down', undefined, 'negative', 'Decrease'],
    ['flat', undefined, 'neutral', 'No change'],
    ['up', 'negative', 'negative', 'Increase'],
  ] as const)('trend %s / sentiment %s → %s', (direction, sentiment, expected, word) => {
    inGroup(<StatTile label="l" value="1" trend={{ label: 'x', direction, sentiment }} />);
    const trend = screen.getByText('x').closest('[data-sentiment]')!;
    expect(trend).toHaveAttribute('data-sentiment', expected);
    expect(trend).toHaveTextContent(`${word} x`);
  });

  it('renders the icon beside the label and omits empty optional slots', () => {
    inGroup(<StatTile label="Deals" value="3" icon={<svg data-testid="icon" />} />);
    const li = screen.getByRole('listitem');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(li.querySelector('[data-sentiment]')).toBeNull();
    expect(li).toHaveTextContent(/^Deals3$/);
  });

  it('renders the sparkline slot after the trend, before the footnote', () => {
    render(
      <StatGroup aria-label="KPIs">
        <StatTile
          label="Contacts"
          value="1,204"
          trend={UP}
          sparkline={<Sparkline label="Contacts per day" values={[1, 2, 3]} />}
          footnote="Last 90 days"
        />
      </StatGroup>,
    );
    const spark = screen.getByRole('img', { name: /^Contacts per day:/ });
    const foot = screen.getByText('Last 90 days');
    const trend = screen.getByText(UP.label);
    expect(trend.compareDocumentPosition(spark) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(spark.compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows a sparkline-height skeleton instead of the slot while loading', () => {
    const { container } = render(
      <StatGroup aria-label="KPIs" loading>
        <StatTile label="Contacts" value="1" sparkline={<Sparkline label="S" values={[1]} />} />
      </StatGroup>,
    );
    expect(screen.queryByRole('img', { name: /^S:/ })).toBeNull();
    expect(container.querySelector('[data-stat-sparkline-skeleton]')).not.toBeNull();
  });

  it('renders no sparkline skeleton for a tile without a sparkline while loading', () => {
    const { container } = render(
      <StatGroup aria-label="KPIs" loading>
        <StatTile label="Contacts" value="1" />
      </StatGroup>,
    );
    expect(container.querySelector('[data-stat-sparkline-skeleton]')).toBeNull();
  });

  it('progress: a small meter after the trend, named by the tile label (#648)', () => {
    render(
      <StatGroup aria-label="KPIs">
        <StatTile
          label="Storage"
          value="1.2 GB / 5 GB"
          trend={UP}
          progress={{ value: 1.2, max: 5, tone: 'warning' }}
          sparkline={<Sparkline label="Daily" values={[1, 2]} />}
        />
      </StatGroup>,
    );
    const bar = screen.getByRole('progressbar', { name: 'Storage' });
    expect(bar).toHaveAttribute('aria-valuenow', '1.2');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
    const trend = screen.getByText(UP.label);
    const spark = screen.getByRole('img', { name: /^Daily:/ });
    expect(trend.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.compareDocumentPosition(spark) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('progress: progress-height skeleton while loading, none without the prop', () => {
    const { container } = render(
      <StatGroup aria-label="KPIs" loading>
        <StatTile label="Storage" value="1" progress={{ value: 1, max: 5 }} />
        <StatTile label="Seats" value="3" />
      </StatGroup>,
    );
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(container.querySelectorAll('[data-stat-progress-skeleton]')).toHaveLength(1);
  });

  it('variant="card" puts every tile on the card surface; default stays filled', () => {
    const { rerender } = render(
      <StatGroup aria-label="KPIs" variant="card">
        <StatTile label="A" value="1" />
        <StatTile label="B" value="2" />
      </StatGroup>,
    );
    const tiles = screen.getAllByRole('listitem');
    tiles.forEach((li) => expect(li.className).toMatch(/card/));
    rerender(
      <StatGroup aria-label="KPIs">
        <StatTile label="A" value="1" />
      </StatGroup>,
    );
    expect(screen.getByRole('listitem').className).not.toMatch(/card/);
  });
});
