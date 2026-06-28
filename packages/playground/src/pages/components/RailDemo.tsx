import { useState } from 'react';
// Note: this demo intentionally uses plain <a> with aria-current="page" for
// the "active" example. react-router's NavLink can't be used here because the
// playground already mounts a top-level <BrowserRouter>, and nesting Routers
// is forbidden. The active styling is purely CSS via [aria-current="page"],
// so a hard-coded anchor demonstrates the contract identically.
import {
  Activity,
  Building2,
  Bell,
  Cog,
  Home,
  KanbanSquare,
  Layers,
  Mail,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge, Button, Cluster, Rail, Stack, Text, useRail } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

/**
 * Visual container that constrains a Rail to a believable height + sets a
 * neutral background so the rail's border and tonal contrast read.
 */
function RailStage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: 480,
        minHeight: 480,
        display: 'flex',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        overflow: 'hidden',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div
        style={{
          flex: '1 1 auto',
          padding: 'var(--space-4)',
          color: 'var(--color-fg-muted)',
        }}
      >
        <Text tone="muted">Main content area — the rail is to the left.</Text>
      </div>
    </div>
  );
}

function BrandMark() {
  // Read the rail's collapsed state so the wordmark "Railside" hides when
  // the rail narrows — leaving only the centered "R" logo, mirroring the
  // Atlassian / Jira behavior where the brand collapses to a glyph.
  const { collapsed } = useRail();
  return (
    <Cluster gap="sm" align="center" wrap={false} justify={collapsed ? 'center' : 'start'}>
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent)',
          color: 'var(--color-accent-fg)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'var(--font-weight-semibold)',
          flexShrink: 0,
        }}
      >
        R
      </div>
      {!collapsed && <Text weight="semibold">Railside</Text>}
    </Cluster>
  );
}

