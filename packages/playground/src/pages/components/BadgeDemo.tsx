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
        title="Sizes"
        description="Two emphases. md (20px, default) is the loud label pill — uppercase and tracked. sm (16px) is the quiet inline tag — case as-typed, no tracking. Use sm in dense table cells, compact toolbars, or anywhere the uppercase treatment shouts next to body copy."
        code={`// md (default), all tones
<Badge tone="neutral">Neutral</Badge>
<Badge tone="info">Info</Badge>
<Badge tone="success">Success</Badge>
<Badge tone="warning">Warning</Badge>
<Badge tone="danger">Danger</Badge>
<Badge tone="purple">Purple</Badge>

// sm, all tones
<Badge size="sm" tone="neutral">Neutral</Badge>
<Badge size="sm" tone="info">Info</Badge>
<Badge size="sm" tone="success">Success</Badge>
<Badge size="sm" tone="warning">Warning</Badge>
<Badge size="sm" tone="danger">Danger</Badge>
<Badge size="sm" tone="purple">Purple</Badge>`}
      >
        <Stack gap="md">
          <Cluster gap="sm" align="center">
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="info">Info</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
            <Badge tone="purple">Purple</Badge>
          </Cluster>
          <Cluster gap="sm" align="center">
            <Badge size="sm" tone="neutral">
              Neutral
            </Badge>
            <Badge size="sm" tone="info">
              Info
            </Badge>
            <Badge size="sm" tone="success">
              Success
            </Badge>
            <Badge size="sm" tone="warning">
              Warning
            </Badge>
            <Badge size="sm" tone="danger">
              Danger
            </Badge>
            <Badge size="sm" tone="purple">
              Purple
            </Badge>
          </Cluster>
        </Stack>
      </Example>

      <Example
        title="Status dot"
        description={`Add dot="start" or dot="end" to render a small filled circle in the badge's text color. Useful when the dot is the primary status signal (Slack/GitHub-style online/offline indicators) and the label is supporting context. Works with every tone and both sizes.`}
        code={`// Dot at the start
<Badge tone="success" dot="start">Active</Badge>
<Badge tone="warning" dot="start">Pending</Badge>
<Badge tone="danger" dot="start">Failed</Badge>

// Dot at the end
<Badge tone="info" dot="end">Lead</Badge>

// Works at sm size too
<Badge size="sm" tone="success" dot="start">Online</Badge>
<Badge size="sm" tone="neutral" dot="start">Away</Badge>`}
      >
        <Stack gap="md">
          <Cluster gap="sm" align="center">
            <Badge tone="neutral" dot="start">
              Neutral
            </Badge>
            <Badge tone="info" dot="start">
              Info
            </Badge>
            <Badge tone="success" dot="start">
              Success
            </Badge>
            <Badge tone="warning" dot="start">
              Warning
            </Badge>
            <Badge tone="danger" dot="start">
              Danger
            </Badge>
            <Badge tone="purple" dot="start">
              Purple
            </Badge>
          </Cluster>
          <Cluster gap="sm" align="center">
            <Badge tone="neutral" dot="end">
              Neutral
            </Badge>
            <Badge tone="info" dot="end">
              Info
            </Badge>
            <Badge tone="success" dot="end">
              Success
            </Badge>
            <Badge tone="warning" dot="end">
              Warning
            </Badge>
            <Badge tone="danger" dot="end">
              Danger
            </Badge>
            <Badge tone="purple" dot="end">
              Purple
            </Badge>
          </Cluster>
          <Cluster gap="sm" align="center">
            <Badge size="sm" tone="success" dot="start">
              Online
            </Badge>
            <Badge size="sm" tone="warning" dot="start">
              Away
            </Badge>
            <Badge size="sm" tone="danger" dot="start">
              Offline
            </Badge>
            <Badge size="sm" tone="neutral" dot="start">
              Unknown
            </Badge>
          </Cluster>
        </Stack>
      </Example>

      <Example
        title="Stripe variant (rectangular with left stripe)"
        description={`variant="stripe" renders a rectangular block with a tone-colored 3px left stripe and a softly tinted body. No uppercase, no letter-spacing — reads as a category label rather than a loud status pill. Composes with all six existing tones.`}
        code={`<Badge variant="stripe" tone="info">Lead</Badge>
<Badge variant="stripe" tone="success">Active</Badge>
<Badge variant="stripe" tone="warning">Renewal due</Badge>
<Badge variant="stripe" tone="danger">Churned</Badge>
<Badge variant="stripe" tone="neutral">Archived</Badge>
<Badge variant="stripe" tone="purple">Enterprise</Badge>`}
      >
        <Cluster gap="sm" wrap>
          <Badge variant="stripe" tone="info">Lead</Badge>
          <Badge variant="stripe" tone="success">Active</Badge>
          <Badge variant="stripe" tone="warning">Renewal due</Badge>
          <Badge variant="stripe" tone="danger">Churned</Badge>
          <Badge variant="stripe" tone="neutral">Archived</Badge>
          <Badge variant="stripe" tone="purple">Enterprise</Badge>
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
