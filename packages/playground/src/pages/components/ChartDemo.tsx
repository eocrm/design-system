import { useState, type ReactNode } from 'react';
import {
  Button,
  Chart,
  Cluster,
  DashboardWidget,
  Stack,
  Switch,
  type ChartSeries,
  type ChartType,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const weeks = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);
const days = Array.from({ length: 90 }, (_, i) =>
  new Date(2026, 6, 1 + i).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
);
const wave = (seed: number, n: number, amp = 10) =>
  Array.from({ length: n }, (_, i) => Math.round(amp + amp * Math.sin((i + seed) / 2) + seed));

const owners = ['Alice', 'Bob', 'Chen', 'Dana', 'Emil', 'Fatima', 'Goran', 'Hana'];
const grouped: ChartSeries[] = owners.map((name, i) => ({
  key: name.toLowerCase(),
  label: name,
  values: wave(i, 12, 4),
}));
const types: ChartType[] = ['line', 'bar', 'stacked-bar', 'area'];
const fmt = new Intl.NumberFormat('en-GB');
const eur = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Resizable box standing in for a DashboardCanvas cell (demo-only inline style). */
function Cell({
  children,
  title,
  loading,
}: {
  children: ReactNode;
  title: string;
  loading?: boolean;
}) {
  return (
    <div style={{ resize: 'both', overflow: 'hidden', width: 520, height: 300, maxWidth: '100%' }}>
      <DashboardWidget variant="chart" title={title} loading={loading}>
        {children}
      </DashboardWidget>
    </div>
  );
}

export function ChartDemo() {
  const [type, setType] = useState<ChartType>('line');
  const [loading, setLoading] = useState(false);

  return (
    <DemoLayout
      name="Chart"
      componentName="Chart"
      description="Line, bar, stacked bar or area time-series chart for a chart DashboardWidget: pre-bucketed categories, legend toggles, tooltip, keyboard inspection, hidden data table and empty state."
      files={getComponentFiles('Chart')}
    >
      <Example
        title="In a dashboard widget"
        description="One metric with the previous period as a comparison. Pick a type, or drag the corner to resize: x labels thin out, nothing scrolls. Tab to the plot and use the arrow keys."
        code={`<DashboardWidget variant="chart" title="Deals won" loading={loading}>
  <Chart
    type="line"
    label="Deals won per week"
    categories={weeks}
    series={[
      { key: 'won', label: 'Deals won', values: [...] },
      { key: 'prev', label: 'Previous period', values: [...], comparisonOf: 'won' },
    ]}
    formatValue={(n) => fmt.format(n)}
  />
</DashboardWidget>`}
      >
        <Stack gap="md">
          <Cluster gap="sm">
            {types.map((tp) => (
              <Button
                key={tp}
                size="sm"
                variant={type === tp ? 'primary' : 'secondary'}
                aria-pressed={type === tp}
                onClick={() => setType(tp)}
              >
                {tp}
              </Button>
            ))}
            <Switch checked={loading} onChange={setLoading}>
              Loading
            </Switch>
          </Cluster>
          <Cell title="Deals won" loading={loading}>
            <Chart
              type={type}
              label="Deals won per week"
              categories={weeks}
              series={[
                { key: 'won', label: 'Deals won', values: wave(2, 12) },
                {
                  key: 'prev',
                  label: 'Previous period',
                  values: wave(5, 12),
                  comparisonOf: 'won',
                },
              ]}
              formatValue={(n) => fmt.format(n)}
            />
          </Cell>
        </Stack>
      </Example>

      <Example
        title="Types"
        description="Same data, four forms. Stacked types take comparisonOf: 'total'."
        code={`<Chart type="stacked-bar" label="Won amount by owner" categories={weeks}
  series={[
    ...owners,
    { key: 'prev', label: 'Previous period', values: [...], comparisonOf: 'total' },
  ]}
  formatValue={(n) => eur.format(n * 1000)}
/>`}
      >
        <Stack gap="md">
          {types.map((tp) => (
            <Cell key={tp} title={tp}>
              <Chart
                type={tp}
                label={`Won amount by owner (${tp})`}
                categories={weeks}
                series={[
                  ...grouped.slice(0, 3),
                  tp === 'stacked-bar' || tp === 'area'
                    ? {
                        key: 'prev',
                        label: 'Previous period',
                        values: wave(9, 12, 12),
                        comparisonOf: 'total',
                      }
                    : {
                        key: 'alice-prev',
                        label: 'Previous period',
                        values: wave(3, 12, 4),
                        comparisonOf: 'alice',
                      },
                ]}
                formatValue={(n) => eur.format(n * 1000)}
              />
            </Cell>
          ))}
        </Stack>
      </Example>

      <Example
        title="Eight groups"
        description="The palette maximum. Hover a legend item to focus it; click to hide it."
        code={`<Chart type="line" label="Deals won by owner" categories={weeks} series={grouped} />`}
      >
        <Cell title="Deals won by owner">
          <Chart
            type="line"
            label="Deals won by owner"
            categories={weeks}
            series={grouped}
            formatValue={(n) => fmt.format(n)}
          />
        </Cell>
      </Example>

      <Example
        title="Gaps and 90 daily points"
        description="null values break the line; labels thin to fit."
        code={`<Chart type="line" label="Appointments booked per day" categories={days}
  series={[{ key: 'appts', label: 'Appointments', values: [3, null, 5, ...] }]}
/>`}
      >
        <Cell title="Appointments booked">
          <Chart
            type="line"
            label="Appointments booked per day"
            categories={days}
            series={[
              {
                key: 'appts',
                label: 'Appointments',
                values: wave(1, 90).map((v, i) => (i % 17 === 5 ? null : v)),
              },
            ]}
            formatValue={(n) => fmt.format(n)}
          />
        </Cell>
      </Example>

      <Example
        title="Empty"
        description="All zero or no data renders EmptyState."
        code={`<Chart type="bar" label="Tasks completed per week" categories={weeks}
  series={[{ key: 't', label: 'Tasks', values: weeks.map(() => 0) }]}
/>`}
      >
        <Cell title="Tasks completed">
          <Chart
            type="bar"
            label="Tasks completed per week"
            categories={weeks}
            series={[{ key: 't', label: 'Tasks', values: weeks.map(() => 0) }]}
            formatValue={(n) => fmt.format(n)}
          />
        </Cell>
      </Example>
    </DemoLayout>
  );
}
