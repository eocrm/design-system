import { ArrowUpRight, DollarSign, UserPlus, Briefcase } from 'lucide-react';
import { Card } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Avatar } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { contacts, deals } from '../../../data/mock';
import styles from './Dashboard.module.scss';
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
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Good morning, Alex. Here's where your pipeline stands.</p>
        </div>
        <Button>
          <UserPlus size={14} /> Add contact
        </Button>
      </Cluster>

      <div className={styles.statsGrid}>
        {stats.map(({ label, value, delta, deltaTone, icon: Icon }) => (
          <Card key={label} padding="md" tone="accent">
            <Cluster justify="between" align="start" gap="md" wrap={false}>
              <Stack gap="xs">
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statValue}>{value}</span>
                <Badge tone={deltaTone}>
                  <ArrowUpRight size={10} /> {delta}
                </Badge>
              </Stack>
              <div className={styles.statIcon}>
                <Icon size={16} />
              </div>
            </Cluster>
          </Card>
        ))}
      </div>

      <div className={styles.twoCol}>
        <Card padding="none">
          <Card.Header
            headerLevel="h2"
            action={
              <a href="#" className={styles.cardLink} onClick={(e) => e.preventDefault()}>
                View all
              </a>
            }
          >
            Deals needing attention
          </Card.Header>
          <Card.List>
            {upcoming.map((d) => (
              <Card.ListRow key={d.id}>
                <Stack gap="xs">
                  <Cluster gap="sm">
                    <span className={styles.listRowTitle}>{d.title}</span>
                    {d.tags.map((t) => (
                      <Badge key={t.label} tone={t.tone}>
                        {t.label}
                      </Badge>
                    ))}
                  </Cluster>
                  <span className={styles.listRowMeta}>
                    {d.company} · ${d.amount.toLocaleString()}
                  </span>
                </Stack>
                <Avatar name={d.owner} size="sm" />
              </Card.ListRow>
            ))}
          </Card.List>
        </Card>

        <Card padding="none">
          <Card.Header headerLevel="h2">Recent activity</Card.Header>
          <Card.List>
            {activity.map((a, i) => (
              <Card.ListRow key={i}>
                <Cluster gap="sm" wrap={false} align="start">
                  <Avatar name={a.who} size="sm" />
                  <Stack gap="xs">
                    <span className={styles.activityLine}>
                      <strong>{a.who}</strong> {a.what}{' '}
                      <span className={styles.activityTarget}>{a.target}</span>
                    </span>
                    <span className={styles.listRowMeta}>{a.when}</span>
                  </Stack>
                </Cluster>
              </Card.ListRow>
            ))}
          </Card.List>
        </Card>
      </div>

      <Card padding="md">
        <h2 className={styles.cardTitle}>Recent contacts</h2>
        <div className={styles.contactGrid}>
          {contacts.slice(0, 4).map((c) => (
            <Cluster key={c.id} gap="sm" wrap={false} align="center">
              <Avatar name={c.name} size="md" />
              <Stack gap="xs">
                <span className={styles.contactName}>{c.name}</span>
                <span className={styles.listRowMeta}>{c.title}</span>
              </Stack>
            </Cluster>
          ))}
        </div>
      </Card>

      <CrossLinks kind="mockup" slug="dashboard" />
    </Stack>
  );
}
