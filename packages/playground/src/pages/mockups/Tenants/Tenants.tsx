import { useMemo, useState } from 'react';
import { ChevronDown, Download, Plus, MoreHorizontal } from 'lucide-react';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Cluster,
  Code,
  DropdownMenu,
  EmptyState,
  Input,
  Page,
  PageHeader,
  Pagination,
  PersonDisplay,
  Progress,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@eocrm/design-system';
import {
  tenants as ALL_TENANTS,
  stateTone,
  stateLabel,
  tenantActions,
  actionLabel,
  relativeTime,
  shortDate,
  formatGb,
  usagePercent,
  type TenantState,
} from '../../../data/tenants';
import { CrossLinks } from '../../shared/CrossLinks';

type StateFilterValue = TenantState | 'all';

const STATE_FILTER_OPTIONS: { value: StateFilterValue; label: string }[] = [
  { value: 'all', label: 'All states' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'queued', label: 'Queued' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'failed', label: 'Failed' },
  { value: 'suspended', label: 'Suspended' },
];

export function Tenants() {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilterValue>('all');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_TENANTS.filter((t) => {
      if (stateFilter !== 'all' && t.state !== stateFilter) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.slug.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, stateFilter]);

  const stateFilterLabel =
    STATE_FILTER_OPTIONS.find((o) => o.value === stateFilter)?.label ?? 'All states';

  return (
    <Page>
      <PageHeader>
        <PageHeader.Breadcrumb>
          <Breadcrumb>
            <Breadcrumb.Item>Superadmin</Breadcrumb.Item>
            <Breadcrumb.Item current>Tenants</Breadcrumb.Item>
          </Breadcrumb>
        </PageHeader.Breadcrumb>
        <PageHeader.Title>
          <Cluster gap="sm" align="center">
            Tenants
            <Badge tone="warning" size="sm">
              Superadmin
            </Badge>
          </Cluster>
        </PageHeader.Title>
        <PageHeader.Meta>
          <Text size="sm" tone="muted">
            {rows.length} {rows.length === 1 ? 'tenant' : 'tenants'}
          </Text>
        </PageHeader.Meta>
        <PageHeader.Actions>
          <Cluster gap="sm">
            {/*
              aria-disabled (not disabled) so Tooltip's pointer/focus events
              still fire — `disabled` swallows them and the "coming soon" copy
              would never surface (anti-pattern noted in Tooltip's JSDoc).
            */}
            <Tooltip content="Export coming soon">
              <Button variant="secondary" aria-disabled onClick={(e) => e.preventDefault()}>
                <Download size={14} /> Export CSV
              </Button>
            </Tooltip>
            <Button>
              <Plus size={14} /> New tenant
            </Button>
          </Cluster>
        </PageHeader.Actions>
      </PageHeader>

      <Card padding="sm">
        <Cluster justify="between" align="center" gap="md" wrap={false}>
          <Input
            placeholder="Search by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tenants"
          />
          <Cluster gap="sm" wrap={false}>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="secondary" size="sm">
                  State: {stateFilterLabel} <ChevronDown size={12} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.RadioGroup
                  value={stateFilter}
                  onValueChange={(v) => setStateFilter(v as StateFilterValue)}
                >
                  {STATE_FILTER_OPTIONS.map((o) => (
                    <DropdownMenu.RadioItem key={o.value} value={o.value}>
                      {o.label}
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="secondary" size="sm">
                  Sort: Last active <ChevronDown size={12} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onSelect={() => {}}>Last active</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => {}}>Name (A→Z)</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => {}}>Created (newest)</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => {}}>Members</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </Cluster>
        </Cluster>
      </Card>

      <Card padding="none">
        {rows.length === 0 ? (
          <EmptyState
            title="No tenants match your filters"
            description="Try clearing the search or switching the state filter."
            actions={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStateFilter('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <Table hover>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Tenant</Table.HeaderCell>
                <Table.HeaderCell>State</Table.HeaderCell>
                <Table.HeaderCell align="end">Members</Table.HeaderCell>
                <Table.HeaderCell align="end">Invites</Table.HeaderCell>
                <Table.HeaderCell>Last active</Table.HeaderCell>
                <Table.HeaderCell>App version</Table.HeaderCell>
                <Table.HeaderCell align="end">DB size</Table.HeaderCell>
                <Table.HeaderCell>Used</Table.HeaderCell>
                <Table.HeaderCell>Created</Table.HeaderCell>
                <Table.HeaderCell align="end" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((t) => {
                const actions = tenantActions(t.state);
                const stateBadge = (
                  <Badge tone={stateTone[t.state]} size="sm">
                    {stateLabel[t.state]}
                  </Badge>
                );
                return (
                  <Table.Row key={t.id}>
                    <Table.Cell>
                      <PersonDisplay size="sm">
                        <PersonDisplay.Avatar name={t.name} />
                        <PersonDisplay.Name>{t.name}</PersonDisplay.Name>
                        <PersonDisplay.Description>
                          <Code tone="muted">{t.slug}</Code>
                        </PersonDisplay.Description>
                      </PersonDisplay>
                    </Table.Cell>
                    <Table.Cell>
                      {t.stateReason ? (
                        <Tooltip content={t.stateReason}>
                          {/*
                            Tooltip clones its child to attach pointer/focus
                            listeners + aria-describedby — Badge is a span
                            that accepts refs, so this works without a wrapper.
                          */}
                          {stateBadge}
                        </Tooltip>
                      ) : (
                        stateBadge
                      )}
                    </Table.Cell>
                    <Table.Cell align="end">
                      <Text as="span" size="sm" tone={t.membersCount === 0 ? 'muted' : 'default'}>
                        {t.membersCount}
                      </Text>
                    </Table.Cell>
                    <Table.Cell align="end">
                      {t.pendingInvitesCount === 0 ? (
                        <Text as="span" size="sm" tone="muted">
                          —
                        </Text>
                      ) : (
                        <Badge tone="info" size="sm">
                          {t.pendingInvitesCount}
                        </Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="sm" tone={t.lastMemberActiveAt ? 'default' : 'muted'}>
                        {relativeTime(t.lastMemberActiveAt)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {t.appVersion ? (
                        <Tooltip
                          content={
                            t.lastMigrationAt
                              ? `Last migration ${shortDate(t.lastMigrationAt)}`
                              : 'No migration history'
                          }
                        >
                          <Code>{t.appVersion}</Code>
                        </Tooltip>
                      ) : (
                        <Text size="sm" tone="muted">
                          —
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell align="end">
                      <Text as="span" size="sm" tone={t.dbSizeGb == null ? 'muted' : 'default'}>
                        {formatGb(t.dbSizeGb)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {(() => {
                        const pct = usagePercent(t.usedSpaceGb, t.dbSizeGb);
                        if (pct == null) {
                          return (
                            <Text size="sm" tone="muted">
                              —
                            </Text>
                          );
                        }
                        const tone: 'default' | 'warning' | 'danger' =
                          pct > 90 ? 'danger' : pct > 75 ? 'warning' : 'default';
                        return (
                          <Tooltip
                            content={`${formatGb(t.usedSpaceGb)} of ${formatGb(t.dbSizeGb)}`}
                          >
                            <Stack gap="xs">
                              <Progress value={pct} size="sm" tone={tone} />
                              <Text as="span" size="xs" tone="muted">
                                {pct}%
                              </Text>
                            </Stack>
                          </Tooltip>
                        );
                      })()}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="sm" tone="muted">
                        {shortDate(t.createdAt)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell align="end">
                      <DropdownMenu>
                        <DropdownMenu.Trigger>
                          <Button variant="ghost" size="sm" aria-label={`Actions for ${t.name}`}>
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                          {actions.map((a) => (
                            <DropdownMenu.Item
                              key={a}
                              onSelect={() => {}}
                              tone={a === 'suspend' || a === 'cancel' ? 'danger' : 'default'}
                            >
                              {actionLabel[a]}
                            </DropdownMenu.Item>
                          ))}
                        </DropdownMenu.Content>
                      </DropdownMenu>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
      </Card>

      <Cluster justify="between" align="center">
        <Text size="sm" tone="muted">
          Showing 1–{rows.length} of 84 tenants
        </Text>
        <Pagination currentPage={1} pageCount={4} onPageChange={() => undefined} size="sm" />
      </Cluster>

      <CrossLinks kind="mockup" slug="tenants" />
    </Page>
  );
}
