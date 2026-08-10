import { useState } from 'react';
import { Activity, CreditCard, Settings, Shield } from 'lucide-react';
import { Badge } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { Split } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Tabs, type TabItem } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';
import { ResizablePreview } from './ResizablePreview';

const sections: Record<string, { title: string; body: string }> = {
  general: { title: 'General', body: 'Workspace name, locale, and default landing page.' },
  security: {
    title: 'Security',
    body: 'SSO, session timeout, and IP allow-list. Unsaved changes.',
  },
  activity: { title: 'Activity', body: 'Audit log of configuration changes (14 this month).' },
  billing: { title: 'Billing', body: 'Plan, seats, and invoices.' },
};

const settingsTabs: TabItem[] = [
  { id: 'general', label: 'General', icon: <Settings size={14} /> },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield size={14} />,
    trailing: <Badge tone="warning">Unsaved</Badge>,
  },
  { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 14 },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={14} />, count: 3 },
];

export function SplitDemo() {
  const [section, setSection] = useState('general');
  const [sectionEnd, setSectionEnd] = useState('general');
  const [sectionCollapse, setSectionCollapse] = useState('general');
  const [sectionCollapseEnd, setSectionCollapseEnd] = useState('general');
  const active = sections[section];
  const activeEnd = sections[sectionEnd];
  const activeCollapse = sections[sectionCollapse];
  const activeCollapseEnd = sections[sectionCollapseEnd];

  return (
    <DemoLayout
      name="Split"
      description="Master–detail layout primitive: an intrinsic-width aside pane beside a filling main pane (CSS grid auto 1fr). Never wraps. For a vertical Tabs rail beside its detail panel, a filter column beside results, etc."
      files={getComponentFiles('Split')}
      componentName="Split"
    >
      <Example
        title="Vertical Tabs rail + detail panel (canonical)"
        description="aside holds the narrow vertical Tabs rail; children is the filling detail panel. The panel sits to the right and fills remaining width at any container size — no wrapping."
        code={`import { useState } from 'react';
import { Activity, CreditCard, Settings, Shield } from 'lucide-react';
import { Badge, Card, Split, Stack, Tabs, type TabItem } from '@eocrm/design-system';

const sections: Record<string, { title: string; body: string }> = {
  general: { title: 'General', body: 'Workspace name, locale, and default landing page.' },
  security: {
    title: 'Security',
    body: 'SSO, session timeout, and IP allow-list. Unsaved changes.',
  },
  activity: { title: 'Activity', body: 'Audit log of configuration changes (14 this month).' },
  billing: { title: 'Billing', body: 'Plan, seats, and invoices.' },
};

const settingsTabs: TabItem[] = [
  { id: 'general', label: 'General', icon: <Settings size={14} /> },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield size={14} />,
    trailing: <Badge tone="warning">Unsaved</Badge>,
  },
  { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 14 },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={14} />, count: 3 },
];

export function Demo() {
  const [section, setSection] = useState('general');
  const active = sections[section];

  return (
    <Split
      gap="lg"
      aside={
        <Tabs
          orientation="vertical"
          items={settingsTabs}
          activeId={section}
          onChange={setSection}
        />
      }
    >
      <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
        <Stack gap="xs">
          <strong style={{ color: 'var(--color-fg)' }}>{active.title}</strong>
          <span>{active.body}</span>
        </Stack>
      </Card>
    </Split>
  );
}`}
      >
        <Split
          gap="lg"
          aside={
            <Tabs
              orientation="vertical"
              items={settingsTabs}
              activeId={section}
              onChange={setSection}
            />
          }
        >
          <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
            <Stack gap="xs">
              <strong style={{ color: 'var(--color-fg)' }}>{active.title}</strong>
              <span>{active.body}</span>
            </Stack>
          </Card>
        </Split>
      </Example>

      <Example
        title="side='end' + pinned asideWidth"
        description="side='end' moves the aside to the trailing edge; asideWidth pins the rail width so the main panel doesn't reflow as the active row's adornments change."
        code={`import { useState } from 'react';
import { Activity, CreditCard, Settings, Shield } from 'lucide-react';
import { Badge, Card, Split, Stack, Tabs, type TabItem } from '@eocrm/design-system';

const sections: Record<string, { title: string; body: string }> = {
  general: { title: 'General', body: 'Workspace name, locale, and default landing page.' },
  security: {
    title: 'Security',
    body: 'SSO, session timeout, and IP allow-list. Unsaved changes.',
  },
  activity: { title: 'Activity', body: 'Audit log of configuration changes (14 this month).' },
  billing: { title: 'Billing', body: 'Plan, seats, and invoices.' },
};

const settingsTabs: TabItem[] = [
  { id: 'general', label: 'General', icon: <Settings size={14} /> },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield size={14} />,
    trailing: <Badge tone="warning">Unsaved</Badge>,
  },
  { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 14 },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={14} />, count: 3 },
];

export function Demo() {
  const [sectionEnd, setSectionEnd] = useState('general');
  const activeEnd = sections[sectionEnd];

  return (
    <Split
      side="end"
      asideWidth="200px"
      gap="lg"
      aside={
        <Tabs
          orientation="vertical"
          items={settingsTabs}
          activeId={sectionEnd}
          onChange={setSectionEnd}
        />
      }
    >
      <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
        <Stack gap="xs">
          <strong style={{ color: 'var(--color-fg)' }}>{activeEnd.title}</strong>
          <span>{activeEnd.body}</span>
        </Stack>
      </Card>
    </Split>
  );
}`}
      >
        <Split
          side="end"
          asideWidth="200px"
          gap="lg"
          aside={
            <Tabs
              orientation="vertical"
              items={settingsTabs}
              activeId={sectionEnd}
              onChange={setSectionEnd}
            />
          }
        >
          <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
            <Stack gap="xs">
              <strong style={{ color: 'var(--color-fg)' }}>{activeEnd.title}</strong>
              <span>{activeEnd.body}</span>
            </Stack>
          </Card>
        </Split>
      </Example>

      <Example
        title="collapseBelow — stacks on narrow containers"
        description="collapseBelow='sm' stacks the two panes into one column once the SPLIT'S OWN width (container query, not the viewport) drops below 480px — without it a pinned 220px rail squeezes the panel to nothing. Panes stack in DOM order: aside on top for side='start', main on top for side='end' (no CSS order flip, so visual order stays in sync with tab order). Drag each box's resize handle (bottom-right corner) narrower to see it collapse."
        code={`import { useState } from 'react';
import { Card, Split, Stack, Tabs } from '@eocrm/design-system';

export function Demo() {
  const [section, setSection] = useState('general');
  const active = sections[section];

  return (
    <Split
      asideWidth="220px"
      gap="lg"
      collapseBelow="sm"
      aside={
        <Tabs
          orientation="vertical"
          items={settingsTabs}
          activeId={section}
          onChange={setSection}
        />
      }
    >
      <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
        <Stack gap="xs">
          <strong style={{ color: 'var(--color-fg)' }}>{active.title}</strong>
          <span>{active.body}</span>
        </Stack>
      </Card>
    </Split>
  );
}`}
      >
        <Stack gap="lg">
          <ResizablePreview>
            <Split
              asideWidth="220px"
              gap="lg"
              collapseBelow="sm"
              aside={
                <Tabs
                  orientation="vertical"
                  items={settingsTabs}
                  activeId={sectionCollapse}
                  onChange={setSectionCollapse}
                />
              }
            >
              <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
                <Stack gap="xs">
                  <strong style={{ color: 'var(--color-fg)' }}>{activeCollapse.title}</strong>
                  <span>{activeCollapse.body}</span>
                </Stack>
              </Card>
            </Split>
          </ResizablePreview>
          <ResizablePreview>
            <Split
              side="end"
              asideWidth="220px"
              gap="lg"
              collapseBelow="sm"
              aside={
                <Tabs
                  orientation="vertical"
                  items={settingsTabs}
                  activeId={sectionCollapseEnd}
                  onChange={setSectionCollapseEnd}
                />
              }
            >
              <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
                <Stack gap="xs">
                  <strong style={{ color: 'var(--color-fg)' }}>{activeCollapseEnd.title}</strong>
                  <span>{activeCollapseEnd.body}</span>
                </Stack>
              </Card>
            </Split>
          </ResizablePreview>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