export function RailDemo() {
  // Example 3: controlled state driven by a sibling button outside the rail.
  const [controlledCollapsed, setControlledCollapsed] = useState(false);

  return (
    <DemoLayout
      name="Rail"
      componentName="Rail"
      description="Collapsible left-side navigation rail with sections, items, parent groups, and a hover-popover that surfaces a group's subitems when the rail is collapsed. Polymorphic items integrate with any router via aria-current."
      files={getComponentFiles('Rail')}
    >
      <Example
        title="Default — uncontrolled, with sections, items, and a group"
        description="Start with `defaultCollapsed={false}` and let the built-in CollapseToggle in the footer drive the state. Sections group related items; a Rail.Group renders inline when expanded."
        code={`import { type ReactNode } from 'react';
import { Activity, Home, KanbanSquare, Settings as SettingsIcon, Users } from 'lucide-react';
import { Badge, Cluster, Rail, Text, useRail } from '@eocrm/design-system';

function RailStage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 480,
        minHeight: 480,
        display: 'flex',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        overflow: 'hidden',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div
        style={{
          flex: '1 1 auto',
          padding: 'var(--space-4)',
          color: 'var(--color-fg-muted)',
        }}
      >
        <Text tone="muted">Main content area — the rail is to the left.</Text>
      </div>
    </div>
  );
}

function BrandMark() {
  const { collapsed } = useRail();
  return (
    <Cluster gap="sm" align="center" wrap={false} justify={collapsed ? 'center' : 'start'}>
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent)',
          color: 'var(--color-accent-fg)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'var(--font-weight-semibold)',
          flexShrink: 0,
        }}
      >
        R
      </div>
      {!collapsed && <Text weight="semibold">Railside</Text>}
    </Cluster>
  );
}

export function Demo() {
  return (
    <RailStage>
      <Rail defaultCollapsed={false}>
        <Rail.Header>
          <BrandMark />
        </Rail.Header>

        <Rail.Section title="Main">
          <Rail.Item
            icon={<Home size={16} />}
            href="#dashboard"
            onClick={(e) => e.preventDefault()}
          >
            Dashboard
          </Rail.Item>
          <Rail.Item
            icon={<KanbanSquare size={16} />}
            href="#deals"
            onClick={(e) => e.preventDefault()}
          >
            Deals
          </Rail.Item>
          <Rail.Item
            icon={<Users size={16} />}
            href="#contacts"
            onClick={(e) => e.preventDefault()}
            badge={
              <Badge tone="info" size="sm">
                12
              </Badge>
            }
          >
            Contacts
          </Rail.Item>
        </Rail.Section>

        <Rail.Section title="Operations">
          <Rail.Group icon={<SettingsIcon size={16} />} label="Settings">
            <Rail.Item href="#settings-general" onClick={(e) => e.preventDefault()}>
              General
            </Rail.Item>
            <Rail.Item href="#settings-security" onClick={(e) => e.preventDefault()}>
              Security
            </Rail.Item>
            <Rail.Item href="#settings-billing" onClick={(e) => e.preventDefault()}>
              Billing
            </Rail.Item>
          </Rail.Group>
          <Rail.Item
            icon={<Activity size={16} />}
            href="#audit"
            onClick={(e) => e.preventDefault()}
          >
            Audit log
          </Rail.Item>
        </Rail.Section>

        <Rail.Spacer />

        <Rail.Footer>
          <Rail.CollapseToggle />
        </Rail.Footer>
      </Rail>
    </RailStage>
  );
}`}
      >
        <RailStage>
          <Rail defaultCollapsed={false}>
            <Rail.Header>
              <BrandMark />
            </Rail.Header>

            <Rail.Section title="Main">
              <Rail.Item
                icon={<Home size={16} />}
                href="#dashboard"
                onClick={(e) => e.preventDefault()}
              >
                Dashboard
              </Rail.Item>
              <Rail.Item
                icon={<KanbanSquare size={16} />}
                href="#deals"
                onClick={(e) => e.preventDefault()}
              >
                Deals
              </Rail.Item>
              <Rail.Item
                icon={<Users size={16} />}
                href="#contacts"
                onClick={(e) => e.preventDefault()}
                badge={
                  <Badge tone="info" size="sm">
                    12
                  </Badge>
                }
              >
                Contacts
              </Rail.Item>
            </Rail.Section>

            <Rail.Section title="Operations">
              <Rail.Group icon={<SettingsIcon size={16} />} label="Settings">
                <Rail.Item href="#settings-general" onClick={(e) => e.preventDefault()}>
                  General
                </Rail.Item>
                <Rail.Item href="#settings-security" onClick={(e) => e.preventDefault()}>
                  Security
                </Rail.Item>
                <Rail.Item href="#settings-billing" onClick={(e) => e.preventDefault()}>
                  Billing
                </Rail.Item>
              </Rail.Group>
              <Rail.Item
                icon={<Activity size={16} />}
                href="#audit"
                onClick={(e) => e.preventDefault()}
              >
                Audit log
              </Rail.Item>
            </Rail.Section>

            <Rail.Spacer />

            <Rail.Footer>
              <Rail.CollapseToggle />
            </Rail.Footer>
          </Rail>
        </RailStage>
      </Example>

      <Example
        title="Collapsed by default — hover a group to reveal its subitems"
        description="`defaultCollapsed` makes the rail mount in its narrow mode. Top-level items become icon-only with a tooltip on hover; hovering a group icon reveals a flyout popover containing the group's subitems."
        code={`import { type ReactNode } from 'react';
import { Bell, Home, Mail, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { Cluster, Rail, Text, useRail } from '@eocrm/design-system';

function RailStage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 480,
        minHeight: 480,
        display: 'flex',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        overflow: 'hidden',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div
        style={{
          flex: '1 1 auto',
          padding: 'var(--space-4)',
          color: 'var(--color-fg-muted)',
        }}
      >
        <Text tone="muted">Main content area — the rail is to the left.</Text>
      </div>
    </div>
  );
}

function BrandMark() {
  const { collapsed } = useRail();
  return (
    <Cluster gap="sm" align="center" wrap={false} justify={collapsed ? 'center' : 'start'}>
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent)',
          color: 'var(--color-accent-fg)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'var(--font-weight-semibold)',
          flexShrink: 0,
        }}
      >
        R
      </div>
      {!collapsed && <Text weight="semibold">Railside</Text>}
    </Cluster>
  );
}

export function Demo() {
  return (
    <RailStage>
      <Rail defaultCollapsed>
        <Rail.Header>
          <BrandMark />
        </Rail.Header>

        <Rail.Section title="Main">
          <Rail.Item
            icon={<Home size={16} />}
            href="#dashboard"
            onClick={(e) => e.preventDefault()}
          >
            Dashboard
          </Rail.Item>
          <Rail.Item
            icon={<Bell size={16} />}
            href="#alerts"
            onClick={(e) => e.preventDefault()}
          >
            Alerts
          </Rail.Item>
          <Rail.Item
            icon={<Mail size={16} />}
            href="#inbox"
            onClick={(e) => e.preventDefault()}
          >
            Inbox
          </Rail.Item>
        </Rail.Section>

        <Rail.Section title="Operations">
          <Rail.Group icon={<SettingsIcon size={16} />} label="Settings">
            <Rail.Item href="#settings-general" onClick={(e) => e.preventDefault()}>
              General
            </Rail.Item>
            <Rail.Item href="#settings-security" onClick={(e) => e.preventDefault()}>
              Security
            </Rail.Item>
            <Rail.Item href="#settings-billing" onClick={(e) => e.preventDefault()}>
              Billing
            </Rail.Item>
          </Rail.Group>
          <Rail.Item
            icon={<ShieldCheck size={16} />}
            href="#audit"
            onClick={(e) => e.preventDefault()}
          >
            Audit
          </Rail.Item>
        </Rail.Section>

        <Rail.Spacer />

        <Rail.Footer>
          <Rail.CollapseToggle />
        </Rail.Footer>
      </Rail>
    </RailStage>
  );
}`}
      >
        <RailStage>
          <Rail defaultCollapsed>
            <Rail.Header>
              <BrandMark />
            </Rail.Header>

            <Rail.Section title="Main">
              <Rail.Item
                icon={<Home size={16} />}
                href="#dashboard"
                onClick={(e) => e.preventDefault()}
              >
                Dashboard
              </Rail.Item>
              <Rail.Item
                icon={<Bell size={16} />}
                href="#alerts"
                onClick={(e) => e.preventDefault()}
              >
                Alerts
              </Rail.Item>
              <Rail.Item
                icon={<Mail size={16} />}
                href="#inbox"
                onClick={(e) => e.preventDefault()}
              >
                Inbox
              </Rail.Item>
            </Rail.Section>

            <Rail.Section title="Operations">
              <Rail.Group icon={<SettingsIcon size={16} />} label="Settings">
                <Rail.Item href="#settings-general" onClick={(e) => e.preventDefault()}>
                  General
                </Rail.Item>
                <Rail.Item href="#settings-security" onClick={(e) => e.preventDefault()}>
                  Security
                </Rail.Item>
                <Rail.Item href="#settings-billing" onClick={(e) => e.preventDefault()}>
                  Billing
                </Rail.Item>
              </Rail.Group>
              <Rail.Item
                icon={<ShieldCheck size={16} />}
                href="#audit"
                onClick={(e) => e.preventDefault()}
              >
                Audit
              </Rail.Item>
            </Rail.Section>

            <Rail.Spacer />

            <Rail.Footer>
              <Rail.CollapseToggle />
            </Rail.Footer>
          </Rail>
        </RailStage>
      </Example>

      <Example
        title="Controlled — drive collapsed state from a sibling component"
        description="Pass `collapsed` + `onCollapsedChange` to control state externally. Useful when the rail's collapsed state is persisted to localStorage, syncs with a URL parameter, or is toggled by a button elsewhere in the page chrome."
        code={`import { useState, type ReactNode } from 'react';
import { Building2, Home, Search } from 'lucide-react';
import { Button, Cluster, Rail, Stack, Text, useRail } from '@eocrm/design-system';

function RailStage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 480,
        minHeight: 480,
        display: 'flex',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        overflow: 'hidden',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div
        style={{
          flex: '1 1 auto',
          padding: 'var(--space-4)',
          color: 'var(--color-fg-muted)',
        }}
      >
        <Text tone="muted">Main content area — the rail is to the left.</Text>
      </div>
    </div>
  );
}

function BrandMark() {
  const { collapsed } = useRail();
  return (
    <Cluster gap="sm" align="center" wrap={false} justify={collapsed ? 'center' : 'start'}>
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent)',
          color: 'var(--color-accent-fg)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'var(--font-weight-semibold)',
          flexShrink: 0,
        }}
      >
        R
      </div>
      {!collapsed && <Text weight="semibold">Railside</Text>}
    </Cluster>
  );
}

export function Demo() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Stack gap="md">
      <Cluster gap="sm" align="center">
        <Button variant="secondary" size="sm" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? 'Expand' : 'Collapse'} rail
        </Button>
        <Text tone="muted" size="sm">
          External state controls the rail.
        </Text>
      </Cluster>
      <RailStage>
        <Rail collapsed={collapsed} onCollapsedChange={setCollapsed}>
          <Rail.Header>
            <BrandMark />
          </Rail.Header>
          <Rail.Section title="Main">
            <Rail.Item
              icon={<Home size={16} />}
              href="#dashboard"
              onClick={(e) => e.preventDefault()}
            >
              Dashboard
            </Rail.Item>
            <Rail.Item
              icon={<Search size={16} />}
              href="#search"
              onClick={(e) => e.preventDefault()}
            >
              Search
            </Rail.Item>
            <Rail.Item
              icon={<Building2 size={16} />}
              href="#tenants"
              onClick={(e) => e.preventDefault()}
            >
              Tenants
            </Rail.Item>
          </Rail.Section>
          <Rail.Spacer />
          <Rail.Footer>
            <Rail.CollapseToggle />
          </Rail.Footer>
        </Rail>
      </RailStage>
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <Cluster gap="sm" align="center">
            <Button variant="secondary" size="sm" onClick={() => setControlledCollapsed((c) => !c)}>
              {controlledCollapsed ? 'Expand' : 'Collapse'} rail
            </Button>
            <Text tone="muted" size="sm">
              External state controls the rail.
            </Text>
          </Cluster>
          <RailStage>
            <Rail collapsed={controlledCollapsed} onCollapsedChange={setControlledCollapsed}>
              <Rail.Header>
                <BrandMark />
              </Rail.Header>
              <Rail.Section title="Main">
                <Rail.Item
                  icon={<Home size={16} />}
                  href="#dashboard"
                  onClick={(e) => e.preventDefault()}
                >
                  Dashboard
                </Rail.Item>
                <Rail.Item
                  icon={<Search size={16} />}
                  href="#search"
                  onClick={(e) => e.preventDefault()}
                >
                  Search
                </Rail.Item>
                <Rail.Item
                  icon={<Building2 size={16} />}
                  href="#tenants"
                  onClick={(e) => e.preventDefault()}
                >
                  Tenants
                </Rail.Item>
              </Rail.Section>
              <Rail.Spacer />
              <Rail.Footer>
                <Rail.CollapseToggle />
              </Rail.Footer>
            </Rail>
          </RailStage>
        </Stack>
      </Example>

      <Example
        title="With router — `as={NavLink}` + automatic active styling"
        description={
          'The polymorphic `as` prop lets the item render any routing primitive. ' +
          'react-router\'s NavLink sets `aria-current="page"` on the rendered ' +
          "anchor; Rail's CSS reads that selector and applies the active accent. " +
          'Groups auto-open when one of their subitems is the active route.'
        }
        code={`import { type ReactNode } from 'react';
import { Cog, Home, KanbanSquare, Layers, Settings as SettingsIcon, Users } from 'lucide-react';
import { Cluster, Rail, Text, useRail } from '@eocrm/design-system';

function RailStage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 480,
        minHeight: 480,
        display: 'flex',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        overflow: 'hidden',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div
        style={{
          flex: '1 1 auto',
          padding: 'var(--space-4)',
          color: 'var(--color-fg-muted)',
        }}
      >
        <Text tone="muted">Main content area — the rail is to the left.</Text>
      </div>
    </div>
  );
}

function BrandMark() {
  const { collapsed } = useRail();
  return (
    <Cluster gap="sm" align="center" wrap={false} justify={collapsed ? 'center' : 'start'}>
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent)',
          color: 'var(--color-accent-fg)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'var(--font-weight-semibold)',
          flexShrink: 0,
        }}
      >
        R
      </div>
      {!collapsed && <Text weight="semibold">Railside</Text>}
    </Cluster>
  );
}

