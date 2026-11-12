import { useState, type ReactNode } from 'react';
import {
  DashboardWidget,
  ScatterChart,
  Stack,
  Switch,
  type ScatterReference,
  type ScatterSeries,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

/** Resizable box standing in for a DashboardCanvas cell (demo-only inline style). */
function Cell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div style={{ resize: 'both', overflow: 'hidden', width: 560, height: 340, maxWidth: '100%' }}>
      <DashboardWidget variant="chart" title={title}>
        {children}
      </DashboardWidget>
    </div>
  );
}

const grams = new Intl.NumberFormat('en-GB');
const formatGrams = (n: number) => `${grams.format(Math.round(n))} g`;
const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const at = (h: number, m = 0) => new Date(2026, 10, 7, h, m);

// Today's meals per bowl: x = time, y = grams eaten so far today, size = the meal's grams.
const mealsA = [
  { time: at(6, 40), g: 45 },
  { time: at(11, 5), g: 38 },
  { time: at(16, 30), g: 52 },
  { time: at(21, 15), g: 30 },
];
const mealsB = [
  { time: at(7, 10), g: 28 },
  { time: at(13, 45), g: 60 },
  { time: at(19, 20), g: 41 },
];
const cumulative = (meals: { time: Date; g: number }[]) => {
  let total = 0;
  return meals.map((m) => ({ x: m.time, y: (total += m.g), size: m.g }));
};
const todaySeries: ScatterSeries[] = [
  { key: 'a', label: 'Bowl A', color: 1, points: cumulative(mealsA) },
  { key: 'b', label: 'Bowl B', color: 2, points: cumulative(mealsB) },
];
const usualPace: ScatterReference = {
  label: 'Usual pace',
  points: [
    { x: at(0), y: 0 },
    { x: at(12), y: 60 },
    { x: at(18), y: 120 },
    { x: at(22), y: 160 },
  ],
};
// A straight line from midnight to "now" at the grams eaten so far.
const todayPace: ScatterReference = {
  label: "Today's pace",
  color: 3,
  emphasis: 'strong',
  points: [
    { x: at(0), y: 0 },
    { x: at(20), y: 150 },
  ],
};
const paces = [usualPace, todayPace];

// ~60 meals, deterministic pseudo-random (LCG): bowl contents at meal start vs grams eaten.
function lcg(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}
const rand = lcg(7);
const bowlVsEaten: ScatterSeries[] = [
  {
    key: 'meals',
    label: 'Meals',
    points: Array.from({ length: 60 }, () => {
      const bowl = 20 + rand() * 180;
      return { x: Math.round(bowl), y: Math.round(5 + bowl * 0.28 + (rand() - 0.5) * 24) };
    }),
  },
];

const shapeSeries: ScatterSeries[] = [
  { key: 'meal', label: 'Meal', points: todaySeries[0].points },
  {
    key: 'poo',
    label: 'Poo',
    shape: 'square',
    points: todaySeries[0].points.slice(0, 3).map((p) => ({ ...p, y: 5, size: undefined })),
  },
  {
    key: 'visit',
    label: 'Long visit',
    shape: 'triangle',
    emphasis: 'strong',
    points: todaySeries[0].points.slice(1, 3).map((p) => ({ ...p, y: 20, size: undefined })),
  },
];

function SeriesToggleExample() {
  const [hidden, setHidden] = useState<string[]>([]);
  return (
    <Stack gap="sm">
      <Switch checked={hidden.includes('b')} onChange={(on) => setHidden(on ? ['b'] : [])}>
        Hide Bowl B
      </Switch>
      <Cell title="Meals today">
        <ScatterChart
          label="Meals today"
          xScale="time"
          series={todaySeries}
          hiddenSeries={hidden}
          onHiddenSeriesChange={setHidden}
          xLabel="Time"
          yLabel="Eaten so far"
          formatX={formatTime}
          formatY={formatGrams}
        />
      </Cell>
    </Stack>
  );
}

