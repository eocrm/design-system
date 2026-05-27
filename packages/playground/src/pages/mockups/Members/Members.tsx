import { useState } from 'react';
import { UserPlus, MoreHorizontal, MailPlus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Cluster,
  DropdownMenu,
  Input,
  PersonDisplay,
  Progress,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from '@eocrm/design-system';
import { members, pendingInvites, roleTone, roleLabel, seatLimit } from '../../../data/mock';
import { CrossLinks } from '../../shared/CrossLinks';

export function Members() {
  const [activeTab, setActiveTab] = useState('active');
  const seatsUsed = members.length;

  const tabs = [
    { id: 'active', label: 'Active', count: members.length },
    { id: 'invites', label: 'Invitations', count: pendingInvites.length },
  ];

  return (
    <Stack gap="lg">
      <Cluster justify="between" align="end" gap="md">
        <Stack gap="xs">
          <Title order={1}>Members</Title>
          <Text tone="muted">People with access to your Orbit CRM workspace.</Text>
        </Stack>
        <Button>
          <UserPlus size={14} /> Invite members
        </Button>
      </Cluster>

      <Card padding="md">
        <Cluster justify="between" align="center" gap="md" wrap={false}>
          <Stack gap="xs">
            <Text as="span" size="sm" tone="muted" weight="medium">
              Seats used
            </Text>
            <Text as="span" size="xl" weight="semibold">
              {seatsUsed}{' '}
              <Text as="span" size="xl" tone="subtle" weight="regular">
                of {seatLimit}
              </Text>
            </Text>
            <Text as="span" size="sm" tone="subtle">
              {seatLimit - seatsUsed} seats remaining on your current plan.
            </Text>
          </Stack>
          {/* TODO: replace when <Box width> ships — see components/TODO.md.
              Progress is width:100% of parent; inside a Cluster (no defined
              width) it collapses to 0, so the bar wrapper needs explicit
              min-width to render at the original 320px target. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              minWidth: '320px',
            }}
          >
            <Progress value={seatsUsed} max={seatLimit} size="sm" />
            <Button variant="secondary" size="sm">
              Upgrade plan
            </Button>
          </div>
        </Cluster>
      </Card>

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'active' && (
        <Stack gap="md">
          <Input placeholder="Search members by name or email…" />
          <Table hover>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Job title</Table.HeaderCell>
                <Table.HeaderCell>Role</Table.HeaderCell>
                <Table.HeaderCell>Last active</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {members.map((m) => (
                <Table.Row key={m.id}>
                  <Table.Cell>
                    <PersonDisplay size="md">
                      <PersonDisplay.Avatar
                        name={m.name}
                        status={m.online ? 'online' : undefined}
                      />
                      <PersonDisplay.Name>{m.name}</PersonDisplay.Name>
                      <PersonDisplay.Description>{m.email}</PersonDisplay.Description>
                    </PersonDisplay>
                  </Table.Cell>
                  <Table.Cell>
                    <Text as="span" size="sm" tone="subtle">
                      {m.jobTitle}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge tone={roleTone[m.role]}>{roleLabel[m.role]}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text as="span" size="sm" tone="subtle">
                      {m.lastActive}
                    </Text>
                  </Table.Cell>
                  <Table.Cell align="end">
                    <DropdownMenu>
                      <DropdownMenu.Trigger>
                        <Button variant="ghost" size="sm" iconOnly aria-label="More">
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end">
                        <DropdownMenu.Item onSelect={() => {}}>View profile</DropdownMenu.Item>
                        <DropdownMenu.Sub>
                          <DropdownMenu.SubTrigger>Change role</DropdownMenu.SubTrigger>
                          <DropdownMenu.SubContent>
                            <DropdownMenu.RadioGroup value={m.role} onValueChange={() => {}}>
                              <DropdownMenu.RadioItem value="admin">Admin</DropdownMenu.RadioItem>
                              <DropdownMenu.RadioItem value="member">Member</DropdownMenu.RadioItem>
                              <DropdownMenu.RadioItem value="guest">Guest</DropdownMenu.RadioItem>
                            </DropdownMenu.RadioGroup>
                          </DropdownMenu.SubContent>
                        </DropdownMenu.Sub>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item onSelect={() => {}} tone="danger">
                          Remove member
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Stack>
      )}

      {activeTab === 'invites' && (
        <Table hover>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Role</Table.HeaderCell>
              <Table.HeaderCell>Invited by</Table.HeaderCell>
              <Table.HeaderCell>Sent</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {pendingInvites.map((inv) => (
              <Table.Row key={inv.id}>
                <Table.Cell>
                  <Cluster gap="sm" align="center" wrap={false}>
                    {/* TODO: replace when <StatTile> ships (circular variant) — see components/TODO.md */}
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 'var(--size-md)',
                        height: 'var(--size-md)',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-badge-warning-bg)',
                        color: 'var(--color-badge-warning-fg)',
                      }}
                    >
                      <MailPlus size={14} />
                    </span>
                    <Text as="span" weight="medium">
                      {inv.email}
                    </Text>
                    <Badge tone="warning">Pending</Badge>
                  </Cluster>
                </Table.Cell>
                <Table.Cell>
                  <Badge tone={roleTone[inv.role]}>{roleLabel[inv.role]}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <PersonDisplay size="sm">
                    <PersonDisplay.Avatar name={inv.invitedBy} />
                    <PersonDisplay.Name>{inv.invitedBy}</PersonDisplay.Name>
                  </PersonDisplay>
                </Table.Cell>
                <Table.Cell>
                  <Text as="span" size="sm" tone="subtle">
                    {inv.invitedAt}
                  </Text>
                </Table.Cell>
                <Table.Cell align="end">
                  <Cluster gap="xs" justify="end" wrap={false}>
                    <Button variant="ghost" size="sm">
                      Resend
                    </Button>
                    <Button variant="ghost" size="sm" iconOnly aria-label="Revoke invitation">
                      <Trash2 size={14} />
                    </Button>
                  </Cluster>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <CrossLinks kind="mockup" slug="members" />
    </Stack>
  );
}
