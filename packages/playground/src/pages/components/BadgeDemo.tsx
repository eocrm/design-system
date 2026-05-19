import { Badge } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Badge/Badge.tsx?raw';
import scssSource from '@lib-source/components/Badge/Badge.module.scss?raw';

export function BadgeDemo() {
  return (
    <DemoLayout
      name="Badge"
      description="Small inline pill for status, category, or count. Use semantic tones consistently — success means good, danger means problematic, etc."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Badge.tsx"
      scssFilename="Badge.module.scss"
      componentName="Badge"
    >
      <Example
        title="Tones"
        description="Six tones. neutral for generic tags, info for new/in-progress states, success for active/won, warning for at-risk/pending, danger for churned/blocked, purple for special categories like Enterprise."
        code={`<Badge tone="neutral">Neutral</Badge>
<Badge tone="info">Info</Badge>
<Badge tone="success">Success</Badge>
<Badge tone="warning">Warning</Badge>
<Badge tone="danger">Danger</Badge>
<Badge tone="purple">Purple</Badge>`}
      >
        <Cluster gap="sm">
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="purple">Purple</Badge>
        </Cluster>
      </Example>

      <Example
        title="Status patterns"
        description="The most common CRM usage: status pill on a contact, deal, or invitation."
        code={`// Contact statuses
<Badge tone="success">Active</Badge>
<Badge tone="info">Lead</Badge>
<Badge tone="danger">Churned</Badge>

// Member roles
<Badge tone="purple">Admin</Badge>
<Badge tone="info">Member</Badge>
<Badge tone="neutral">Guest</Badge>`}
      >
        <Stack gap="md">
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-fg-subtle)',
                marginBottom: 6,
              }}
            >
              Contact status
            </div>
            <Cluster gap="sm">
              <Badge tone="success">Active</Badge>
              <Badge tone="info">Lead</Badge>
              <Badge tone="danger">Churned</Badge>
            </Cluster>
          </div>
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-fg-subtle)',
                marginBottom: 6,
              }}
            >
              Member role
            </div>
            <Cluster gap="sm">
              <Badge tone="purple">Admin</Badge>
              <Badge tone="info">Member</Badge>
              <Badge tone="neutral">Guest</Badge>
            </Cluster>
          </div>
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-fg-subtle)',
                marginBottom: 6,
              }}
            >
              Deal stage
            </div>
            <Cluster gap="sm">
              <Badge tone="neutral">Lead</Badge>
              <Badge tone="info">Qualified</Badge>
              <Badge tone="warning">Proposal</Badge>
              <Badge tone="success">Won</Badge>
              <Badge tone="danger">Lost</Badge>
            </Cluster>
          </div>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
