import { Card, Cluster, Grid, Input, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function GridDemo() {
  return (
    <DemoLayout
      name="Grid"
      componentName="Grid"
      description="2D layout primitive — CSS Grid wrapper. Use it when you need equal-width columns OR a responsive tile layout that reflows by container width (no breakpoints needed). Pair with Stack (vertical) and Cluster (horizontal-with-wrap)."
      files={getComponentFiles('Grid')}
    >
      <AutoFitExample />
      <FixedColumnsExample />
      <GapScaleExample />
      <MinColumnWidthExample />
      <AlignmentExample />
      <SemanticElementExample />
      <SpanCollapseExample />
      <GraduatedCollapseExample />
    </DemoLayout>
  );
}

function AutoFitExample() {
  return (
    <Example
      title="Auto-fit (default)"
      description="No props set. Defaults to `minColumnWidth='240px'`. Resize your viewport to watch the columns reflow."
      code={`import { Card, Grid } from '@eocrm/design-system';

export function Demo() {
  return (
    <Grid gap="md">
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i}>
          <strong>Tile {i + 1}</strong>
          <p style={{ margin: 0, color: 'var(--color-fg-muted)' }}>
            Auto-fitted to fill the row.
          </p>
        </Card>
      ))}
    </Grid>
  );
}`}
    >
      <Grid gap="md">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i}>
            <strong>Tile {i + 1}</strong>
            <p style={{ margin: 0, color: 'var(--color-fg-muted)' }}>
              Auto-fitted to fill the row.
            </p>
          </Card>
        ))}
      </Grid>
    </Example>
  );
}

function FixedColumnsExample() {
  return (
    <Example
      title="Fixed columns (2-column form)"
      description="`columns={2}` for exactly two equal-width columns regardless of viewport. The canonical label/field form layout."
      code={`import { Grid, Input } from '@eocrm/design-system';

export function Demo() {
  return (
    <Grid columns={2} gap="lg">
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>First name</span>
        <Input placeholder="Ada" />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>Last name</span>
        <Input placeholder="Lovelace" />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>Email</span>
        <Input placeholder="ada@example.com" />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>Phone</span>
        <Input placeholder="+1 555 0100" />
      </label>
    </Grid>
  );
}`}
    >
      <Grid columns={2} gap="lg">
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>First name</span>
          <Input placeholder="Ada" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>Last name</span>
          <Input placeholder="Lovelace" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>Email</span>
          <Input placeholder="ada@example.com" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>Phone</span>
          <Input placeholder="+1 555 0100" />
        </label>
      </Grid>
    </Example>
  );
}

function GapScaleExample() {
  return (
    <Example
      title="Gap scale"
      description="Same scale as Stack and Cluster: xs (4) / sm (8) / md (12) / lg (16) / xl (24) / 2xl (32) — all in pixels."
      code={`import { Card, Grid, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((g) => (
        <Stack key={g} gap="xs">
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
            gap=&quot;{g}&quot;
          </div>
          <Grid columns={3} gap={g}>
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={i}>cell {i + 1}</Card>
            ))}
          </Grid>
        </Stack>
      ))}
    </Stack>
  );
}`}
    >
      <Stack gap="md">
        {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((g) => (
          <Stack key={g} gap="xs">
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
              gap=&quot;{g}&quot;
            </div>
            <Grid columns={3} gap={g}>
              {Array.from({ length: 3 }, (_, i) => (
                <Card key={i}>cell {i + 1}</Card>
              ))}
            </Grid>
          </Stack>
        ))}
      </Stack>
    </Example>
  );
}

function MinColumnWidthExample() {
  return (
    <Example
      title="minColumnWidth variants"
      description="Three grids at different minimums. Wider minColumnWidth = fewer, wider columns at the same viewport."
      code={`import { Card, Grid, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      {(['200px', '280px', '360px'] as const).map((m) => (
        <Stack key={m} gap="xs">
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
            minColumnWidth=&quot;{m}&quot;
          </div>
          <Grid minColumnWidth={m} gap="sm">
            {Array.from({ length: 5 }, (_, i) => (
              <Card key={i}>cell {i + 1}</Card>
            ))}
          </Grid>
        </Stack>
      ))}
    </Stack>
  );
}`}
    >
      <Stack gap="md">
        {(['200px', '280px', '360px'] as const).map((m) => (
          <Stack key={m} gap="xs">
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
              minColumnWidth=&quot;{m}&quot;
            </div>
            <Grid minColumnWidth={m} gap="sm">
              {Array.from({ length: 5 }, (_, i) => (
                <Card key={i}>cell {i + 1}</Card>
              ))}
            </Grid>
          </Stack>
        ))}
      </Stack>
    </Example>
  );
}

function AlignmentExample() {
  return (
    <Example
      title="alignItems / justifyItems"
      description="Cells of varying intrinsic content height. alignItems=start aligns content to the top of each track; alignItems=stretch (default browser behavior) makes them all match the tallest. Try changing the value to compare."
      code={`import { Card, Grid, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
        alignItems=&quot;start&quot;
      </div>
      <Grid columns={3} gap="md" alignItems="start">
        <Card>short</Card>
        <Card>
          medium content here that takes a couple of lines so the card grows taller than the
          others
        </Card>
        <Card>short</Card>
      </Grid>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
        alignItems=&quot;stretch&quot; (default)
      </div>
      <Grid columns={3} gap="md" alignItems="stretch">
        <Card>short</Card>
        <Card>
          medium content here that takes a couple of lines so the card grows taller than the
          others
        </Card>
        <Card>short</Card>
      </Grid>
    </Stack>
  );
}`}
    >
      <Stack gap="md">
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
          alignItems=&quot;start&quot;
        </div>
        <Grid columns={3} gap="md" alignItems="start">
          <Card>short</Card>
          <Card>
            medium content here that takes a couple of lines so the card grows taller than the
            others
          </Card>
          <Card>short</Card>
        </Grid>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
          alignItems=&quot;stretch&quot; (default)
        </div>
        <Grid columns={3} gap="md" alignItems="stretch">
          <Card>short</Card>
          <Card>
            medium content here that takes a couple of lines so the card grows taller than the
            others
          </Card>
          <Card>short</Card>
        </Grid>
      </Stack>
    </Example>
  );
}

