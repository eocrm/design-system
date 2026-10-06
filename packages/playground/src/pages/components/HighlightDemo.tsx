import { useState } from 'react';
import {
  Button,
  Cluster,
  Card,
  DashboardCanvas,
  type DashboardCanvasValue,
  Highlight,
  LiveRegion,
  Stack,
  Table,
  Text,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const INITIAL_CANVAS: DashboardCanvasValue = {
  items: [
    { id: 'w1', x: 0, y: 0, w: 4, h: 3 },
    { id: 'w2', x: 4, y: 0, w: 4, h: 3 },
    { id: 'w3', x: 8, y: 0, w: 4, h: 3 },
    { id: 'w4', x: 0, y: 3, w: 4, h: 3 },
    { id: 'w5', x: 4, y: 3, w: 4, h: 3 },
    { id: 'w6', x: 8, y: 3, w: 4, h: 3 },
  ],
  sections: [],
};

function WidgetAdded() {
  const [value, setValue] = useState<DashboardCanvasValue>(INITIAL_CANVAS);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const addWidget = () => {
    const id = `w${value.items.length + 1}`;
    const y = Math.max(0, ...value.items.map((p) => p.y + p.h));
    setValue({ ...value, items: [...value.items, { id, x: 0, y, w: 4, h: 3 }] });
    setAddedId(id);
    setAnnouncement(`Widget ${id} added`);
  };

  return (
    <Stack gap="sm" align="start">
      <Button onClick={addWidget}>Add widget</Button>
      <div style={{ width: 720, maxWidth: '100%', height: 320, overflow: 'auto' }}>
        <DashboardCanvas
          readOnly
          columns={12}
          stackBelow="sm"
          value={value}
          renderItem={(id) => (
            <Highlight active={id === addedId} scrollIntoView focus onDone={() => setAddedId(null)}>
              <Card tabIndex={-1} style={{ height: '100%' }}>
                <Card.Body>Widget {id}</Card.Body>
              </Card>
            </Highlight>
          )}
        />
      </div>
      <LiveRegion>{announcement}</LiveRegion>
    </Stack>
  );
}

interface Contact {
  id: string;
  name: string;
  email: string;
}

const INITIAL_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'c2', name: 'Grace Hopper', email: 'grace@example.com' },
  { id: 'c3', name: 'Alan Turing', email: 'alan@example.com' },
];

function NewTableRow() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [addedId, setAddedId] = useState<string | null>(null);

  const createContact = () => {
    const n = contacts.length + 1;
    const id = `c${n}`;
    setContacts([{ id, name: `New contact ${n}`, email: `contact${n}@example.com` }, ...contacts]);
    setAddedId(id);
  };

  return (
    <Stack gap="sm" align="start">
      <Button onClick={createContact}>Create contact</Button>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Email</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {contacts.map((c) => (
            <Highlight key={c.id} active={c.id === addedId} onDone={() => setAddedId(null)}>
              <Table.Row>
                <Table.Cell>{c.name}</Table.Cell>
                <Table.Cell>{c.email}</Table.Cell>
              </Table.Row>
            </Highlight>
          ))}
        </Table.Body>
      </Table>
    </Stack>
  );
}

const SECTIONS = ['Profile', 'Security', 'Billing'];

function DeepLinkedSection() {
  const [linked, setLinked] = useState(false);

  return (
    <Stack gap="sm" align="start">
      <Cluster gap="sm">
        <Button onClick={() => setLinked(true)}>Jump to Billing</Button>
        <Button variant="secondary" onClick={() => setLinked(false)}>
          Clear
        </Button>
      </Cluster>
      <div style={{ width: '100%', height: 240, overflow: 'auto' }}>
        <Stack gap="md">
          {SECTIONS.map((name) => (
            <Highlight
              key={name}
              active={linked && name === 'Billing'}
              scrollIntoView
              focus
              duration={Infinity}
            >
              <Card tabIndex={-1}>
                <Card.Header>{name}</Card.Header>
                <Card.Body>
                  <Text tone="muted">{name} settings go here.</Text>
                  <div style={{ height: 120 }} />
                </Card.Body>
              </Card>
            </Highlight>
          ))}
        </Stack>
      </div>
    </Stack>
  );
}

