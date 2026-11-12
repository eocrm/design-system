import type { ReactNode } from 'react';
import {
  Chart,
  ChartSync,
  DashboardWidget,
  LaneChart,
  ScatterChart,
  Stack,
  type ChartSeries,
  type Lane,
  type ScatterSeries,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const DAYS = 30;
const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayStarts = Array.from({ length: DAYS }, (_, i) => Date.UTC(2026, 9, 1 + i));
const categories = dayStarts.map((t) => fmt.format(t));

// Deterministic pseudo-random (LCG), so the demo is stable across renders.
function lcg(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}
const rand = lcg(5);
const calls = categories.map((_, i) => Math.round(60 + 20 * Math.sin(i / 4) + rand() * 15));
const revenue = categories.map((_, i) => Math.round(900 + 250 * Math.cos(i / 5) + rand() * 200));
const signups = categories.map((_, i) => Math.round(20 + i * 0.8 + rand() * 12));
const escalations = categories.map(() => (rand() < 0.4 ? Math.ceil(rand() * 3) : 0));

const num = (n: number) => `${Math.round(n)}`;
const money = (n: number) => `$${Math.round(n)}`;
const callSeries: ChartSeries[] = [{ key: 'calls', label: 'Calls', values: calls }];
const revenueSeries: ChartSeries[] = [{ key: 'rev', label: 'Revenue', values: revenue }];
const signupSeries: ChartSeries[] = [{ key: 'su', label: 'Signups', values: signups }];

// Timestamped events (an hour within a random day), y = severity.
const events: ScatterSeries[] = [
  {
    key: 'events',
    label: 'Incidents',
    points: Array.from({ length: 14 }, () => ({
      x: new Date(dayStarts[Math.floor(rand() * DAYS)] + Math.floor(rand() * 24) * 3_600_000),
      y: 1 + Math.floor(rand() * 5),
    })),
  },
];
const lanes: Lane[] = [
  {
    key: 'esc',
    label: 'Escalations',
    type: 'dots',
    values: escalations,
    formatValue: (n) => `${n}×`,
  },
  { key: 'calls', label: 'Calls', type: 'line', values: calls, formatValue: num },
];

/** Fixed-height box standing in for a DashboardCanvas cell (demo-only inline style). */
function Cell({
  children,
  title,
  height = 260,
}: {
  children: ReactNode;
  title: string;
  height?: number;
}) {
  return (
    <div style={{ height, maxWidth: '100%' }}>
      <DashboardWidget variant="chart" title={title}>
        {children}
      </DashboardWidget>
    </div>
  );
}

function Dashboard() {
  return (
    <ChartSync>
      <Stack gap="md">
        <Cell title="Calls">
          <Chart
            type="line"
            label="Calls per day"
            categories={categories}
            categoryValues={dayStarts}
            series={callSeries}
            formatValue={num}
          />
        </Cell>
        <Cell title="Revenue">
          <Chart
            type="bar"
            label="Revenue per day"
            categories={categories}
            categoryValues={dayStarts}
            series={revenueSeries}
            formatValue={money}
          />
        </Cell>
        <Cell title="Signups">
          <Chart
            type="area"
            label="Signups per day"
            categories={categories}
            categoryValues={dayStarts}
            series={signupSeries}
            formatValue={num}
          />
        </Cell>
        <Cell title="Incidents">
          <ScatterChart
            label="Incidents"
            xScale="time"
            series={events}
            xLabel="Time"
            yLabel="Severity"
            formatX={(ms) => fmt.format(ms)}
            formatY={num}
          />
        </Cell>
        <Cell title="Escalations vs calls" height={380}>
          <LaneChart
            label="Escalations and calls"
            categories={categories}
            categoryValues={dayStarts}
            lanes={lanes}
          />
        </Cell>
      </Stack>
    </ChartSync>
  );
}

function IndependentGroups() {
  return (
    <Stack gap="md">
      <ChartSync>
        <Stack gap="md">
          <Cell title="Group A: calls">
            <Chart
              type="line"
              label="Calls per day (group A)"
              categories={categories}
              categoryValues={dayStarts}
              series={callSeries}
              formatValue={num}
            />
          </Cell>
          <Cell title="Group A: revenue">
            <Chart
              type="bar"
              label="Revenue per day (group A)"
              categories={categories}
              categoryValues={dayStarts}
              series={revenueSeries}
              formatValue={money}
            />
          </Cell>
          <Cell title="Group A: opted out (sync=false)">
            <Chart
              type="line"
              label="Signups per day (opted out)"
              categories={categories}
              categoryValues={dayStarts}
              series={signupSeries}
              formatValue={num}
              sync={false}
            />
          </Cell>
        </Stack>
      </ChartSync>
      <ChartSync>
        <Stack gap="md">
          <Cell title="Group B: calls">
            <Chart
              type="line"
              label="Calls per day (group B)"
              categories={categories}
              categoryValues={dayStarts}
              series={callSeries}
              formatValue={num}
            />
          </Cell>
          <Cell title="Group B: signups">
            <Chart
              type="area"
              label="Signups per day (group B)"
              categories={categories}
              categoryValues={dayStarts}
              series={signupSeries}
              formatValue={num}
            />
          </Cell>
        </Stack>
      </ChartSync>
    </Stack>
  );
}

export function ChartSyncDemo() {
  return (
    <DemoLayout
      name="ChartSync"
      componentName="ChartSync"
      description="Wrap charts in one ChartSync and hovering a moment in one shows a crosshair, highlighted marks and a tooltip at the same x in the others."
      files={getComponentFiles('ChartSync')}
    >
      <Example
        title="Dashboard"
        description="Three Charts (line, bar, area) over the same 30 days, a ScatterChart of timestamped incidents and a LaneChart. Hover or use the keyboard in any chart; the rest follow. Category charts pass categoryValues (day starts) so the scatter lines up by value."
        code={`<ChartSync>
  <Chart type="line" categories={days} categoryValues={dayStarts} series={calls} formatValue={num} label="Calls per day" />
  <Chart type="bar" categories={days} categoryValues={dayStarts} series={revenue} formatValue={money} label="Revenue per day" />
  <Chart type="area" categories={days} categoryValues={dayStarts} series={signups} formatValue={num} label="Signups per day" />
  <ScatterChart xScale="time" series={incidents} label="Incidents" /* ... */ />
  <LaneChart categories={days} categoryValues={dayStarts} lanes={lanes} label="Escalations and calls" />
</ChartSync>`}
      >
        <Dashboard />
      </Example>
      <Example
        title="Independent groups and opting out"
        description="Two separate ChartSync groups do not affect each other. In group A the third chart has sync={false}, so it neither shows nor drives the echo."
        code={`<ChartSync>{/* group A */}
  <Chart categoryValues={dayStarts} ... />
  <Chart categoryValues={dayStarts} ... />
  <Chart categoryValues={dayStarts} sync={false} ... />
</ChartSync>
<ChartSync>{/* group B */}
  <Chart categoryValues={dayStarts} ... />
</ChartSync>`}
      >
        <IndependentGroups />
      </Example>
    </DemoLayout>
  );
}
