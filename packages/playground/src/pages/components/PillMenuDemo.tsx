import { useState } from 'react';
import { BookOpen, Bug, CheckSquare } from 'lucide-react';
import { Cluster, PillMenu, type PillMenuOption } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const TASK_TYPES: PillMenuOption[] = [
  { id: 'bug', name: 'Bug', color: 'red', icon: <Bug size={14} /> },
  { id: 'story', name: 'Story', color: 'green', icon: <BookOpen size={14} /> },
  { id: 'task', name: 'Task', color: 'blue', icon: <CheckSquare size={14} /> },
];

function TaskTypeExample() {
  const [type, setType] = useState<PillMenuOption>(TASK_TYPES[0]);
  return (
    <PillMenu
      label="type"
      current={type}
      options={TASK_TYPES.filter((t) => t.id !== type.id)}
      onSelect={(id) => setType(TASK_TYPES.find((t) => t.id === id) ?? type)}
    />
  );
}

export function PillMenuDemo() {
  return (
    <DemoLayout
      name="PillMenu"
      componentName="PillMenu"
      description="Coloured value menu: a coloured pill trigger that opens a menu of values, each row fully coloured to its own value — a workflow status, a task type, a priority. Composes DropdownMenu. Renders a read-only coloured chip when options is omitted or empty."
      files={getComponentFiles('PillMenu')}
    >
      <Example
        title="Task workflow"
        description="Categories resolve their color automatically — to_do slate / in_progress blue / done green. onSelect updates the stateful current."
        code={`import { useState } from 'react';
import { PillMenu, type PillMenuOption } from '@eocrm/design-system';

const TASK_STATUSES: PillMenuOption[] = [
  { id: 'todo', name: 'To do', category: 'to_do' },
  { id: 'in_progress', name: 'In progress', category: 'in_progress' },
  { id: 'done', name: 'Done', category: 'done' },
];

export function TaskExample() {
  const [current, setCurrent] = useState(TASK_STATUSES[0]);
  return (
    <PillMenu
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
import { PillMenu, type PillMenuOption } from '@eocrm/design-system';

const DEAL_STATUSES: PillMenuOption[] = [
  { id: 'open', name: 'Open', category: 'open' },
  { id: 'won', name: 'Won', category: 'won' },
  { id: 'lost', name: 'Lost', category: 'lost' },
  // Custom color override — wins over category's default green.
  { id: 'on_hold', name: 'On hold', category: 'won', color: 'amber' },
];

export function DealExample() {
  const [current, setCurrent] = useState(DEAL_STATUSES[0]);
  return (
    <PillMenu
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
        code={`import { Cluster, PillMenu, type PillMenuOption } from '@eocrm/design-system';

const options: PillMenuOption[] = [
  { id: 'in_progress', name: 'In progress', category: 'in_progress' },
];

export function Demo() {
  return (
    <Cluster gap="md">
      <PillMenu current={{ id: 'done', name: 'Done', category: 'done' }} />
      <PillMenu
        current={{ id: 'todo', name: 'To do', category: 'to_do' }}
        options={options}
        disabled
      />
      <PillMenu
        current={{ id: 'todo', name: 'To do', category: 'to_do' }}
        options={options}
        busy
      />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md">
          <PillMenu current={{ id: 'done', name: 'Done', category: 'done' }} />
          <PillMenu
            current={{ id: 'todo', name: 'To do', category: 'to_do' }}
            options={BLOCKED_EXAMPLE_OPTIONS}
            disabled
          />
          <PillMenu
            current={{ id: 'todo', name: 'To do', category: 'to_do' }}
            options={BLOCKED_EXAMPLE_OPTIONS}
            busy
          />
        </Cluster>
      </Example>
      <Example
        title="Not a status: label + icons"
        description="label names what the value is in the trigger's accessible name — label='type' is announced 'Change type: Bug' (default: 'Change status: …'). Each value can carry a decorative icon, rendered before its name in the pill and in its menu row."
        code={`import { useState } from 'react';
import { BookOpen, Bug, CheckSquare } from 'lucide-react';
import { PillMenu, type PillMenuOption } from '@eocrm/design-system';

const TASK_TYPES: PillMenuOption[] = [
  { id: 'bug', name: 'Bug', color: 'red', icon: <Bug size={14} /> },
  { id: 'story', name: 'Story', color: 'green', icon: <BookOpen size={14} /> },
  { id: 'task', name: 'Task', color: 'blue', icon: <CheckSquare size={14} /> },
];

export function Demo() {
  const [type, setType] = useState<PillMenuOption>(TASK_TYPES[0]);
  return (
    <PillMenu
      label="type"
      current={type}
      options={TASK_TYPES.filter((t) => t.id !== type.id)}
      onSelect={(id) => setType(TASK_TYPES.find((t) => t.id === id) ?? type)}
    />
  );
}`}
      >
        <TaskTypeExample />
      </Example>
    </DemoLayout>
  );
}

const TASK_STATUSES: PillMenuOption[] = [
  { id: 'todo', name: 'To do', category: 'to_do' },
  { id: 'in_progress', name: 'In progress', category: 'in_progress' },
  { id: 'done', name: 'Done', category: 'done' },
];

function TaskExample() {
  const [current, setCurrent] = useState<PillMenuOption>(TASK_STATUSES[0]);
  return (
    <PillMenu
      current={current}
      options={TASK_STATUSES.filter((s) => s.id !== current.id)}
      onSelect={(id) => setCurrent(TASK_STATUSES.find((s) => s.id === id)!)}
    />
  );
}

const DEAL_STATUSES: PillMenuOption[] = [
  { id: 'open', name: 'Open', category: 'open' },
  { id: 'won', name: 'Won', category: 'won' },
  { id: 'lost', name: 'Lost', category: 'lost' },
  { id: 'on_hold', name: 'On hold', category: 'won', color: 'amber' },
];

function DealExample() {
  const [current, setCurrent] = useState<PillMenuOption>(DEAL_STATUSES[0]);
  return (
    <PillMenu
      current={current}
      options={DEAL_STATUSES.filter((s) => s.id !== current.id)}
      onSelect={(id) => setCurrent(DEAL_STATUSES.find((s) => s.id === id)!)}
    />
  );
}

const BLOCKED_EXAMPLE_OPTIONS: PillMenuOption[] = [
  { id: 'in_progress', name: 'In progress', category: 'in_progress' },
];