export function ScatterChartDemo() {
  return (
    <DemoLayout
      name="ScatterChart"
      componentName="ScatterChart"
      description="Scatter plot of two measures, or events on a time axis sized by magnitude. Series colours and marker shapes, optional trend and reference lines, legend, tooltip, keyboard inspection and a data table."
      files={getComponentFiles('ScatterChart')}
    >
      <Example
        title="Meals today"
        description="A time axis: x is the meal time, y the grams eaten so far, dot area the meal's grams. Two bowls are series with an explicit colour; the dashed lines are the app-computed usual pace and today's pace (each line gets its own dash pattern and legend entry)."
        code={`<ScatterChart
  label="Meals today" xScale="time"
  series={[
    { key: 'a', label: 'Bowl A', color: 1, points: bowlA }, // { x: Date, y: cumulativeG, size: mealG }
    { key: 'b', label: 'Bowl B', color: 2, points: bowlB },
  ]}
  reference={[usualPace, todayPace]} // each { label, points, color?, emphasis? }
  xLabel="Time" yLabel="Eaten so far" sizeLabel="Meal"
  formatX={formatTime} formatY={formatGrams} formatSize={formatGrams}
/>`}
      >
        <Cell title="Meals today">
          <ScatterChart
            label="Meals today"
            xScale="time"
            series={todaySeries}
            reference={paces}
            xLabel="Time"
            yLabel="Eaten so far"
            sizeLabel="Meal"
            formatX={formatTime}
            formatY={formatGrams}
            formatSize={formatGrams}
          />
        </Cell>
      </Example>

      <Example
        title="Shape and emphasis"
        description="Per-series marker shape and strong emphasis: meals are circles, 'Poo' squares and 'Long visit' strong triangles."
        code={`<ScatterChart ... series={[
  { key: 'meal', label: 'Meal', points: meals },
  { key: 'poo', label: 'Poo', shape: 'square', points: poo },
  { key: 'visit', label: 'Long visit', shape: 'triangle', emphasis: 'strong', points: visits },
]} />`}
      >
        <Cell title="Shapes">
          <ScatterChart
            label="Meals, poo and long visits"
            xScale="time"
            series={shapeSeries}
            xLabel="Time"
            yLabel="Eaten so far"
            formatX={formatTime}
            formatY={formatGrams}
          />
        </Cell>
      </Example>

      <Example
        title="Two measures with a trend line"
        description="60 meals: bowl contents at the start against grams eaten. trendLine draws a dashed least-squares line per series."
        code={`<ScatterChart
  label="Bowl contents at meal start vs grams eaten"
  series={[{ key: 'meals', label: 'Meals', points }]} // { x: bowlG, y: eatenG }
  xLabel="Bowl at start" yLabel="Eaten"
  formatX={formatGrams} formatY={formatGrams}
  trendLine
/>`}
      >
        <Cell title="Bowl vs eaten">
          <ScatterChart
            label="Bowl contents at meal start vs grams eaten"
            series={bowlVsEaten}
            xLabel="Bowl at start"
            yLabel="Eaten"
            formatX={formatGrams}
            formatY={formatGrams}
            trendLine
          />
        </Cell>
      </Example>

      <Example
        title="Controlled legend"
        description="hiddenSeries and onHiddenSeriesChange control which series the legend hides."
        code={`const [hidden, setHidden] = useState<string[]>([]);
<ScatterChart ... hiddenSeries={hidden} onHiddenSeriesChange={setHidden} />`}
      >
        <SeriesToggleExample />
      </Example>

      <Example
        title="Footnote"
        description="A short note under the plot."
        code={`<ScatterChart ... footnote="Meals under 5 g not included" />`}
      >
        <Cell title="Bowl vs eaten">
          <ScatterChart
            label="Bowl contents at meal start vs grams eaten"
            series={bowlVsEaten}
            xLabel="Bowl at start"
            yLabel="Eaten"
            formatX={formatGrams}
            formatY={formatGrams}
            footnote="Meals under 5 g not included"
          />
        </Cell>
      </Example>

      <Example
        title="Empty"
        description="No points renders EmptyState."
        code={`<ScatterChart ... series={[{ key: 'meals', label: 'Meals', points: [] }]} />`}
      >
        <Cell title="Bowl vs eaten">
          <ScatterChart
            label="Bowl contents at meal start vs grams eaten"
            series={[{ key: 'meals', label: 'Meals', points: [] }]}
            xLabel="Bowl at start"
            yLabel="Eaten"
            formatX={formatGrams}
            formatY={formatGrams}
          />
        </Cell>
      </Example>
    </DemoLayout>
  );
}
