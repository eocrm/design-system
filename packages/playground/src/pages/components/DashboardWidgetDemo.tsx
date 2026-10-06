import { useState } from 'react';
import {
  Button,
  Card,
  DashboardWidget,
  DropdownMenu,
  ErrorState,
  Grid,
  Stack,
  Switch,
  Text,
} from '@eocrm/design-system';
import { MoreHorizontal, RefreshCw } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const CELL = { height: 220 } as const;

const TASKS = [
  'Send proposal to Acme Corp',
  'Follow up with Initech',
  'Prepare Q3 review deck',
  'Update Globex contract terms',
  'Schedule onboarding call',
  'Review renewal pricing',
];

const BARS = [40, 65, 50, 80, 55, 90, 70];

function Menu() {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <Button size="xs" variant="ghost" iconOnly aria-label="Widget actions">
          <MoreHorizontal size={14} aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Item onSelect={() => {}}>Configure</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => {}} tone="danger">
          Remove
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

function Plot() {
  return (
    <svg
      viewBox="0 0 140 60"
      preserveAspectRatio="none"
      role="img"
      aria-label="Revenue by month"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {BARS.map((h, i) => (
        <rect
          key={i}
          x={i * 20 + 4}
          y={60 - (h * 56) / 100}
          width={12}
          height={(h * 56) / 100}
          fill="var(--color-accent)"
        />
      ))}
    </svg>
  );
}

export function DashboardWidgetDemo() {
  const [loading, setLoading] = useState(false);

  return (
    <DemoLayout
      name="DashboardWidget"
      componentName="DashboardWidget"
      description="Card that fills a DashboardCanvas cell in four presentations (standard, list, kpi, chart). Owns the header, body chrome and a variant-matched loading skeleton; the app owns data, error state and the actions menu."
      files={getComponentFiles('DashboardWidget')}
    >
      <Example
        title="Variants"
        description="Each widget fills a fixed 220px cell. The kpi shows churn, where an upward trend is negative; the list scrolls; the chart plot fills the body. Toggle Loading for the variant-matched skeletons."
        code={`const [loading, setLoading] = useState(false);

<Switch checked={loading} onChange={setLoading}>Loading</Switch>
<Grid minColumnWidth="240px" gap="md">
  <div style={{ height: 220 }}>
    <DashboardWidget title="Recent activity" actions={<Menu />} loading={loading}>
      <Text size="sm">Acme Corp moved to Negotiation.</Text>
    </DashboardWidget>
  </div>
  <div style={{ height: 220 }}>
    <DashboardWidget variant="list" title="Tasks due" actions={<Menu />} loading={loading}>
      <Card.List>
        {TASKS.map((t) => <Card.ListRow key={t}>{t}</Card.ListRow>)}
      </Card.List>
    </DashboardWidget>
  </div>
  <div style={{ height: 220 }}>
    <DashboardWidget
      variant="kpi"
      title="Churned accounts"
      actions={<Menu />}
      loading={loading}
      value="14"
      trend={{ label: '+3 vs last month', direction: 'up', sentiment: 'negative' }}
    />
  </div>
  <div style={{ height: 220 }}>
    <DashboardWidget variant="chart" title="Revenue" actions={<Menu />} loading={loading}>
      <svg viewBox="0 0 140 60" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {/* bars */}
      </svg>
    </DashboardWidget>
  </div>
</Grid>`}
      >
        <Stack gap="md">
          <Switch checked={loading} onChange={setLoading}>
            Loading
          </Switch>
          <Grid minColumnWidth="240px" gap="md">
            <div style={CELL}>
              <DashboardWidget title="Recent activity" actions={<Menu />} loading={loading}>
                <Text size="sm">Acme Corp moved to Negotiation.</Text>
              </DashboardWidget>
            </div>
            <div style={CELL}>
              <DashboardWidget
                variant="list"
                title="Tasks due"
                actions={<Menu />}
                loading={loading}
              >
                <Card.List>
                  {TASKS.map((t) => (
                    <Card.ListRow key={t}>{t}</Card.ListRow>
                  ))}
                </Card.List>
              </DashboardWidget>
            </div>
            <div style={CELL}>
              <DashboardWidget
                variant="kpi"
                title="Churned accounts"
                actions={<Menu />}
                loading={loading}
                value="14"
                trend={{ label: '+3 vs last month', direction: 'up', sentiment: 'negative' }}
              />
            </div>
            <div style={CELL}>
              <DashboardWidget variant="chart" title="Revenue" actions={<Menu />} loading={loading}>
                <Plot />
              </DashboardWidget>
            </div>
          </Grid>
        </Stack>
      </Example>

      <Example
        title="Header meta"
        description="Freshness or status text in meta yields first: it truncates before the title shrinks, while actions keep their width. Cells below are 360, 240 and 180px wide."
        code={`<DashboardWidget
  title="Deals pipeline"
  meta="Updated 1 second ago"
  actions={
    <Button size="xs" variant="ghost" iconOnly aria-label="Refresh">
      <RefreshCw size={14} aria-hidden="true" />
    </Button>
  }
>
  …
</DashboardWidget>`}
      >
        <Stack gap="md">
          {[360, 240, 180].map((width) => (
            <div key={width} style={{ height: 120, width }}>
              <DashboardWidget
                title="Deals pipeline"
                meta="Updated 1 second ago"
                actions={
                  <Button size="xs" variant="ghost" iconOnly aria-label="Refresh">
                    <RefreshCw size={14} aria-hidden="true" />
                  </Button>
                }
              >
                <Text>{width}px cell</Text>
              </DashboardWidget>
            </div>
          ))}
        </Stack>
      </Example>

      <Example
        title="Error state"
        description="Pass the app's ErrorState as children; lower headingLevel under the widget title."
        code={`<div style={{ height: 220 }}>
  <DashboardWidget title="Recent activity" actions={<Menu />}>
    <ErrorState
      tone="danger"
      size="sm"
      headingLevel={4}
      title="Could not load"
      actions={<Button size="sm">Retry</Button>}
    />
  </DashboardWidget>
</div>`}
      >
        <div style={{ ...CELL, maxWidth: 360 }}>
          <DashboardWidget title="Recent activity" actions={<Menu />}>
            <ErrorState
              tone="danger"
              size="sm"
              headingLevel={4}
              title="Could not load"
              actions={<Button size="sm">Retry</Button>}
            />
          </DashboardWidget>
        </div>
      </Example>
    </DemoLayout>
  );
}
