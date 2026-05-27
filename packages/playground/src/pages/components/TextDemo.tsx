import { Text } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Input } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function TextDemo() {
  return (
    <DemoLayout
      name="Text"
      description="Body / inline text primitive. Constrained-as (p/span/div/label). Use for every non-heading run — stop reaching for raw <p> + style={{ fontSize: ... }}."
      files={getComponentFiles('Text')}
      componentName="Text"
    >
      <Example
        title="Sizes"
        description="Five sizes from --font-size-xs (11px) to --font-size-xl (20px). Default is `md` (14px)."
        code={`<Text size="xs">xs — 11px, dense metadata</Text>
<Text size="sm">sm — 12px, small body / labels</Text>
<Text size="md">md — 14px, body (default)</Text>
<Text size="lg">lg — 16px, large body</Text>
<Text size="xl">xl — 20px, very large body</Text>`}
      >
        <Stack gap="xs">
          <Text size="xs">xs — 11px, dense metadata</Text>
          <Text size="sm">sm — 12px, small body / labels</Text>
          <Text size="md">md — 14px, body (default)</Text>
          <Text size="lg">lg — 16px, large body</Text>
          <Text size="xl">xl — 20px, very large body</Text>
        </Stack>
      </Example>

      <Example
        title="As variants"
        description="Constrained-as dispatch — exactly four rendered elements. <p> (block, default), <span> (inline), <div> (block, no <p> nesting constraints), <label> (pair with htmlFor)."
        code={`<Text>Default — renders <p></Text>
<Text as="span">as="span" — renders inline <span></Text>
<Text as="div">as="div" — renders block <div></Text>
<Text as="label" htmlFor="email-demo">as="label" htmlFor — renders <label></Text>
<Input id="email-demo" placeholder="Email" />`}
      >
        <Stack gap="sm" align="start">
          <Text>Default — renders &lt;p&gt;</Text>
          <Text as="span">as="span" — renders inline &lt;span&gt;</Text>
          <Text as="div">as="div" — renders block &lt;div&gt;</Text>
          <Text as="label" htmlFor="email-demo">
            as="label" htmlFor — renders &lt;label&gt;
          </Text>
          <Input id="email-demo" placeholder="Email" />
        </Stack>
      </Example>

      <Example
        title="Tones"
        description="Seven tones: default + muted + subtle (foreground variants), accent, plus state-coded danger / success / warning."
        code={`<Text tone="default">default</Text>
<Text tone="muted">muted</Text>
<Text tone="subtle">subtle</Text>
<Text tone="accent">accent</Text>
<Text tone="danger">danger</Text>
<Text tone="success">success</Text>
<Text tone="warning">warning</Text>`}
      >
        <Stack gap="xs">
          <Text tone="default">default</Text>
          <Text tone="muted">muted</Text>
          <Text tone="subtle">subtle</Text>
          <Text tone="accent">accent</Text>
          <Text tone="danger">danger</Text>
          <Text tone="success">success</Text>
          <Text tone="warning">warning</Text>
        </Stack>
      </Example>

      <Example
        title="Weights"
        description="Four weights. Default for Text is `regular`."
        code={`<Text weight="regular">regular (default)</Text>
<Text weight="medium">medium</Text>
<Text weight="semibold">semibold</Text>
<Text weight="bold">bold</Text>`}
      >
        <Stack gap="xs">
          <Text weight="regular">regular (default)</Text>
          <Text weight="medium">medium</Text>
          <Text weight="semibold">semibold</Text>
          <Text weight="bold">bold</Text>
        </Stack>
      </Example>

      <Example
        title="Alignment"
        description="Text-align applied via class — left / center / right."
        code={`<Text align="left">left aligned</Text>
<Text align="center">center aligned</Text>
<Text align="right">right aligned</Text>`}
      >
        <Stack gap="xs" style={{ width: 360 }}>
          <Text align="left">left aligned</Text>
          <Text align="center">center aligned</Text>
          <Text align="right">right aligned</Text>
        </Stack>
      </Example>

      <Example
        title="Truncate"
        description="Single-line ellipsis. The full text remains in the accessibility tree."
        code={`<div style={{ width: 240 }}>
  <Text truncate>A long single line that will be ellipsed when it overflows the parent.</Text>
</div>`}
      >
        <div style={{ width: 240, border: '1px dashed var(--color-border)', padding: 8 }}>
          <Text truncate>
            A long single line that will be ellipsed when it overflows the parent.
          </Text>
        </div>
      </Example>

      <Example
        title="Line clamp"
        description="Multi-line ellipsis via `lineClamp={N}` — uses CSS -webkit-line-clamp (the dynamic value is set inline)."
        code={`<div style={{ width: 320 }}>
  <Text lineClamp={2}>
    A long paragraph that wraps onto multiple lines, but we want to ellipsis
    after exactly two lines so the surrounding card has a predictable height.
  </Text>
</div>`}
      >
        <div style={{ width: 320, border: '1px dashed var(--color-border)', padding: 8 }}>
          <Text lineClamp={2}>
            A long paragraph that wraps onto multiple lines, but we want to ellipsis after exactly
            two lines so the surrounding card has a predictable height. This sentence is here just
            to make sure the text overflows so the clamp visibly fires in the demo.
          </Text>
        </div>
      </Example>

      <Example
        title="Composing with <Code>"
        description="<Code> is inline by default and scales with the surrounding text (uses --font-size-code, a relative 0.92em)."
        code={`<Text>Run <Code>npm install</Code> to add a dependency.</Text>
<Text size="sm">In dev mode, set <Code>VITE_BASE_PATH=/</Code> to serve from root.</Text>`}
      >
        <Cluster gap="md" align="start">
          <Stack gap="xs" style={{ maxWidth: 360 }}>
            <Text>
              Run <Code>npm install</Code> to add a dependency.
            </Text>
            <Text size="sm">
              In dev mode, set <Code>VITE_BASE_PATH=/</Code> to serve from root.
            </Text>
          </Stack>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
