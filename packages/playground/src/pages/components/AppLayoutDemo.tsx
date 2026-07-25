import { AppLayout, Page, Rail, Stack, Text, Title } from '@eocrm/design-system';
import { Home, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

// AppLayout fills the viewport (min-height: 100vh); in a demo we clip it to a
// bounded frame so the structure is visible inline. Raw div + inline style is
// fine here — demo pages are tooling, not mockups (Rule 6 doesn't apply).
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 320,
        overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}

function Bar({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-bg-subtle)',
        borderBottom: 'var(--border-width) solid var(--color-border)',
      }}
    >
      <Text weight="semibold">{label}</Text>
    </div>
  );
}

function Side() {
  return (
    <div
      style={{
        width: 180,
        height: '100%',
        padding: 'var(--space-4)',
        background: 'var(--color-bg-subtle)',
        borderRight: 'var(--border-width) solid var(--color-border)',
      }}
    >
      <Stack gap="sm">
        <Text tone="muted">Dashboard</Text>
        <Text tone="muted">Contacts</Text>
        <Text tone="muted">Deals</Text>
      </Stack>
    </div>
  );
}

// sidebarPinned sizes the sidebar to 100dvh — the REAL browser viewport, not
// whatever box it's nested in. A small fixed-height frame (like Frame above)
// can't preview it: the sidebar would render taller than the box and its
// footer would never come into view. So this frame is 100dvh too — same
// viewport unit, same pixel value — meaning the frame's own edge lines up
// exactly with the sidebar's, and scrolling the (also-tall) content inside it
// shows the footer staying glued to the frame's bottom, matching what happens
// at the real page root.
function PinnedFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: '100dvh',
        overflow: 'auto',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}

function PinnedSide() {
  return (
    <Rail defaultCollapsed={false} aria-label="Main navigation">
      <Rail.Header>
        <Text weight="semibold">eocrm</Text>
      </Rail.Header>
      <Rail.Section title="Main">
        <Rail.Item icon={<Home size={16} />} href="#dashboard" onClick={(e) => e.preventDefault()}>
          Dashboard
        </Rail.Item>
        <Rail.Item icon={<Users size={16} />} href="#contacts" onClick={(e) => e.preventDefault()}>
          Contacts
        </Rail.Item>
      </Rail.Section>
      <Rail.Spacer />
      <Rail.Footer>
        <Rail.CollapseToggle />
      </Rail.Footer>
    </Rail>
  );
}

function TallContent() {
  return (
    <Stack gap="md">
      <Title order={3}>Dashboard</Title>
      {Array.from({ length: 40 }, (_, i) => (
        <Text key={i} tone="muted">
          Row {i + 1} — scroll this frame. The sidebar (and its footer / CollapseToggle) stays
          pinned to the top instead of scrolling away with the tall content.
        </Text>
      ))}
    </Stack>
  );
}

