import { useState } from 'react';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Dot } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { ButtonGroup } from '@eocrm/design-system';
import { Kanban, List } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import outlineStyles from './demoOutline.module.scss';
import { getComponentFiles } from '../../lib/componentFiles';

// Live preview for the as="span" example — the issue's motivating use case:
// icon + label inside a segmented ButtonGroup.Item, where a <div> is invalid.
function InlineClusterExample() {
  const [view, setView] = useState('list');
  return (
    <ButtonGroup value={view} onValueChange={setView} aria-label="View">
      <ButtonGroup.Item value="list">
        <Cluster as="span" gap="xs" align="center" wrap={false}>
          <List size={14} aria-hidden />
          List
        </Cluster>
      </ButtonGroup.Item>
      <ButtonGroup.Item value="board">
        <Cluster as="span" gap="xs" align="center" wrap={false}>
          <Kanban size={14} aria-hidden />
          Board
        </Cluster>
      </ButtonGroup.Item>
    </ButtonGroup>
  );
}

// A narrow flex parent with overflow: hidden — the shape a Calendar chip, a
// table cell, or a TopBar slot has. Cluster's min-width: 0 is what lets the
// Text inside it ellipsize instead of being hard-cut at this boundary.
const ClippingParent = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', width: 220, overflow: 'hidden' }}>{children}</div>
);

const Block = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: '6px 12px',
      background: 'var(--color-accent-subtle-bg)',
      color: 'var(--color-accent)',
      borderRadius: 'var(--radius-sm)',
      fontWeight: 500,
      fontSize: 'var(--font-size-sm)',
    }}
  >
    {children}
  </div>
);

export function ClusterDemo() {
  return (
    <DemoLayout
      name="Cluster"
      description="Horizontal flex layout that wraps. Use for button rows, toolbars, tag lists, breadcrumbs. Replaces ad-hoc display: flex with flex-wrap."
      files={getComponentFiles('Cluster')}
      componentName="Cluster"
    >
      <Example
        title="Justify (main-axis)"
        description="Controls horizontal distribution. between is the toolbar pattern: title on left, actions on right."
        code={`import type { ReactNode } from 'react';
import { Cluster, Stack } from '@eocrm/design-system';

const Block = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      padding: '6px 12px',
      background: 'var(--color-accent-subtle-bg)',
      color: 'var(--color-accent)',
      borderRadius: 'var(--radius-sm)',
      fontWeight: 500,
      fontSize: 'var(--font-size-sm)',
    }}
  >
    {children}
  </div>
);

export function Demo() {
  return (
    <Stack gap="md">
      {(['start', 'center', 'end', 'between'] as const).map((j) => (
        <div key={j}>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-fg-subtle)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
          >
            justify={j}
          </div>
          <Cluster gap="sm" justify={j}>
            <Block>One</Block>
            <Block>Two</Block>
            <Block>Three</Block>
          </Cluster>
        </div>
      ))}
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          {(['start', 'center', 'end', 'between'] as const).map((j) => (
            <div key={j}>
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-fg-subtle)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                justify={j}
              </div>
              <Cluster gap="sm" justify={j} className={outlineStyles.outlined}>
                <Block>One</Block>
                <Block>Two</Block>
                <Block>Three</Block>
              </Cluster>
            </div>
          ))}
        </Stack>
      </Example>

      <Example
        title="Form footer (most common pattern)"
        description="Cluster with justify='end' is the canonical form footer / modal footer."
        code={`import { Button, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster justify="end" gap="sm">
      <Button variant="secondary">Cancel</Button>
      <Button>Save changes</Button>
    </Cluster>
  );
}`}
      >
        <Cluster justify="end" gap="sm" className={outlineStyles.outlined}>
          <Button variant="secondary">Cancel</Button>
          <Button>Save changes</Button>
        </Cluster>
      </Example>

      <Example
        title="Toolbar (justify='between')"
        description="Title on the left, actions on the right. Each side can be its own cluster."
        code={`import { Button, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster justify="between" gap="md">
      <h2 style={{ margin: 0 }}>Users</h2>
      <Cluster gap="sm">
        <Button variant="secondary">Filter</Button>
        <Button>Add user</Button>
      </Cluster>
    </Cluster>
  );
}`}
      >
        <Cluster justify="between" gap="md" className={outlineStyles.outlined}>
          <h2 style={{ margin: 0 }}>Users</h2>
          <Cluster gap="sm" className={outlineStyles.outlined}>
            <Button variant="secondary">Filter</Button>
            <Button>Add user</Button>
          </Cluster>
        </Cluster>
      </Example>

      <Example
        title="Tag list (wrap=true, default)"
        description="When the container is narrow, items wrap to the next line. This is the default behavior."
        code={`import { Badge, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Cluster gap="xs">
        <Badge tone="purple">Enterprise</Badge>
        <Badge tone="info">Pipeline 2026</Badge>
        <Badge tone="success">Champion</Badge>
        <Badge tone="warning">Renewal</Badge>
        <Badge tone="danger">At risk</Badge>
        <Badge tone="neutral">SMB</Badge>
        <Badge tone="neutral">North America</Badge>
      </Cluster>
    </div>
  );
}`}
      >
        <div style={{ maxWidth: 360 }}>
          <Cluster gap="xs" className={outlineStyles.outlined}>
            <Badge tone="purple">Enterprise</Badge>
            <Badge tone="info">Pipeline 2026</Badge>
            <Badge tone="success">Champion</Badge>
            <Badge tone="warning">Renewal</Badge>
            <Badge tone="danger">At risk</Badge>
            <Badge tone="neutral">SMB</Badge>
            <Badge tone="neutral">North America</Badge>
          </Cluster>
        </div>
      </Example>

      <Example
        title={`Inline (as="span")`}
        description="Inside a <button>, <a>, or <label>, a block <div> is invalid HTML. as='span' renders an inline-flex <span> — here giving a segmented ButtonGroup.Item a proper icon + label with a token gap."
        code={`import { useState } from 'react';
