import { useState } from 'react';
import { Bell, HelpCircle, Plus, Settings as SettingsIcon, Wrench } from 'lucide-react';
import { Avatar, Text, TopBar } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

/**
 * Bordered preview frame that lets the sticky-top TopBar sit at the
 * top of a believable layout column. The TopBar's `position: sticky`
 * needs a scrollable parent to anchor against — without the frame it
 * would stick to the page-level scroller and visually escape the demo.
 */
function TopBarStage({ children, height = 220 }: { children: React.ReactNode; height?: number }) {
  return (
    <div
      style={{
        height,
        overflow: 'auto',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div style={{ padding: 'var(--space-4)' }}>
        <Text tone="muted">
          Scroll this box — the bar pins to the top. Page content goes here in a real app.
        </Text>
      </div>
    </div>
  );
}

/** Brand mark used by the right-aligned example. */
function BrandMark() {
  return (
    <div
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-fg)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent)',
          color: 'var(--color-accent-fg)',
          fontSize: 'var(--font-size-xs)',
        }}
      >
        OC
      </span>
      Orbit CRM
    </div>
  );
}

export function TopBarDemo() {
  // Example 1: controlled search input so consumers see the round-trip pattern.
  const [query, setQuery] = useState('');

  return (
    <DemoLayout
      name="TopBar"
      componentName="TopBar"
      description="Sticky application top-bar primitive. Compound API: TopBar.Start + TopBar.End for the two horizontal clusters, plus TopBar.Search (styled search input with a leading icon and optional hotkey hint) and TopBar.IconButton (icon-only ghost button with an optional notification-dot indicator)."
      files={getComponentFiles('TopBar')}
    >
      <Example
        title="Default — search on the left, actions + avatar on the right"
        description="The canonical app-shell pattern: TopBar.Start holds TopBar.Search (with an optional ⌘K hint), TopBar.End holds two TopBar.IconButton actions and a trailing Avatar. The Bell button is `indicator` to surface unread notifications."
        code={`import { useState, type ReactNode } from 'react';
import { Bell, Plus } from 'lucide-react';
import { Avatar, Text, TopBar } from '@eocrm/design-system';

function TopBarStage({ children, height = 220 }: { children: ReactNode; height?: number }) {
  return (
    <div
      style={{
        height,
        overflow: 'auto',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div style={{ padding: 'var(--space-4)' }}>
        <Text tone="muted">
          Scroll this box — the bar pins to the top. Page content goes here in a real app.
        </Text>
      </div>
    </div>
  );
}

export function Demo() {
  const [query, setQuery] = useState('');

  return (
    <TopBarStage>
      <TopBar>
        <TopBar.Start>
          <TopBar.Search
            placeholder="Search contacts, deals…"
            hotkey={['⌘', 'K']}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </TopBar.Start>
        <TopBar.End>
          <TopBar.IconButton aria-label="Create new">
            <Plus size={16} />
          </TopBar.IconButton>
          <TopBar.IconButton aria-label="Notifications, 3 unread" indicator>
            <Bell size={16} />
          </TopBar.IconButton>
          <Avatar name="Alex Rivera" size="sm" />
        </TopBar.End>
      </TopBar>
    </TopBarStage>
  );
}`}
      >
        <TopBarStage>
          <TopBar>
            <TopBar.Start>
              <TopBar.Search
                placeholder="Search contacts, deals…"
                hotkey={['⌘', 'K']}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </TopBar.Start>
            <TopBar.End>
              <TopBar.IconButton aria-label="Create new">
                <Plus size={16} />
              </TopBar.IconButton>
              <TopBar.IconButton aria-label="Notifications, 3 unread" indicator>
                <Bell size={16} />
              </TopBar.IconButton>
              <Avatar name="Alex Rivera" size="sm" />
            </TopBar.End>
          </TopBar>
        </TopBarStage>
      </Example>

      <Example
        title="Brand on the left, no search"
        description="The Start cluster can hold anything — drop the search and use it for a brand mark when the bar is part of a marketing surface or a docs site. End-only is also valid: a single trailing cluster works because Start defaults to no content."
        code={`import { type ReactNode } from 'react';
import { HelpCircle, Settings as SettingsIcon } from 'lucide-react';
import { Avatar, Text, TopBar } from '@eocrm/design-system';

function TopBarStage({ children, height = 220 }: { children: ReactNode; height?: number }) {
  return (
    <div
      style={{
        height,
        overflow: 'auto',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div style={{ padding: 'var(--space-4)' }}>
        <Text tone="muted">
          Scroll this box — the bar pins to the top. Page content goes here in a real app.
        </Text>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-fg)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent)',
          color: 'var(--color-accent-fg)',
          fontSize: 'var(--font-size-xs)',
        }}
      >
        OC
      </span>
      Orbit CRM
    </div>
  );
}

export function Demo() {
  return (
    <TopBarStage>
      <TopBar>
        <TopBar.Start>
          <BrandMark />
        </TopBar.Start>
        <TopBar.End>
          <TopBar.IconButton aria-label="Help">
            <HelpCircle size={16} />
          </TopBar.IconButton>
          <TopBar.IconButton aria-label="Settings">
            <SettingsIcon size={16} />
          </TopBar.IconButton>
          <Avatar name="Sam Chen" size="sm" />
        </TopBar.End>
      </TopBar>
    </TopBarStage>
  );
}`}
      >
        <TopBarStage>
          <TopBar>
            <TopBar.Start>
              <BrandMark />
            </TopBar.Start>
            <TopBar.End>
              <TopBar.IconButton aria-label="Help">
                <HelpCircle size={16} />
              </TopBar.IconButton>
              <TopBar.IconButton aria-label="Settings">
                <SettingsIcon size={16} />
              </TopBar.IconButton>
              <Avatar name="Sam Chen" size="sm" />
            </TopBar.End>
          </TopBar>
        </TopBarStage>
      </Example>

      <Example
        title="Custom indicator tone"
        description="`indicatorTone` selects the dot color. Use `warning` for soft cues (a scheduled maintenance reminder), `info` for informational pings, `accent` for new-feature highlights. The default is `danger`."
        code={`import { type ReactNode } from 'react';
import { Bell, Wrench } from 'lucide-react';
import { Text, TopBar } from '@eocrm/design-system';

function TopBarStage({ children, height = 220 }: { children: ReactNode; height?: number }) {
  return (
    <div
      style={{
        height,
        overflow: 'auto',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div style={{ padding: 'var(--space-4)' }}>
        <Text tone="muted">
          Scroll this box — the bar pins to the top. Page content goes here in a real app.
        </Text>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <TopBarStage>
      <TopBar>
        <TopBar.End>
          <TopBar.IconButton aria-label="Maintenance scheduled" indicator indicatorTone="warning">
            <Wrench size={16} />
          </TopBar.IconButton>
          <TopBar.IconButton aria-label="What's new" indicator indicatorTone="accent">
            <Bell size={16} />
          </TopBar.IconButton>
        </TopBar.End>
      </TopBar>
    </TopBarStage>
  );
}`}
      >
        <TopBarStage>
          <TopBar>
            <TopBar.End>
              <TopBar.IconButton
                aria-label="Maintenance scheduled"
                indicator
                indicatorTone="warning"
              >
                <Wrench size={16} />
              </TopBar.IconButton>
              <TopBar.IconButton aria-label="What's new" indicator indicatorTone="accent">
                <Bell size={16} />
              </TopBar.IconButton>
            </TopBar.End>
          </TopBar>
        </TopBarStage>
      </Example>

      <Example
        title='Nested toolbar with as="div"'
        description='When the bar appears inside another content area where a second header landmark would be wrong (e.g. a secondary filters toolbar inside a main page), pass `as="div"` to render the same chrome without the banner role.'
        code={`import { type ReactNode } from 'react';
import { Wrench } from 'lucide-react';
import { Text, TopBar } from '@eocrm/design-system';

function TopBarStage({ children, height = 220 }: { children: ReactNode; height?: number }) {
  return (
    <div
      style={{
        height,
        overflow: 'auto',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
      <div style={{ padding: 'var(--space-4)' }}>
        <Text tone="muted">
          Scroll this box — the bar pins to the top. Page content goes here in a real app.
        </Text>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <TopBarStage>
      <TopBar as="div" aria-label="Filters toolbar">
        <TopBar.Start>
          <Text weight="medium">Filters</Text>
        </TopBar.Start>
        <TopBar.End>
          <TopBar.IconButton aria-label="Reset filters">
            <Wrench size={16} />
          </TopBar.IconButton>
        </TopBar.End>
      </TopBar>
    </TopBarStage>
  );
}`}
      >
        <TopBarStage>
          <TopBar as="div" aria-label="Filters toolbar">
            <TopBar.Start>
              <Text weight="medium">Filters</Text>
            </TopBar.Start>
            <TopBar.End>
              <TopBar.IconButton aria-label="Reset filters">
                <Wrench size={16} />
              </TopBar.IconButton>
            </TopBar.End>
          </TopBar>
        </TopBarStage>
      </Example>
    </DemoLayout>
  );
}
