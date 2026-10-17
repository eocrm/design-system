import {
  Card,
  DashboardWidget,
  Grid,
  IconTile,
  Sparkline,
  Stack,
  StatGroup,
  StatTile,
  Text,
  type SparklineType,
} from '@eocrm/design-system';
import { Building2, CheckSquare, Handshake, Users } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const series = (seed: number) =>
  Array.from({ length: 90 }, (_, i) =>
    Math.round(40 + 20 * Math.sin((i + seed) / 7) + ((i + seed) % 5) * 3),
  );
const daily = series(0);
const withGaps = daily.map((v, i) => (i >= 30 && i < 45 ? null : v));
const flat = Array.from({ length: 30 }, () => 12);
const negative = [4, -3, 6, -8, 2, 9, -5, 7, -2, 3, -6, 8];
const types: SparklineType[] = ['line', 'area', 'bar'];

const usage = [
  { label: 'Contacts', value: '1,284', icon: <Users size={14} />, color: 'blue' as const },
  { label: 'Companies', value: '312', icon: <Building2 size={14} />, color: 'green' as const },
  { label: 'Deals', value: '148', icon: <Handshake size={14} />, color: 'purple' as const },
  { label: 'Tasks', value: '2,051', icon: <CheckSquare size={14} />, color: 'orange' as const },
];

export function SparklineDemo() {
  return (
    <DemoLayout
      name="Sparkline"
      componentName="Sparkline"
      description="Compact, static, axis-free line / area / bar trend for KPI cards. Intrinsic 40px height, full width; the summary (first, last, low, high) lives in the accessible name."
      files={getComponentFiles('Sparkline')}
    >
      <Example
        title="Types"
        description="line (default), area and bar over the same 90-day series, each in a fixed-width card."
        code={`<Sparkline label="Contacts per day" type="line" values={values} />
<Sparkline label="Contacts per day" type="area" values={values} />
<Sparkline label="Contacts per day" type="bar" values={values} />`}
      >
        <Grid columns={3} gap="md">
          {types.map((type) => (
            <Card key={type}>
              <Card.Body>
                <Stack gap="sm">
                  <Text>{type}</Text>
                  <Sparkline label="Contacts per day" type={type} values={daily} />
                </Stack>
              </Card.Body>
            </Card>
          ))}
        </Grid>
      </Example>

      <Example
        title="Gaps, flat, negative"
        description="null = no data (the line breaks, the bar is absent). A flat line is drawn mid-height. Negative values: an area fills from the series minimum; bars hang from a zero line."
        code={`<Sparkline label="With gaps" values={withGaps} />
<Sparkline label="Flat" values={flat} />
<Sparkline label="Negative" type="bar" values={negative} />`}
      >
        <Grid columns={3} gap="md">
          <Sparkline label="With gaps" values={withGaps} />
          <Sparkline label="Flat" values={flat} />
          <Sparkline label="Negative" type="bar" values={negative} />
        </Grid>
      </Example>

      <Example
        title="In a StatGroup"
        description="The Usage-tab case: one StatTile per record type, each with a sparkline slot."
        code={`<StatGroup aria-label="Usage">
  <StatTile
    label="Contacts"
    value="1,284"
    sparkline={<Sparkline label="Contacts per day" type="area" values={values} />}
  />
</StatGroup>`}
      >
        <DashboardWidget title="Usage, last 90 days">
          <StatGroup aria-label="Usage">
            {usage.map((u, i) => (
              <StatTile
                key={u.label}
                label={u.label}
                value={u.value}
                icon={<IconTile icon={u.icon} color={u.color} size="sm" />}
                sparkline={
                  <Sparkline label={`${u.label} per day`} type="area" values={series(i * 11)} />
                }
              />
            ))}
          </StatGroup>
        </DashboardWidget>
      </Example>

      <Example
        title="In a kpi DashboardWidget"
        description="No dedicated prop: pass the Sparkline as children and it renders under value and trend."
        code={`<DashboardWidget variant="kpi" title="Open deals" value="128" trend={…}>
  <Sparkline label="Open deals per day" values={values} />
</DashboardWidget>`}
      >
        <div style={{ width: 280, height: 200 }}>
          <DashboardWidget
            variant="kpi"
            title="Open deals"
            value="128"
            trend={{ label: '+12% vs last month', direction: 'up' }}
          >
            <Sparkline label="Open deals per day" values={daily} />
          </DashboardWidget>
        </div>
      </Example>
    </DemoLayout>
  );
}
