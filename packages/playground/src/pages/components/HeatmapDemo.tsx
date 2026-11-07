import type { ReactNode } from 'react';
import { DashboardWidget, Heatmap } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

/** Resizable box standing in for a DashboardCanvas cell (demo-only inline style). */
function Cell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div style={{ resize: 'both', overflow: 'hidden', width: 640, height: 320, maxWidth: '100%' }}>
      <DashboardWidget variant="chart" title={title}>
        {children}
      </DashboardWidget>
    </div>
  );
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));

// Deterministic pseudo-random (LCG), so renders are stable.
function lcg(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}
const rand = lcg(11);
const isMealHour = (h: number) => h === 7 || h === 12 || h === 18 || h === 21;

// Average grams eaten per weekday and hour; a few cells have no data (feeder offline).
const averageGrams: (number | null)[][] = weekdays.map((_, d) =>
  hours.map((_, h) => {
    if ((d === 2 && h === 12) || (d === 5 && h >= 3 && h <= 4) || (d === 6 && h === 18))
      return null;
    // One decimal: continuous values, so the legend is a stepped bar.
    return Math.round((isMealHour(h) ? 25 + rand() * 45 : rand() * 8) * 10) / 10;
  }),
);

// Meals per hour: small integers, so each value gets its own colour step.
const mealCounts: (number | null)[][] = weekdays.map((_, d) =>
  hours.map((_, h) => {
    const base = isMealHour(h) ? 2 : 0;
    return Math.min(3, base + Math.floor(rand() * (d >= 5 ? 2 : 1.6)));
  }),
);

const formatGrams = (n: number) => `${n} g`;
const formatMeals = (n: number) => `${n} ${n === 1 ? 'meal' : 'meals'}`;

export function HeatmapDemo() {
  return (
    <DemoLayout
      name="Heatmap"
      componentName="Heatmap"
      description="Rows by columns grid coloured by value in up to five sequential steps. Null cells are neutral outlined no-data cells. Legend, tooltip, keyboard inspection and a data table included."
      files={getComponentFiles('Heatmap')}
    >
      <Example
        title="Average grams by weekday and hour"
        description="Continuous values get a stepped-bar legend. The outlined cells have no data (null), not a low value."
        code={`<Heatmap
  label="Average grams eaten by weekday and hour"
  rows={weekdays} columns={hours}
  values={averageGrams} // averageGrams[row][col], null = no data
  formatValue={(n) => \`\${n} g\`}
/>`}
      >
        <Cell title="Average eaten">
          <Heatmap
            label="Average grams eaten by weekday and hour"
            rows={weekdays}
            columns={hours}
            values={averageGrams}
            formatValue={formatGrams}
          />
        </Cell>
      </Example>

      <Example
        title="Integer counts"
        description="Integer data spanning five or fewer integers (0..3 meals per hour) gets one colour step per integer."
        code={`<Heatmap label="Meals per hour" rows={weekdays} columns={hours}
  values={mealCounts} formatValue={(n) => \`\${n} \${n === 1 ? 'meal' : 'meals'}\`}
/>`}
      >
        <Cell title="Meals per hour">
          <Heatmap
            label="Meals per hour"
            rows={weekdays}
            columns={hours}
            values={mealCounts}
            formatValue={formatMeals}
          />
        </Cell>
      </Example>

      <Example
        title="Footnote"
        description="A short note under the grid."
        code={`<Heatmap ... footnote="Feeder offline Sat 03-04" />`}
      >
        <Cell title="Average eaten">
          <Heatmap
            label="Average grams eaten by weekday and hour"
            rows={weekdays}
            columns={hours}
            values={averageGrams}
            formatValue={formatGrams}
            footnote="Feeder offline Sat 03-04"
          />
        </Cell>
      </Example>

      <Example
        title="Empty"
        description="No cell with a value renders EmptyState."
        code={`<Heatmap ... values={weekdays.map(() => hours.map(() => null))} />`}
      >
        <Cell title="Average eaten">
          <Heatmap
            label="Average grams eaten by weekday and hour"
            rows={weekdays}
            columns={hours}
            values={weekdays.map(() => hours.map(() => null))}
            formatValue={formatGrams}
          />
        </Cell>
      </Example>
    </DemoLayout>
  );
}