import { ButtonGroup, Cluster } from '@eocrm/design-system';
import { Kanban, List } from 'lucide-react';

export function Demo() {
  const [view, setView] = useState('list');
  return (
    <ButtonGroup value={view} onValueChange={setView} aria-label="View">
      <ButtonGroup.Item value="list">
        <Cluster as="span" gap="xs" align="center" wrap={false}>
          <List size={14} aria-hidden />
          List
        </Cluster>
      </ButtonGroup.Item>
      <ButtonGroup.Item value="board">
        <Cluster as="span" gap="xs" align="center" wrap={false}>
          <Kanban size={14} aria-hidden />
          Board
        </Cluster>
      </ButtonGroup.Item>
    </ButtonGroup>
  );
}`}
      >
        <InlineClusterExample />
      </Example>

      <Example
        title="wrap={false}"
        description="When you need items to stay on one line (e.g. inside a narrow table cell). Use sparingly — set wrap=false when overflow is more acceptable than wrapping."
        code={`import { Button, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="xs" wrap={false}>
      <Button variant="ghost" size="sm">Resend</Button>
      <Button variant="ghost" size="sm">Revoke</Button>
    </Cluster>
  );
}`}
      >
        <Cluster gap="xs" wrap={false} className={outlineStyles.outlined}>
          <Button variant="ghost" size="sm">
            Resend
          </Button>
          <Button variant="ghost" size="sm">
            Revoke
          </Button>
        </Cluster>
      </Example>

      <Example
        title="Truncating inside a clipping parent"
        description="Cluster sets min-width: 0, so it can sit in a truncating flex chain: a Text truncate nested inside still ellipsizes when a narrow overflow: hidden ancestor squeezes it. Without that, the flex default (min-width: auto) would pin the Cluster to its content width and the text would be hard-cut mid-word."
        code={`import { Cluster, Dot, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    // A 220px-wide parent with overflow: hidden.
    <Cluster as="span" gap="xs" align="center" wrap={false}>
      <Dot color="violet" />
      <Text as="span" size="sm" truncate>
        A very long appointment title that will not fit
      </Text>
    </Cluster>
  );
}`}
      >
        <ClippingParent>
          <Cluster as="span" gap="xs" align="center" wrap={false}>
            <Dot color="violet" />
            <Text as="span" size="sm" truncate>
              A very long appointment title that will not fit
            </Text>
          </Cluster>
        </ClippingParent>
      </Example>
    </DemoLayout>
  );
}
