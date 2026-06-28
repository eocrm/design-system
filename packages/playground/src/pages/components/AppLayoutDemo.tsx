import { AppLayout, Page, Stack, Text, Title } from '@eocrm/design-system';
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
    </DemoLayout>
  );
}
