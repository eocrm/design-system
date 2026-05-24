import { CircularProgress } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/CircularProgress/CircularProgress.tsx?raw';
import scssSource from '@lib-source/components/CircularProgress/CircularProgress.module.scss?raw';

export function CircularProgressDemo() {
  return (
    <DemoLayout
      name="CircularProgress"
      description="Circular progress / loading spinner. Determinate via value/max draws a donut arc; indeterminate is the canonical inline 'Saving…' spinner. Same prop vocabulary as <Progress>."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="CircularProgress.tsx"
      scssFilename="CircularProgress.module.scss"
      componentName="CircularProgress"
    >
      <Example
        title="Sizes"
        description="Three diameters with proportional stroke. `sm` is 16px (inline next to a button), `md` is 32px (default), `lg` is 56px (page-level)."
        code={`<CircularProgress size="sm" value={45} />
<CircularProgress size="md" value={45} />
<CircularProgress size="lg" value={45} />`}
      >
        <Cluster gap="md" align="center">
          <CircularProgress size="sm" value={45} />
          <CircularProgress size="md" value={45} />
          <CircularProgress size="lg" value={45} />
        </Cluster>
      </Example>

      <Example
        title="Tones"
        description="Same vocabulary as <Progress> — default / success / warning / danger. Stroke color only; the track stays muted."
        code={`<CircularProgress value={80} />
<CircularProgress value={80} tone="success" />
<CircularProgress value={80} tone="warning" />
<CircularProgress value={80} tone="danger" />`}
      >
        <Cluster gap="md" align="center">
          <CircularProgress value={80} />
          <CircularProgress value={80} tone="success" />
          <CircularProgress value={80} tone="warning" />
          <CircularProgress value={80} tone="danger" />
        </Cluster>
      </Example>

      <Example
        title="Indeterminate — the spinner use case"
        description="Omit `value` to spin. This is the canonical inline loading affordance — use `size='sm'` next to a button, `size='md'` near a heading, `size='lg'` as a centered page-loader."
        code={`<CircularProgress size="sm" />
<CircularProgress size="md" />
<CircularProgress size="lg" />`}
      >
        <Cluster gap="md" align="center">
          <CircularProgress size="sm" />
          <CircularProgress size="md" />
          <CircularProgress size="lg" />
        </Cluster>
      </Example>

      <Example
        title="Labels"
        description="`label={true}` shows {n}% centered. Auto-suppressed at `size='sm'` (no room for text) AND when `label=true` on indeterminate. ReactNode labels render in both modes (still suppressed at sm)."
        code={`<CircularProgress size="md" value={75} label />
<CircularProgress size="lg" value={75} label />
<CircularProgress size="sm" value={75} label />  {/* label auto-suppressed */}`}
      >
        <Cluster gap="md" align="center">
          <Stack gap="xs" align="center">
            <CircularProgress size="md" value={75} label />
            <Text size="xs" tone="muted">
              md + label
            </Text>
          </Stack>
          <Stack gap="xs" align="center">
            <CircularProgress size="lg" value={75} label />
            <Text size="xs" tone="muted">
              lg + label
            </Text>
          </Stack>
          <Stack gap="xs" align="center">
            <CircularProgress size="sm" value={75} label />
            <Text size="xs" tone="muted">
              sm (label suppressed)
            </Text>
          </Stack>
        </Cluster>
      </Example>

      <Example
        title="Inline with a button — the canonical 'Saving…' pattern"
        description="A tight loading indicator next to an action trigger. Use `aria-label` to tell SR users what the spinner means."
        code={`<Cluster gap="sm" align="center">
  <Button disabled>Save</Button>
  <CircularProgress size="sm" aria-label="Saving" />
</Cluster>`}
      >
        <Cluster gap="sm" align="center">
          <Button disabled>Save</Button>
          <CircularProgress size="sm" aria-label="Saving" />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
