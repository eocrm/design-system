import { useState } from 'react';
import { Avatar, Badge, Button, Cluster, Select, Stack, type SelectOption } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Select/Select.tsx?raw';
import scssSource from '@lib-source/components/Select/Select.module.scss?raw';

// ── Demo data ───────────────────────────────────────────────────────────────

const STATUSES: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
];

const COUNTRIES = [
  {
    label: 'Americas',
    options: [
      { value: 'us', label: 'United States' },
      { value: 'ca', label: 'Canada' },
      { value: 'br', label: 'Brazil' },
    ],
  },
  {
    label: 'Europe',
    options: [
      { value: 'de', label: 'Germany' },
      { value: 'fr', label: 'France' },
      { value: 'gb', label: 'United Kingdom' },
    ],
  },
  {
    label: 'Asia-Pacific',
    options: [
      { value: 'jp', label: 'Japan' },
      { value: 'au', label: 'Australia' },
    ],
  },
];

const MOCK_USERS = [
  { id: 'u1', name: 'Alex Rivera', email: 'alex@example.com' },
  { id: 'u2', name: 'Bea Chen', email: 'bea@example.com' },
  { id: 'u3', name: 'Cam Patel', email: 'cam@example.com' },
  { id: 'u4', name: 'Dani Kowalski', email: 'dani@example.com' },
  { id: 'u5', name: 'Eli Goldberg', email: 'eli@example.com' },
];

async function fakeFetchUsers(query: string, signal: AbortSignal): Promise<SelectOption[]> {
  await new Promise((r) => setTimeout(r, 250));
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const q = query.toLowerCase();
  return MOCK_USERS.filter((u) => u.name.toLowerCase().includes(q)).map((u) => ({
    value: u.id,
    label: u.name,
    description: u.email,
    data: u,
  }));
}

async function flakyFetch(_query: string, signal: AbortSignal): Promise<SelectOption[]> {
  await new Promise((r) => setTimeout(r, 200));
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  if (Math.random() < 0.5) {
    throw new Error('Network glitched. Try again.');
  }
  return MOCK_USERS.slice(0, 3).map((u) => ({ value: u.id, label: u.name }));
}

// ── Page ────────────────────────────────────────────────────────────────────

