import { useState } from 'react';
import {
  DashboardWidget,
  Cluster,
  IconTile,
  Sparkline,
  Stack,
  StatGroup,
  StatTile,
  Switch,
} from '@eocrm/design-system';
import { CheckSquare, Euro, Handshake, Percent } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

function Tiles() {
  return (
    <>
      <StatTile
        label="Pipeline value"
        value="€1.24M"
        trend={{ label: '12.4% vs previous period', direction: 'up' }}
        footnote="2 deals in other currencies not included"
        icon={<IconTile icon={<Euro size={14} />} color="blue" size="sm" />}
      />
      <StatTile
        label="Win rate"
        value={null}
        footnote="No closed deals yet"
        icon={<IconTile icon={<Percent size={14} />} color="green" size="sm" />}
      />
      <StatTile
        label="Overdue tasks"
        value="17"
        trend={{ label: '4 vs previous period', direction: 'up', sentiment: 'negative' }}
        icon={<IconTile icon={<CheckSquare size={14} />} color="red" size="sm" />}
      />
      <StatTile
        label="Open deals"
        value="48"
        trend={{ label: 'vs previous period', direction: 'flat' }}
        sparkline={<Sparkline label="Open deals per week" values={[40, 44, 43, 47, 46, 49, 48]} />}
        icon={<IconTile icon={<Handshake size={14} />} color="purple" size="sm" />}
      />
    </>
  );
}

export function StatGroupDemo() {
  const [loading, setLoading] = useState(false);

  return (
    <DemoLayout
      name="StatGroup"
      componentName="StatGroup"
      description="Responsive grid of KPI tiles (StatTile: label, value, trend, footnote, icon) for a dashboard widget that shows several numbers at once. Reflows by width; loading keeps the labels and skeletons the numbers."
      files={getComponentFiles('StatGroup')}
    >
      <Example
        title="In a dashboard widget"
        description="Four tiles in a standard DashboardWidget. Win rate has no data (value={null} → “—” + hidden “No data”). Overdue tasks going up is bad, so sentiment overrides direction. Toggle Loading for the skeleton."
        code={`<DashboardWidget title="Key metrics">
  <StatGroup aria-label="Key metrics" loading={loading}>
    <StatTile
      label="Pipeline value"
      value="€1.24M"
      trend={{ label: '12.4% vs previous period', direction: 'up' }}
      footnote="2 deals in other currencies not included"
      icon={<IconTile icon={<Euro size={14} />} color="blue" size="sm" />}
    />
    <StatTile label="Win rate" value={null} footnote="No closed deals yet" />
    <StatTile
      label="Overdue tasks"
      value="17"
      trend={{ label: '4 vs previous period', direction: 'up', sentiment: 'negative' }}
    />
    <StatTile label="Open deals" value="48" trend={{ label: 'vs previous period', direction: 'flat' }} />
  </StatGroup>
</DashboardWidget>`}
      >
        <Stack gap="md">
          <Switch checked={loading} onChange={setLoading}>
            Loading
          </Switch>
          <div style={{ height: 300 }}>
            <DashboardWidget title="Key metrics">
              <StatGroup aria-label="Key metrics" loading={loading}>
                <Tiles />
              </StatGroup>
            </DashboardWidget>
          </div>
        </Stack>
      </Example>

      <Example
        title="Card surface + quota meters"
        description="variant='card' on a group that sits on the page background: every tile gets the card background, border and shadow. progress={{ value, max, tone }} adds a quota meter named by the tile label; its track stays visible on either surface. Toggle Loading for the progress-height skeletons."
        code={`<StatGroup aria-label="Plan usage" variant="card" loading={loading}>
  <StatTile label="Storage" value="1.2 GB / 5 GB" progress={{ value: 1.2, max: 5 }} />
  <StatTile label="Seats" value="18 / 20" progress={{ value: 18, max: 20, tone: 'warning' }} />
  <StatTile label="API calls today" value="10,412 / 10,000" progress={{ value: 10412, max: 10000, tone: 'danger' }} />
</StatGroup>`}
      >
        <StatGroup aria-label="Plan usage" variant="card" loading={loading}>
          <StatTile label="Storage" value="1.2 GB / 5 GB" progress={{ value: 1.2, max: 5 }} />
          <StatTile
            label="Seats"
            value="18 / 20"
            progress={{ value: 18, max: 20, tone: 'warning' }}
          />
          <StatTile
            label="API calls today"
            value="10,412 / 10,000"
            progress={{ value: 10412, max: 10000, tone: 'danger' }}
          />
        </StatGroup>
      </Example>

      <Example
        title="Narrow cells"
        description="The same tiles in 320px and 200px cells: one column, and the 200px cell is narrower than minColumnWidth, so the tile shrinks instead of overflowing. Below ~160px of tile width the icon hides and the value steps down a size."
        code={`<div style={{ width: 200, height: 560 }}>
  <DashboardWidget title="Key metrics">
    <StatGroup aria-label="Key metrics">…</StatGroup>
  </DashboardWidget>
</div>`}
      >
        <Cluster gap="md" align="start">
          <div style={{ width: 320, height: 560 }}>
            <DashboardWidget title="Key metrics">
              <StatGroup aria-label="Key metrics (320px)">
                <Tiles />
              </StatGroup>
            </DashboardWidget>
          </div>
          <div style={{ width: 200, height: 560 }}>
            <DashboardWidget title="Key metrics">
              <StatGroup aria-label="Key metrics (200px)">
                <Tiles />
              </StatGroup>
            </DashboardWidget>
          </div>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
