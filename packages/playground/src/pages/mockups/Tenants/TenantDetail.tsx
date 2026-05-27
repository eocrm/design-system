import { useState } from 'react';
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom';
import { Edit3, MoreHorizontal, Pause, Play, Plus, RotateCw, X } from 'lucide-react';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Cluster,
  Code,
  DefinitionList,
  DropdownMenu,
  EmptyState,
  Grid,
  Page,
  PageHeader,
  PersonDisplay,
  Progress,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
  Tooltip,
} from '@eocrm/design-system';
import {
  formatGb,
  getTenant,
  getTenantInvitations,
  getTenantMembers,
  invitationState,
  relativeTime,
  roleLabel,
  roleTone,
  stateLabel,
  stateTone,
  usagePercent,
  type Tenant,
} from '../../../data/tenants';
import { CrossLinks } from '../../shared/CrossLinks';

function fullDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function PrimaryAction({ state }: { state: Tenant['state'] }) {
  switch (state) {
    case 'active':
      return (
        <Button variant="danger">
          <Pause size={14} /> Suspend
        </Button>
      );
    case 'suspended':
      return (
        <Button>
          <Play size={14} /> Unsuspend
        </Button>
      );
    case 'failed':
    case 'queued':
    case 'pending':
      return (
        <Button>
          <RotateCw size={14} /> Retry provisioning
        </Button>
      );
    case 'provisioning':
      // No primary action while provisioning is in-flight.
      return null;
  }
}

function SystemInfoPanel({ tenant }: { tenant: Tenant }) {
  const pct = usagePercent(tenant.usedSpaceGb, tenant.dbSizeGb);
  const usageTone: 'default' | 'warning' | 'danger' =
    pct == null ? 'default' : pct > 90 ? 'danger' : pct > 75 ? 'warning' : 'default';

  return (
    <Grid minColumnWidth="340px" gap="md">
      <Card padding="md">
        <Stack gap="sm">
          <Title order={3} size="md">
            Provisioning
          </Title>
          <DefinitionList layout="horizontal" spacing="sm">
            <DefinitionList.Item>
              <DefinitionList.Term>State</DefinitionList.Term>
              <DefinitionList.Description>
                <Badge tone={stateTone[tenant.state]} size="sm">
                  {stateLabel[tenant.state]}
                </Badge>
              </DefinitionList.Description>
            </DefinitionList.Item>
            {tenant.stateReason && (
              <DefinitionList.Item>
                <DefinitionList.Term>Reason</DefinitionList.Term>
                <DefinitionList.Description>
                  <Text size="sm">{tenant.stateReason}</Text>
                </DefinitionList.Description>
              </DefinitionList.Item>
            )}
            <DefinitionList.Item>
              <DefinitionList.Term>App version</DefinitionList.Term>
              <DefinitionList.Description>
                {tenant.appVersion ? (
                  <Code>{tenant.appVersion}</Code>
                ) : (
                  <Text as="span" size="sm" tone="muted">
                    —
                  </Text>
                )}
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Last migration</DefinitionList.Term>
              <DefinitionList.Description>
                <Text as="span" size="sm" tone={tenant.lastMigrationAt ? 'default' : 'muted'}>
                  {fullDate(tenant.lastMigrationAt)}
                </Text>
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Activated</DefinitionList.Term>
              <DefinitionList.Description>
                <Text as="span" size="sm" tone={tenant.activatedAt ? 'default' : 'muted'}>
                  {fullDate(tenant.activatedAt)}
                </Text>
              </DefinitionList.Description>
            </DefinitionList.Item>
          </DefinitionList>
        </Stack>
      </Card>

      <Card padding="md">
        <Stack gap="sm">
          <Title order={3} size="md">
            Storage
          </Title>
          {pct == null ? (
            <Text size="sm" tone="muted">
              No database provisioned yet.
            </Text>
          ) : (
            <Stack gap="xs">
              <Cluster justify="between" align="baseline">
                <Text size="sm">
                  {formatGb(tenant.usedSpaceGb)} of {formatGb(tenant.dbSizeGb)}
                </Text>
                <Text as="span" size="sm" tone="muted">
                  {pct}%
                </Text>
              </Cluster>
              <Progress value={pct} size="md" tone={usageTone} />
            </Stack>
          )}
          <DefinitionList layout="horizontal" spacing="sm">
            <DefinitionList.Item>
              <DefinitionList.Term>DB quota</DefinitionList.Term>
              <DefinitionList.Description>
                <Text as="span" size="sm" tone={tenant.dbSizeGb == null ? 'muted' : 'default'}>
                  {formatGb(tenant.dbSizeGb)}
                </Text>
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Used</DefinitionList.Term>
              <DefinitionList.Description>
                <Text as="span" size="sm" tone={tenant.usedSpaceGb == null ? 'muted' : 'default'}>
                  {formatGb(tenant.usedSpaceGb)}
                </Text>
              </DefinitionList.Description>
            </DefinitionList.Item>
          </DefinitionList>
        </Stack>
      </Card>

      <Card padding="md">
        <Stack gap="sm">
          <Title order={3} size="md">
            System
          </Title>
          <DefinitionList layout="horizontal" spacing="sm">
            <DefinitionList.Item>
              <DefinitionList.Term>Tenant ID</DefinitionList.Term>
              <DefinitionList.Description>
                <Code>{tenant.id}</Code>
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Slug</DefinitionList.Term>
              <DefinitionList.Description>
                <Code>{tenant.slug}</Code>
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Created</DefinitionList.Term>
              <DefinitionList.Description>
                <Text as="span" size="sm">
                  {fullDate(tenant.createdAt)}
                </Text>
              </DefinitionList.Description>
            </DefinitionList.Item>
          </DefinitionList>
        </Stack>
      </Card>
    </Grid>
  );
}