export function SelectDemo() {
  return (
    <DemoLayout
      name="Select"
      componentName="Select"
      description="Value picker — single, multi (chips and summary), searchable, async, creatable. The generalist."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Select.tsx"
      scssFilename="Select.module.scss"
    >
      <Example
        title="Status — single, non-searchable"
        description="The simplest case. Static options, single value, no search input."
        code={`const [status, setStatus] = useState('');
<Select
  options={STATUSES}
  value={status}
  onChange={(v) => setStatus(v as string)}
  placeholder="Pick a status"
/>`}
      >
        <Cluster gap="md" justify="center">
          <StatusExample />
        </Cluster>
      </Example>

      <Example
        title="Country — single, searchable, grouped"
        description="Options can be nested under group labels. Type to filter; arrow keys traverse across groups."
        code={`<Select
  searchable
  options={COUNTRIES}
  value={country}
  onChange={(v) => setCountry(v as string)}
  placeholder="Search countries…"
/>`}
      >
        <Cluster gap="md" justify="center">
          <CountryExample />
        </Cluster>
      </Example>

      <Example
        title="Assignee — single, async with custom render"
        description="Pass `loadOptions(query, signal)` to fetch on demand. `renderOption` lets the dropdown show whatever you need — avatar + name + email here."
        code={`<Select
  searchable
  loadOptions={fetchUsers}
  value={assignee}
  onChange={(v) => setAssignee(v as string)}
  placeholder="Find a user…"
  renderOption={(opt) => (
    <Cluster gap="sm" align="center">
      <Avatar name={opt.label} size="sm" />
      <Stack gap="xs">
        <span>{opt.label}</span>
        <small>{opt.description}</small>
      </Stack>
    </Cluster>
  )}
/>`}
      >
        <Cluster gap="md" justify="center">
          <AssigneeExample />
        </Cluster>
      </Example>

      <Example
        title="Async + error retry"
        description="The flaky fetch fails ~50% of the time. The listbox surfaces the error with a Retry affordance."
        code={`<Select searchable loadOptions={flakyFetch} placeholder="Pick a user (may fail)" />`}
      >
        <Cluster gap="md" justify="center">
          <div style={{ width: 320 }}>
            <Select searchable loadOptions={flakyFetch} placeholder="Pick a user (may fail)" />
          </div>
        </Cluster>
      </Example>

      <Example
        title="Status filter — multi, summary trigger"
        description="`multiple` + `triggerDisplay='summary'` shows '2 selected' in the trigger. Best for compact filter bars."
        code={`<Select
  multiple
  triggerDisplay="summary"
  searchable
  options={STATUSES}
  value={statusFilter}
  onChange={(v) => setStatusFilter(v as string[])}
  placeholder="Filter by status"
/>`}
      >
        <Cluster gap="md" justify="center">
          <StatusFilterExample />
        </Cluster>
      </Example>

      <Example
        title="Owners — multi, chips trigger"
        description="`triggerDisplay='chips'` (the default for multi) renders each selection as a removable chip in the trigger."
        code={`<Select
  multiple
  triggerDisplay="chips"
  searchable
  loadOptions={fetchUsers}
  value={owners}
  onChange={(v) => setOwners(v as string[])}
  placeholder="Pick owners…"
/>`}
      >
        <Cluster gap="md" justify="center">
          <OwnersExample />
        </Cluster>
      </Example>

      <Example
        title="Tags — multi, chips, searchable, creatable"
        description="`creatable` shows a 'Create &quot;…&quot;' row when the query has no exact match. `onCreate(label)` fires when the user picks it; you decide what to do with the new value."
        code={`<Select
  multiple
  searchable
  creatable
  triggerDisplay="chips"
  options={tagOptions}
  value={tags}
  onChange={(v) => setTags(v as string[])}
  onCreate={(label) => addTag(label)}
  placeholder="Add tags…"
/>`}
      >
        <Cluster gap="md" justify="center">
          <TagsExample />
        </Cluster>
      </Example>

      <Example
        title="Visual states — disabled, readOnly, invalid"
        description="`disabled` blocks all interaction. `readOnly` shows the value but blocks editing. `invalid` paints the trigger with the error ring."
        code={`<Select options={STATUSES} disabled value="pending" />
<Select options={STATUSES} readOnly value="active" />
<Select options={STATUSES} invalid placeholder="Required" />`}
      >
        <Cluster gap="md" wrap justify="center">
          <div style={{ width: 320 }}>
            <Select options={STATUSES} disabled value="pending" />
          </div>
          <div style={{ width: 320 }}>
            <Select options={STATUSES} readOnly value="active" />
          </div>
          <div style={{ width: 320 }}>
            <Select options={STATUSES} invalid placeholder="Required" />
          </div>
        </Cluster>
      </Example>

      <Example
        title="Sizes — sm / md / lg"
        description="`size` controls the trigger height and font size. The listbox typography scales to match."
        code={`<Select options={STATUSES} size="sm" placeholder="sm" />
<Select options={STATUSES} size="md" placeholder="md" />
<Select options={STATUSES} size="lg" placeholder="lg" />`}
      >
        <Cluster gap="md" wrap justify="center">
          <div style={{ width: 320 }}>
            <Select options={STATUSES} size="sm" placeholder="sm" />
          </div>
          <div style={{ width: 320 }}>
            <Select options={STATUSES} size="md" placeholder="md" />
          </div>
          <div style={{ width: 320 }}>
            <Select options={STATUSES} size="lg" placeholder="lg" />
          </div>
        </Cluster>
      </Example>

      <Example
        title="Form integration"
        description="`name` makes Select participate in native FormData. Single values become one entry; multi values become repeated entries. `required` blocks submit when empty."
        code={`<form onSubmit={(e) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  console.log(data.get('status'), data.getAll('tags'));
}}>
  <Select options={STATUSES} name="status" required placeholder="Status (required)" />
  <Select multiple triggerDisplay="chips" searchable creatable
    options={tagOptions} name="tags" placeholder="Tags" />
  <button type="submit">Submit</button>
</form>`}
      >
        <FormExample />
      </Example>
    </DemoLayout>
  );
}

// ── Example components (kept local; they own their state) ───────────────────

