import { Card } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Avatar } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Link } from '@eocrm/design-system';
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
        title="Tone-coded cards (left stripe)"
        description="Five tones: accent / info / success / warning / danger. Each draws a 3px left-edge stripe in the tone color. The border-left is always reserved (transparent) so toggling tone never shifts layout."
        code={`<Card padding="md" tone="accent">Accent</Card>
<Card padding="md" tone="info">Info</Card>
<Card padding="md" tone="success">Success</Card>
<Card padding="md" tone="warning">Warning</Card>
<Card padding="md" tone="danger">Danger</Card>`}
      >
        <Cluster gap="sm" align="start" wrap>
          <Card padding="md" style={{ minWidth: 120 }} tone="accent">
            Accent
          </Card>
          <Card padding="md" style={{ minWidth: 120 }} tone="info">
            Info
          </Card>
          <Card padding="md" style={{ minWidth: 120 }} tone="success">
            Success
          </Card>
          <Card padding="md" style={{ minWidth: 120 }} tone="warning">
            Warning
          </Card>
          <Card padding="md" style={{ minWidth: 120 }} tone="danger">
            Danger
          </Card>
        </Cluster>
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

      <Example
        title="Section card: header + list body"
        description="The canonical Dashboard pattern — padding='none' so header and rows bleed to the card edge. Card.Header provides the title row with a right-aligned action; Card.List and Card.ListRow handle semantics and dividers."
        code={`<Card padding="none">
  <Card.Header action={<Link variant="muted">View all</Link>}>
    Deals needing attention
  </Card.Header>
  <Card.List>
    <Card.ListRow>
      <Stack gap="xs">
        <Cluster gap="sm">
          <span>Acme team plan upgrade</span>
          <Badge tone="warning">At risk</Badge>
        </Cluster>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>
          Acme Inc · $12,000
        </span>
      </Stack>
      <Avatar name="Alex Rivera" size="sm" />
    </Card.ListRow>
    <Card.ListRow>
      <Stack gap="xs">
        <Cluster gap="sm">
          <span>Multi-region rollout</span>
          <Badge tone="info">In progress</Badge>
        </Cluster>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>
          Globex · $28,500
        </span>
      </Stack>
      <Avatar name="Jordan Park" size="sm" />
    </Card.ListRow>
    <Card.ListRow>
      <Stack gap="xs">
        <span>Pilot conversion</span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>
          Initech · $6,200
        </span>
      </Stack>
      <Avatar name="Sam Chen" size="sm" />
    </Card.ListRow>
  </Card.List>
</Card>`}
      >
        <Card padding="none" style={{ maxWidth: 480 }}>
          <Card.Header action={<Link variant="muted">View all</Link>}>
            Deals needing attention
          </Card.Header>
          <Card.List>
            <Card.ListRow>
              <Stack gap="xs">
                <Cluster gap="sm">
                  <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                    Acme team plan upgrade
                  </span>
                  <Badge tone="warning">At risk</Badge>
                </Cluster>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>
                  Acme Inc · $12,000
                </span>
              </Stack>
              <Avatar name="Alex Rivera" size="sm" />
            </Card.ListRow>
            <Card.ListRow>
              <Stack gap="xs">
                <Cluster gap="sm">
                  <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                    Multi-region rollout
                  </span>
                  <Badge tone="info">In progress</Badge>
                </Cluster>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>
                  Globex · $28,500
                </span>
              </Stack>
              <Avatar name="Jordan Park" size="sm" />
            </Card.ListRow>
            <Card.ListRow>
              <Stack gap="xs">
                <span style={{ fontWeight: 'var(--font-weight-medium)' }}>Pilot conversion</span>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>
                  Initech · $6,200
                </span>
              </Stack>
              <Avatar name="Sam Chen" size="sm" />
            </Card.ListRow>
          </Card.List>
        </Card>
      </Example>

      <Example
        title="Header without action"
        description="When there's no navigation link, omit the action prop. The title still gets the bottom-border separator and proper heading semantics."
        code={`<Card padding="none">
  <Card.Header>Recent activity</Card.Header>
  <Card.List>
    <Card.ListRow>
      <Cluster gap="sm" wrap={false} align="start">
        <Avatar name="Priya Shah" size="sm" />
        <Stack gap="xs">
          <span><strong>Priya Shah</strong> replied to your email</span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>
            12m ago
          </span>
        </Stack>
      </Cluster>
    </Card.ListRow>
    <Card.ListRow>
      <Cluster gap="sm" wrap={false} align="start">
        <Avatar name="Jordan Park" size="sm" />
        <Stack gap="xs">
          <span><strong>Jordan Park</strong> moved a deal to Proposal</span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>
            1h ago
          </span>
        </Stack>
      </Cluster>
    </Card.ListRow>
    <Card.ListRow>
      <Cluster gap="sm" wrap={false} align="start">
        <Avatar name="Diana Okafor" size="sm" />
        <Stack gap="xs">
          <span><strong>Diana Okafor</strong> booked a demo</span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>
            3h ago
          </span>
        </Stack>
      </Cluster>
    </Card.ListRow>
  </Card.List>
</Card>`}
      >
        <Card padding="none" style={{ maxWidth: 480 }}>
          <Card.Header>Recent activity</Card.Header>
          <Card.List>
            {[
              { who: 'Priya Shah', what: 'replied to your email', when: '12m ago' },
              { who: 'Jordan Park', what: 'moved a deal to Proposal', when: '1h ago' },
              { who: 'Diana Okafor', what: 'booked a demo', when: '3h ago' },
            ].map((a) => (
              <Card.ListRow key={a.who}>
                <Cluster gap="sm" wrap={false} align="start">
                  <Avatar name={a.who} size="sm" />
                  <Stack gap="xs">
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>
                      <strong>{a.who}</strong> {a.what}
                    </span>
                    <span
                      style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}
                    >
                      {a.when}
                    </span>
                  </Stack>
                </Cluster>
              </Card.ListRow>
            ))}
          </Card.List>
        </Card>
      </Example>
    </DemoLayout>
  );
}