function MembersPanel({ tenant }: { tenant: Tenant }) {
  const members = getTenantMembers(tenant.slug);

  if (members.length === 0) {
    return (
      <EmptyState
        title="No members yet"
        description={
          tenant.state === 'provisioning' || tenant.state === 'queued' || tenant.state === 'pending'
            ? 'Members will appear here once the tenant is provisioned and someone accepts the owner invitation.'
            : 'This tenant has no accepted memberships.'
        }
      />
    );
  }

  return (
    <Table hover>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Member</Table.HeaderCell>
          <Table.HeaderCell>Role</Table.HeaderCell>
          <Table.HeaderCell>Last active</Table.HeaderCell>
          <Table.HeaderCell>Joined</Table.HeaderCell>
          <Table.HeaderCell align="end" />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {members.map((m) => (
          <Table.Row key={m.id}>
            <Table.Cell>
              <PersonDisplay size="sm">
                <PersonDisplay.Avatar name={m.name} />
                <PersonDisplay.Name>{m.name}</PersonDisplay.Name>
                <PersonDisplay.Description>{m.email}</PersonDisplay.Description>
              </PersonDisplay>
            </Table.Cell>
            <Table.Cell>
              <Badge tone={roleTone[m.role]} size="sm">
                {roleLabel[m.role]}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              {m.acceptedAt == null ? (
                <Text as="span" size="sm" tone="muted">
                  Invitation pending
                </Text>
              ) : (
                <Text as="span" size="sm" tone={m.lastActiveAt ? 'default' : 'muted'}>
                  {relativeTime(m.lastActiveAt)}
                </Text>
              )}
            </Table.Cell>
            <Table.Cell>
              <Text as="span" size="sm" tone={m.acceptedAt ? 'default' : 'muted'}>
                {m.acceptedAt ? fullDate(m.acceptedAt) : '—'}
              </Text>
            </Table.Cell>
            <Table.Cell align="end">
              <DropdownMenu>
                <DropdownMenu.Trigger>
                  <Button variant="ghost" size="sm" aria-label={`Actions for ${m.name}`}>
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item onSelect={() => {}}>Change role</DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => {}}>Impersonate</DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => {}} tone="danger">
                    Remove from tenant
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function InvitationsPanel({ tenant }: { tenant: Tenant }) {
  const invitations = getTenantInvitations(tenant.slug);

  if (invitations.length === 0) {
    return (
      <EmptyState
        title="No pending invitations"
        description="When someone is invited to this tenant, the invitation will appear here until it's accepted or expires."
        actions={
          <Button>
            <Plus size={14} /> Invite a member
          </Button>
        }
      />
    );
  }

  return (
    <Table hover>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Email</Table.HeaderCell>
          <Table.HeaderCell>Role</Table.HeaderCell>
          <Table.HeaderCell>Invited by</Table.HeaderCell>
          <Table.HeaderCell>Sent</Table.HeaderCell>
          <Table.HeaderCell>Expires</Table.HeaderCell>
          <Table.HeaderCell align="end" />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {invitations.map((inv) => {
          const expired = invitationState(inv.expiresAt) === 'expired';
          return (
            <Table.Row key={inv.id}>
              <Table.Cell>
                <Text as="span" size="sm">
                  {inv.email}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Badge tone={roleTone[inv.role]} size="sm">
                  {roleLabel[inv.role]}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text as="span" size="sm" tone="muted">
                  {inv.invitedBy}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text as="span" size="sm">
                  {relativeTime(inv.sentAt)}
                </Text>
              </Table.Cell>
              <Table.Cell>
                {expired ? (
                  <Badge tone="danger" size="sm">
                    Expired
                  </Badge>
                ) : (
                  <Text as="span" size="sm">
                    {relativeTime(inv.expiresAt)}
                  </Text>
                )}
              </Table.Cell>
              <Table.Cell align="end">
                <DropdownMenu>
                  <DropdownMenu.Trigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Actions for invite ${inv.email}`}
                    >
                      <MoreHorizontal size={14} />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item onSelect={() => {}}>Resend invitation</DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => {}}>Copy invite link</DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => {}} tone="danger">
                      Revoke invitation
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}

export function TenantDetail() {
  const { slug } = useParams<{ slug: string }>();
  const tenant = slug ? getTenant(slug) : undefined;
  const [activeTab, setActiveTab] = useState('system');

  if (!tenant) return <Navigate to="/mockups/tenants" replace />;

  const memberCount = getTenantMembers(tenant.slug).filter((m) => m.acceptedAt).length;
  const invitationCount = getTenantInvitations(tenant.slug).length;

  return (
    <Page>
      <PageHeader>
        <PageHeader.Breadcrumb>
          <Breadcrumb>
            <Breadcrumb.Item as={RouterLink} to="/mockups/tenants">
              Tenants
            </Breadcrumb.Item>
            <Breadcrumb.Item current>{tenant.name}</Breadcrumb.Item>
          </Breadcrumb>
        </PageHeader.Breadcrumb>

        <PageHeader.Aside>
          <Avatar name={tenant.name} size="lg" />
        </PageHeader.Aside>

        <PageHeader.Title>{tenant.name}</PageHeader.Title>

        <PageHeader.Meta>
          <Cluster gap="sm" align="center">
            <Code>{tenant.slug}</Code>
            {tenant.stateReason ? (
              <Tooltip content={tenant.stateReason}>
                <Badge tone={stateTone[tenant.state]} size="sm">
                  {stateLabel[tenant.state]}
                </Badge>
              </Tooltip>
            ) : (
              <Badge tone={stateTone[tenant.state]} size="sm">
                {stateLabel[tenant.state]}
              </Badge>
            )}
          </Cluster>
        </PageHeader.Meta>

        <PageHeader.Actions>
          <Cluster gap="sm">
            <Button variant="secondary">
              <Edit3 size={14} /> Edit metadata
            </Button>
            <PrimaryAction state={tenant.state} />
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="ghost" aria-label="More actions">
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onSelect={() => {}}>View audit log</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => {}}>Impersonate owner</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => {}} tone="danger">
                  <X size={14} /> Archive tenant
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </Cluster>
        </PageHeader.Actions>
      </PageHeader>

      <Tabs
        items={[
          { id: 'system', label: 'System info' },
          { id: 'members', label: 'Members', count: memberCount },
          { id: 'invitations', label: 'Invitations', count: invitationCount },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'system' && <SystemInfoPanel tenant={tenant} />}
      {activeTab === 'members' && <MembersPanel tenant={tenant} />}
      {activeTab === 'invitations' && <InvitationsPanel tenant={tenant} />}

      <CrossLinks kind="mockup" slug="tenant-detail" />
    </Page>
  );
}