export function AppLayoutDemo() {
  return (
    <DemoLayout
      name="AppLayout"
      description="Viewport-filling application shell, matching the CRM shell topology: a full-height sidebar down the left, an optional top bar over the content column, and the main content below it. The top-level layout primitive, mounted once at the app root."
      files={getComponentFiles('AppLayout')}
      apiName="AppLayout"
    >
      <Example
        title="Full shell (sidebar + topBar + content)"
        description="The canonical CRM shell — full-height sidebar on the left, top bar over the content column. AppLayout fills the viewport; shown clipped to a bounded frame."
        code={`import type { ReactNode } from 'react';
import { AppLayout, Page, Stack, Text, Title } from '@eocrm/design-system';

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 320,
        overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}

function Bar({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-bg-subtle)',
        borderBottom: 'var(--border-width) solid var(--color-border)',
      }}
    >
      <Text weight="semibold">{label}</Text>
    </div>
  );
}

function Side() {
  return (
    <div
      style={{
        width: 180,
        height: '100%',
        padding: 'var(--space-4)',
        background: 'var(--color-bg-subtle)',
        borderRight: 'var(--border-width) solid var(--color-border)',
      }}
    >
      <Stack gap="sm">
        <Text tone="muted">Dashboard</Text>
        <Text tone="muted">Contacts</Text>
        <Text tone="muted">Deals</Text>
      </Stack>
    </div>
  );
}

export function Demo() {
  return (
    <Frame>
      <AppLayout topBar={<Bar label="eocrm" />} sidebar={<Side />}>
        <Page>
          <Stack gap="sm">
            <Title order={3}>Dashboard</Title>
            <Text tone="muted">Main content fills the remaining space.</Text>
          </Stack>
        </Page>
      </AppLayout>
    </Frame>
  );
}`}
      >
        <Frame>
          <AppLayout topBar={<Bar label="eocrm" />} sidebar={<Side />}>
            <Page>
              <Stack gap="sm">
                <Title order={3}>Dashboard</Title>
                <Text tone="muted">Main content fills the remaining space.</Text>
              </Stack>
            </Page>
          </AppLayout>
        </Frame>
      </Example>

      <Example
        title="No sidebar"
        description="Omit the sidebar slot for a top bar + content shell."
        code={`import type { ReactNode } from 'react';
import { AppLayout, Page, Text } from '@eocrm/design-system';

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 320,
        overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}

function Bar({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-bg-subtle)',
        borderBottom: 'var(--border-width) solid var(--color-border)',
      }}
    >
      <Text weight="semibold">{label}</Text>
    </div>
  );
}

export function Demo() {
  return (
    <Frame>
      <AppLayout topBar={<Bar label="eocrm" />}>
        <Page>
          <Text tone="muted">No sidebar — content spans the full width.</Text>
        </Page>
      </AppLayout>
    </Frame>
  );
}`}
      >
        <Frame>
          <AppLayout topBar={<Bar label="eocrm" />}>
            <Page>
              <Text tone="muted">No sidebar — content spans the full width.</Text>
            </Page>
          </AppLayout>
        </Frame>
      </Example>

      <Example
        title="No top bar"
        description="Omit the topBar slot for a sidebar + content shell."
        code={`import type { ReactNode } from 'react';
import { AppLayout, Page, Stack, Text } from '@eocrm/design-system';

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 320,
        overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}

function Side() {
  return (
    <div
      style={{
        width: 180,
        height: '100%',
        padding: 'var(--space-4)',
        background: 'var(--color-bg-subtle)',
        borderRight: 'var(--border-width) solid var(--color-border)',
      }}
    >
      <Stack gap="sm">
        <Text tone="muted">Dashboard</Text>
        <Text tone="muted">Contacts</Text>
        <Text tone="muted">Deals</Text>
      </Stack>
    </div>
  );
}

export function Demo() {
  return (
    <Frame>
      <AppLayout sidebar={<Side />}>
        <Page>
          <Text tone="muted">No top bar — sidebar runs full height.</Text>
        </Page>
      </AppLayout>
    </Frame>
  );
}`}
      >
        <Frame>
          <AppLayout sidebar={<Side />}>
            <Page>
              <Text tone="muted">No top bar — sidebar runs full height.</Text>
            </Page>
          </AppLayout>
        </Frame>
      </Example>

      <Example
        title="sidebarPinned — Rail footer glued to the screen"
        description="On pages taller than the viewport, sidebarPinned keeps the sidebar — and a Rail's footer / CollapseToggle — pinned to the top of the viewport instead of scrolling away with tall content. sidebarPinned sizes to 100dvh (the real browser viewport), so this preview frame is deliberately 100dvh too — a smaller fixed-height box can't line up with it. Scroll the frame below; the rail stays put and its footer stays glued to the bottom."
        code={`import { type ReactNode } from 'react';
import { AppLayout, Page, Rail, Stack, Text, Title } from '@eocrm/design-system';
import { Home, Users } from 'lucide-react';

// sidebarPinned sizes the sidebar to 100dvh — the REAL browser viewport, not
// whatever box it's nested in. A small fixed-height frame can't preview it:
// the sidebar would render taller than the box and its footer would never
// come into view. So this frame is 100dvh too — same viewport unit, same
// pixel value — meaning the frame's own edge lines up exactly with the
// sidebar's, and scrolling the (also-tall) content inside it shows the
// footer staying glued to the frame's bottom, matching what happens at the
// real page root.
function PinnedFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: '100dvh',
        overflow: 'auto',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}

function PinnedSide() {
  return (
    <Rail defaultCollapsed={false} aria-label="Main navigation">
      <Rail.Header>
        <Text weight="semibold">eocrm</Text>
      </Rail.Header>
      <Rail.Section title="Main">
        <Rail.Item icon={<Home size={16} />} href="#dashboard" onClick={(e) => e.preventDefault()}>
          Dashboard
        </Rail.Item>
        <Rail.Item icon={<Users size={16} />} href="#contacts" onClick={(e) => e.preventDefault()}>
          Contacts
        </Rail.Item>
      </Rail.Section>
      <Rail.Spacer />
      <Rail.Footer>
        <Rail.CollapseToggle />
      </Rail.Footer>
    </Rail>
  );
}

function TallContent() {
  return (
    <Stack gap="md">
      <Title order={3}>Dashboard</Title>
      {Array.from({ length: 40 }, (_, i) => (
        <Text key={i} tone="muted">
          Row {i + 1} — scroll this frame. The sidebar (and its footer /
          CollapseToggle) stays pinned to the top instead of scrolling away
          with the tall content.
        </Text>
      ))}
    </Stack>
  );
}

export function Demo() {
  return (
    <PinnedFrame>
      <AppLayout sidebar={<PinnedSide />} sidebarPinned>
        <Page>
          <TallContent />
        </Page>
      </AppLayout>
    </PinnedFrame>
  );
}`}
      >
        <PinnedFrame>
          <AppLayout sidebar={<PinnedSide />} sidebarPinned>
            <Page>
              <TallContent />
            </Page>
          </AppLayout>
        </PinnedFrame>
      </Example>
    </DemoLayout>
  );
}
