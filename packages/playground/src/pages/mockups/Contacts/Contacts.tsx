import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Plus, Filter, ChevronDown } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Cluster,
  DropdownMenu,
  Input,
  Link,
  PersonDisplay,
  Stack,
  Table,
  Text,
  Title,
} from '@eocrm/design-system';
import { contacts, statusTone, statusLabel } from '../../../data/mock';
import { CrossLinks } from '../../shared/CrossLinks';

const statusFilterLabel: Record<string, string> = {
  all: 'All',
  active: 'Active',
  lead: 'Lead',
  churned: 'Churned',
};

const owners = ['all', 'Alex Rivera', 'Jordan Park', 'Sam Chen', 'Maya Owens'];

export function Contacts() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');

  return (
    <Stack gap="lg">
      <Cluster justify="between" align="end" gap="md">
        <Stack gap="xs">
          <Title order={1}>Contacts</Title>
          <Text tone="muted">{contacts.length} contacts</Text>
        </Stack>
        <Cluster gap="sm">
          <Button variant="secondary">
            <Filter size={14} /> Filter
          </Button>
          <Button>
            <Plus size={14} /> Add contact
          </Button>
        </Cluster>
      </Cluster>

      <Card padding="sm">
        <Cluster justify="between" align="center" gap="md" wrap={false}>
          <Input placeholder="Search by name, email, or company…" />
          <Cluster gap="sm" wrap={false}>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="secondary" size="sm">
                  Status: {statusFilterLabel[statusFilter]} <ChevronDown size={12} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.RadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                  <DropdownMenu.RadioItem value="all">All</DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem value="active">Active</DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem value="lead">Lead</DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem value="churned">Churned</DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="secondary" size="sm">
                  Owner: {ownerFilter === 'all' ? 'All' : ownerFilter} <ChevronDown size={12} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.RadioGroup value={ownerFilter} onValueChange={setOwnerFilter}>
                  {owners.map((o) => (
                    <DropdownMenu.RadioItem key={o} value={o}>
                      {o === 'all' ? 'All' : o}
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu>
          </Cluster>
        </Cluster>
      </Card>

      <Table hover>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>
              <Checkbox aria-label="Select all" />
            </Table.HeaderCell>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Company</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Owner</Table.HeaderCell>
            <Table.HeaderCell>Last activity</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {contacts.map((c) => (
            <Table.Row key={c.id}>
              <Table.Cell>
                <Checkbox aria-label={`Select ${c.name}`} />
              </Table.Cell>
              <Table.Cell>
                <PersonDisplay size="sm">
                  <PersonDisplay.Avatar name={c.name} />
                  <PersonDisplay.Name>
                    <Link as={RouterLink} to={`/mockups/contacts/${c.id}`} variant="subtle">
                      {c.name}
                    </Link>
                  </PersonDisplay.Name>
                  <PersonDisplay.Description>{c.title}</PersonDisplay.Description>
                </PersonDisplay>
              </Table.Cell>
              <Table.Cell>
                <Stack gap="xs">
                  <Text as="span" weight="medium">
                    {c.company}
                  </Text>
                  <Text as="span" size="sm" tone="subtle">
                    {c.email}
                  </Text>
                </Stack>
              </Table.Cell>
              <Table.Cell>
                <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
              </Table.Cell>
              <Table.Cell>
                <PersonDisplay size="sm">
                  <PersonDisplay.Avatar name={c.owner} />
                  <PersonDisplay.Name>{c.owner}</PersonDisplay.Name>
                </PersonDisplay>
              </Table.Cell>
              <Table.Cell>
                <Text as="span" size="sm" tone="subtle">
                  {c.lastActivity}
                </Text>
              </Table.Cell>
              <Table.Cell align="end">
                <Link as={RouterLink} to={`/mockups/contacts/${c.id}`}>
                  View
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      <CrossLinks kind="mockup" slug="contacts" />
    </Stack>
  );
}
