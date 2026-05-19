import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, ChevronDown } from 'lucide-react';
import { Avatar } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Input } from '@eocrm/design-system';
import { DropdownMenu } from '@eocrm/design-system';
import { contacts, statusTone, statusLabel } from '../../../data/mock';
import styles from './Contacts.module.scss';
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
        <div>
          <h1 className={styles.title}>Contacts</h1>
          <p className={styles.subtitle}>{contacts.length} contacts</p>
        </div>
        <Cluster gap="sm">
          <Button variant="secondary">
            <Filter size={14} /> Filter
          </Button>
          <Button>
            <Plus size={14} /> Add contact
          </Button>
        </Cluster>
      </Cluster>

      <div className={styles.toolbar}>
        <div className={styles.searchInTable}>
          <Input placeholder="Search by name, email, or company…" />
        </div>
        <Cluster gap="sm">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <button className={styles.toolbarBtn} type="button">
                Status: {statusFilterLabel[statusFilter]} <ChevronDown size={12} />
              </button>
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
              <button className={styles.toolbarBtn} type="button">
                Owner: {ownerFilter === 'all' ? 'All' : ownerFilter} <ChevronDown size={12} />
              </button>
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
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <input type="checkbox" aria-label="Select all" />
              </th>
              <th>Name</th>
              <th>Company</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Last activity</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td className={styles.checkboxCell}>
                  <input type="checkbox" aria-label={`Select ${c.name}`} />
                </td>
                <td>
                  <Cluster gap="sm" align="center" wrap={false}>
                    <Avatar name={c.name} size="sm" />
                    <Stack gap="xs">
                      <Link to={`/mockups/contacts/${c.id}`} className={styles.nameLink}>
                        {c.name}
                      </Link>
                      <span className={styles.meta}>{c.title}</span>
                    </Stack>
                  </Cluster>
                </td>
                <td>
                  <Stack gap="xs">
                    <span className={styles.companyName}>{c.company}</span>
                    <span className={styles.meta}>{c.email}</span>
                  </Stack>
                </td>
                <td>
                  <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
                </td>
                <td>
                  <Cluster gap="sm" align="center" wrap={false}>
                    <Avatar name={c.owner} size="sm" />
                    <span>{c.owner}</span>
                  </Cluster>
                </td>
                <td className={styles.meta}>{c.lastActivity}</td>
                <td className={styles.rowActions}>
                  <Link to={`/mockups/contacts/${c.id}`} className={styles.viewLink}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CrossLinks kind="mockup" slug="contacts" />
    </Stack>
  );
}
