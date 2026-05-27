import { ArrowUpRight, DollarSign, UserPlus, Briefcase } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  Stack,
  Cluster,
  Grid,
  Avatar,
  Badge,
  Button,
  Link,
  PageHeader,
  PersonDisplay,
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
      <PageHeader>
        <PageHeader.Title>Dashboard</PageHeader.Title>
        <PageHeader.Subtitle>
          Good morning, Alex. Here's where your pipeline stands.
        </PageHeader.Subtitle>
        <PageHeader.Actions>
          <Button>
            <UserPlus size={14} /> Add contact
          </Button>
        </PageHeader.Actions>
      </PageHeader>

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
              <Link as={RouterLink} to="/mockups/deals">
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
                <PersonDisplay size="sm">
                  <PersonDisplay.Avatar name={a.who} />
                  <PersonDisplay.Name>{a.who}</PersonDisplay.Name>
                  <PersonDisplay.Description>
                    {a.what}{' '}
                    <Text as="span" size="xs" tone="accent">
                      {a.target}
                    </Text>
                    {' · '}
                    {a.when}
                  </PersonDisplay.Description>
                </PersonDisplay>
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
              <PersonDisplay key={c.id} size="md">
                <PersonDisplay.Avatar name={c.name} />
                <PersonDisplay.Name>{c.name}</PersonDisplay.Name>
                <PersonDisplay.Description>{c.title}</PersonDisplay.Description>
              </PersonDisplay>
            ))}
          </Grid>
        </Stack>
      </Card>

      <CrossLinks kind="mockup" slug="dashboard" />
    </Stack>
  );
}
