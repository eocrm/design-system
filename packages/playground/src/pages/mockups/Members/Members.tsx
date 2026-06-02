import { useState } from 'react';
import { UserPlus, MoreHorizontal, MailPlus, Trash2 } from 'lucide-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Cluster,
  Constrain,
  DropdownMenu,
  IconTile,
  Input,
  Link,
  Page,
  PageHeader,
  PersonDisplay,
  Progress,
  Stack,
  Table,
  Tabs,
  Text,
} from '@eocrm/design-system';
import { members, pendingInvites, roleTone, roleLabel, seatLimit } from '../../../data/mock';
import { CrossLinks } from '../../shared/CrossLinks';

export function Members() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const seatsUsed = members.length;

  const tabs = [
    { id: 'active', label: 'Active', count: members.length },
    { id: 'invites', label: 'Invitations', count: pendingInvites.length },
  ];

  return (
    <Page>
      <PageHeader>
        <PageHeader.Title>Members</PageHeader.Title>
        <PageHeader.Subtitle>People with access to your Orbit CRM workspace.</PageHeader.Subtitle>
        <PageHeader.Actions>
          <Button>
            <UserPlus size={14} /> Invite members
          </Button>
        </PageHeader.Actions>
      </PageHeader>

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
          <Cluster wrap={false} gap="sm">
            <Constrain flex="grow">
              <Progress value={seatsUsed} max={seatLimit} size="sm" />
            </Constrain>
            <Button variant="secondary" size="sm">
              Upgrade plan
            </Button>
          </Cluster>
        </Cluster>
      </Card>

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'active' && (
        <Stack gap="md">
          <Constrain maxWidth="sm">
            <Input placeholder="Search members by name or email…" />
          </Constrain>
          <Card padding="none">
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
                        <PersonDisplay.Name>
                          <Link as={RouterLink} variant="subtle" to={`/mockups/members/${m.id}`}>
                            {m.name}
                          </Link>
                        </PersonDisplay.Name>
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
                          <DropdownMenu.Item onSelect={() => navigate(`/mockups/members/${m.id}`)}>
                            View profile
                          </DropdownMenu.Item>
                          <DropdownMenu.Sub>
                            <DropdownMenu.SubTrigger>Change role</DropdownMenu.SubTrigger>
                            <DropdownMenu.SubContent>
                              <DropdownMenu.RadioGroup value={m.role} onValueChange={() => {}}>
                                <DropdownMenu.RadioItem value="admin">Admin</DropdownMenu.RadioItem>
                                <DropdownMenu.RadioItem value="member">
                                  Member
                                </DropdownMenu.RadioItem>
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
          </Card>
        </Stack>
      )}

      {activeTab === 'invites' && (
        <Card padding="none">
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
                      <IconTile color="amber" shape="circle" icon={<MailPlus size={14} />} />
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
        </Card>
      )}

      <CrossLinks kind="mockup" slug="members" />
    </Page>
  );
}
