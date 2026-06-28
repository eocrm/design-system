import { Title } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function TitleDemo() {
  return (
    <DemoLayout
      name="Title"
      description="Semantic heading primitive. Renders <h1>-<h6> from the required `order` prop. Use for every heading in your UI."
      files={getComponentFiles('Title')}
      componentName="Title"
    >
      <Example
        title="Orders 1-6"
        description="The required `order` prop drives both the rendered element (h1-h6) and the default visual size (1→3xl, 2→2xl, 3→xl, 4→lg, 5→md, 6→sm)."
        code={`import { Stack, Title } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <Title order={1}>Order 1 (h1, 3xl)</Title>
      <Title order={2}>Order 2 (h2, 2xl)</Title>
      <Title order={3}>Order 3 (h3, xl)</Title>
      <Title order={4}>Order 4 (h4, lg)</Title>
      <Title order={5}>Order 5 (h5, md)</Title>
      <Title order={6}>Order 6 (h6, sm)</Title>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Title order={1}>Order 1 (h1, 3xl)</Title>
          <Title order={2}>Order 2 (h2, 2xl)</Title>
          <Title order={3}>Order 3 (h3, xl)</Title>
          <Title order={4}>Order 4 (h4, lg)</Title>
          <Title order={5}>Order 5 (h5, md)</Title>
          <Title order={6}>Order 6 (h6, sm)</Title>
        </Stack>
      </Example>

      <Example
        title="Size override"
        description="Pass `size` to decouple the visual size from the semantic level. Useful when a nested section still needs the right h-level for SR but a smaller visual treatment."
        code={`import { Stack, Title } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <Title order={2}>Default h2 (2xl)</Title>
      <Title order={2} size="lg">h2 with size="lg"</Title>
      <Title order={2} size="md">h2 with size="md"</Title>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Title order={2}>Default h2 (2xl)</Title>
          <Title order={2} size="lg">
            h2 with size="lg"
          </Title>
          <Title order={2} size="md">
            h2 with size="md"
          </Title>
        </Stack>
      </Example>

      <Example
        title="Tones"
        description="Five tones map to --color-fg / -muted / -subtle / --color-accent / --color-danger."
        code={`import { Stack, Title } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <Title order={3} tone="default">default</Title>
      <Title order={3} tone="muted">muted</Title>
      <Title order={3} tone="subtle">subtle</Title>
      <Title order={3} tone="accent">accent</Title>
      <Title order={3} tone="danger">danger</Title>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Title order={3} tone="default">
            default
          </Title>
          <Title order={3} tone="muted">
            muted
          </Title>
          <Title order={3} tone="subtle">
            subtle
          </Title>
          <Title order={3} tone="accent">
            accent
          </Title>
          <Title order={3} tone="danger">
            danger
          </Title>
        </Stack>
      </Example>

      <Example
        title="Weights"
        description="Four weights. Default for Title is `semibold`."
        code={`import { Stack, Title } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <Title order={3} weight="regular">regular</Title>
      <Title order={3} weight="medium">medium</Title>
      <Title order={3} weight="semibold">semibold (default)</Title>
      <Title order={3} weight="bold">bold</Title>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Title order={3} weight="regular">
            regular
          </Title>
          <Title order={3} weight="medium">
            medium
          </Title>
          <Title order={3} weight="semibold">
            semibold (default)
          </Title>
          <Title order={3} weight="bold">
            bold
          </Title>
        </Stack>
      </Example>

      <Example
        title="Truncate"
        description="Single-line ellipsis inside a narrow container. The full text remains in the accessibility tree."
        code={`import { Cluster, Title } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="md" align="start">
      <div style={{ width: 200, border: '1px dashed var(--color-border)', padding: 8 }}>
        <Title order={3} truncate>
          A very long title that exceeds the container width
        </Title>
      </div>
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="start">
          <div style={{ width: 200, border: '1px dashed var(--color-border)', padding: 8 }}>
            <Title order={3} truncate>
              A very long title that exceeds the container width
            </Title>
          </div>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
