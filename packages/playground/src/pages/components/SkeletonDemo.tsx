import { Card, Cluster, Skeleton, Stack, Table } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function SkeletonDemo() {
  return (
    <DemoLayout
      name="Skeleton"
      componentName="Skeleton"
      description="Placeholder rectangle for loading states. Three variants (text / circular / rectangular), pulse animation respects prefers-reduced-motion."
      files={getComponentFiles('Skeleton')}
    >
      <Example
        title="Text — inline placeholder"
        description="Default variant sits on the text baseline. Use directly inside a paragraph or label while the real value loads."
        code={`<p style={{ margin: 0 }}>
  Loading user name: <Skeleton width={120} />
</p>`}
      >
        <p style={{ margin: 0 }}>
          Loading user name: <Skeleton width={120} />
        </p>
      </Example>

      <Example
        title="Multi-line text"
        description="Stack several text skeletons at varied widths to mimic a paragraph or list-item copy block."
        code={`<Stack gap="xs" style={{ width: 240 }}>
  <Skeleton width="80%" />
  <Skeleton width="60%" />
  <Skeleton width="40%" />
</Stack>`}
      >
        <Stack gap="xs" style={{ width: 240 }}>
          <Skeleton width="80%" />
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </Stack>
      </Example>

      <Example
        title="Circular — avatar placeholders"
        description='`variant="circular"` forces border-radius 50%. When only `width` is set the height matches automatically — no need to supply both.'
        code={`<Cluster gap="md" align="center">
  <Skeleton variant="circular" width={32} />
  <Skeleton variant="circular" width={40} />
</Cluster>`}
      >
        <Cluster gap="md" align="center">
          <Skeleton variant="circular" width={32} />
          <Skeleton variant="circular" width={40} />
        </Cluster>
      </Example>

      <Example
        title="Rectangular — image / button / card"
        description='`variant="rectangular"` gives a small border-radius. Always supply explicit dimensions — with no width/height the box has zero size and renders invisibly.'
        code={`<Stack gap="sm">
  <Skeleton variant="rectangular" width={200} height={120} />
  <Skeleton variant="rectangular" width={80} height={32} />
  <Skeleton variant="rectangular" width="100%" height={60} />
</Stack>`}
      >
        <Stack gap="sm">
          <Skeleton variant="rectangular" width={200} height={120} />
          <Skeleton variant="rectangular" width={80} height={32} />
          <Skeleton variant="rectangular" width="100%" height={60} />
        </Stack>
      </Example>

      <Example
        title="List-row composition"
        description="Compose circular + text + rectangular skeletons inside your normal layout primitives to match the shape of the real content."
        code={`<Card padding="md">
  <Cluster gap="md" align="center">
    <Skeleton variant="circular" width={32} />
    <Stack gap="xs" style={{ flex: 1 }}>
      <Skeleton width="60%" />
      <Skeleton width="40%" />
    </Stack>
    <Skeleton variant="rectangular" width={80} height={32} />
  </Cluster>
</Card>`}
      >
        <Card padding="md">
          <Cluster gap="md" align="center">
            <Skeleton variant="circular" width={32} />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Skeleton width="60%" />
              <Skeleton width="40%" />
            </Stack>
            <Skeleton variant="rectangular" width={80} height={32} />
          </Cluster>
        </Card>
      </Example>

      <Example
        title='No animation — animation="none"'
        description='Pass `animation="none"` when rendering many skeletons at once. Simultaneous pulsing on 10+ elements is visually noisy; a static state reads more cleanly.'
        code={`<Stack gap="xs" style={{ width: 240 }}>
  {Array.from({ length: 5 }).map((_, i) => (
    <Skeleton key={i} variant="rectangular" height={32} animation="none" />
  ))}
</Stack>`}
      >
        <Stack gap="xs" style={{ width: 240 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={32} animation="none" />
          ))}
        </Stack>
      </Example>

      <Example
        title="Inside a Table — DataTable preview"
        description="Drop skeletons directly into Table cells to render a realistic table loading state before data arrives."
        code={`<Table>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Name</Table.HeaderCell>
      <Table.HeaderCell>Status</Table.HeaderCell>
      <Table.HeaderCell align="end">Amount</Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {Array.from({ length: 5 }).map((_, i) => (
      <Table.Row key={i}>
        <Table.Cell><Skeleton width="80%" /></Table.Cell>
        <Table.Cell><Skeleton width={60} /></Table.Cell>
        <Table.Cell align="end"><Skeleton width={50} /></Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>`}
      >
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell align="end">Amount</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {Array.from({ length: 5 }).map((_, i) => (
              <Table.Row key={i}>
                <Table.Cell>
                  <Skeleton width="80%" />
                </Table.Cell>
                <Table.Cell>
                  <Skeleton width={60} />
                </Table.Cell>
                <Table.Cell align="end">
                  <Skeleton width={50} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Example>
    </DemoLayout>
  );
}