export function HighlightDemo() {
  return (
    <DemoLayout
      name="Highlight"
      componentName="Highlight"
      description="A temporary inset attention ring and glow on any single block — a just-added widget, a newly created row, a deep-linked section — with optional scroll into view and focus. Renders no wrapper; pair it with a LiveRegion for screen-reader users."
      files={getComponentFiles('Highlight')}
    >
      <Example
        title="Widget added to a dashboard"
        description="'Add widget' appends a widget below the fold. Highlight scrolls it to the centre of the scroll box, focuses it (the Card has tabIndex={-1}), rings it for 3s, fades, then onDone clears addedId. A LiveRegion announces the addition."
        code={`import { useState } from 'react';
import {
  Button,
  Card,
  DashboardCanvas,
  type DashboardCanvasValue,
  Highlight,
  LiveRegion,
  Stack,
} from '@eocrm/design-system';

const INITIAL_CANVAS: DashboardCanvasValue = {
  items: [
    { id: 'w1', x: 0, y: 0, w: 4, h: 3 },
    { id: 'w2', x: 4, y: 0, w: 4, h: 3 },
    { id: 'w3', x: 8, y: 0, w: 4, h: 3 },
    { id: 'w4', x: 0, y: 3, w: 4, h: 3 },
    { id: 'w5', x: 4, y: 3, w: 4, h: 3 },
    { id: 'w6', x: 8, y: 3, w: 4, h: 3 },
  ],
  sections: [],
};

export function Demo() {
  const [value, setValue] = useState<DashboardCanvasValue>(INITIAL_CANVAS);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const addWidget = () => {
    const id = \`w\${value.items.length + 1}\`;
    const y = Math.max(0, ...value.items.map((p) => p.y + p.h));
    setValue({ ...value, items: [...value.items, { id, x: 0, y, w: 4, h: 3 }] });
    setAddedId(id);
    setAnnouncement(\`Widget \${id} added\`);
  };

  return (
    <Stack gap="sm" align="start">
      <Button onClick={addWidget}>Add widget</Button>
      <div style={{ width: 720, maxWidth: '100%', height: 320, overflow: 'auto' }}>
        <DashboardCanvas
          readOnly
          columns={12}
          stackBelow="sm"
          value={value}
          renderItem={(id) => (
            <Highlight
              active={id === addedId}
              scrollIntoView
              focus
              onDone={() => setAddedId(null)}
            >
              <Card tabIndex={-1} style={{ height: '100%' }}>
                <Card.Body>Widget {id}</Card.Body>
              </Card>
            </Highlight>
          )}
        />
      </div>
      <LiveRegion>{announcement}</LiveRegion>
    </Stack>
  );
}`}
      >
        <WidgetAdded />
      </Example>

      <Example
        title="Just-created table row"
        description="'Create contact' prepends a row and highlights it — no scroll or focus, the row is already in view. Table.Row forwards ref and className, so Highlight wraps it directly with no extra element in the tbody."
        code={`import { useState } from 'react';
import { Button, Highlight, Stack, Table } from '@eocrm/design-system';

interface Contact {
  id: string;
  name: string;
  email: string;
}

const INITIAL_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'c2', name: 'Grace Hopper', email: 'grace@example.com' },
  { id: 'c3', name: 'Alan Turing', email: 'alan@example.com' },
];

export function Demo() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [addedId, setAddedId] = useState<string | null>(null);

  const createContact = () => {
    const n = contacts.length + 1;
    const id = \`c\${n}\`;
    setContacts([{ id, name: \`New contact \${n}\`, email: \`contact\${n}@example.com\` }, ...contacts]);
    setAddedId(id);
  };

  return (
    <Stack gap="sm" align="start">
      <Button onClick={createContact}>Create contact</Button>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Email</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {contacts.map((c) => (
            <Highlight key={c.id} active={c.id === addedId} onDone={() => setAddedId(null)}>
              <Table.Row>
                <Table.Cell>{c.name}</Table.Cell>
                <Table.Cell>{c.email}</Table.Cell>
              </Table.Row>
            </Highlight>
          ))}
        </Table.Body>
      </Table>
    </Stack>
  );
}`}
      >
        <NewTableRow />
      </Example>

      <Example
        title="Deep-linked section"
        description="'Jump to Billing' scrolls the Billing card into view, focuses it and keeps the ring on (duration={Infinity}) until 'Clear' turns active off. Under prefers-reduced-motion the ring is static and the scroll is instant."
        code={`import { useState } from 'react';
import { Button, Card, Cluster, Highlight, Stack, Text } from '@eocrm/design-system';

const SECTIONS = ['Profile', 'Security', 'Billing'];

export function Demo() {
  const [linked, setLinked] = useState(false);

  return (
    <Stack gap="sm" align="start">
      <Cluster gap="sm">
        <Button onClick={() => setLinked(true)}>Jump to Billing</Button>
        <Button variant="secondary" onClick={() => setLinked(false)}>
          Clear
        </Button>
      </Cluster>
      <div style={{ width: '100%', height: 240, overflow: 'auto' }}>
        <Stack gap="md">
          {SECTIONS.map((name) => (
            <Highlight
              key={name}
              active={linked && name === 'Billing'}
              scrollIntoView
              focus
              duration={Infinity}
            >
              <Card tabIndex={-1}>
                <Card.Header>{name}</Card.Header>
                <Card.Body>
                  <Text tone="muted">{name} settings go here.</Text>
                  <div style={{ height: 120 }} />
                </Card.Body>
              </Card>
            </Highlight>
          ))}
        </Stack>
      </div>
    </Stack>
  );
}`}
      >
        <DeepLinkedSection />
      </Example>
    </DemoLayout>
  );
}
