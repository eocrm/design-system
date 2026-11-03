import { useState, type ReactNode } from 'react';
import { DashboardWidget, FunnelChart, Stack, type FunnelStage } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

// Stable references: FunnelChart re-derives its geometry when `stages`/`formatValue` change identity.
const fmt = new Intl.NumberFormat('en-GB');
const formatCount = (n: number) => fmt.format(n);

const pipeline: FunnelStage[] = [
  { key: 'leads', label: 'Leads', value: 1200 },
  { key: 'qualified', label: 'Qualified', value: 640 },
  { key: 'proposal', label: 'Proposal', value: 210 },
  { key: 'won', label: 'Won', value: 64 },
];
const longLabels: FunnelStage[] = [
  'Inbound enquiry from the website form',
  'First contact attempt by sales development',
  'Discovery call completed with decision maker',
  'Technical evaluation and security review',
  'Commercial proposal sent to the customer',
  'Contract negotiation and legal review',
  'Signed order awaiting kick-off scheduling',
  'Onboarded and live in production',
].map((label, i) => ({ key: `s${i}`, label, value: Math.round(2000 * 0.72 ** i) }));
const none: FunnelStage[] = [];

/** Resizable box standing in for a DashboardCanvas cell (demo-only inline style). */
function Cell({
  children,
  title,
  height = 300,
}: {
  children: ReactNode;
  title: string;
  height?: number;
}) {
  return (
    <div style={{ resize: 'both', overflow: 'hidden', width: 520, height, maxWidth: '100%' }}>
      <DashboardWidget variant="chart" title={title}>
        {children}
      </DashboardWidget>
    </div>
  );
}

export function FunnelChartDemo() {
  const [active, setActive] = useState<FunnelStage | null>(null);
  const [clicked, setClicked] = useState<string>('none yet');

  return (
    <DemoLayout
      name="FunnelChart"
      componentName="FunnelChart"
      description="Stage funnel for pipeline or campaign conversion: height shows drop-off, a pill shows step conversion. Optional stage click, vertical layout when narrow, tooltip, keyboard and hidden data table."
      files={getComponentFiles('FunnelChart')}
    >
      <Example
        title="In a dashboard widget"
        description="Eased funnel. Drag the corner to resize: below 96px per stage it switches to vertical rows."
        code={`<DashboardWidget variant="chart" title="Sales pipeline">
  <FunnelChart label="Sales pipeline" stages={stages} formatValue={formatCount} />
</DashboardWidget>`}
      >
        <Cell title="Sales pipeline">
          <FunnelChart label="Sales pipeline" stages={pipeline} formatValue={formatCount} />
        </Cell>
      </Example>

      <Example
        title="Sharp shape"
        description="Straight trapezoids between stages, in both the horizontal and the narrow vertical layout."
        code={`<FunnelChart label="Sales pipeline" stages={stages} formatValue={formatCount} shape="sharp" />`}
      >
        <Cell title="Sales pipeline">
          <FunnelChart
            label="Sales pipeline (sharp)"
            stages={pipeline}
            formatValue={formatCount}
            shape="sharp"
          />
        </Cell>
      </Example>

      <Example
        title="Inline on a page"
        description="No widget: a definite-height parent is filled; in an auto-height parent the funnel takes its default height."
        code={`<div style={{ height: 260 }}>
  <FunnelChart label="Campaign funnel" stages={stages} formatValue={formatCount} />
</div>`}
      >
        <div style={{ height: 260 }}>
          <FunnelChart label="Campaign funnel" stages={pipeline} formatValue={formatCount} />
        </div>
      </Example>

      <Example
        title="Clickable stages"
        description="onStageClick makes stages buttons; onActiveStageChange drives the headline above as you hover or focus."
        code={`<strong>{active ? \`\${active.label}: \${formatCount(active.value)}\` : 'Hover a stage'}</strong>
<FunnelChart
  label="Sales pipeline"
  stages={stages}
  formatValue={formatCount}
  onStageClick={(stage) => setClicked(stage.label)}
  onActiveStageChange={setActive}
/>`}
      >
        <Stack gap="sm">
          <strong>
            {active ? `${active.label}: ${formatCount(active.value)}` : 'Hover a stage'}
          </strong>
          <span>Last clicked: {clicked}</span>
          <Cell title="Sales pipeline">
            <FunnelChart
              label="Sales pipeline (clickable)"
              stages={pipeline}
              formatValue={formatCount}
              onStageClick={(stage) => setClicked(stage.label)}
              onActiveStageChange={setActive}
            />
          </Cell>
        </Stack>
      </Example>

      <Example
        title="Eight stages, long labels"
        description="Horizontal needs 96px per stage (768px for eight), so in this cell it renders as vertical rows; long labels wrap beside the bands, never truncate."
        code={`<FunnelChart label="Enterprise pipeline" stages={longLabels} formatValue={formatCount} />`}
      >
        <Cell title="Enterprise pipeline" height={380}>
          <FunnelChart label="Enterprise pipeline" stages={longLabels} formatValue={formatCount} />
        </Cell>
      </Example>

      <Example
        title="Empty with footnote"
        description="No stages: EmptyState, with the footnote explaining why."
        code={`<FunnelChart label="Sales pipeline" stages={[]} formatValue={formatCount} footnote="Closed deals only" />`}
      >
        <Cell title="Sales pipeline">
          <FunnelChart
            label="Sales pipeline (empty)"
            stages={none}
            formatValue={formatCount}
            footnote="Closed deals only"
          />
        </Cell>
      </Example>
    </DemoLayout>
  );
}
