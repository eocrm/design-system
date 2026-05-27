import { useState } from 'react';
import { Cluster, FilterChip } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

export function FilterChipDemo() {
  const [chips, setChips] = useState<string[]>(['event', 'tenant']);
  const removeChip = (id: string) => setChips((prev) => prev.filter((c) => c !== id));

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
        code={`<FilterChip onDismiss={() => removeChip('event')}>
  <FilterChip.Label>Event</FilterChip.Label>
  <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
</FilterChip>`}
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
        code={`<FilterChip onDismiss={() => {}}>
  <FilterChip.Label>Event</FilterChip.Label>
  <FilterChip.Value tone="success">auth.login_succeeded</FilterChip.Value>
</FilterChip>`}
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
        code={`<FilterChip onDismiss={() => {}}>
  <FilterChip.Value tone="warning">Platform only</FilterChip.Value>
</FilterChip>`}
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
        code={`<FilterChip>
  <FilterChip.Label>Status</FilterChip.Label>
  <FilterChip.Value>Active</FilterChip.Value>
</FilterChip>`}
      >
        <InputExample width="auto">
          <FilterChip>
            <FilterChip.Label>Status</FilterChip.Label>
            <FilterChip.Value>Active</FilterChip.Value>
          </FilterChip>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
