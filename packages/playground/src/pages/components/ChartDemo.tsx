import { useState, type ReactNode } from 'react';
import {
  Button,
  ButtonGroup,
  Chart,
  Cluster,
  DashboardWidget,
  Stack,
  Switch,
  Text,
  type ChartMarker,
  type ChartRange,
  type ChartSeries,
  type ChartType,
  type ChartViewport,
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

// Stable references: Chart re-derives its layout when `series`/`formatValue` change identity.
const formatCount = (n: number) => fmt.format(n);
const dealsSeries: ChartSeries[] = [
  { key: 'won', label: 'Deals won', values: wave(2, 12) },
  { key: 'prev', label: 'Previous period', values: wave(5, 12), comparisonOf: 'won' },
];
// Weekends of the first 6 weeks as subtle bands (Sat–Sun as one range), plus two events.
const firstSixWeeks = days.slice(0, 42);
const weekendMarkers: ChartMarker[] = firstSixWeeks.flatMap((d, i) =>
  new Date(2026, 6, 1 + i).getDay() === 6 && i + 1 < firstSixWeeks.length
    ? [{ key: `we-${d}`, from: d, to: firstSixWeeks[i + 1], tone: 'subtle' as const }]
    : [],
);
const eventMarkers: ChartMarker[] = [
  ...weekendMarkers,
  { key: 'launch', label: 'Launch', at: firstSixWeeks[9] },
  { key: 'promo', label: 'Summer promo', from: firstSixWeeks[20], to: firstSixWeeks[29] },
];
const markerSeries: ChartSeries[] = [{ key: 'calls', label: 'Calls', values: wave(3, 42, 40) }];
const dailySeries: ChartSeries[] = [
  { key: 'calls', label: 'Calls', values: wave(3, 90, 8) },
  { key: 'prev', label: 'Previous period', values: wave(7, 90, 8), comparisonOf: 'calls' },
];

// Bowl weight sampled once a minute over an hour, as a feeder would log it.
const minutes = Array.from({ length: 60 }, (_, i) => `08:${String(i).padStart(2, '0')}`);
const bowlSeries: ChartSeries[] = [
  {
    key: 'bowl',
    label: 'Bowl weight',
    values: minutes.map((_, i) => Math.max(0, 120 - i * 2 + (i % 7 === 0 ? 30 : 0))),
  },
];
const formatGrams = (n: number) => `${fmt.format(n)} g`;

const mealHours = ['07:00', '12:00', '18:00', '21:00'];
const pinnedSeries: ChartSeries[] = [
  { key: 'a', label: 'Bowl A', color: 3, values: [45, 38, 52, 30] },
  { key: 'b', label: 'Bowl B', color: 5, values: [28, 60, 41, null] },
];
// Pet Control: bowl weight on two scales over a day, with each feeding marked in its scale's colour.
const dayHours = Array.from({ length: 17 }, (_, i) => `${String(6 + i).padStart(2, '0')}:00`);
const scaleSeries: ChartSeries[] = [
  { key: 'a', label: 'Scale A', color: 3, values: dayHours.map((_, i) => 40 + ((i * 13) % 50)) },
  { key: 'b', label: 'Scale B', color: 5, values: dayHours.map((_, i) => 30 + ((i * 7) % 40)) },
];
const feedingMarkers: ChartMarker[] = [
  { key: 'fa1', label: 'Breakfast', at: '07:00', color: 3, icon: '🐱' },
  { key: 'fb1', label: 'Snack', at: '11:00', color: 5, icon: '🐱' },
  { key: 'fa2', label: 'Dinner', at: '18:00', color: 3, icon: '🐱', labelPlacement: 'top' },
];
const eatenSeries: ChartSeries[] = [{ key: 'g', label: 'Eaten', values: [73, 98, 93, 30] }];
const mealDetails = (i: number) => [`${[190, 255, 240, 80][i]} kcal`, `${[3, 4, 4, 1][i]} times`];

function RangeSelectionExample() {
  const [range, setRange] = useState<ChartRange | null>(null);
  return (
    <Stack gap="sm">
      <Cell title="Bowl weight">
        <Chart
          type="line"
          label="Bowl weight per minute"
          categories={minutes}
          series={bowlSeries}
          formatValue={formatGrams}
          selectedRange={range}
          onSelectedRangeChange={setRange}
        />
      </Cell>
      <Text size="sm" tone="muted" data-testid="chart-range-readout">
        {range ? `Selected ${range.from} – ${range.to}` : ''}
      </Text>
    </Stack>
  );
}

const fmtViewport = (v: ChartViewport | null) =>
  v ? `${v.from.toFixed(2)}–${v.to.toFixed(2)}` : 'everything';

function ZoomGesturesExample() {
  const [viewport, setViewport] = useState<ChartViewport | null>(null);
  const [log, setLog] = useState('');
  const [notes, setNotes] = useState<ChartMarker[]>([]);
  return (
    <Stack gap="sm">
      <Cell title="Bowl weight">
        <Chart
          type="line"
          label="Bowl weight per minute"
          categories={minutes}
          series={bowlSeries}
          formatValue={formatGrams}
          markers={notes}
          zoomGestures
          viewport={viewport}
          onViewportChange={(next, { end }) => {
            setViewport(next);
            setLog(`onViewportChange(${fmtViewport(next)}, { end: ${end} })`);
          }}
          onPlotDoubleClick={({ index, source }) =>
            setNotes((m) =>
              m.some((n) => n.key === `note-${index}`)
                ? m
                : [...m, { key: `note-${index}`, label: `Note (${source})`, at: minutes[index] }],
            )
          }
        />
      </Cell>
      <Text size="sm" tone="muted" data-testid="chart-viewport-log">
        {log || 'Zoom or pan the chart'}
      </Text>
    </Stack>
  );
}

export function ChartDemo() {
  const [type, setType] = useState<ChartType>('line');
  const [loading, setLoading] = useState(false);
  const [curve, setCurve] = useState<'smooth' | 'linear'>('smooth');

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
    curve="smooth" // or "linear"
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
            <ButtonGroup
              size="sm"
              aria-label="Curve"
              value={curve}
              onValueChange={(v) => setCurve(v as 'smooth' | 'linear')}
            >
              <ButtonGroup.Item value="smooth">Smooth</ButtonGroup.Item>
              <ButtonGroup.Item value="linear">Linear</ButtonGroup.Item>
            </ButtonGroup>
            <Switch checked={loading} onChange={setLoading}>
              Loading
            </Switch>
          </Cluster>
          <Cell title="Deals won" loading={loading}>
            <Chart
              type={type}
              curve={curve}
              label="Deals won per week"
              categories={weeks}
              series={dealsSeries}
              formatValue={formatCount}
            />
          </Cell>
        </Stack>
      </Example>

      <Example
        title="Range selection"
        description="Passing onSelectedRangeChange turns selection on. While a range exists a Zoom to selection button appears in the legend row (Reset zoom once zoomed), so the chart can zoom with no extra props. Mouse: press and drag. Touch: hold a finger still for a moment, then slide; a quick swipe still scrolls the page and a tap shows the tooltip. Keyboard: Shift+arrows. A click or tap outside the band clears it."
        code={`const [range, setRange] = useState<ChartRange | null>(null);
<Chart type="line" label="Bowl weight per minute" categories={minutes} series={bowl}
  formatValue={formatGrams} selectedRange={range} onSelectedRangeChange={setRange}
/>
<Text size="sm" tone="muted">{range ? \`Selected \${range.from} – \${range.to}\` : ''}</Text>`}
      >
        <RangeSelectionExample />
      </Example>

      <Example
        title="Zoom gestures"
        description="zoomGestures with a controlled viewport. Ctrl/⌘ + wheel or a trackpad pinch zooms around the pointer; Shift + wheel or a horizontal swipe pans; a plain wheel scrolls the page. Touch: pinch, two-finger drag, or a one-finger horizontal drag while zoomed. Mouse drag pans while zoomed (selection is off here). Keyboard: + and -. The line below logs onViewportChange; apps refetch on end: true. Double-click, double-tap or Enter on an inspected point adds a marker there (onPlotDoubleClick)."
        code={`const [viewport, setViewport] = useState<ChartViewport | null>(null);
<Chart type="line" label="Bowl weight per minute" categories={minutes} series={bowl}
  formatValue={formatGrams} markers={notes} zoomGestures viewport={viewport}
  onViewportChange={(next, { end }) => {
    setViewport(next);
    if (end) refetchFor(next);
  }}
  onPlotDoubleClick={({ index }) =>
    setNotes((m) => [...m, { key: \`note-\${index}\`, label: 'Note', at: minutes[index] }])
  }
/>`}
      >
        <ZoomGesturesExample />
      </Example>

      <Example
        title="Colour"
        description="color pins a series to a palette slot (1-8) so an entity keeps its colour when others are filtered or reordered. Series without color fill the free slots in order."
        code={`<Chart type="line" label="Eaten per bowl" categories={hours}
  series={[
    { key: 'a', label: 'Bowl A', color: 3, values: bowlA },
    { key: 'b', label: 'Bowl B', color: 5, values: bowlB },
  ]}
/>`}
      >
        <Cell title="Eaten per bowl">
          <Chart
            type="line"
            label="Eaten per bowl"
            categories={mealHours}
            series={pinnedSeries}
            formatValue={formatGrams}
          />
        </Cell>
      </Example>

      <Example
        title="Details and value labels"
        description="details adds muted lines per category to the tooltip, the keyboard announcement and a Details column in the data table. valueLabels prints each bar's value (or stack total) on the chart."
        code={`<Chart type="bar" label="Grams eaten per meal" categories={mealHours} series={eaten}
  formatValue={formatGrams} valueLabels
  details={(i) => [\`\${kcal[i]} kcal\`, \`\${times[i]} times\`]}
/>`}
      >
        <Cell title="Grams per meal">
          <Chart
            type="bar"
            label="Grams eaten per meal"
            categories={mealHours}
            series={eatenSeries}
            formatValue={formatGrams}
            valueLabels
            details={mealDetails}
          />
        </Cell>
      </Example>

      <Example
        title="Bars over 90 days"
        description="90 daily buckets with a previous-period comparison. Grouped bars shrink to fit their slot instead of spilling into the next day."
        code={`<Chart type="bar" label="Calls per day" categories={days}
  series={[
    { key: 'calls', label: 'Calls', values: [...90 values] },
    { key: 'prev', label: 'Previous period', values: [...90 values], comparisonOf: 'calls' },
  ]}
  formatValue={(n) => fmt.format(n)}
/>`}
      >
        <Cell title="Calls">
          <Chart
            type="bar"
            label="Calls per day"
            categories={days}
            series={dailySeries}
            formatValue={formatCount}
          />
        </Cell>
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
        title="Markers"
        description="A vertical line at one category, or a shaded band over a range. Subtle bands mark recurring context like weekends; labelled markers also appear in the tooltip, the keyboard announcement and the data table."
        code={`<Chart type="area" label="Calls per day" categories={days} series={calls}
  markers={[
    { key: 'launch', label: 'Launch', at: '10 Jul' },
    { key: 'promo', label: 'Summer promo', from: '21 Jul', to: '30 Jul' },
    { key: 'we-4', from: '4 Jul', to: '5 Jul', tone: 'subtle' }, // weekend, decorative
  ]}
/>`}
      >
        <Cell title="Calls">
          <Chart
            type="area"
            label="Calls per day"
            categories={firstSixWeeks}
            series={markerSeries}
            markers={eventMarkers}
            formatValue={formatCount}
          />
        </Cell>
      </Example>

      <Example
        title="Marker colour, icon and top labels"
        description="color strokes a marker in a palette slot, e.g. the scale it belongs to. icon (short text or emoji, decorative) is drawn above the plot; labelPlacement 'top' moves the label there too, under the icon. Without icons or top labels the plot keeps its size."
        code={`<Chart type="line" label="Bowl weight per scale" categories={hours}
  series={[
    { key: 'a', label: 'Scale A', color: 3, values: scaleA },
    { key: 'b', label: 'Scale B', color: 5, values: scaleB },
  ]}
  markers={[
    { key: 'fa1', label: 'Breakfast', at: '07:00', color: 3, icon: '🐱' },
    { key: 'fb1', label: 'Snack', at: '11:00', color: 5, icon: '🐱' },
    { key: 'fa2', label: 'Dinner', at: '18:00', color: 3, icon: '🐱', labelPlacement: 'top' },
  ]}
/>`}
      >
        <Cell title="Feedings">
          <Chart
            type="line"
            label="Bowl weight per scale"
            categories={dayHours}
            series={scaleSeries}
            markers={feedingMarkers}
            formatValue={formatGrams}
          />
        </Cell>
      </Example>

      <Example
        title="Footnote"
        description="A short note under the plot, e.g. excluded currencies. It takes its own row and the plot fills the rest; it also describes the plot to screen readers and stays in the empty state."
        code={`<Chart type="line" label="Deals won per week" categories={weeks} series={won}
  footnote="3 deals in other currencies not included"
/>`}
      >
        <Cell title="Deals won">
          <Chart
            type="line"
            label="Deals won per week"
            categories={weeks}
            series={[
              { key: 't', label: 'Deals won', values: weeks.map((_, i) => 4 + ((i * 7) % 9)) },
            ]}
            formatValue={(n) => fmt.format(n)}
            footnote="3 deals in other currencies not included"
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
