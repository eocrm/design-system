import { useState } from 'react';
import { Tabs } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Tabs/Tabs.tsx?raw';
import scssSource from '@lib-source/components/Tabs/Tabs.module.scss?raw';

export function TabsDemo() {
  const [t1, setT1] = useState('overview');
  const [t2, setT2] = useState('all');

  return (
    <DemoLayout
      name="Tabs"
      description="Horizontal tab strip with optional count chips. Controlled by the caller: pass activeId and onChange. Best for switching between views of the same entity — not for cross-page navigation."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Tabs.tsx"
      scssFilename="Tabs.module.scss"
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
    </DemoLayout>
  );
}
