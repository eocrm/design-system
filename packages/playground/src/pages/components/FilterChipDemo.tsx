import { useState } from 'react';
import { Cluster, FilterChip, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

type EditableFilter = { id: string; label: string; value: string };

const INITIAL_EDITABLE: EditableFilter[] = [
  { id: 'range', label: 'Range', value: 'Jun 1 – Jul 31' },
  { id: 'owner', label: 'Owner', value: 'Sarah Chen' },
  { id: 'event', label: 'Event', value: 'auth.* (3)' },
];

export function FilterChipDemo() {
  const [chips, setChips] = useState<string[]>(['event', 'tenant']);
  const removeChip = (id: string) => setChips((prev) => prev.filter((c) => c !== id));

  // Interactive (editable) example: clicking a chip body marks it "editing"
  // (where a real consumer would open a controlled <Popover> editor); the ✕
  // removes the chip from the list WITHOUT activating the editor.
  const [editable, setEditable] = useState<EditableFilter[]>(INITIAL_EDITABLE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const removeEditable = (id: string) => {
    setEditable((prev) => prev.filter((f) => f.id !== id));
    setEditingId((cur) => (cur === id ? null : cur));
  };

  return (
    <DemoLayout
      name="FilterChip"
      componentName="FilterChip"
      description='Dismissible "active filter" pill: Label + tone-dotted Value + auto-rendered × button when onDismiss is passed.'
      files={getComponentFiles('FilterChip')}
    >
      <Example
        title="Label + tone-dotted value + dismiss"
        description="The canonical filter-chip shape. tone='info' prefixes a 6px blue dot before the value text. The dismiss × removes the chip from local state."
        code={`import { useState } from 'react';
import { Cluster, FilterChip } from '@eocrm/design-system';

export function Demo() {
  const [chips, setChips] = useState(['event', 'tenant']);
  const removeChip = (id: string) =>
    setChips((prev) => prev.filter((c) => c !== id));

  return (
    <Cluster gap="sm">
      {chips.includes('event') && (
        <FilterChip onDismiss={() => removeChip('event')}>
          <FilterChip.Label>Event</FilterChip.Label>
          <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
        </FilterChip>
      )}
      {chips.includes('tenant') && (
        <FilterChip onDismiss={() => removeChip('tenant')}>
          <FilterChip.Label>Tenant</FilterChip.Label>
          <FilterChip.Value>beta</FilterChip.Value>
        </FilterChip>
      )}
    </Cluster>
  );
}`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            {chips.includes('event') && (
              <FilterChip onDismiss={() => removeChip('event')}>
                <FilterChip.Label>Event</FilterChip.Label>
                <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
              </FilterChip>
            )}
            {chips.includes('tenant') && (
              <FilterChip onDismiss={() => removeChip('tenant')}>
                <FilterChip.Label>Tenant</FilterChip.Label>
                <FilterChip.Value>beta</FilterChip.Value>
              </FilterChip>
            )}
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="Tone variants"
        description="One chip per BadgeTone — info / success / warning / danger / purple / neutral. The dot color comes from the matching token; the pill itself stays neutral white."
        code={`import { Cluster, FilterChip } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="sm">
      <FilterChip onDismiss={() => {}}>
        <FilterChip.Label>Event</FilterChip.Label>
        <FilterChip.Value tone="info">role.assigned</FilterChip.Value>
      </FilterChip>
      <FilterChip onDismiss={() => {}}>
        <FilterChip.Label>Event</FilterChip.Label>
        <FilterChip.Value tone="success">auth.login_succeeded</FilterChip.Value>
      </FilterChip>
      <FilterChip onDismiss={() => {}}>
        <FilterChip.Label>Event</FilterChip.Label>
        <FilterChip.Value tone="warning">invitation.expired</FilterChip.Value>
      </FilterChip>
      <FilterChip onDismiss={() => {}}>
        <FilterChip.Label>Event</FilterChip.Label>
        <FilterChip.Value tone="danger">auth.login_failed</FilterChip.Value>
      </FilterChip>
      <FilterChip onDismiss={() => {}}>
        <FilterChip.Label>Event</FilterChip.Label>
        <FilterChip.Value tone="purple">deal.won</FilterChip.Value>
      </FilterChip>
      <FilterChip onDismiss={() => {}}>
        <FilterChip.Label>Event</FilterChip.Label>
        <FilterChip.Value tone="neutral">system_setting.updated</FilterChip.Value>
      </FilterChip>
    </Cluster>
  );
}`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="info">role.assigned</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="success">auth.login_succeeded</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="warning">invitation.expired</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="danger">auth.login_failed</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="purple">deal.won</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="neutral">system_setting.updated</FilterChip.Value>
            </FilterChip>
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="Value-only (no label)"
        description="Omit the Label subcomponent for chips that don't need a category prefix — useful when the filter category is implied by surrounding context."
        code={`import { Cluster, FilterChip } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="sm">
      <FilterChip onDismiss={() => {}}>
        <FilterChip.Value tone="warning">Platform only</FilterChip.Value>
      </FilterChip>
      <FilterChip onDismiss={() => {}}>
        <FilterChip.Value>acme</FilterChip.Value>
      </FilterChip>
    </Cluster>
  );
}`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Value tone="warning">Platform only</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Value>acme</FilterChip.Value>
            </FilterChip>
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="Read-only (no dismiss button)"
        description="Omit onDismiss to render a static chip — useful for displaying filters that aren't user-removable."
        code={`import { FilterChip } from '@eocrm/design-system';

export function Demo() {
  return (
    <FilterChip>
      <FilterChip.Label>Status</FilterChip.Label>
      <FilterChip.Value>Active</FilterChip.Value>
    </FilterChip>
  );
}`}
      >
        <InputExample width="auto">
          <FilterChip>
            <FilterChip.Label>Status</FilterChip.Label>
            <FilterChip.Value>Active</FilterChip.Value>
          </FilterChip>
        </InputExample>
      </Example>

      <Example
        title="Interactive (editable) chip"
        description="Pass onActivate to make the chip BODY a button — for editable filters whose body re-opens an editor. Click a chip body below to 'edit' it; click the ✕ to remove it. The ✕ stops propagation, so removing never fires onActivate. In a real screen, wire onActivate to a controlled <Popover open onOpenChange> whose content is the editor (e.g. a range-picker)."
        code={`import { useState } from 'react';
import { Cluster, FilterChip, Stack, Text } from '@eocrm/design-system';

type EditableFilter = { id: string; label: string; value: string };

const INITIAL_EDITABLE: EditableFilter[] = [
  { id: 'range', label: 'Range', value: 'Jun 1 – Jul 31' },
  { id: 'owner', label: 'Owner', value: 'Sarah Chen' },
  { id: 'event', label: 'Event', value: 'auth.* (3)' },
];

export function Demo() {
  const [editable, setEditable] = useState<EditableFilter[]>(INITIAL_EDITABLE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const removeEditable = (id: string) => {
    setEditable((prev) => prev.filter((f) => f.id !== id));
    setEditingId((cur) => (cur === id ? null : cur));
  };

  return (
    <Stack gap="sm">
      <Cluster gap="sm">
        {editable.map((f) => (
          <FilterChip
            key={f.id}
            onActivate={() => setEditingId((cur) => (cur === f.id ? null : f.id))}
            expanded={editingId === f.id}
            onDismiss={() => removeEditable(f.id)}
            dismissLabel={\`Remove \${f.label}: \${f.value} filter\`}
          >
            <FilterChip.Label>{f.label}</FilterChip.Label>
            <FilterChip.Value>{f.value}</FilterChip.Value>
          </FilterChip>
        ))}
      </Cluster>
      <Text size="sm" tone="muted">
        {editable.length === 0
          ? 'All filters removed.'
          : editingId
            ? \`Editing "\${editable.find((f) => f.id === editingId)?.label}" — a real consumer would now show a Popover editor here.\`
            : 'Click a chip body to edit it; click × to remove (× never triggers edit).'}
      </Text>
    </Stack>
  );
}`}
      >
        <InputExample width="auto">
          <Stack gap="sm">
            <Cluster gap="sm">
              {editable.map((f) => (
                <FilterChip
                  key={f.id}
                  onActivate={() => setEditingId((cur) => (cur === f.id ? null : f.id))}
                  expanded={editingId === f.id}
                  onDismiss={() => removeEditable(f.id)}
                  dismissLabel={`Remove ${f.label}: ${f.value} filter`}
                >
                  <FilterChip.Label>{f.label}</FilterChip.Label>
                  <FilterChip.Value>{f.value}</FilterChip.Value>
                </FilterChip>
              ))}
            </Cluster>
            <Text size="sm" tone="muted">
              {editable.length === 0
                ? 'All filters removed.'
                : editingId
                  ? `Editing "${editable.find((f) => f.id === editingId)?.label}" — a real consumer would now show a Popover editor here.`
                  : 'Click a chip body to edit it; click ✕ to remove (✕ never triggers edit).'}
            </Text>
          </Stack>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
