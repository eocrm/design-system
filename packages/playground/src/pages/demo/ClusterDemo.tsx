import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Cluster/Cluster.tsx?raw';
import scssSource from '@lib-source/components/Cluster/Cluster.module.scss?raw';

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
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Cluster.tsx"
      scssFilename="Cluster.module.scss"
    >
      <Example
        title="Justify (main-axis)"
        description="Controls horizontal distribution. between is the toolbar pattern: title on left, actions on right."
        code={`<Cluster justify="start">…</Cluster>
<Cluster justify="center">…</Cluster>
<Cluster justify="end">…</Cluster>
<Cluster justify="between">…</Cluster>`}
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
              <Cluster gap="sm" justify={j}>
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
        code={`<Cluster justify="end" gap="sm">
  <Button variant="secondary">Cancel</Button>
  <Button>Save</Button>
</Cluster>`}
      >
        <Cluster justify="end" gap="sm">
          <Button variant="secondary">Cancel</Button>
          <Button>Save changes</Button>
        </Cluster>
      </Example>

      <Example
        title="Toolbar (justify='between')"
        description="Title on the left, actions on the right. Each side can be its own cluster."
        code={`<Cluster justify="between" gap="md">
  <h2>Users</h2>
  <Cluster gap="sm">
    <Button variant="secondary">Filter</Button>
    <Button>Add user</Button>
  </Cluster>
</Cluster>`}
      >
        <Cluster justify="between" gap="md">
          <h2 style={{ margin: 0 }}>Users</h2>
          <Cluster gap="sm">
            <Button variant="secondary">Filter</Button>
            <Button>Add user</Button>
          </Cluster>
        </Cluster>
      </Example>

      <Example
        title="Tag list (wrap=true, default)"
        description="When the container is narrow, items wrap to the next line. This is the default behavior."
        code={`<Cluster gap="xs">
  {tags.map(t => <Badge tone={t.tone}>{t.label}</Badge>)}
</Cluster>`}
      >
        <div style={{ maxWidth: 360, border: '1px dashed var(--color-border-strong)', padding: 12 }}>
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
      </Example>

      <Example
        title="wrap={false}"
        description="When you need items to stay on one line (e.g. inside a narrow table cell). Use sparingly — set wrap=false when overflow is more acceptable than wrapping."
        code={`<Cluster gap="xs" wrap={false}>
  <Button variant="ghost" size="sm">Resend</Button>
  <Button variant="ghost" size="sm">Revoke</Button>
</Cluster>`}
      >
        <Cluster gap="xs" wrap={false}>
          <Button variant="ghost" size="sm">
            Resend
          </Button>
          <Button variant="ghost" size="sm">
            Revoke
          </Button>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
