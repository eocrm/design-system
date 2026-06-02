import { useState } from 'react';
import { GripVertical, ListPlus, MoreHorizontal } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Cluster,
  Code,
  ConfirmationPopover,
  DropdownMenu,
  EmptyState,
  Page,
  PageHeader,
  Sortable,
  Stack,
  Tabs,
  Text,
  toast,
  type TabItem,
} from '@eocrm/design-system';
import {
  ENTITIES,
  FIELD_TYPE_LABEL,
  FIELD_TYPE_TONE,
  SEED,
  type CustomField,
  type EntityKey,
} from './fields';
import { FieldDrawer } from './FieldDrawer';
import { CrossLinks } from '../../shared/CrossLinks';

export function CustomFields() {
  const [fieldsByEntity, setFieldsByEntity] = useState<Record<EntityKey, CustomField[]>>(SEED);
  const [activeEntity, setActiveEntity] = useState<EntityKey>('contacts');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);

  const fields = fieldsByEntity[activeEntity];
  const entityLabel = ENTITIES.find((e) => e.id === activeEntity)!.label;

  const tabs: TabItem[] = ENTITIES.map((e) => ({
    id: e.id,
    label: e.label,
    count: fieldsByEntity[e.id].length,
  }));

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (f: CustomField) => {
    setEditing(f);
    setDrawerOpen(true);
  };

  const saveField = (field: CustomField) => {
    setFieldsByEntity((prev) => {
      const list = prev[activeEntity];
      const exists = list.some((f) => f.id === field.id);
      const nextList = exists ? list.map((f) => (f.id === field.id ? field : f)) : [...list, field];
      return { ...prev, [activeEntity]: nextList };
    });
    setDrawerOpen(false);
    toast.success('Field saved', { description: `“${field.label}” on ${entityLabel}.` });
  };

  const deleteField = (id: string) => {
    setFieldsByEntity((prev) => ({
      ...prev,
      [activeEntity]: prev[activeEntity].filter((f) => f.id !== id),
    }));
    toast.success('Field deleted');
  };

  const reorder = (from: number, to: number) =>
    setFieldsByEntity((prev) => {
      const next = prev[activeEntity].slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, [activeEntity]: next };
    });

  const existingKeys = fields.filter((f) => f.id !== editing?.id).map((f) => f.key);

  return (
    <Page>
      <PageHeader>
        <PageHeader.Title>Custom fields</PageHeader.Title>
        <PageHeader.Subtitle>
          Define extra fields to capture data unique to your eocrm workspace.
        </PageHeader.Subtitle>
        <PageHeader.Actions>
          <Button onClick={openAdd}>Add field</Button>
        </PageHeader.Actions>
      </PageHeader>

      <Tabs
        items={tabs}
        activeId={activeEntity}
        onChange={(id) => setActiveEntity(id as EntityKey)}
      />

      {fields.length === 0 ? (
        <EmptyState
          icon={<ListPlus size={32} aria-hidden="true" />}
          title={`No custom fields for ${entityLabel}`}
          description="Add a custom field to capture data unique to your workflow."
          actions={<Button onClick={openAdd}>Add field</Button>}
        />
      ) : (
        <Sortable onReorder={({ from, to }) => reorder(from, to)}>
          {fields.map((f) => (
            <Sortable.Item key={f.id} id={f.id}>
              <Card padding="sm">
                <Cluster justify="between" align="center" wrap={false} gap="sm">
                  <Cluster gap="sm" align="center" wrap={false}>
                    <Sortable.Handle aria-label={`Reorder ${f.label}`}>
                      <GripVertical size={14} />
                    </Sortable.Handle>
                    <Stack gap="xs">
                      <Text weight="medium">{f.label}</Text>
                      <Code tone="muted">{f.key}</Code>
                    </Stack>
                  </Cluster>
                  <Cluster gap="sm" align="center" wrap={false}>
                    <Badge tone={FIELD_TYPE_TONE[f.type]} size="sm">
                      {FIELD_TYPE_LABEL[f.type]}
                    </Badge>
                    {f.required && (
                      <Badge tone="neutral" size="sm">
                        Required
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenu.Trigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={`Actions for ${f.label}`}
                        >
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end">
                        <DropdownMenu.Item onSelect={() => openEdit(f)}>Edit</DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <ConfirmationPopover
                          title="Delete field?"
                          description={`“${f.label}” and its data mapping will be removed.`}
                          variant="danger"
                          confirmLabel="Delete field"
                          onConfirm={() => deleteField(f.id)}
                        >
                          <DropdownMenu.Item
                            closeOnSelect={false}
                            onSelect={() => {}}
                            tone="danger"
                          >
                            Delete field
                          </DropdownMenu.Item>
                        </ConfirmationPopover>
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  </Cluster>
                </Cluster>
              </Card>
            </Sortable.Item>
          ))}
        </Sortable>
      )}

      <FieldDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        entityLabel={entityLabel}
        field={editing}
        existingKeys={existingKeys}
        onSave={saveField}
      />

      <CrossLinks kind="mockup" slug="custom-fields" />
    </Page>
  );
}
