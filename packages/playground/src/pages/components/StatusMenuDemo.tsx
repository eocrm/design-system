import { useState } from 'react';
import { Cluster, StatusMenu, type StatusMenuStatus } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function StatusMenuDemo() {
  return (
    <DemoLayout
      name="StatusMenu"
      componentName="StatusMenu"
      description="Status-transition dropdown: a colored pill trigger that opens a menu of transition targets, each row fully colored to its own status. Composes DropdownMenu. Renders a read-only colored chip when options is omitted or empty."
      files={getComponentFiles('StatusMenu')}
    >
      <Example
        title="Task workflow"
        description="Categories resolve their color automatically — to_do slate / in_progress blue / done green. onSelect updates the stateful current."
        code={`import { useState } from 'react';
import { StatusMenu, type StatusMenuStatus } from '@eocrm/design-system';

const TASK_STATUSES: StatusMenuStatus[] = [
  { id: 'todo', name: 'To do', category: 'to_do' },
  { id: 'in_progress', name: 'In progress', category: 'in_progress' },
  { id: 'done', name: 'Done', category: 'done' },
];

export function TaskExample() {
  const [current, setCurrent] = useState(TASK_STATUSES[0]);
  return (
    <StatusMenu
      current={current}
      options={TASK_STATUSES.filter((s) => s.id !== current.id)}
      onSelect={(id) => setCurrent(TASK_STATUSES.find((s) => s.id === id)!)}
    />
  );
}`}
      >
        <TaskExample />
      </Example>

      <Example
        title="Deal workflow"
        description={`open/won/lost categories, plus one option with a custom color override — color always wins over category.`}
        code={`import { useState } from 'react';
import { StatusMenu, type StatusMenuStatus } from '@eocrm/design-system';

const DEAL_STATUSES: StatusMenuStatus[] = [
  { id: 'open', name: 'Open', category: 'open' },
  { id: 'won', name: 'Won', category: 'won' },
  { id: 'lost', name: 'Lost', category: 'lost' },
  // Custom color override — wins over category's default green.
  { id: 'on_hold', name: 'On hold', category: 'won', color: 'amber' },
];

export function DealExample() {
  const [current, setCurrent] = useState(DEAL_STATUSES[0]);
  return (
    <StatusMenu
      current={current}
      options={DEAL_STATUSES.filter((s) => s.id !== current.id)}
      onSelect={(id) => setCurrent(DEAL_STATUSES.find((s) => s.id === id)!)}
    />
  );
}`}
      >
        <DealExample />
      </Example>

      <Example
        title="Read-only, disabled, and busy"
        description="Omitting options renders a static colored chip (no button, no menu). disabled and busy keep the trigger's color but block interaction. busy is announced from a live region the component owns; it also sets aria-busy, but nothing reads that on its own."
        code={`import { Cluster, StatusMenu, type StatusMenuStatus } from '@eocrm/design-system';

const options: StatusMenuStatus[] = [
  { id: 'in_progress', name: 'In progress', category: 'in_progress' },
];

export function Demo() {
  return (
    <Cluster gap="md">
      <StatusMenu current={{ id: 'done', name: 'Done', category: 'done' }} />
      <StatusMenu
        current={{ id: 'todo', name: 'To do', category: 'to_do' }}
        options={options}
        disabled
      />
      <StatusMenu
        current={{ id: 'todo', name: 'To do', category: 'to_do' }}
        options={options}
        busy
      />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md">
          <StatusMenu current={{ id: 'done', name: 'Done', category: 'done' }} />
          <StatusMenu
            current={{ id: 'todo', name: 'To do', category: 'to_do' }}
            options={BLOCKED_EXAMPLE_OPTIONS}
            disabled
          />
          <StatusMenu
            current={{ id: 'todo', name: 'To do', category: 'to_do' }}
            options={BLOCKED_EXAMPLE_OPTIONS}
            busy
          />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}

const TASK_STATUSES: StatusMenuStatus[] = [
  { id: 'todo', name: 'To do', category: 'to_do' },
  { id: 'in_progress', name: 'In progress', category: 'in_progress' },
  { id: 'done', name: 'Done', category: 'done' },
];

function TaskExample() {
  const [current, setCurrent] = useState<StatusMenuStatus>(TASK_STATUSES[0]);
  return (
    <StatusMenu
      current={current}
      options={TASK_STATUSES.filter((s) => s.id !== current.id)}
      onSelect={(id) => setCurrent(TASK_STATUSES.find((s) => s.id === id)!)}
    />
  );
}

const DEAL_STATUSES: StatusMenuStatus[] = [
  { id: 'open', name: 'Open', category: 'open' },
  { id: 'won', name: 'Won', category: 'won' },
  { id: 'lost', name: 'Lost', category: 'lost' },
  { id: 'on_hold', name: 'On hold', category: 'won', color: 'amber' },
];

function DealExample() {
  const [current, setCurrent] = useState<StatusMenuStatus>(DEAL_STATUSES[0]);
  return (
    <StatusMenu
      current={current}
      options={DEAL_STATUSES.filter((s) => s.id !== current.id)}
      onSelect={(id) => setCurrent(DEAL_STATUSES.find((s) => s.id === id)!)}
    />
  );
}

const BLOCKED_EXAMPLE_OPTIONS: StatusMenuStatus[] = [
  { id: 'in_progress', name: 'In progress', category: 'in_progress' },
];
