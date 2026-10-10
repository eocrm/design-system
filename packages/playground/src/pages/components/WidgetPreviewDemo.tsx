import { Grid, Stack, Text, WidgetPreview } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const VARIANTS = ['kpi', 'list', 'chart', 'line', 'pipeline', 'activity'] as const;

export function WidgetPreviewDemo() {
  return (
    <DemoLayout
      name="WidgetPreview"
      componentName="WidgetPreview"
      description="Data-free, aria-hidden miniature of a dashboard widget kind. Built for the preview slot of CatalogPicker items; it fills its container width at a fixed 16 / 10 ratio."
      files={getComponentFiles('WidgetPreview')}
    >
      <Example
        title="Variants"
        description="kpi, list, chart, line, pipeline and activity."
        code={`<Grid minColumnWidth="160px" gap="md">
  {['kpi', 'list', 'chart', 'line', 'pipeline', 'activity'].map((variant) => (
    <Stack key={variant} gap="xs">
      <WidgetPreview variant={variant} />
      <Text size="sm" tone="muted">{variant}</Text>
    </Stack>
  ))}
</Grid>`}
      >
        <Grid minColumnWidth="160px" gap="md">
          {VARIANTS.map((variant) => (
            <Stack key={variant} gap="xs">
              <WidgetPreview variant={variant} />
              <Text size="sm" tone="muted">
                {variant}
              </Text>
            </Stack>
          ))}
        </Grid>
      </Example>

      <Example
        title="Scaling"
        description="The preview takes the width of its parent: a 160px and a 360px container."
        code={`<Stack gap="md">
  <div style={{ width: 160 }}><WidgetPreview variant="chart" /></div>
  <div style={{ width: 360 }}><WidgetPreview variant="chart" /></div>
</Stack>`}
      >
        <Stack gap="md">
          <div style={{ width: 160 }}>
            <WidgetPreview variant="chart" />
          </div>
          <div style={{ width: 360 }}>
            <WidgetPreview variant="chart" />
          </div>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
