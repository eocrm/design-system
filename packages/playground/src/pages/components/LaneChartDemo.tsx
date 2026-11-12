import { useMemo, useState } from 'react';
import {
  DashboardWidget,
  LaneChart,
  Stack,
  Text,
  type ChartMarker,
  type ChartRange,
  type Lane,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const DAYS = 90;
const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const categories = Array.from({ length: DAYS }, (_, i) => fmt.format(new Date(2026, 7, 14 + i)));

// Deterministic pseudo-random (LCG), so the demo is stable across renders.
function lcg(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}
const rand = lcg(11);
const food = categories.map((_, i) => Math.round(180 + 40 * Math.sin(i / 6) + rand() * 30));
const poo = categories.map(() => (rand() < 0.7 ? Math.ceil(rand() * 3) : 0));
const weight = categories.map((_, i) => +(4.2 + i * 0.004 + (rand() - 0.5) * 0.06).toFixed(2));
const cleanings = categories.map(() => Math.floor(rand() * 4));
const weightAvg = weight.slice(-30).reduce((a, b) => a + b, 0) / 30;

const lanes: Lane[] = [
  {
    key: 'food',
    label: 'Food',
    type: 'bar',
    values: food,
    formatValue: (n) => `${Math.round(n)} g`,
  },
  { key: 'poo', label: 'Poo', type: 'dots', values: poo, formatValue: (n) => `${n}×` },
  {
    key: 'weight',
    label: 'Weight',
    type: 'line',
    values: weight,
    includeZero: false,
    formatValue: (n) => `${n.toFixed(2)} kg`,
    referenceLines: [{ key: 'avg', label: '30-day avg', value: weightAvg }],
  },
  {
    key: 'cleanings',
    label: 'Cleanings',
    type: 'bar',
    values: cleanings,
    integerValues: true,
    formatValue: (n) => `${n}`,
  },
];

const markers: ChartMarker[] = [
  { key: 'diet', label: 'Diet change', at: categories[30] },
  { key: 'vet', label: 'Vet', from: categories[60], to: categories[63] },
];

function EffectsExample() {
  const memoLanes = useMemo(() => lanes, []);
  const [range, setRange] = useState<ChartRange | null>(null);
  const idx = range ? categories.indexOf(range.from) : -1;
  return (
    <Stack gap="sm">
      <div style={{ height: 520, maxWidth: '100%' }}>
        <DashboardWidget variant="chart" title="Effects">
          <LaneChart
            label="Effects, last 90 days"
            categories={categories}
            lanes={memoLanes}
            markers={markers}
            selectOn="tap"
            onSelectedRangeChange={setRange}
            zoomGestures
          />
        </DashboardWidget>
      </div>
      <Text>
        {range && idx >= 0
          ? `Selected: ${range.from}${range.to !== range.from ? ` – ${range.to}` : ''}, food ${food[idx]} g, cleanings ${cleanings[idx]}`
          : 'Tap a day to select it.'}
      </Text>
    </Stack>
  );
}

export function LaneChartDemo() {
  return (
    <DemoLayout
      name="LaneChart"
      componentName="LaneChart"
      description="Several measures with different units in lanes on one shared time axis: one tooltip, selection, zoom and set of markers across all lanes."
      files={getComponentFiles('LaneChart')}
    >
      <Example
        title="Effects"
        description="90 days of food (bar, grams), poo (presence dots), weight (line fitted to its data, with a 30-day average) and cleanings (bar, whole numbers). Tap a day to select it; Ctrl/Cmd + wheel or pinch zooms. Markers run through every lane."
        code={`<LaneChart
  label="Effects, last 90 days" categories={days}
  lanes={[
    { key: 'food', label: 'Food', type: 'bar', values: food, formatValue: grams },
    { key: 'poo', label: 'Poo', type: 'dots', values: poo, formatValue: times },
    { key: 'weight', label: 'Weight', type: 'line', values: weight, includeZero: false,
      formatValue: kg, referenceLines: [{ label: '30-day avg', value: avg }] },
    { key: 'cleanings', label: 'Cleanings', type: 'bar', values: cleanings,
      integerValues: true, formatValue: String },
  ]}
  markers={[
    { key: 'diet', label: 'Diet change', at: '13 Sep' },
    { key: 'vet', label: 'Vet', from: '12 Oct', to: '15 Oct' },
  ]}
  selectOn="tap" onSelectedRangeChange={setRange} zoomGestures
/>`}
      >
        <EffectsExample />
      </Example>
    </DemoLayout>
  );
}
