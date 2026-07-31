import { useState } from 'react';
import {
  Activity,
  CreditCard,
  FileText,
  Mail,
  MoreVertical,
  Plus,
  Settings,
  Shield,
  User,
  X,
} from 'lucide-react';
import { Tabs } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { Split } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Switch } from '@eocrm/design-system';
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

  // Per-tab controls example: an activeId + the Switch's checked state.
  const [pcTab, setPcTab] = useState('auto');
  const [autoOn, setAutoOn] = useState(true);

  // Closeable-tabs example: a local items list + activeId the consumer owns.
  const [closeTabs, setCloseTabs] = useState([
    { id: 'accounts', label: 'Accounts' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'deals', label: 'Deals' },
  ]);
  const [closeActive, setCloseActive] = useState('accounts');
  const closeTab = (id: string) => {
    const idx = closeTabs.findIndex((tab) => tab.id === id);
    const next = closeTabs.filter((tab) => tab.id !== id);
    setCloseTabs(next);
    if (id === closeActive && next.length > 0) {
      setCloseActive(next[Math.min(idx, next.length - 1)].id);
    }
  };

  // Strip-level actions example.
  const [stripTab, setStripTab] = useState('board');

  // Trailing action example: a stateful deal list where the action appends a
  // new tab and selects it — the real product flow, not just a click handler.
  const [dealTabs, setDealTabs] = useState([
    { id: 'acme', label: 'Acme Corp' },
    { id: 'globex', label: 'Globex' },
  ]);
  const [dealActive, setDealActive] = useState('acme');
  const [dealCount, setDealCount] = useState(0);
  const addDeal = () => {
    const n = dealCount + 1;
    const id = `deal-${n}`;
    setDealTabs((prev) => [...prev, { id, label: `New deal ${n}` }]);
    setDealCount(n);
    setDealActive(id);
  };

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
        code={`import { useState } from 'react';
import { Card, Stack, Tabs } from '@eocrm/design-system';

export function Demo() {
  const [activeTab, setActiveTab] = useState('overview');
  return (
    <Stack gap="md">
      <Tabs
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'activity', label: 'Activity' },
          { id: 'notes', label: 'Notes' },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />
      <Card padding="md" style={{ color: 'var(--color-fg-muted)' }}>
        Showing <strong>{activeTab}</strong> panel.
      </Card>
    </Stack>
  );
}`}
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
        code={`import { useState } from 'react';
import { Tabs } from '@eocrm/design-system';

export function Demo() {
  const [tab, setTab] = useState('all');
  return (
    <Tabs
      items={[
        { id: 'all', label: 'All', count: 248 },
        { id: 'open', label: 'Open', count: 32 },
        { id: 'won', label: 'Won', count: 8 },
        { id: 'lost', label: 'Lost', count: 4 },
      ]}
      activeId={tab}
      onChange={setTab}
    />
  );
}`}
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
        code={`import { useState } from 'react';
import { Activity, FileText, Settings, User } from 'lucide-react';
import { Tabs } from '@eocrm/design-system';

export function Demo() {
  const [tab, setTab] = useState('profile');
  return (
    <Tabs
      items={[
        { id: 'profile', label: 'Profile', icon: <User size={14} /> },
        { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
        { id: 'files', label: 'Files', icon: <FileText size={14} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
      ]}
      activeId={tab}
      onChange={setTab}
    />
  );
}`}
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
        code={`import { useState } from 'react';
import { Activity, FileText, Mail } from 'lucide-react';
import { Tabs } from '@eocrm/design-system';

export function Demo() {
  const [tab, setTab] = useState('inbox');
  return (
    <Tabs
      items={[
        { id: 'inbox', label: 'Inbox', icon: <Mail size={14} />, count: 12 },
        { id: 'tasks', label: 'Tasks', icon: <Activity size={14} />, count: 3 },
        { id: 'docs', label: 'Docs', icon: <FileText size={14} /> },
      ]}
      activeId={tab}
      onChange={setTab}
    />
  );
}`}
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
        title="Responsive master–detail"
        description='orientation="auto" keeps the 220px Split rail vertical, then makes the tabs horizontal after Split stacks them above the detail panel. Below 320px, the tablist stays vertical. Use this composition for settings / configuration editors, where each row is a section and the panel reflects the selection.'
        code={`import { useState } from 'react';
import { Activity, CreditCard, Settings, Shield } from 'lucide-react';
import { Badge, Card, Split, Stack, Tabs } from '@eocrm/design-system';

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

export function Demo() {
  const [section, setSection] = useState('general');
  const active = verticalDetail[section];
  return (
    <Split
      gap="lg"
      asideWidth="220px"
      collapseBelow="sm"
      aside={
        <Tabs
          orientation="auto"
          items={[
            {
              id: 'general',
              label: 'General',
              icon: <Settings size={14} />,
              actions: (
                <Button iconOnly size="xs" variant="ghost" aria-label="General options">
                  <MoreVertical size={14} />
                </Button>
              ),
            },
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
      }
    >
      <Card padding="md" style={{ minWidth: 280, color: 'var(--color-fg-muted)' }}>
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
          data-testid="responsive-tabs-split"
          gap="lg"
          asideWidth="220px"
          collapseBelow="sm"
          aside={
            <Tabs
              orientation="auto"
              items={[
                {
                  id: 'general',
                  label: 'General',
                  icon: <Settings size={14} />,
                  actions: (
                    <Button iconOnly size="xs" variant="ghost" aria-label="General options">
                      <MoreVertical size={14} />
                    </Button>
                  ),
                },
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
          }
        >
          <Card padding="md" style={{ minWidth: 280, color: 'var(--color-fg-muted)' }}>
            <Stack gap="xs">
              <strong style={{ color: 'var(--color-fg)' }}>{active.title}</strong>
              <span>{active.body}</span>
            </Stack>
          </Card>
        </Split>
      </Example>

      <Example
        title="Leading / trailing adornments"
        description="leading and trailing are free-form adornments, distinct from the decorative icon and numeric count. leading sits before the icon/label (here a colored sync-status dot); trailing sits at the end (here a Badge). Unlike icon, they are NOT aria-hidden — give meaningful adornments accessible text. The bare status dots below are marked aria-hidden because the trailing Badge already carries the status in words."
        code={`import { useState } from 'react';
import { Badge, Tabs } from '@eocrm/design-system';

function StatusDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block' }}
    />
  );
}

