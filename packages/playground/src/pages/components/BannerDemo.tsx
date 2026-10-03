import { useState, type ReactNode } from 'react';
import { AppLayout, Banner, Button, Link, Page, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

// AppLayout fills the viewport; clip it to a bounded frame (demo tooling, not a mockup).
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
      <Text tone="muted">Sidebar</Text>
    </div>
  );
}

export function BannerDemo() {
  const [restored, setRestored] = useState(true);

  return (
    <DemoLayout
      name="Banner"
      componentName="Banner"
      description="Full-width system / app message bar for AppLayout's banner (system-wide) and contextBanner (module-scoped) slots. Tinted background + bottom rule per tone; title inline with the text; one action; optional dismiss. Use Alert for page content."
      files={getComponentFiles('Banner')}
    >
      <Example
        title="Four tones"
        description="info (advance notice) / success (resolved) / warning (imminent) / danger (broken now). A visually hidden tone prefix is read before the text."
        code={`import { Banner } from '@eocrm/design-system';

export function Demo() {
  return (
    <div>
      <Banner tone="info" title="Scheduled maintenance">Sat 4 Oct, 22:00–23:00 CET.</Banner>
      <Banner tone="success" title="Email sending restored.">Thanks for cleaning your list.</Banner>
      <Banner tone="warning" title="Read-only in 30 minutes.">Save your work.</Banner>
      <Banner tone="danger" title="Email sending suspended.">Bounce rate 7.2% (limit 5%).</Banner>
    </div>
  );
}`}
      >
        <div>
          <Banner tone="info" title="Scheduled maintenance">
            Sat 4 Oct, 22:00–23:00 CET.
          </Banner>
          <Banner tone="success" title="Email sending restored.">
            Thanks for cleaning your list.
          </Banner>
          <Banner tone="warning" title="Read-only in 30 minutes.">
            Save your work.
          </Banner>
          <Banner tone="danger" title="Email sending suspended.">
            Bounce rate 7.2% (limit 5%).
          </Banner>
        </div>
      </Example>

      <Example
        title="Action + dismiss"
        description="One action pinned right. onDismiss is controlled — the app persists the dismissal. Don't make a danger banner dismissible while its condition holds."
        code={`import { useState } from 'react';
import { Banner, Button, Link, Stack } from '@eocrm/design-system';

export function Demo() {
  const [restored, setRestored] = useState(true);
  return (
    <Stack gap="sm">
      <Banner tone="warning" title="Scheduled maintenance" action={<Link href="#">Details</Link>}>
        Sat 4 Oct, 22:00–23:00 CET. CRM will be read-only.
      </Banner>
      {restored ? (
        <Banner tone="success" onDismiss={() => setRestored(false)}>Email sending restored.</Banner>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setRestored(true)}>Show again</Button>
      )}
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Banner
            tone="warning"
            title="Scheduled maintenance"
            action={<Link href="#">Details</Link>}
          >
            Sat 4 Oct, 22:00–23:00 CET. CRM will be read-only.
          </Banner>
          {restored ? (
            <Banner tone="success" onDismiss={() => setRestored(false)}>
              Email sending restored.
            </Banner>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setRestored(true)}>
              Show again
            </Button>
          )}
        </Stack>
      </Example>

      <Example
        title="Long message wraps"
        description="Text wraps; when the row gets narrow the action and × drop onto their own line. Resize the window to see it."
        code={`import { Banner, Button } from '@eocrm/design-system';

export function Demo() {
  return (
    <Banner
      tone="danger"
      title="Email sending suspended."
      action={<Button size="xs" variant="secondary">Review bounces</Button>}
    >
      Your bounce rate reached 7.2% over the last 7 days, above the 5% limit. Campaigns and sequences are paused until it drops.
    </Banner>
  );
}`}
      >
        <Banner
          tone="danger"
          title="Email sending suspended."
          action={
            <Button size="xs" variant="secondary">
              Review bounces
            </Button>
          }
        >
          Your bounce rate reached 7.2% over the last 7 days, above the 5% limit. Campaigns and
          sequences are paused until it drops.
        </Banner>
      </Example>

      <Example
        title="In the shell: banner + contextBanner"
        description="banner spans the whole window above the sidebar (system-wide). contextBanner sits under the top bar, outside the content padding (module-scoped). Neither is sticky."
        code={`import type { ReactNode } from 'react';
import { AppLayout, Banner, Link, Page, Text } from '@eocrm/design-system';

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
      <Text tone="muted">Sidebar</Text>
    </div>
  );
}

export function Demo() {
  return (
    <Frame>
      <AppLayout
        banner={
          <Banner tone="info" title="Scheduled maintenance" action={<Link href="#">Details</Link>}>
            Sat 4 Oct, 22:00–23:00 CET.
          </Banner>
        }
        topBar={<Bar label="TopBar · Email › Campaigns" />}
        contextBanner={
          <Banner tone="danger" title="Email sending suspended.">
            Bounce rate 7.2% (limit 5%).
          </Banner>
        }
        sidebar={<Side />}
      >
        <Page>
          <Text tone="muted">Page content</Text>
        </Page>
      </AppLayout>
    </Frame>
  );
}`}
      >
        <Frame>
          <AppLayout
            banner={
              <Banner
                tone="info"
                title="Scheduled maintenance"
                action={<Link href="#">Details</Link>}
              >
                Sat 4 Oct, 22:00–23:00 CET.
              </Banner>
            }
            topBar={<Bar label="TopBar · Email › Campaigns" />}
            contextBanner={
              <Banner tone="danger" title="Email sending suspended.">
                Bounce rate 7.2% (limit 5%).
              </Banner>
            }
            sidebar={<Side />}
          >
            <Page>
              <Text tone="muted">Page content</Text>
            </Page>
          </AppLayout>
        </Frame>
      </Example>
    </DemoLayout>
  );
}
