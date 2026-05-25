import { useState, type ReactNode } from 'react';
import { useParams, Link as RouterLink, Navigate } from 'react-router-dom';
import { Mail, Phone, MoreHorizontal, Building, MapPin } from 'lucide-react';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Cluster,
  DropdownMenu,
  Grid,
  Link,
  PageHeader,
  Stack,
  Tabs,
  Text,
  Title,
} from '@eocrm/design-system';
import { getContact, statusLabel, statusTone } from '../../../data/mock';
import { CrossLinks } from '../../shared/CrossLinks';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity', count: 12 },
  { id: 'deals', label: 'Deals', count: 2 },
  { id: 'notes', label: 'Notes', count: 4 },
];

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const contact = id ? getContact(id) : undefined;
  const [activeTab, setActiveTab] = useState('overview');

  if (!contact) return <Navigate to="/mockups/contacts" replace />;

  return (
    <Stack gap="lg">
      <Breadcrumb>
        <Breadcrumb.Item as={RouterLink} to="/mockups/contacts">
          Contacts
        </Breadcrumb.Item>
        <Breadcrumb.Item>{contact.name}</Breadcrumb.Item>
      </Breadcrumb>

      <PageHeader borderBottom={false}>
        <PageHeader.Aside>
          <Avatar name={contact.name} size="lg" />
        </PageHeader.Aside>
        <PageHeader.Title>{contact.name}</PageHeader.Title>
        <PageHeader.Subtitle>
          {contact.title} · {contact.company}
        </PageHeader.Subtitle>
        <PageHeader.Meta>
          <Badge tone={statusTone[contact.status]}>{statusLabel[contact.status]}</Badge>
        </PageHeader.Meta>
        <PageHeader.Actions>
          <Button variant="secondary">
            <Mail size={14} /> Email
          </Button>
          <Button variant="secondary">
            <Phone size={14} /> Call
          </Button>
          <Button>Edit</Button>
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="ghost" iconOnly aria-label="More">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item onSelect={() => {}}>Add to list</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Log a call</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Create deal</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={() => {}}>Merge contact…</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Archive</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={() => {}} tone="danger">
                Delete contact
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </PageHeader.Actions>
      </PageHeader>

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <Grid columns={2} gap="md">
          <Stack gap="lg">
            <Card>
              <Card.Header headerLevel="h2">About</Card.Header>
              <Card.List>
                <Field label="Email" value={contact.email} icon={<Mail size={14} />} />
                <Field label="Phone" value="+1 (415) 555-0142" icon={<Phone size={14} />} />
                <Field label="Company" value={contact.company} icon={<Building size={14} />} />
                <Field label="Location" value="San Francisco, CA" icon={<MapPin size={14} />} />
              </Card.List>
            </Card>

            <Card>
              <Card.Header
                headerLevel="h2"
                action={
                  <Link as={RouterLink} to="/mockups/contacts">
                    View all
                  </Link>
                }
              >
                Recent activity
              </Card.Header>
              <Card.List>
                <TimelineItem who="Alex Rivera" when="2h ago">
                  Sent{' '}
                  <Text as="span" tone="accent">
                    Q3 renewal proposal
                  </Text>{' '}
                  to {contact.name}.
                </TimelineItem>
                <TimelineItem who={contact.name} when="Yesterday">
                  Replied to thread about pricing.
                </TimelineItem>
                <TimelineItem who="Jordan Park" when="3d ago">
                  Updated company info on {contact.company}.
                </TimelineItem>
                <TimelineItem who="Alex Rivera" when="1w ago">
                  Logged a call — discussed onboarding timeline.
                </TimelineItem>
              </Card.List>
            </Card>
          </Stack>

          <Stack gap="lg">
            <Card padding="md">
              <Stack gap="sm">
                <Title order={2} size="md">
                  Owner
                </Title>
                <Cluster gap="sm" align="center">
                  <Avatar name={contact.owner} size="md" />
                  <Stack gap="xs">
                    <Text as="span" weight="medium">
                      {contact.owner}
                    </Text>
                    <Text as="span" size="sm" tone="muted">
                      Account Executive
                    </Text>
                  </Stack>
                </Cluster>
              </Stack>
            </Card>

            <Card padding="md">
              <Stack gap="sm">
                <Title order={2} size="md">
                  Tags
                </Title>
                <Cluster gap="xs">
                  <Badge tone="purple">Enterprise</Badge>
                  <Badge tone="info">Pipeline 2026</Badge>
                  <Badge tone="success">Champion</Badge>
                </Cluster>
              </Stack>
            </Card>

            <Card>
              <Card.Header headerLevel="h2">Open deals</Card.Header>
              <Card.List>
                <Card.ListRow>
                  <Stack gap="xs">
                    <Text as="span" size="sm" weight="medium">
                      Acme team plan upgrade
                    </Text>
                    <Text as="span" size="sm" tone="muted">
                      $12,000 · Lead
                    </Text>
                  </Stack>
                </Card.ListRow>
                <Card.ListRow>
                  <Stack gap="xs">
                    <Text as="span" size="sm" weight="medium">
                      Annual renewal
                    </Text>
                    <Text as="span" size="sm" tone="muted">
                      $18,000 · Qualified
                    </Text>
                  </Stack>
                </Card.ListRow>
              </Card.List>
            </Card>
          </Stack>
        </Grid>
      )}

      {activeTab !== 'overview' && (
        <Card padding="lg">
          <Text tone="muted" align="center">
            <Text as="span" weight="semibold">
              {tabs.find((t) => t.id === activeTab)?.label}
            </Text>{' '}
            tab content would render here. This is a demo — only Overview is populated.
          </Text>
        </Card>
      )}

      <CrossLinks kind="mockup" slug="contact-detail" />
    </Stack>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <Card.ListRow>
      <Text as="span" size="sm" tone="muted" weight="medium">
        {label}
      </Text>
      <Cluster gap="sm" align="center" wrap={false}>
        {icon && (
          <Text as="span" tone="subtle">
            {icon}
          </Text>
        )}
        <Text as="span" size="sm" tone="muted">
          {value}
        </Text>
      </Cluster>
    </Card.ListRow>
  );
}

function TimelineItem({
  who,
  when,
  children,
}: {
  who: string;
  when: string;
  children: ReactNode;
}) {
  return (
    <Card.ListRow>
      <Cluster gap="sm" align="start" wrap={false}>
        <Avatar name={who} size="sm" />
        <Stack gap="xs">
          <Text as="span" size="sm" tone="muted">
            <Text as="span" weight="semibold">
              {who}
            </Text>{' '}
            {children}
          </Text>
          <Text as="span" size="xs" tone="subtle">
            {when}
          </Text>
        </Stack>
      </Cluster>
    </Card.ListRow>
  );
}
