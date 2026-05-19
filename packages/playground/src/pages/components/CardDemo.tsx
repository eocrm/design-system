import { Card } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Avatar } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Card/Card.tsx?raw';
import scssSource from '@lib-source/components/Card/Card.module.scss?raw';

export function CardDemo() {
  return (
    <DemoLayout
      name="Card"
      description="A bordered container for grouping related content. Used for stat panels, list rows, info blocks. Do not nest cards inside cards."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Card.tsx"
      scssFilename="Card.module.scss"
      componentName="Card"
    >
      <Example
        title="Padding sizes"
        description="Four padding options. Use none when the card contains a table or list that should bleed to the card edges."
        code={`<Card padding="none">none</Card>
<Card padding="sm">sm</Card>
<Card padding="md">md (default)</Card>
<Card padding="lg">lg</Card>`}
      >
        <Cluster gap="sm" align="start">
          <Card padding="none" style={{ minWidth: 100, textAlign: 'center' }}>
            <div style={{ padding: 4 }}>none</div>
          </Card>
          <Card padding="sm" style={{ minWidth: 100 }}>
            sm
          </Card>
          <Card padding="md" style={{ minWidth: 100 }}>
            md
          </Card>
          <Card padding="lg" style={{ minWidth: 100 }}>
            lg
          </Card>
        </Cluster>
      </Example>

      <Example
        title="With content"
        description="The most common shape: a heading, some details, an action row at the bottom."
        code={`<Card padding="md">
  <Stack gap="md">
    <Cluster justify="between" align="start">
      <h3>Acme team plan upgrade</h3>
      <Badge tone="success">Won</Badge>
    </Cluster>
    <p>Closed $12,000 deal with Acme Inc.</p>
    <Cluster justify="end" gap="sm">
      <Button variant="secondary">Archive</Button>
      <Button>View deal</Button>
    </Cluster>
  </Stack>
</Card>`}
      >
        <Card padding="md" style={{ maxWidth: 480 }}>
          <Stack gap="md">
            <Cluster justify="between" align="start">
              <h3 style={{ margin: 0 }}>Acme team plan upgrade</h3>
              <Badge tone="success">Won</Badge>
            </Cluster>
            <p style={{ margin: 0, color: 'var(--color-fg-muted)' }}>
              Closed $12,000 deal with Acme Inc. Renewal scheduled for next year.
            </p>
            <Cluster justify="end" gap="sm">
              <Button variant="secondary">Archive</Button>
              <Button>View deal</Button>
            </Cluster>
          </Stack>
        </Card>
      </Example>

      <Example
        title="Padding=none with header + list"
        description="When the card contains a list or table, use padding='none' and let the inner sections control their own padding."
        code={`<Card padding="none">
  <div className={styles.cardHeader}>...</div>
  <ul className={styles.list}>...</ul>
</Card>`}
      >
        <Card padding="none" style={{ maxWidth: 480 }}>
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <strong>Owners</strong>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 13 }}>
              Manage
            </a>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {['Alex Rivera', 'Jordan Park', 'Sam Chen'].map((name) => (
              <li
                key={name}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  alignItems: 'center',
                }}
              >
                <Avatar name={name} size="sm" />
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </Card>
      </Example>
    </DemoLayout>
  );
}
