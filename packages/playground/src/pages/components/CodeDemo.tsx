import { Code } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Code/Code.tsx?raw';
import scssSource from '@lib-source/components/Code/Code.module.scss?raw';

export function CodeDemo() {
  return (
    <DemoLayout
      name="Code"
      description="Inline <code> chip — monospace text with a subtle background. Inline only; block code with syntax highlighting lives in the playground's CodeBlock (Prism)."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Code.tsx"
      scssFilename="Code.module.scss"
      componentName="Code"
    >
      <Example
        title="Inline inside text"
        description="The default chip — used as part of a sentence."
        code={`<Text>The variable <Code>userId</Code> is required.</Text>
<Text>Use <Code>npm install</Code> to add a dependency.</Text>`}
      >
        <Stack gap="xs">
          <Text>
            The variable <Code>userId</Code> is required.
          </Text>
          <Text>
            Use <Code>npm install</Code> to add a dependency.
          </Text>
        </Stack>
      </Example>

      <Example
        title="Tones"
        description="Four tones change only the text color — the chip background stays the same."
        code={`<Code tone="default">default()</Code>
<Code tone="muted">muted()</Code>
<Code tone="accent">accent()</Code>
<Code tone="danger">danger()</Code>`}
      >
        <Cluster gap="sm">
          <Code tone="default">default()</Code>
          <Code tone="muted">muted()</Code>
          <Code tone="accent">accent()</Code>
          <Code tone="danger">danger()</Code>
        </Cluster>
      </Example>

      <Example
        title="Standalone"
        description="A <Code> outside a surrounding <Text>. The chip uses var(--font-size-code), which is 0.92em — so a standalone Code inherits the document's base font-size and scales accordingly."
        code={`<Code>fetch('/api/users')</Code>`}
      >
        <Code>fetch('/api/users')</Code>
      </Example>
    </DemoLayout>
  );
}