export function Demo() {
  const [stage, setStage] = useState('lead');
  return (
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
      activeId={stage}
      onChange={setStage}
    />
  );
}`}
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

      <Example
        title="Per-tab controls"
        description="Interactive controls (a Switch, a close button) render OUTSIDE the tab's role=tab button via TabItem.actions — so the markup is valid and the control stays focusable and keyboard-operable. Static badges keep using leading/trailing, which render inside the button."
        code={`import { useState } from 'react';
import { Switch, Tabs } from '@eocrm/design-system';

export function Demo() {
  const [tab, setTab] = useState('auto');
  const [autoOn, setAutoOn] = useState(true);
  return (
    <Tabs
      items={[
        {
          id: 'auto',
          label: 'Automation',
          // actions renders OUTSIDE the role="tab" button — valid + keyboard-operable.
          actions: (
            <Switch
              size="sm"
              aria-label="Enable automation"
              checked={autoOn}
              onChange={(next) => setAutoOn(next)}
            />
          ),
        },
        { id: 'fields', label: 'Fields' },
        { id: 'audit', label: 'Audit log' },
      ]}
      activeId={tab}
      onChange={setTab}
    />
  );
}`}
      >
        <Tabs
          items={[
            {
              id: 'auto',
              label: 'Automation',
              actions: (
                <Switch
                  size="sm"
                  aria-label="Enable automation"
                  checked={autoOn}
                  onChange={(next) => setAutoOn(next)}
                />
              ),
            },
            { id: 'fields', label: 'Fields' },
            { id: 'audit', label: 'Audit log' },
          ]}
          activeId={pcTab}
          onChange={setPcTab}
        />
      </Example>

      <Example
        title="Closeable tabs"
        description="actions is a generic slot, so closeable tabs need no dedicated API: put a ✕ Button in each tab's actions and let the consumer own removal — filter the item out of local state and re-point activeId when the closed tab was active."
        code={`import { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Tabs } from '@eocrm/design-system';

