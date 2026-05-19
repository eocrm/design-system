import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ChevronRight, Mail, Phone, MoreHorizontal, Building, MapPin } from 'lucide-react';
import { Avatar } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Tabs } from '@eocrm/design-system';
import { getContact, statusLabel, statusTone } from '../../data/mock';
import styles from './ContactDetail.module.scss';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity', count: 12 },
  { id: 'deals', label: 'Deals', count: 2 },
  { id: 'notes', label: 'Notes', count: 4 },
];

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const contact = id ? getContact(id) : undefined;
  const [activeTab, setActiveTab] = useState('overview');

  if (!contact) return <Navigate to="/contacts" replace />;

  return (
    <Stack gap="lg">
      <nav className={styles.breadcrumb}>
        <Link to="/contacts">Contacts</Link>
        <ChevronRight size={14} aria-hidden />
        <span>{contact.name}</span>
      </nav>

      <div className={styles.header}>
        <Cluster gap="md" align="center" wrap={false}>
          <Avatar name={contact.name} size="lg" />
          <Stack gap="xs">
            <Cluster gap="sm" align="center">
              <h1 className={styles.name}>{contact.name}</h1>
              <Badge tone={statusTone[contact.status]}>{statusLabel[contact.status]}</Badge>
            </Cluster>
            <span className={styles.title}>
              {contact.title} · {contact.company}
            </span>
          </Stack>
        </Cluster>
        <Cluster gap="sm">
          <Button variant="secondary">
            <Mail size={14} /> Email
          </Button>
          <Button variant="secondary">
            <Phone size={14} /> Call
          </Button>
          <Button>Edit</Button>
          <Button variant="ghost" aria-label="More">
            <MoreHorizontal size={16} />
          </Button>
        </Cluster>
      </div>

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className={styles.twoCol}>
          <Stack gap="lg">
            <Card padding="none">
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>About</h2>
              </div>
              <div className={styles.fields}>
                <Field label="Email" value={contact.email} icon={<Mail size={14} />} />
                <Field label="Phone" value="+1 (415) 555-0142" icon={<Phone size={14} />} />
                <Field label="Company" value={contact.company} icon={<Building size={14} />} />
                <Field label="Location" value="San Francisco, CA" icon={<MapPin size={14} />} />
              </div>
            </Card>

            <Card padding="none">
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Recent activity</h2>
                <a href="#" className={styles.cardLink} onClick={(e) => e.preventDefault()}>
                  View all
                </a>
              </div>
              <ul className={styles.timeline}>
                <TimelineItem who="Alex Rivera" when="2h ago">
                  Sent <em>Q3 renewal proposal</em> to {contact.name}.
                </TimelineItem>
                <TimelineItem who={contact.name} when="Yesterday">
                  Replied to thread about pricing.
                </TimelineItem>
                <TimelineItem who="Jordan Park" when="3d ago">
                  Updated company info on {contact.company}.
                </TimelineItem>
                <TimelineItem who="Alex Rivera" when="1w ago">
                  Logged a call — discussed onboarding timeline.
                </TimelineItem>
              </ul>
            </Card>
          </Stack>

          <Stack gap="lg">
            <Card padding="md">
              <Stack gap="sm">
                <h2 className={styles.cardTitle}>Owner</h2>
                <Cluster gap="sm" align="center">
                  <Avatar name={contact.owner} size="md" />
                  <Stack gap="xs">
                    <span className={styles.ownerName}>{contact.owner}</span>
                    <span className={styles.fieldValue}>Account Executive</span>
                  </Stack>
                </Cluster>
              </Stack>
            </Card>

            <Card padding="md">
              <Stack gap="sm">
                <h2 className={styles.cardTitle}>Tags</h2>
                <Cluster gap="xs">
                  <Badge tone="purple">Enterprise</Badge>
                  <Badge tone="info">Pipeline 2026</Badge>
                  <Badge tone="success">Champion</Badge>
                </Cluster>
              </Stack>
            </Card>

            <Card padding="md">
              <Stack gap="sm">
                <h2 className={styles.cardTitle}>Open deals</h2>
                <Stack gap="xs">
                  <div className={styles.dealRow}>
                    <div>
                      <div className={styles.dealRowTitle}>Acme team plan upgrade</div>
                      <div className={styles.fieldValue}>$12,000 · Lead</div>
                    </div>
                  </div>
                  <div className={styles.dealRow}>
                    <div>
                      <div className={styles.dealRowTitle}>Annual renewal</div>
                      <div className={styles.fieldValue}>$18,000 · Qualified</div>
                    </div>
                  </div>
                </Stack>
              </Stack>
            </Card>
          </Stack>
        </div>
      )}

      {activeTab !== 'overview' && (
        <Card padding="lg">
          <p className={styles.empty}>
            <strong>{tabs.find((t) => t.id === activeTab)?.label}</strong> tab content would render
            here. This is a demo — only Overview is populated.
          </p>
        </Card>
      )}
    </Stack>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValueRow}>
        {icon && <span className={styles.fieldIcon}>{icon}</span>}
        <span className={styles.fieldValue}>{value}</span>
      </span>
    </div>
  );
}

function TimelineItem({
  who,
  when,
  children,
}: {
  who: string;
  when: string;
  children: React.ReactNode;
}) {
  return (
    <li className={styles.timelineItem}>
      <Avatar name={who} size="sm" />
      <Stack gap="xs">
        <span className={styles.timelineText}>
          <strong>{who}</strong> {children}
        </span>
        <span className={styles.timelineMeta}>{when}</span>
      </Stack>
    </li>
  );
}