export function Demo() {
  return (
    <>
      <RailStage>
        <Rail>
          <Rail.Header>
            <BrandMark />
          </Rail.Header>
          <Rail.Section title="Main">
            <Rail.Item icon={<Home size={16} />} href="#/">
              Dashboard
            </Rail.Item>
            <Rail.Item icon={<KanbanSquare size={16} />} href="#/deals">
              Deals
            </Rail.Item>
            <Rail.Item icon={<Users size={16} />} href="#/contacts">
              Contacts
            </Rail.Item>
          </Rail.Section>
          <Rail.Section title="Operations">
            <Rail.Group icon={<SettingsIcon size={16} />} label="Settings">
              <Rail.Item href="#/settings/general">General</Rail.Item>
              <Rail.Item href="#/settings/security" aria-current="page">
                Security
              </Rail.Item>
              <Rail.Item href="#/settings/billing">Billing</Rail.Item>
            </Rail.Group>
            <Rail.Item icon={<Cog size={16} />} href="#/integrations">
              Integrations
            </Rail.Item>
          </Rail.Section>
          <Rail.Spacer />
          <Rail.Footer>
            <Rail.CollapseToggle />
          </Rail.Footer>
        </Rail>
      </RailStage>
      <Cluster gap="sm" align="center">
        <Layers size={14} aria-hidden style={{ color: 'var(--color-fg-muted)' }} />
        <Text tone="muted" size="sm">
          The demo starts at <code>/settings/security</code>, so the Settings group auto-opens and
          that subitem shows the active accent.
        </Text>
      </Cluster>
    </>
  );
}`}
      >
        <RailStage>
          <Rail>
            <Rail.Header>
              <BrandMark />
            </Rail.Header>
            <Rail.Section title="Main">
              <Rail.Item icon={<Home size={16} />} href="#/">
                Dashboard
              </Rail.Item>
              <Rail.Item icon={<KanbanSquare size={16} />} href="#/deals">
                Deals
              </Rail.Item>
              <Rail.Item icon={<Users size={16} />} href="#/contacts">
                Contacts
              </Rail.Item>
            </Rail.Section>
            <Rail.Section title="Operations">
              <Rail.Group icon={<SettingsIcon size={16} />} label="Settings">
                <Rail.Item href="#/settings/general">General</Rail.Item>
                <Rail.Item href="#/settings/security" aria-current="page">
                  Security
                </Rail.Item>
                <Rail.Item href="#/settings/billing">Billing</Rail.Item>
              </Rail.Group>
              <Rail.Item icon={<Cog size={16} />} href="#/integrations">
                Integrations
              </Rail.Item>
            </Rail.Section>
            <Rail.Spacer />
            <Rail.Footer>
              <Rail.CollapseToggle />
            </Rail.Footer>
          </Rail>
        </RailStage>
        <Cluster gap="sm" align="center">
          <Layers size={14} aria-hidden style={{ color: 'var(--color-fg-muted)' }} />
          <Text tone="muted" size="sm">
            The demo starts at <code>/settings/security</code>, so the Settings group auto-opens and
            that subitem shows the active accent.
          </Text>
        </Cluster>
      </Example>

      <Example
        title="Items pinned to the bottom — Rail.Spacer pushes anything after it down"
        description="Drop a `<Rail.Spacer />` between the main item list and a secondary section to keep settings / help / sign-out anchored at the rail's bottom edge. The Footer (CollapseToggle, user chip) sits below them and stays sticky when the item list overflows."
        code={`import { type ReactNode } from 'react';
