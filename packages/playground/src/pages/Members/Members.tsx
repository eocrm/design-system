import { useState } from 'react';
import { UserPlus, MoreHorizontal, MailPlus, Trash2 } from 'lucide-react';
import { Avatar } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Tabs } from '@eocrm/design-system';
import { Input } from '@eocrm/design-system';
import {
  members,
  pendingInvites,
  roleTone,
  roleLabel,
  seatLimit,
} from '../../data/mock';
import styles from './Members.module.scss';

export function Members() {
  const [activeTab, setActiveTab] = useState('active');
  const seatsUsed = members.length;
  const seatsPercent = Math.min(100, (seatsUsed / seatLimit) * 100);

  const tabs = [
    { id: 'active', label: 'Active', count: members.length },
    { id: 'invites', label: 'Invitations', count: pendingInvites.length },
  ];

  return (
    <Stack gap="lg">
      <Cluster justify="between" align="end" gap="md">
        <div>
          <h1 className={styles.title}>Members</h1>
          <p className={styles.subtitle}>
            People with access to your Orbit CRM workspace.
          </p>
        </div>
        <Button>
          <UserPlus size={14} /> Invite members
        </Button>
      </Cluster>

      <Card padding="md">
        <Cluster justify="between" align="center" gap="md" wrap={false}>
          <Stack gap="xs">
            <span className={styles.seatsLabel}>Seats used</span>
            <span className={styles.seatsValue}>
              {seatsUsed} <span className={styles.seatsLimit}>of {seatLimit}</span>
            </span>
            <span className={styles.seatsHint}>
              {seatLimit - seatsUsed} seats remaining on your current plan.
            </span>
          </Stack>
          <div className={styles.seatsBarWrap}>
            <div
              className={styles.seatsBar}
              role="progressbar"
              aria-valuenow={seatsUsed}
              aria-valuemin={0}
              aria-valuemax={seatLimit}
            >
              <div className={styles.seatsBarFill} style={{ width: `${seatsPercent}%` }} />
            </div>
            <Button variant="secondary" size="sm">
              Upgrade plan
            </Button>
          </div>
        </Cluster>
      </Card>

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'active' && (
        <Stack gap="md">
          <div className={styles.searchRow}>
            <div className={styles.searchWrap}>
              <Input placeholder="Search members by name or email…" />
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Job title</th>
                  <th>Role</th>
                  <th>Last active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Cluster gap="sm" align="center" wrap={false}>
                        <div className={styles.avatarWrap}>
                          <Avatar name={m.name} size="md" />
                          {m.online && <span className={styles.onlineDot} aria-label="Online" />}
                        </div>
                        <Stack gap="xs">
                          <span className={styles.name}>{m.name}</span>
                          <span className={styles.meta}>{m.email}</span>
                        </Stack>
                      </Cluster>
                    </td>
                    <td className={styles.meta}>{m.jobTitle}</td>
                    <td>
                      <Badge tone={roleTone[m.role]}>{roleLabel[m.role]}</Badge>
                    </td>
                    <td className={styles.meta}>{m.lastActive}</td>
                    <td className={styles.rowActions}>
                      <button type="button" className={styles.rowActionBtn} aria-label="More">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Stack>
      )}

      {activeTab === 'invites' && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Invited by</th>
                <th>Sent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pendingInvites.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Cluster gap="sm" align="center" wrap={false}>
                      <span className={styles.inviteAvatar} aria-hidden>
                        <MailPlus size={14} />
                      </span>
                      <span className={styles.name}>{inv.email}</span>
                      <Badge tone="warning">Pending</Badge>
                    </Cluster>
                  </td>
                  <td>
                    <Badge tone={roleTone[inv.role]}>{roleLabel[inv.role]}</Badge>
                  </td>
                  <td>
                    <Cluster gap="sm" align="center" wrap={false}>
                      <Avatar name={inv.invitedBy} size="sm" />
                      <span>{inv.invitedBy}</span>
                    </Cluster>
                  </td>
                  <td className={styles.meta}>{inv.invitedAt}</td>
                  <td className={styles.rowActions}>
                    <Cluster gap="xs" justify="end" wrap={false}>
                      <Button variant="ghost" size="sm">
                        Resend
                      </Button>
                      <button
                        type="button"
                        className={styles.rowActionBtn}
                        aria-label="Revoke invitation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Cluster>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Stack>
  );
}
