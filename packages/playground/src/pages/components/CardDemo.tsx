import { Card } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Avatar } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Link } from '@eocrm/design-system';
import { Constrain } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function CardDemo() {
  return (
    <DemoLayout
      name="Card"
      description="A bordered container for grouping related content. Used for stat panels, list rows, info blocks. Do not nest cards inside cards."
      files={getComponentFiles('Card')}
      componentName="Card"
    >
      <Example
        title="Padding sizes"
        description="Four padding options. Use none when the card contains a table or list that should bleed to the card edges."
        code={`import { Card, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
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
  );
}`}
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
        title="Fill a bounded cell"
        description="Use fill when a Card should occupy the full height of a stretched Grid, Sortable, or DashboardCanvas cell. It also allows the Card to shrink safely in narrow spans."
        code={`import { Card, Constrain } from '@eocrm/design-system';

export function Demo() {
  return (
    <Constrain height="xs" maxWidth="sm">
      <Card fill>Full-height widget card</Card>
    </Constrain>
  );
}`}
      >
        <Constrain height="xs" maxWidth="sm">
          <Card fill>Full-height widget card</Card>
        </Constrain>
      </Example>

      <Example
        title="Fixed header with scrolling body"
        description="Combine fill with Card.Body scroll inside a definite-height parent. Card owns the internal flex and minimum-height chain, so the header stays fixed while only the padded body scrolls."
        code={`import { Card, Constrain, Stack } from '@eocrm/design-system';

const stages = [
  'New lead',
  'Qualification',
  'Discovery',
  'Proposal',
  'Negotiation',
  'Legal review',
  'Verbal commitment',
  'Closed won',
];

export function Demo() {
  return (
    <Constrain height="sm" maxWidth="sm">
      <Card fill>
        <Card.Header>Pipeline stages</Card.Header>
        <Card.Body scroll>
          <Stack gap="md">
            {stages.map((stage, index) => (
              <div key={stage}>
                <strong>{stage}</strong>
                <div style={{ color: 'var(--color-fg-muted)' }}>
                  {index + 2} active deals
                </div>
              </div>
            ))}
          </Stack>
        </Card.Body>
      </Card>
    </Constrain>
  );
}`}
      >
        <Constrain height="sm" maxWidth="sm">
          <Card fill>
            <Card.Header>Pipeline stages</Card.Header>
            <Card.Body scroll>
              <Stack gap="md">
                {[
                  'New lead',
                  'Qualification',
                  'Discovery',
                  'Proposal',
                  'Negotiation',
                  'Legal review',
                  'Verbal commitment',
                  'Closed won',
                ].map((stage, index) => (
                  <div key={stage}>
                    <strong>{stage}</strong>
                    <div style={{ color: 'var(--color-fg-muted)' }}>{index + 2} active deals</div>
                  </div>
                ))}
              </Stack>
            </Card.Body>
          </Card>
        </Constrain>
      </Example>

      <Example
        title="With content"
        description="The most common shape: a heading, some details, an action row at the bottom."
        code={`import { Badge, Button, Card, Cluster, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
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
  );
}`}
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
        code={`import { Card, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
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
  );
}`}
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
        code={`import { Avatar, Card } from '@eocrm/design-system';

export function Demo() {
  return (
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
  );
}`}
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
        description="The canonical Dashboard pattern. No padding prop needed — when Card.Header / Card.List / Card.ListRow appear as direct children, padding auto-defaults to 'none' so the header and rows bleed to the card edge."
        code={`import { Avatar, Badge, Card, Cluster, Link, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Card style={{ maxWidth: 480 }}>
      <Card.Header
        action={
          <Link href="#" onClick={(e) => e.preventDefault()}>
            View all
          </Link>
        }
      >
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
  );
}`}
      >
        <Card style={{ maxWidth: 480 }}>
          <Card.Header
            action={
              <Link href="#" onClick={(e) => e.preventDefault()}>
                View all
              </Link>
            }
          >
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
        code={`import { Avatar, Card, Cluster, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Card style={{ maxWidth: 480 }}>
      <Card.Header>Recent activity</Card.Header>
      <Card.List>
        <Card.ListRow>
          <Cluster gap="sm" wrap={false} align="start">
            <Avatar name="Priya Shah" size="sm" />
            <Stack gap="xs">
              <span style={{ fontSize: 'var(--font-size-sm)' }}>
                <strong>Priya Shah</strong> replied to your email
              </span>
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
              <span style={{ fontSize: 'var(--font-size-sm)' }}>
                <strong>Jordan Park</strong> moved a deal to Proposal
              </span>
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
              <span style={{ fontSize: 'var(--font-size-sm)' }}>
                <strong>Diana Okafor</strong> booked a demo
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>
                3h ago
              </span>
            </Stack>
          </Cluster>
        </Card.ListRow>
      </Card.List>
    </Card>
  );
}`}
      >
        <Card style={{ maxWidth: 480 }}>
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