import { Home, KanbanSquare, Search, Settings as SettingsIcon, Users } from 'lucide-react';
import { Cluster, Rail, Text, useRail } from '@eocrm/design-system';

function RailStage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 480,
        minHeight: 480,
        display: 'flex',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        overflow: 'hidden',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div
        style={{
          flex: '1 1 auto',
          padding: 'var(--space-4)',
          color: 'var(--color-fg-muted)',
        }}
      >
        <Text tone="muted">Main content area — the rail is to the left.</Text>
      </div>
    </div>
  );
}

function BrandMark() {
  const { collapsed } = useRail();
  return (
    <Cluster gap="sm" align="center" wrap={false} justify={collapsed ? 'center' : 'start'}>
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent)',
          color: 'var(--color-accent-fg)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'var(--font-weight-semibold)',
          flexShrink: 0,
        }}
      >
        R
      </div>
      {!collapsed && <Text weight="semibold">Railside</Text>}
    </Cluster>
  );
}

export function Demo() {
  return (
    <RailStage>
      <Rail>
        <Rail.Header>
          <BrandMark />
        </Rail.Header>

        <Rail.Section title="Main">
          <Rail.Item
            icon={<Home size={16} />}
            href="#dashboard"
            onClick={(e) => e.preventDefault()}
          >
            Dashboard
          </Rail.Item>
          <Rail.Item
            icon={<KanbanSquare size={16} />}
            href="#deals"
            onClick={(e) => e.preventDefault()}
          >
            Deals
          </Rail.Item>
          <Rail.Item
            icon={<Users size={16} />}
            href="#contacts"
            onClick={(e) => e.preventDefault()}
          >
            Contacts
          </Rail.Item>
        </Rail.Section>

        <Rail.Spacer />

        <Rail.Section>
          <Rail.Item
            icon={<SettingsIcon size={16} />}
            href="#settings"
            onClick={(e) => e.preventDefault()}
          >
            Settings
          </Rail.Item>
          <Rail.Item
            icon={<Search size={16} />}
            href="#help"
            onClick={(e) => e.preventDefault()}
          >
            Help & feedback
          </Rail.Item>
        </Rail.Section>

        <Rail.Footer>
          <Rail.CollapseToggle />
        </Rail.Footer>
      </Rail>
    </RailStage>
  );
}`}
      >
        <RailStage>
          <Rail>
            <Rail.Header>
              <BrandMark />
            </Rail.Header>

            <Rail.Section title="Main">
              <Rail.Item
                icon={<Home size={16} />}
                href="#dashboard"
                onClick={(e) => e.preventDefault()}
              >
                Dashboard
              </Rail.Item>
              <Rail.Item
                icon={<KanbanSquare size={16} />}
                href="#deals"
                onClick={(e) => e.preventDefault()}
              >
                Deals
              </Rail.Item>
              <Rail.Item
                icon={<Users size={16} />}
                href="#contacts"
                onClick={(e) => e.preventDefault()}
              >
                Contacts
              </Rail.Item>
            </Rail.Section>

            <Rail.Spacer />

            <Rail.Section>
              <Rail.Item
                icon={<SettingsIcon size={16} />}
                href="#settings"
                onClick={(e) => e.preventDefault()}
              >
                Settings
              </Rail.Item>
              <Rail.Item
                icon={<Search size={16} />}
                href="#help"
                onClick={(e) => e.preventDefault()}
              >
                Help & feedback
              </Rail.Item>
            </Rail.Section>

            <Rail.Footer>
              <Rail.CollapseToggle />
            </Rail.Footer>
          </Rail>
        </RailStage>
      </Example>
    </DemoLayout>
  );
}
