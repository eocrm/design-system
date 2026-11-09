import { useState } from 'react';
import { DashboardWidget, DonutChart, Stack, toast, type DonutSegment } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

// Stable references: DonutChart re-derives its geometry when `segments`/`formatValue` change identity.
const fmt = new Intl.NumberFormat('en-GB');
const formatCount = (n: number) => fmt.format(n);

const status: DonutSegment[] = [
  { key: 'new', label: 'New', value: 48 },
  { key: 'in-progress', label: 'In progress', value: 31 },
  { key: 'blocked', label: 'Blocked', value: 9 },
  { key: 'done', label: 'Done', value: 112 },
];
const small: DonutSegment[] = [
  { key: 'won', label: 'Won', value: 980 },
  { key: 'lost', label: 'Lost', value: 14 },
  { key: 'stalled', label: 'Stalled', value: 5 },
  { key: 'void', label: 'Void', value: 0 },
];
const none: DonutSegment[] = [];

export function DonutChartDemo() {
  const [clicked, setClicked] = useState('none yet');
  const onClick = (s: DonutSegment) => {
    setClicked(s.label);
    toast.info(`Open ${s.label} items`);
  };

  return (
    <DemoLayout
      name="DonutChart"
      componentName="DonutChart"
      description="Part-of-whole donut with the total in the centre and a legend of values and shares. Optional segment click, tooltip, keyboard inspection and hidden data table."
      files={getComponentFiles('DonutChart')}
    >
      <Example
        title="Status overview"
        description="onSegmentClick makes arcs and legend entries buttons. Arrow keys choose a segment; Enter or Space activates the chosen one. Hover shows details but does not choose a segment for Enter."
        code={`<DonutChart
  label="Work items by status"
  segments={segments}
  formatValue={formatCount}
  centerLabel="work items"
  onSegmentClick={(s) => toast.info(\`Open \${s.label} items\`)}
/>`}
      >
        <Stack gap="sm">
          <span>Last clicked: {clicked}</span>
          <div style={{ height: 300, maxWidth: 640 }}>
            <DonutChart
              label="Work items by status"
              segments={status}
              formatValue={formatCount}
              centerLabel="work items"
              onSegmentClick={onClick}
            />
          </div>
        </Stack>
      </Example>

      <Example
        title="Small segments"
        description="Percentages come from the real total; tiny segments get a minimum visible angle. A zero-value segment is listed but cannot be focused or clicked."
        code={`<DonutChart label="Deals by outcome" segments={segments} formatValue={formatCount} onSegmentClick={...} />`}
      >
        <div style={{ height: 300, maxWidth: 640 }}>
          <DonutChart
            label="Deals by outcome"
            segments={small}
            formatValue={formatCount}
            onSegmentClick={onClick}
            footnote="Closed deals only"
          />
        </div>
      </Example>

      <Example
        title="Empty"
        description="No segments, or every value 0: EmptyState, with the footnote kept."
        code={`<DonutChart label="Tickets by channel" segments={[]} formatValue={formatCount} footnote="Last 30 days" />`}
      >
        <div style={{ height: 240, maxWidth: 560 }}>
          <DonutChart
            label="Tickets by channel"
            segments={none}
            formatValue={formatCount}
            footnote="Last 30 days"
          />
        </div>
      </Example>

      <Example
        title="In a dashboard widget"
        description="Fills a chart widget body. Drag the corner to resize: the legend moves beside or below the ring."
        code={`<DashboardWidget variant="chart" title="Work items">
  <DonutChart label="Work items (widget)" segments={segments} formatValue={formatCount} />
</DashboardWidget>`}
      >
        <div
          style={{ resize: 'both', overflow: 'hidden', width: 640, height: 320, maxWidth: '100%' }}
        >
          <DashboardWidget variant="chart" title="Work items">
            <DonutChart label="Work items (widget)" segments={status} formatValue={formatCount} />
          </DashboardWidget>
        </div>
      </Example>
    </DemoLayout>
  );
}