function StatusExample() {
  const [status, setStatus] = useState<string>('');
  return (
    <Stack gap="sm" align="start">
      <div style={{ width: 320 }}>
        <Select
          options={STATUSES}
          value={status}
          onChange={(v) => setStatus(v as string)}
          placeholder="Pick a status"
        />
      </div>
      {status ? <Badge tone="info">{status}</Badge> : <Badge tone="neutral">none</Badge>}
    </Stack>
  );
}

function CountryExample() {
  const [country, setCountry] = useState<string>('');
  return (
    <Stack gap="sm" align="start">
      <div style={{ width: 320 }}>
        <Select
          searchable
          options={COUNTRIES}
          value={country}
          onChange={(v) => setCountry(v as string)}
          placeholder="Search countries…"
        />
      </div>
      {country ? <Badge tone="info">{country}</Badge> : <Badge tone="neutral">none</Badge>}
    </Stack>
  );
}

function AssigneeExample() {
  const [assignee, setAssignee] = useState<string>('');
  return (
    <Stack gap="sm" align="start">
      <div style={{ width: 320 }}>
        <Select
          searchable
          loadOptions={fakeFetchUsers}
          value={assignee}
          onChange={(v) => setAssignee(v as string)}
          placeholder="Find a user…"
          renderOption={(opt) => (
            <Cluster gap="sm" align="center">
              <Avatar name={opt.label} size="sm" />
              <Stack gap="xs">
                <span>{opt.label}</span>
                <small style={{ color: 'var(--color-fg-muted)' }}>{opt.description}</small>
              </Stack>
            </Cluster>
          )}
        />
      </div>
      {assignee ? <Badge tone="info">{assignee}</Badge> : <Badge tone="neutral">none</Badge>}
    </Stack>
  );
}

function StatusFilterExample() {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  return (
    <Stack gap="sm" align="start">
      <div style={{ width: 320 }}>
        <Select
          multiple
          triggerDisplay="summary"
          searchable
          options={STATUSES}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as string[])}
          placeholder="Filter by status"
        />
      </div>
      <Cluster gap="xs">
        {statusFilter.length === 0 ? (
          <Badge tone="neutral">none</Badge>
        ) : (
          statusFilter.map((v) => (
            <Badge key={v} tone="info">
              {v}
            </Badge>
          ))
        )}
      </Cluster>
    </Stack>
  );
}

function OwnersExample() {
  const [owners, setOwners] = useState<string[]>([]);
  return (
    <div style={{ width: 320 }}>
      <Select
        multiple
        triggerDisplay="chips"
        searchable
        loadOptions={fakeFetchUsers}
        value={owners}
        onChange={(v) => setOwners(v as string[])}
        placeholder="Pick owners…"
      />
    </div>
  );
}

function TagsExample() {
  const [tags, setTags] = useState<string[]>(['shipping']);
  const [createdLog, setCreatedLog] = useState<string[]>([]);
  return (
    <Stack gap="sm" align="start">
      <div style={{ width: 320 }}>
        <Select
          multiple
          searchable
          creatable
          triggerDisplay="chips"
          options={[
            { value: 'shipping', label: 'shipping' },
            { value: 'urgent', label: 'urgent' },
            { value: 'vip', label: 'vip' },
          ]}
          value={tags}
          onChange={(v) => setTags(v as string[])}
          onCreate={(label) => setCreatedLog((log) => [...log, label])}
          placeholder="Add tags…"
        />
      </div>
      {createdLog.length > 0 && (
        <small>
          Created: <code>{createdLog.join(', ')}</code>
        </small>
      )}
    </Stack>
  );
}

function FormExample() {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        alert(
          `status = ${data.get('status') ?? '(empty)'}\ntags = ${JSON.stringify(data.getAll('tags'))}`,
        );
      }}
    >
      <Stack gap="md">
        <div style={{ width: 320 }}>
          <Select options={STATUSES} name="status" required placeholder="Status (required)" />
        </div>
        <div style={{ width: 320 }}>
          <Select
            multiple
            triggerDisplay="chips"
            searchable
            creatable
            options={[
              { value: 'a', label: 'a' },
              { value: 'b', label: 'b' },
            ]}
            name="tags"
            placeholder="Tags"
          />
        </div>
        <Cluster>
          <Button type="submit" size="sm">
            Submit
          </Button>
        </Cluster>
      </Stack>
    </form>
  );
}
