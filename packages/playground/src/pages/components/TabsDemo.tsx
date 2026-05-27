import { useState } from 'react';
import { Activity, FileText, Mail, Settings, User } from 'lucide-react';
import { Tabs } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function TabsDemo() {
  const [t1, setT1] = useState('overview');
  const [t2, setT2] = useState('all');
  const [t3, setT3] = useState('profile');
  const [t4, setT4] = useState('inbox');

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
    </DemoLayout>
  );
}
