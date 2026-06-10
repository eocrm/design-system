import { useState } from 'react';
import { Activity, CreditCard, FileText, Mail, Settings, Shield, User } from 'lucide-react';
import { Tabs } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function TabsDemo() {
  const [t1, setT1] = useState('overview');
  const [t2, setT2] = useState('all');
  const [t3, setT3] = useState('profile');
  const [t4, setT4] = useState('inbox');
  const [vTab, setVTab] = useState('general');
  const [t5, setT5] = useState('lead');

  const verticalDetail: Record<string, { title: string; body: string }> = {
    general: {
      title: 'General',
      body: 'Workspace name, default currency, and time zone for this account.',
    },
    security: {
      title: 'Security',
      body: 'Password policy, two-factor enforcement, and active session management.',
    },
    activity: {
      title: 'Activity log',
      body: '14 recent events — logins, record edits, and permission changes.',
    },
    billing: {
      title: 'Billing',
      body: 'Plan, payment method, and the 3 invoices issued this quarter.',
    },
  };
  const active = verticalDetail[vTab];

  return (
    <DemoLayout
      name="Tabs"
      description="Horizontal tab strip with optional count chips. Controlled by the caller: pass activeId and onChange. Best for switching between views of the same entity — not for cross-page navigation."
      files={getComponentFiles('Tabs')}
      componentName="Tabs"
    >
      <Example
        title="Basic"
        description="Pass items as an array of { id, label }. Track activeId in caller state. Use the active id to conditionally render the panel below."
        code={`const [activeTab, setActiveTab] = useState('overview');

<Tabs
  items={[
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'notes', label: 'Notes' },
  ]}
  activeId={activeTab}
  onChange={setActiveTab}
/>
{activeTab === 'overview' && <OverviewPanel />}`}
      >
        <Stack gap="md">
          <Tabs
            items={[
              { id: 'overview', label: 'Overview' },
              { id: 'activity', label: 'Activity' },
              { id: 'notes', label: 'Notes' },
            ]}
            activeId={t1}
            onChange={setT1}
          />
          <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
            Showing <strong>{t1}</strong> panel.
          </Card>
        </Stack>
      </Example>

      <Example
        title="With count chips"
        description="Add count to any item for a chip showing the number of records in that view. The chip color shifts when the tab is active."
        code={`<Tabs
  items={[
    { id: 'all', label: 'All', count: 248 },
    { id: 'open', label: 'Open', count: 32 },
    { id: 'won', label: 'Won', count: 8 },
    { id: 'lost', label: 'Lost', count: 4 },
  ]}
  activeId={tab}
  onChange={setTab}
/>`}
      >
        <Tabs
          items={[
            { id: 'all', label: 'All', count: 248 },
            { id: 'open', label: 'Open', count: 32 },
            { id: 'won', label: 'Won', count: 8 },
            { id: 'lost', label: 'Lost', count: 4 },
          ]}
          activeId={t2}
          onChange={setT2}
        />
      </Example>

      <Example
        title="With leading icons"
        description="Each TabItem accepts an optional icon (typically a lucide-react glyph). The icon renders before the label and inherits the tab's color so it dims when inactive and shifts to accent when active. The icon is decorative (aria-hidden) — the label carries the accessible name."
        code={`<Tabs
  items={[
    { id: 'profile', label: 'Profile', icon: <User size={14} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
    { id: 'files', label: 'Files', icon: <FileText size={14} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
  ]}
  activeId={tab}
  onChange={setTab}
/>`}
      >
        <Tabs
          items={[
            { id: 'profile', label: 'Profile', icon: <User size={14} /> },
            { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
            { id: 'files', label: 'Files', icon: <FileText size={14} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
          ]}
          activeId={t3}
          onChange={setT3}
        />
      </Example>

      <Example
        title="Icons + counts together"
        description="Icon and count can coexist — icon renders before the label, count renders after."
        code={`<Tabs
  items={[
    { id: 'inbox', label: 'Inbox', icon: <Mail size={14} />, count: 12 },
    { id: 'tasks', label: 'Tasks', icon: <Activity size={14} />, count: 3 },
    { id: 'docs', label: 'Docs', icon: <FileText size={14} /> },
  ]}
  activeId={tab}
  onChange={setTab}
/>`}
      >
        <Tabs
          items={[
            { id: 'inbox', label: 'Inbox', icon: <Mail size={14} />, count: 12 },
            { id: 'tasks', label: 'Tasks', icon: <Activity size={14} />, count: 3 },
            { id: 'docs', label: 'Docs', icon: <FileText size={14} /> },
          ]}
          activeId={t4}
          onChange={setT4}
        />
      </Example>

      <Example
        title="Vertical (master–detail)"
        description='orientation="vertical" renders a stacked rail of full-width rows — the active row gets a left accent bar and a subtly tinted background, and ArrowUp/ArrowDown move between rows. Place the rail beside its detail panel (here in a Cluster gap="lg" align="start"). Best for settings / configuration editors, where each row is a section and the panel reflects the selection.'
        code={`const [section, setSection] = useState('general');

<Cluster gap="lg" align="start">
  <Tabs
    orientation="vertical"
    items={[
      { id: 'general', label: 'General', icon: <Settings size={14} /> },
      {
        id: 'security',
        label: 'Security',
        icon: <Shield size={14} />,
        trailing: <Badge tone="warning">Unsaved</Badge>,
      },
      { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 14 },
      { id: 'billing', label: 'Billing', icon: <CreditCard size={14} />, count: 3 },
    ]}
    activeId={section}
    onChange={setSection}
  />
  <Card padding="md">{/* panel for the active section */}</Card>
</Cluster>`}
      >
        <Cluster gap="lg" align="start">
          <Tabs
            orientation="vertical"
            items={[
              { id: 'general', label: 'General', icon: <Settings size={14} /> },
              {
                id: 'security',
                label: 'Security',
                icon: <Shield size={14} />,
                trailing: <Badge tone="warning">Unsaved</Badge>,
              },
              { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 14 },
              { id: 'billing', label: 'Billing', icon: <CreditCard size={14} />, count: 3 },
            ]}
            activeId={vTab}
            onChange={setVTab}
          />
          <Card padding="md" style={{ minWidth: 280, color: 'var(--color-fg-muted)' }}>
            <Stack gap="xs">
              <strong style={{ color: 'var(--color-fg)' }}>{active.title}</strong>
              <span>{active.body}</span>
            </Stack>
          </Card>
        </Cluster>
      </Example>

      <Example
        title="Leading / trailing adornments"
        description="leading and trailing are free-form adornments, distinct from the decorative icon and numeric count. leading sits before the icon/label (here a colored sync-status dot); trailing sits at the end (here a Badge). Unlike icon, they are NOT aria-hidden — give meaningful adornments accessible text. The bare status dots below are marked aria-hidden because the trailing Badge already carries the status in words."
        code={`<Tabs
  items={[
    {
      id: 'lead',
      label: 'Leads',
      leading: <span style={{ /* token-colored dot */ }} aria-hidden />,
      trailing: <Badge tone="info">Syncing</Badge>,
    },
    {
      id: 'won',
      label: 'Won',
      leading: <span style={{ /* token-colored dot */ }} aria-hidden />,
      trailing: <Badge tone="success">Live</Badge>,
    },
    {
      id: 'lost',
      label: 'Lost',
      leading: <span style={{ /* token-colored dot */ }} aria-hidden />,
      trailing: <Badge tone="danger">Failed</Badge>,
    },
  ]}
  activeId={stage}
  onChange={setStage}
/>`}
      >
        <Tabs
          items={[
            {
              id: 'lead',
              label: 'Leads',
              leading: <StatusDot color="var(--color-info)" />,
              trailing: <Badge tone="info">Syncing</Badge>,
            },
            {
              id: 'won',
              label: 'Won',
              leading: <StatusDot color="var(--color-success)" />,
              trailing: <Badge tone="success">Live</Badge>,
            },
            {
              id: 'lost',
              label: 'Lost',
              leading: <StatusDot color="var(--color-danger)" />,
              trailing: <Badge tone="danger">Failed</Badge>,
            },
          ]}
          activeId={t5}
          onChange={setT5}
        />
      </Example>
    </DemoLayout>
  );
}

function StatusDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block' }}
    />
  );
}
