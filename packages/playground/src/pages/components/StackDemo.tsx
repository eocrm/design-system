import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Input } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import outlineStyles from './demoOutline.module.scss';
import { getComponentFiles } from '../../lib/componentFiles';

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
    </DemoLayout>
  );
}
