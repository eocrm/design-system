import { Link as RouterLink, Navigate, useParams } from 'react-router-dom';
import { Edit3, MoreHorizontal, Pause, Play, RotateCw, X } from 'lucide-react';
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
  Grid,
  Page,
  PageHeader,
  Progress,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@eocrm/design-system';
import {
  getTenant,
  stateTone,
  stateLabel,
  formatGb,
  relativeTime,
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

export function TenantDetail() {
  const { slug } = useParams<{ slug: string }>();
  const tenant = slug ? getTenant(slug) : undefined;

  if (!tenant) return <Navigate to="/mockups/tenants" replace />;

  const pct = usagePercent(tenant.usedSpaceGb, tenant.dbSizeGb);
  const usageTone: 'default' | 'warning' | 'danger' =
    pct == null ? 'default' : pct > 90 ? 'danger' : pct > 75 ? 'warning' : 'default';

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

        <PageHeader.Title>
          <Cluster gap="sm" align="center">
            {tenant.name}
            <Badge tone="warning" size="sm">
              Superadmin
            </Badge>
          </Cluster>
        </PageHeader.Title>

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
              Members & invites
            </Title>
            <Cluster gap="lg" align="end">
              <Stack gap="xs">
                <Text size="xs" tone="muted">
                  Members
                </Text>
                <Title order={2} size="xl">
                  {tenant.membersCount}
                </Title>
              </Stack>
              <Stack gap="xs">
                <Text size="xs" tone="muted">
                  Pending invites
                </Text>
                <Title order={2} size="xl">
                  {tenant.pendingInvitesCount}
                </Title>
              </Stack>
            </Cluster>
            <DefinitionList layout="horizontal" spacing="sm">
              <DefinitionList.Item>
                <DefinitionList.Term>Last member active</DefinitionList.Term>
                <DefinitionList.Description>
                  <Text as="span" size="sm" tone={tenant.lastMemberActiveAt ? 'default' : 'muted'}>
                    {relativeTime(tenant.lastMemberActiveAt)}
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

      <CrossLinks kind="mockup" slug="tenant-detail" />
    </Page>
  );
}
