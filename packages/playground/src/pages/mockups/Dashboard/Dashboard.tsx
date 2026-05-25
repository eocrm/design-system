import { ArrowUpRight, DollarSign, UserPlus, Briefcase } from 'lucide-react';
import {
  Card,
  Stack,
  Cluster,
  Grid,
  Avatar,
  Badge,
  Button,
  Link,
  Title,
  Text,
} from '@eocrm/design-system';
import { contacts, deals } from '../../../data/mock';
import { CrossLinks } from '../../shared/CrossLinks';

const stats = [
  {
    label: 'Open deals',
    value: '32',
    delta: '+4 this week',
    deltaTone: 'success' as const,
    icon: Briefcase,
  },
  {
    label: 'Pipeline value',
    value: '$284,500',
    delta: '+12%',
    deltaTone: 'success' as const,
    icon: DollarSign,
  },
  {
    label: 'New contacts',
    value: '18',
    delta: '+3 today',
    deltaTone: 'info' as const,
    icon: UserPlus,
  },
];

const activity = [
  {
    who: 'Priya Shah',
    what: 'replied to your email',
    when: '12m ago',
    target: 'Acme team plan upgrade',
  },
  {
    who: 'Jordan Park',
    what: 'moved a deal to Proposal',
    when: '1h ago',
    target: 'Multi-region rollout',
  },
  { who: 'Diana Okafor', what: 'booked a demo', when: '3h ago', target: 'Globex' },
  { who: 'Sam Chen', what: 'added a note on', when: 'Yesterday', target: 'Pilot conversion' },
  { who: 'Maya Owens', what: 'created a deal', when: '2d ago', target: 'Add-on: API gateway' },
];

export function Dashboard() {
  const upcoming = deals.filter((d) => d.stage !== 'won').slice(0, 4);

  return (
    <Stack gap="lg">
      <Cluster justify="between" align="end" gap="md">
        <Stack gap="xs">
          <Title order={1}>Dashboard</Title>
          <Text size="lg" tone="muted">
            Good morning, Alex. Here's where your pipeline stands.
          </Text>
        </Stack>
        <Button>
          <UserPlus size={14} /> Add contact
        </Button>
      </Cluster>

      <Grid columns={3} gap="md">
        {stats.map(({ label, value, delta, deltaTone, icon: Icon }) => (
          <Card key={label} padding="md" tone="accent">
            <Cluster justify="between" align="start" gap="md" wrap={false}>
              <Stack gap="xs">
                <Text as="span" size="sm" tone="muted" weight="medium">
                  {label}
                </Text>
                <Text as="span" size="lg" weight="semibold">
                  {value}
                </Text>
                <Badge tone={deltaTone}>
                  <ArrowUpRight size={10} /> {delta}
                </Badge>
              </Stack>
              {/* TODO: replace when <StatTile> ships — see components/TODO.md */}
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 'var(--size-md)',
                  height: 'var(--size-md)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-accent-subtle-bg)',
                  color: 'var(--color-accent)',
                }}
              >
                <Icon size={16} />
              </div>
            </Cluster>
          </Card>
        ))}
      </Grid>

      <Grid columns={2} gap="md">
        <Card>
          <Card.Header
            headerLevel="h2"
            action={
              <Link href="#" onClick={(e) => e.preventDefault()}>
                View all
              </Link>
            }
          >
            Deals needing attention
          </Card.Header>
          <Card.List>
            {upcoming.map((d) => (
              <Card.ListRow key={d.id}>
                <Stack gap="xs">
                  <Cluster gap="sm">
                    <Text as="span" weight="medium">
                      {d.title}
                    </Text>
                    {d.tags.map((t) => (
                      <Badge key={t.label} tone={t.tone}>
                        {t.label}
                      </Badge>
                    ))}
                  </Cluster>
                  <Text as="span" size="sm" tone="subtle">
                    {d.company} · ${d.amount.toLocaleString()}
                  </Text>
                </Stack>
                <Avatar name={d.owner} size="sm" />
              </Card.ListRow>
            ))}
          </Card.List>
        </Card>

        <Card>
          <Card.Header headerLevel="h2">Recent activity</Card.Header>
          <Card.List>
            {activity.map((a, i) => (
              <Card.ListRow key={i}>
                <Cluster gap="sm" wrap={false} align="start">
                  <Avatar name={a.who} size="sm" />
                  <Stack gap="xs">
                    {/* Inner Text on `a.target` is intentional — re-tone an inline run inside a sentence without raw style. Inner needs explicit size="sm" so it doesn't pop to its default md. */}
                    <Text as="span" size="sm" tone="muted">
                      <strong>{a.who}</strong> {a.what}{' '}
                      <Text as="span" size="sm" tone="accent">
                        {a.target}
                      </Text>
                    </Text>
                    <Text as="span" size="sm" tone="subtle">
                      {a.when}
                    </Text>
                  </Stack>
                </Cluster>
              </Card.ListRow>
            ))}
          </Card.List>
        </Card>
      </Grid>

      <Card padding="md">
        <Stack gap="md">
          <Title order={2} size="md">
            Recent contacts
          </Title>
          <Grid minColumnWidth="220px" gap="sm">
            {contacts.slice(0, 4).map((c) => (
              <Cluster key={c.id} gap="sm" wrap={false} align="center">
                <Avatar name={c.name} size="md" />
                <Stack gap="xs">
                  <Text as="span" weight="medium">
                    {c.name}
                  </Text>
                  <Text as="span" size="sm" tone="subtle">
                    {c.title}
                  </Text>
                </Stack>
              </Cluster>
            ))}
          </Grid>
        </Stack>
      </Card>

      <CrossLinks kind="mockup" slug="dashboard" />
    </Stack>
  );
}
