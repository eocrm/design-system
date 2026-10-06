import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardWidget } from './DashboardWidget';

describe('DashboardWidget', () => {
  it('defaults to standard: heading h3, actions slot, scrolling padded body', () => {
    const { container } = render(
      <DashboardWidget title="Pipeline" actions={<button>Menu</button>}>
        <p>Body</p>
      </DashboardWidget>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Pipeline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute('data-variant', 'standard');
    expect(root.querySelector('[data-scroll]')).toHaveTextContent('Body');
  });

  it('meta renders in the header and describes the scrolling body group', () => {
    render(
      <DashboardWidget title="Pipeline" meta="Updated 3 minutes ago" actions={<button>R</button>}>
        <p>Body</p>
      </DashboardWidget>,
    );
    expect(screen.getByRole('heading', { name: 'Pipeline' })).not.toHaveTextContent('Updated');
    expect(screen.getByRole('group', { name: 'Pipeline' })).toHaveAccessibleDescription(
      'Updated 3 minutes ago',
    );
  });

  it('no meta → body group has no description', () => {
    render(<DashboardWidget title="Pipeline" />);
    expect(screen.getByRole('group', { name: 'Pipeline' })).not.toHaveAttribute('aria-describedby');
  });

  it('honours headerLevel', () => {
    render(<DashboardWidget title="T" headerLevel="h2" />);
    expect(screen.getByRole('heading', { level: 2, name: 'T' })).toBeInTheDocument();
  });

  it('list: flush scrolling body', () => {
    const { container } = render(
      <DashboardWidget variant="list" title="Tasks">
        <ul>
          <li>a</li>
        </ul>
      </DashboardWidget>,
    );
    const body = container.querySelector('[data-scroll]') as HTMLElement;
    expect(body.className).toMatch(/flush/);
  });

  it('chart: flush, non-scrolling fill body', () => {
    const { container } = render(
      <DashboardWidget variant="chart" title="Revenue">
        <svg data-testid="plot" />
      </DashboardWidget>,
    );
    expect(container.querySelector('[data-scroll]')).toBeNull();
    expect(screen.getByTestId('plot').parentElement!.className).toMatch(/chartBody/);
  });

  it('kpi: value + trend with hidden direction text, default sentiment from direction', () => {
    render(
      <DashboardWidget
        variant="kpi"
        title="Open deals"
        value="128"
        trend={{ label: '+12%', direction: 'up' }}
      />,
    );
    expect(screen.getByText('128')).toBeInTheDocument();
    const trend = screen.getByText('+12%').closest('[data-sentiment]')!;
    expect(trend).toHaveAttribute('data-sentiment', 'positive');
    expect(trend).toHaveTextContent('Increase +12%');
  });

  it.each([
    ['down', undefined, 'negative', 'Decrease'],
    ['flat', undefined, 'neutral', 'No change'],
    ['up', 'negative', 'negative', 'Increase'],
  ] as const)('trend %s with sentiment %s → %s', (direction, sentiment, expected, word) => {
    render(
      <DashboardWidget
        variant="kpi"
        title="Churn"
        value="3%"
        trend={{ label: 'x', direction, sentiment }}
      />,
    );
    const trend = screen.getByText('x').closest('[data-sentiment]')!;
    expect(trend).toHaveAttribute('data-sentiment', expected);
    expect(trend).toHaveTextContent(`${word} x`);
  });

  it.each([
    ['standard', 'lines'],
    ['list', 'list'],
    ['kpi', 'kpi'],
    ['chart', 'chart'],
  ] as const)('loading %s renders the %s shape and keeps title + actions', (variant, kind) => {
    const { container } = render(
      <DashboardWidget variant={variant} title="W" actions={<button>Menu</button>} loading>
        <p>Real body</p>
      </DashboardWidget>,
    );
    expect(
      container.querySelector(`[data-widget-shape="${kind}"][data-mode="loading"]`),
    ).not.toBeNull();
    expect(screen.queryByText('Real body')).toBeNull();
    expect(screen.getByRole('heading', { name: 'W' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(container.querySelector('[role="status"], [aria-live]')).toBeNull();
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
  });

  it('kpi loading hides value and trend (no stale numbers next to a skeleton)', () => {
    render(
      <DashboardWidget
        variant="kpi"
        title="Open deals"
        value="128"
        trend={{ label: '+12%', direction: 'up' }}
        loading
      />,
    );
    expect(screen.queryByText('128')).toBeNull();
    expect(screen.queryByText('+12%')).toBeNull();
  });

  it('forwards ref to the Card root, merges className, spreads attrs', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <DashboardWidget ref={ref} title="T" className="mine" data-testid="w" />,
    );
    const root = container.firstChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.className).toMatch(/mine/);
    expect(root).toHaveAttribute('data-testid', 'w');
  });
});

describe('DashboardWidget — scroll body name', () => {
  it.each(['standard', 'list'] as const)('%s: scroll body is a group named by the title', (v) => {
    render(
      <DashboardWidget variant={v} title="Open deals" actions={<button>Menu</button>}>
        x
      </DashboardWidget>,
    );
    const g = screen.getByRole('group', { name: 'Open deals' });
    expect(g).toHaveAttribute('data-scroll');
  });
  it.each(['kpi', 'chart'] as const)('%s: no group', (v) => {
    render(<DashboardWidget variant={v} title="T" />);
    expect(screen.queryByRole('group')).toBeNull();
  });
});

describe('DashboardWidget — cascade + fill chain (source-pinned; jsdom cannot compute CSS)', () => {
  const scss = readFileSync(resolve(__dirname, 'DashboardWidget.module.scss'), 'utf8');

  // Card.module.scss and this module are separate CSS modules: their relative
  // order is not guaranteed, so every override of a Card rule must win on
  // specificity (a `.root` ancestor), never on source order.
  it.each([
    /\.root :is\(\.header-kpi, \.header-chart\) \{/,
    /\.root :is\(\.header-kpi, \.header-chart\) :is\(h2, h3, h4, h5, h6\) \{/,
    /\.root \.scrollBody \{/,
    /\.root \.flush \{/,
    /\.root :is\(\.kpiBody, \.chartBody\) \{/,
  ])('overrides Card rules via a .root-scoped selector: %s', (re) => {
    expect(scss).toMatch(re);
  });

  it('kpi/chart bodies are Card.Body siblings so Card establishes the fill column', () => {
    const { container } = render(<DashboardWidget variant="kpi" title="K" value="1" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/fillWithBody/);
  });
});