function SemanticElementExample() {
  return (
    <Example
      title="Semantic elements via `as`"
      description="Render Grid as a `<section>` (landmark) or `<ul>` (list). Limited to 10 common layout/semantic elements."
      code={`import { Card, Cluster, Grid, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <Grid as="section" columns={2} gap="md">
        <Card>section cell 1</Card>
        <Card>section cell 2</Card>
      </Grid>
      <Cluster gap="sm">
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
          Below: rendered as &lt;ul&gt; with &lt;li&gt; children.
        </span>
      </Cluster>
      <Grid as="ul" minColumnWidth="160px" gap="sm" style={{ listStyle: 'none', padding: 0 }}>
        {['Alpha', 'Bravo', 'Charlie', 'Delta'].map((label) => (
          <li key={label}>
            <Card>{label}</Card>
          </li>
        ))}
      </Grid>
    </Stack>
  );
}`}
    >
      <Stack gap="md">
        <Grid as="section" columns={2} gap="md">
          <Card>section cell 1</Card>
          <Card>section cell 2</Card>
        </Grid>
        <Cluster gap="sm">
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
            Below: rendered as &lt;ul&gt; with &lt;li&gt; children.
          </span>
        </Cluster>
        <Grid as="ul" minColumnWidth="160px" gap="sm" style={{ listStyle: 'none', padding: 0 }}>
          {['Alpha', 'Bravo', 'Charlie', 'Delta'].map((label) => (
            <li key={label}>
              <Card>{label}</Card>
            </li>
          ))}
        </Grid>
      </Stack>
    </Example>
  );
}

function SpanCollapseExample() {
  return (
    <Example
      title="Grid.Item span + collapseBelow"
      description="`Grid.Item span` on a 12-column grid for per-cell width; `collapseBelow='md'` collapses every cell to a full row once the GRID'S OWN width (not the viewport) drops below 640px. Drag the box's resize handle (bottom-right corner) narrower to see it collapse."
      code={`import { Card, Grid } from '@eocrm/design-system';

export function Demo() {
  return (
    <Grid columns={12} gap="md" collapseBelow="md">
      <Grid.Item span="25%"><Card>KPI</Card></Grid.Item>
      <Grid.Item span="75%"><Card>Chart</Card></Grid.Item>
      <Grid.Item span="33%"><Card>List</Card></Grid.Item>
      <Grid.Item span="67%"><Card>Table</Card></Grid.Item>
      <Grid.Item span="100%"><Card>Footer row</Card></Grid.Item>
    </Grid>
  );
}`}
    >
      <div style={{ resize: 'horizontal', overflow: 'auto' }}>
        <Grid columns={12} gap="md" collapseBelow="md">
          <Grid.Item span="25%">
            <Card>KPI</Card>
          </Grid.Item>
          <Grid.Item span="75%">
            <Card>Chart</Card>
          </Grid.Item>
          <Grid.Item span="33%">
            <Card>List</Card>
          </Grid.Item>
          <Grid.Item span="67%">
            <Card>Table</Card>
          </Grid.Item>
          <Grid.Item span="100%">
            <Card>Footer row</Card>
          </Grid.Item>
        </Grid>
      </div>
    </Example>
  );
}

function GraduatedCollapseExample() {
  return (
    <Example
      title="Graduated collapse (breakpoint→columns map)"
      description="`collapseBelow={{ md: 6, sm: 1 }}` steps down instead of jumping straight to one column: 12 columns wide, re-templates to 6 columns under 640px (spans clamp to fit), then to 1 column under 480px. Drag the box's resize handle (bottom-right corner) narrower to see both steps."
      code={`import { Card, Grid } from '@eocrm/design-system';

export function Demo() {
  return (
    <Grid columns={12} gap="md" collapseBelow={{ md: 6, sm: 1 }}>
      <Grid.Item span="25%"><Card>KPI</Card></Grid.Item>
      <Grid.Item span="75%"><Card>Chart</Card></Grid.Item>
      <Grid.Item span="33%"><Card>List</Card></Grid.Item>
      <Grid.Item span="67%"><Card>Table</Card></Grid.Item>
      <Grid.Item span="100%"><Card>Footer row</Card></Grid.Item>
    </Grid>
  );
}`}
    >
      <div style={{ resize: 'horizontal', overflow: 'auto' }}>
        <Grid columns={12} gap="md" collapseBelow={{ md: 6, sm: 1 }}>
          <Grid.Item span="25%">
            <Card>KPI</Card>
          </Grid.Item>
          <Grid.Item span="75%">
            <Card>Chart</Card>
          </Grid.Item>
          <Grid.Item span="33%">
            <Card>List</Card>
          </Grid.Item>
          <Grid.Item span="67%">
            <Card>Table</Card>
          </Grid.Item>
          <Grid.Item span="100%">
            <Card>Footer row</Card>
          </Grid.Item>
        </Grid>
      </div>
    </Example>
  );
}