export function Demo() {
  const [tabs, setTabs] = useState([
    { id: 'accounts', label: 'Accounts' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'deals', label: 'Deals' },
  ]);
  const [active, setActive] = useState('accounts');

  const closeTab = (id: string) => {
    const idx = tabs.findIndex((tab) => tab.id === id);
    const next = tabs.filter((tab) => tab.id !== id);
    setTabs(next);
    if (id === active && next.length > 0) {
      setActive(next[Math.min(idx, next.length - 1)].id);
    }
  };

  return (
    <Tabs
      items={tabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        actions: (
          <Button
            iconOnly
            size="xs"
            variant="ghost"
            aria-label={\`Close \${tab.label}\`}
            onClick={() => closeTab(tab.id)}
          >
            <X size={12} />
          </Button>
        ),
      }))}
      activeId={active}
      onChange={setActive}
    />
  );
}`}
      >
        <Tabs
          items={closeTabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            actions: (
              <Button
                iconOnly
                size="xs"
                variant="ghost"
                aria-label={`Close ${tab.label}`}
                onClick={() => closeTab(tab.id)}
              >
                <X size={12} />
              </Button>
            ),
          }))}
          activeId={closeActive}
          onChange={setCloseActive}
        />
      </Example>

      <Example
        title="Strip-level actions"
        description="endContent renders controls for the whole bar (an add-tab button, a filter toggle) at the end of the strip, OUTSIDE the tablist — so they never scroll with the tabs and aren't part of arrow-key tab navigation. For a control attached to a single tab, use TabItem.actions instead."
        code={`import { useState } from 'react';
import { Button, Tabs } from '@eocrm/design-system';

export function Demo() {
  const [tab, setTab] = useState('board');
  return (
    <Tabs
      items={[
        { id: 'board', label: 'Board' },
        { id: 'list', label: 'List' },
        { id: 'calendar', label: 'Calendar' },
      ]}
      activeId={tab}
      onChange={setTab}
      endContent={<Button size="sm">+ New tab</Button>}
    />
  );
}`}
      >
        <Tabs
          items={[
            { id: 'board', label: 'Board' },
            { id: 'list', label: 'List' },
            { id: 'calendar', label: 'Calendar' },
          ]}
          activeId={stripTab}
          onChange={setStripTab}
          endContent={<Button size="sm">+ New tab</Button>}
        />
      </Example>

      <Example
        title="Trailing action"
        description="action renders a button-like pseudo-tab after the tab items, in the same strip. Unlike endContent, it's styled to match the tab rhythm (just visibly muted) and sits right where the next tab would go. Clicking it never selects it — it only fires onClick, so the consumer decides what happens (here: append a new tab and select it)."
        code={`import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Tabs } from '@eocrm/design-system';

export function Demo() {
  const [tabs, setTabs] = useState([
    { id: 'acme', label: 'Acme Corp' },
    { id: 'globex', label: 'Globex' },
  ]);
  const [active, setActive] = useState('acme');
  const [count, setCount] = useState(0);

  const addDeal = () => {
    const n = count + 1;
    const id = \`deal-\${n}\`;
    setTabs((prev) => [...prev, { id, label: \`New deal \${n}\` }]);
    setCount(n);
    setActive(id);
  };

  return (
    <Tabs
      items={tabs}
      activeId={active}
      onChange={setActive}
      action={{ label: 'New deal', icon: <Plus size={14} />, onClick: addDeal }}
    />
  );
}`}
      >
        <Tabs
          items={dealTabs}
          activeId={dealActive}
          onChange={setDealActive}
          action={{ label: 'New deal', icon: <Plus size={14} />, onClick: addDeal }}
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
