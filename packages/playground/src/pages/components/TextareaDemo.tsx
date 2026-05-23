import { useState } from 'react';
import { Cluster, Stack, Textarea } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Textarea/Textarea.tsx?raw';
import scssSource from '@lib-source/components/Textarea/Textarea.module.scss?raw';

export function TextareaDemo() {
  const [tweet, setTweet] = useState("What's happening?");
  const [autoGrowDemo, setAutoGrowDemo] = useState('');

  return (
    <DemoLayout
      name="Textarea"
      componentName="Textarea"
      description="Multi-line text input. Auto-grows by default, optional character counter, configurable resize handle."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Textarea.tsx"
      scssFilename="Textarea.module.scss"
    >
      <Example
        title="Default"
        description="Auto-grows on input, 3 row minimum, no max. Resize handle hidden because auto-grow is on."
        code={`<Textarea placeholder="Write something…" />`}
      >
        <Textarea placeholder="Write something…" />
      </Example>

      <Example
        title="Three sizes"
        description="Size affects typography + padding only (height comes from minRows). Useful when matching Input alongside."
        code={`<Textarea size="sm" minRows={2} placeholder="sm" />
<Textarea size="md" minRows={2} placeholder="md" />
<Textarea size="lg" minRows={2} placeholder="lg" />`}
      >
        <Stack gap="sm">
          <Textarea size="sm" minRows={2} placeholder="sm" />
          <Textarea size="md" minRows={2} placeholder="md" />
          <Textarea size="lg" minRows={2} placeholder="lg" />
        </Stack>
      </Example>

      <Example
        title="Auto-grow in action (capped at 8 rows)"
        description="Type multiple lines — the field expands up to 8 rows, then scrolls."
        code={`<Textarea
  minRows={2}
  maxRows={8}
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Try multiple lines…"
/>`}
      >
        <Textarea
          minRows={2}
          maxRows={8}
          value={autoGrowDemo}
          onChange={(e) => setAutoGrowDemo(e.target.value)}
          placeholder="Try multiple lines…"
        />
      </Example>

      <Example
        title="Fixed rows (no auto-grow) with resize handle"
        description="Opting out of auto-grow lets the user drag the resize handle in the bottom-right corner."
        code={`<Textarea autoGrow={false} minRows={4} resize="vertical" />`}
      >
        <Textarea autoGrow={false} minRows={4} resize="vertical" />
      </Example>

      <Example
        title="Twitter-style counter"
        description="When maxLength is set, the counter appears automatically. Controlled state shown."
        code={`<Textarea
  maxLength={140}
  value={tweet}
  onChange={(e) => setTweet(e.target.value)}
/>`}
      >
        <Textarea
          maxLength={140}
          value={tweet}
          onChange={(e) => setTweet(e.target.value)}
        />
      </Example>

      <Example
        title="Bare counter (no maxLength)"
        description="showCount={true} forces the counter even without a hard limit — shows just the running count."
        code={`<Textarea showCount minRows={3} placeholder="Free-form…" />`}
      >
        <Textarea showCount minRows={3} placeholder="Free-form…" />
      </Example>

      <Example
        title="Error state"
        description="invalid={true} adds the red border + danger focus ring. Pair with a visible error message via aria-describedby."
        code={`<Textarea invalid aria-describedby="bio-error" defaultValue="" />
<p id="bio-error" style={{ color: 'var(--color-danger)' }}>
  Bio must not be empty.
</p>`}
      >
        <Stack gap="sm">
          <Textarea invalid aria-describedby="bio-error" defaultValue="" />
          <p
            id="bio-error"
            style={{
              color: 'var(--color-danger)',
              margin: 0,
              fontSize: 'var(--font-size-sm)',
            }}
          >
            Bio must not be empty.
          </p>
        </Stack>
      </Example>

      <Example
        title="Disabled and readOnly"
        description="Native attributes — same visual treatment as Input."
        code={`<Textarea disabled defaultValue="Disabled — can't focus or edit." />
<Textarea readOnly defaultValue="Read-only — focusable, content selectable, not editable." />`}
      >
        <Cluster gap="sm">
          <Textarea disabled defaultValue="Disabled — can't focus or edit." />
          <Textarea
            readOnly
            defaultValue="Read-only — focusable, content selectable, not editable."
          />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
