import { Timeline, Avatar, Dot, Stack, Text, IconTile, Button } from '@eocrm/design-system';
import { GitCommit, Mail, Plus } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function TimelineDemo() {
  return (
    <DemoLayout
      name="Timeline"
      componentName="Timeline"
      description="Vertical activity-feed primitive — a connector line running between per-item node slots (avatar / dot / icon) with content to the right; the line stops at the last node. Use compact for a dense sidebar widget. For a plain list use Stack."
      files={getComponentFiles('Timeline')}
    >
      <Example
        title="Activity feed (avatar / icon nodes)"
        description="Each item's node is a slot — an Avatar for a person, an IconTile for a system event, or an action like the “Add activity” composer pinned as the most-recent node at the top. The connector links consecutive nodes and stops at the last."
        code={`<Timeline>
  <Timeline.Item node={<IconTile icon={<Plus size={16} />} color="blue" size="sm" />}>
    {/* center the single control to the node box */}
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 'var(--size-md)' }}>
      <Button variant="secondary" size="sm" onClick={addActivity}>Add activity</Button>
    </div>
  </Timeline.Item>
  <Timeline.Item node={<Avatar name="Dana Reyes" size="sm" />}>
    <Stack gap="xs">
      <Text size="sm"><strong>Dana Reyes</strong> · note · 2h ago</Text>
      <Text size="sm" tone="muted">Called the client; renewal confirmed for Q3.</Text>
    </Stack>
  </Timeline.Item>
  <Timeline.Item node={<IconTile icon={<GitCommit size={16} />} color="blue" size="sm" />}>
    …
  </Timeline.Item>
  …
</Timeline>`}
      >
        <Timeline>
          {/* Composer entry as the most-recent (top) node — its connector flows into the feed below.
              The single button is centered to the node box (matches its height) so it lines up with the node. */}
          <Timeline.Item node={<IconTile icon={<Plus size={16} />} color="blue" size="sm" />}>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: 'var(--size-md)' }}>
              <Button variant="secondary" size="sm" onClick={() => {}}>
                Add activity
              </Button>
            </div>
          </Timeline.Item>
          <Timeline.Item node={<Avatar name="Dana Reyes" size="sm" />}>
            <Stack gap="xs">
              <Text size="sm">
                <strong>Dana Reyes</strong> · note · 2h ago
              </Text>
              <Text size="sm" tone="muted">
                Called the client; renewal confirmed for Q3.
              </Text>
            </Stack>
          </Timeline.Item>
          <Timeline.Item node={<IconTile icon={<GitCommit size={16} />} color="blue" size="sm" />}>
            <Stack gap="xs">
              <Text size="sm">
                <strong>System</strong> · stage change · 5h ago
              </Text>
              <Text size="sm" tone="muted">
                Moved to “Negotiation”.
              </Text>
            </Stack>
          </Timeline.Item>
          <Timeline.Item node={<IconTile icon={<Mail size={16} />} color="slate" size="sm" />}>
            <Stack gap="xs">
              <Text size="sm">
                <strong>Sam Cole</strong> · email · yesterday
              </Text>
              <Text size="sm" tone="muted">
                Sent the updated proposal.
              </Text>
            </Stack>
          </Timeline.Item>
          <Timeline.Item node={<Avatar name="Priya Nair" size="sm" />}>
            <Text size="sm">
              <strong>Priya Nair</strong> · created · 3d ago
            </Text>
          </Timeline.Item>
        </Timeline>
      </Example>

      <Example
        title="Compact (dot nodes — sidebar widget)"
        description="compact tightens the gutter, node box, and spacing; pair with small Dot nodes for a dense activity widget."
        code={`<Timeline compact>
  <Timeline.Item node={<Dot tone="info" />}>
    <Text size="sm">Renewal confirmed</Text>
    <Text size="xs" tone="muted">2h ago</Text>
  </Timeline.Item>
  …
</Timeline>`}
      >
        <div style={{ maxWidth: 260 }}>
          <Timeline compact>
            <Timeline.Item node={<Dot tone="info" />}>
              <Text size="sm">Renewal confirmed</Text>
              <Text size="xs" tone="muted">
                2h ago
              </Text>
            </Timeline.Item>
            <Timeline.Item node={<Dot tone="success" />}>
              <Text size="sm">Moved to Negotiation</Text>
              <Text size="xs" tone="muted">
                5h ago
              </Text>
            </Timeline.Item>
            <Timeline.Item node={<Dot tone="purple" />}>
              <Text size="sm">Proposal sent</Text>
              <Text size="xs" tone="muted">
                yesterday
              </Text>
            </Timeline.Item>
          </Timeline>
        </div>
      </Example>
    </DemoLayout>
  );
}
