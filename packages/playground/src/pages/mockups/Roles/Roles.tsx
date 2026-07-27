import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { UserPlus } from 'lucide-react';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Cluster,
  ConfirmationPopover,
  Constrain,
  Divider,
  EmptyState,
  Field,
  Input,
  Masonry,
  Page,
  PageHeader,
  Stack,
  Tabs,
  Text,
  toast,
  type TabItem,
} from '@eocrm/design-system';
import { PERMISSION_GROUPS, INITIAL_SELECTED } from './permissions';
import { CrossLinks } from '../../shared/CrossLinks';

const TOTAL_PERMISSIONS = PERMISSION_GROUPS.reduce((n, g) => n + g.permissions.length, 0);

export function Roles() {
  const [name, setName] = useState('Support');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(INITIAL_SELECTED));
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('permissions');

  const query = search.trim().toLowerCase();

  // Each group with its permissions narrowed to the current search query;
  // groups with no remaining matches drop out.
  const visibleGroups = useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => ({
        ...group,
        permissions: query
          ? group.permissions.filter((p) => p.label.toLowerCase().includes(query))
          : group.permissions,
      })).filter((group) => group.permissions.length > 0),
    [query],
  );

  const setMany = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const set = new Set(prev);
      ids.forEach((id) => (on ? set.add(id) : set.delete(id)));
      return set;
    });

  const tabs: TabItem[] = [
    { id: 'permissions', label: 'Permissions', count: selected.size },
    { id: 'operators', label: 'Assigned operators', count: 0 },
  ];

  const save = () =>
    toast.success('Role saved', {
      description: `“${name}” · ${selected.size} ${selected.size === 1 ? 'permission' : 'permissions'}.`,
    });
  const cancel = () => toast('Changes discarded');
  const deleteRole = () => {
    toast.success('Role deleted', { description: `“${name}” was removed.` });
  };

  return (
    <Page>
      <PageHeader>
        <PageHeader.Breadcrumb>
          <Breadcrumb>
            <Breadcrumb.Item as={RouterLink} to="/mockups/roles">
              Roles
            </Breadcrumb.Item>
            <Breadcrumb.Item>{name}</Breadcrumb.Item>
          </Breadcrumb>
        </PageHeader.Breadcrumb>
        <PageHeader.Title>Edit role · {name}</PageHeader.Title>
        <PageHeader.Subtitle>
          Control which control-plane actions operators with this role can perform.
        </PageHeader.Subtitle>
        <PageHeader.Actions>
          <ConfirmationPopover
            title="Delete role?"
            description={`“${name}” and its permission grants will be permanently removed. Operators assigned to it lose these permissions.`}
            variant="danger"
            confirmLabel="Delete role"
            onConfirm={deleteRole}
          >
            <Button variant="danger">Delete role</Button>
          </ConfirmationPopover>
        </PageHeader.Actions>
      </PageHeader>

      <Tabs items={tabs} activeId={tab} onChange={setTab} />

      {tab === 'permissions' ? (
        <Stack gap="md">
          <Card>
            <Constrain maxWidth="lg">
              <Field label="Name" required description="Shown to operators when assigning roles.">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </Constrain>
          </Card>

          <Card padding="sm">
            <Cluster justify="between" align="center" gap="md" wrap={false}>
              <Constrain flex="grow">
                <Input
                  placeholder="Search permissions"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search permissions"
                />
              </Constrain>
              <Cluster gap="sm" align="center" wrap={false}>
                <Text tone="muted" size="sm">
                  {selected.size} of {TOTAL_PERMISSIONS} selected
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                  disabled={selected.size === 0}
                >
                  Clear
                </Button>
              </Cluster>
            </Cluster>
          </Card>

          {visibleGroups.length === 0 ? (
            <Card>
              <Text tone="muted">No permissions match “{search}”.</Text>
            </Card>
          ) : (
            <Masonry minColumnWidth="440px" gap="md">
              {visibleGroups.map((group) => {
                const ids = group.permissions.map((p) => p.id);
                const selectedInGroup = ids.filter((id) => selected.has(id)).length;
                const allSelected = selectedInGroup === group.permissions.length;
                const someSelected = selectedInGroup > 0 && !allSelected;
                return (
                  <Card key={group.id}>
                    <Stack gap="sm">
                      <Cluster justify="between" align="center" gap="sm" wrap={false}>
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={(next) => setMany(ids, next)}
                          label={<Text weight="semibold">{group.label}</Text>}
                        />
                        <Badge tone={selectedInGroup > 0 ? 'info' : 'neutral'} size="sm">
                          {selectedInGroup}/{group.permissions.length}
                        </Badge>
                      </Cluster>
                      <Divider />
                      <Stack gap="xs">
                        {group.permissions.map((p) => (
                          <Checkbox
                            key={p.id}
                            checked={selected.has(p.id)}
                            onChange={(next) => setMany([p.id], next)}
                            label={p.label}
                          />
                        ))}
                      </Stack>
                    </Stack>
                  </Card>
                );
              })}
            </Masonry>
          )}

          <Cluster justify="end" gap="sm">
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </Cluster>
        </Stack>
      ) : (
        <Card>
          <EmptyState
            icon={<UserPlus size={32} aria-hidden="true" />}
            title="No operators assigned"
            description="Assign control-plane operators to grant them this role's permissions."
            actions={<Button>Assign operators</Button>}
          />
        </Card>
      )}

      <CrossLinks kind="mockup" slug="roles" />
    </Page>
  );
}
