import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Input } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import outlineStyles from './demoOutline.module.scss';
import { getComponentFiles } from '../../lib/componentFiles';

// A narrow flex ROW with overflow: hidden. A Stack's own min-width only matters
// when the Stack is itself an item of a row that squeezes it.
const ClippingRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', width: 260, overflow: 'hidden', gap: 8 }}>{children}</div>
);

const Block = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: '10px 14px',
      background: 'var(--color-accent-subtle-bg)',
      color: 'var(--color-accent)',
      borderRadius: 'var(--radius-sm)',
      fontWeight: 500,
    }}
  >
    {children}
  </div>
);

export function StackDemo() {
  return (
    <DemoLayout
      name="Stack"
      description="Vertical flex layout with consistent gap. The most-used layout primitive — form fields, page sections, sidebar contents. Replaces ad-hoc display: flex; flex-direction: column."
      files={getComponentFiles('Stack')}
      componentName="Stack"
    >
      <Example
        title="Gap sizes"
        description="6 gap tokens: xs (4) | sm (8) | md (12, default) | lg (16) | xl (24) | 2xl (32). All values in pixels."
        code={`import type { ReactNode } from 'react';
import { Cluster, Stack } from '@eocrm/design-system';

const Block = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      padding: '10px 14px',
      background: 'var(--color-accent-subtle-bg)',
      color: 'var(--color-accent)',
      borderRadius: 'var(--radius-sm)',
      fontWeight: 500,
    }}
  >
    {children}
  </div>
);

export function Demo() {
  return (
    <Cluster gap="lg" align="start">
      {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((g) => (
        <div key={g}>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-fg-subtle)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
          >
            gap={g}
          </div>
          <Stack gap={g}>
            <Block>1</Block>
            <Block>2</Block>
            <Block>3</Block>
          </Stack>
        </div>
      ))}
    </Cluster>
  );
}`}
      >
        <Cluster gap="lg" align="start">
          {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((g) => (
            <div key={g}>
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-fg-subtle)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                gap={g}
              </div>
              <Stack gap={g} className={outlineStyles.outlined}>
                <Block>1</Block>
                <Block>2</Block>
                <Block>3</Block>
              </Stack>
            </div>
          ))}
        </Cluster>
      </Example>

      <Example
        title="Form (the canonical use)"
        description="Stack a label/input pair vertically, with a button row at the bottom."
        code={`import { Button, Cluster, Input, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Stack gap="md">
        <Input placeholder="Name" />
        <Input placeholder="Email" />
        <Cluster justify="end" gap="sm">
          <Button variant="secondary">Cancel</Button>
          <Button>Save</Button>
        </Cluster>
      </Stack>
    </div>
  );
}`}
      >
        <div style={{ maxWidth: 360 }}>
          <Stack gap="md" className={outlineStyles.outlined}>
            <Input placeholder="Name" />
            <Input placeholder="Email" />
            <Cluster justify="end" gap="sm">
              <Button variant="secondary">Cancel</Button>
              <Button>Save</Button>
            </Cluster>
          </Stack>
        </div>
      </Example>

      <Example
        title="Alignment (cross-axis)"
        description="align controls horizontal alignment of children inside the stack. Default is stretch."
        code={`import { Badge, Cluster, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="lg" align="start">
      {(['start', 'center', 'end', 'stretch'] as const).map((a) => (
        <div key={a} style={{ width: 160 }}>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-fg-subtle)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
          >
            align={a}
          </div>
          <Stack gap="sm" align={a}>
            <Badge tone="info">Short</Badge>
            <Badge tone="info">Medium width</Badge>
          </Stack>
        </div>
      ))}
    </Cluster>
  );
}`}
      >
        <Cluster gap="lg" align="start">
          {(['start', 'center', 'end', 'stretch'] as const).map((a) => (
            <div key={a} style={{ width: 160 }}>
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-fg-subtle)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                align={a}
              </div>
              <Stack gap="sm" align={a} className={outlineStyles.outlined}>
                <Badge tone="info">Short</Badge>
                <Badge tone="info">Medium width</Badge>
              </Stack>
            </div>
          ))}
        </Cluster>
      </Example>

      <Example
        title="minWidth0 — truncating inside a clipping row"
        description="A Stack is a column, so its own min-width only bites when the Stack is itself an item of a squeezing flex row. minWidth0 lets it shrink there so its Text truncate children ellipsize instead of the whole Stack being pinned to its widest line and hard-cut. Same opt-in trade-off as Cluster."
        code={`import { Stack, Text } from '@eocrm/design-system';

// A Stack only needs minWidth0 when it is an item of a squeezing ROW.
const ClippingRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', width: 260, overflow: 'hidden', gap: 8 }}>{children}</div>
);

export function Demo() {
  return (
    <>
      {/* With minWidth0 — both lines ellipsize. */}
      <ClippingRow>
        <Stack gap="xs" minWidth0>
          <Text size="sm" weight="medium" truncate>
            Quarterly business review with the Northwind account team
          </Text>
          <Text size="xs" tone="muted" truncate>
            Attendees: Priya Shah, Sam Okonkwo, Mei Lin, Yusuf Demir
          </Text>
        </Stack>
      </ClippingRow>

      {/* Without it — the Stack is floored at its widest line and overflows. */}
      <ClippingRow>
        <Stack gap="xs">
          <Text size="sm" weight="medium" truncate>
            Quarterly business review with the Northwind account team
          </Text>
          <Text size="xs" tone="muted" truncate>
            Attendees: Priya Shah, Sam Okonkwo, Mei Lin, Yusuf Demir
          </Text>
        </Stack>
      </ClippingRow>
    </>
  );
}`}
      >
        <Stack gap="sm">
          <Text size="xs" tone="muted">
            With minWidth0 — ellipsizes:
          </Text>
          <ClippingRow>
            <Stack gap="xs" minWidth0 className={outlineStyles.outlined}>
              <Text size="sm" weight="medium" truncate>
                Quarterly business review with the Northwind account team
              </Text>
              <Text size="xs" tone="muted" truncate>
                Attendees: Priya Shah, Sam Okonkwo, Mei Lin, Yusuf Demir
              </Text>
            </Stack>
          </ClippingRow>
          <Text size="xs" tone="muted">
            Without it — hard-clipped:
          </Text>
          <ClippingRow>
            <Stack gap="xs" className={outlineStyles.outlined}>
              <Text size="sm" weight="medium" truncate>
                Quarterly business review with the Northwind account team
              </Text>
              <Text size="xs" tone="muted" truncate>
                Attendees: Priya Shah, Sam Okonkwo, Mei Lin, Yusuf Demir
              </Text>
            </Stack>
          </ClippingRow>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
