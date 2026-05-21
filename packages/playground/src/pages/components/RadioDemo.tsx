import { useState } from 'react';
import { Button, Radio, RadioGroup, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import tsxSource from '@lib-source/components/Radio/Radio.tsx?raw';
import scssSource from '@lib-source/components/Radio/Radio.module.scss?raw';

function ControlledDemo() {
  const [plan, setPlan] = useState('free');
  return (
    <Stack gap="xs">
      <RadioGroup name="plan" value={plan} onChange={setPlan} label="Pick a plan">
        <Radio value="free" label="Free" />
        <Radio value="pro" label="Pro" />
        <Radio value="enterprise" label="Enterprise" />
      </RadioGroup>
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        plan = {plan}
      </code>
    </Stack>
  );
}

function FormDemo() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setSubmitted(String(fd.get('size') ?? '(none)'));
      }}
    >
      <Stack gap="xs">
        <RadioGroup name="size" defaultValue="md" label="T-shirt size">
          <Radio value="sm" label="Small" />
          <Radio value="md" label="Medium" />
          <Radio value="lg" label="Large" />
        </RadioGroup>
        <Button type="submit" size="sm">
          Submit
        </Button>
        {submitted !== null && (
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            size = {submitted}
          </code>
        )}
      </Stack>
    </form>
  );
}

export function RadioDemo() {
  return (
    <DemoLayout
      name="Radio"
      componentName="Radio"
      description="Native `<input type='radio'>` visually hidden + custom-painted ring + dot. Pair with `<RadioGroup>` for proper a11y grouping (fieldset/legend), shared name, and centralized state."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Radio.tsx"
      scssFilename="Radio.module.scss"
    >
      <Example
        title="Default — RadioGroup (preferred)"
        description="Wrap radios in `<RadioGroup>` to get fieldset/legend semantics, shared `name`, and centralized state."
        code={`<RadioGroup name="size" defaultValue="md" label="T-shirt size">
  <Radio value="sm" label="Small" />
  <Radio value="md" label="Medium" />
  <Radio value="lg" label="Large" />
</RadioGroup>`}
      >
        <InputExample>
          <RadioGroup name="size-default" defaultValue="md" label="T-shirt size">
            <Radio value="sm" label="Small" />
            <Radio value="md" label="Medium" />
            <Radio value="lg" label="Large" />
          </RadioGroup>
        </InputExample>
      </Example>

      <Example
        title="Sizes"
        description="Three sizes — sm (14px) / md (16px, default) / lg (20px). Same scale as `<Checkbox>` and `<Input>`."
        code={`<RadioGroup name="size" size="sm" defaultValue="a">...</RadioGroup>
<RadioGroup name="size" size="md" defaultValue="a">...</RadioGroup>
<RadioGroup name="size" size="lg" defaultValue="a">...</RadioGroup>`}
      >
        <InputExample>
          <Stack gap="md">
            <RadioGroup name="sz-sm" size="sm" defaultValue="a" orientation="horizontal">
              <Radio value="a" label="Small A" />
              <Radio value="b" label="Small B" />
            </RadioGroup>
            <RadioGroup name="sz-md" size="md" defaultValue="a" orientation="horizontal">
              <Radio value="a" label="Medium A" />
              <Radio value="b" label="Medium B" />
            </RadioGroup>
            <RadioGroup name="sz-lg" size="lg" defaultValue="a" orientation="horizontal">
              <Radio value="a" label="Large A" />
              <Radio value="b" label="Large B" />
            </RadioGroup>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="Provide `value` + `onChange`. The handler receives `(nextValue, event)`."
        code={`const [plan, setPlan] = useState('free');
<RadioGroup name="plan" value={plan} onChange={setPlan} label="Pick a plan">
  <Radio value="free" label="Free" />
  <Radio value="pro" label="Pro" />
  <Radio value="enterprise" label="Enterprise" />
</RadioGroup>`}
      >
        <InputExample>
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="Horizontal orientation"
        description="`orientation='horizontal'` lays out radios in a wrapping row."
        code={`<RadioGroup name="align" defaultValue="left" label="Text align" orientation="horizontal">
  <Radio value="left" label="Left" />
  <Radio value="center" label="Center" />
  <Radio value="right" label="Right" />
</RadioGroup>`}
      >
        <InputExample>
          <RadioGroup name="align" defaultValue="left" label="Text align" orientation="horizontal">
            <Radio value="left" label="Left" />
            <Radio value="center" label="Center" />
            <Radio value="right" label="Right" />
          </RadioGroup>
        </InputExample>
      </Example>

      <Example
        title="Disabled"
        description="`disabled` on the group disables all children. A per-child `disabled` still wins for individual options."
        code={`<RadioGroup name="locked" defaultValue="a" disabled label="Locked group">
  <Radio value="a" label="Option A" />
  <Radio value="b" label="Option B" />
</RadioGroup>`}
      >
        <InputExample>
          <Stack gap="md">
            <RadioGroup name="locked" defaultValue="a" disabled label="Locked group">
              <Radio value="a" label="Option A" />
              <Radio value="b" label="Option B" />
            </RadioGroup>
            <RadioGroup name="mixed" defaultValue="a" label="One option disabled">
              <Radio value="a" label="Available" />
              <Radio value="b" label="Disabled" disabled />
              <Radio value="c" label="Available" />
            </RadioGroup>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Invalid"
        description="`invalid` on the group sets `aria-invalid` on the fieldset and applies the danger visual to every child + the legend."
        code={`<RadioGroup name="terms" invalid required label="Accept the agreement" aria-describedby="terms-err">
  <Radio value="yes" label="Yes" />
  <Radio value="no" label="No" />
</RadioGroup>
<p id="terms-err">Please make a selection.</p>`}
      >
        <InputExample>
          <Stack gap="xs">
            <RadioGroup
              name="terms"
              invalid
              required
              label="Accept the agreement"
              aria-describedby="terms-err"
            >
              <Radio value="yes" label="Yes" />
              <Radio value="no" label="No" />
            </RadioGroup>
            <p
              id="terms-err"
              style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}
            >
              Please make a selection.
            </p>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Form integration"
        description="`<RadioGroup name>` shared across children means `FormData.get(name)` returns the selected value."
        code={`<form>
  <RadioGroup name="size" defaultValue="md" label="T-shirt size">
    <Radio value="sm" label="Small" />
    <Radio value="md" label="Medium" />
    <Radio value="lg" label="Large" />
  </RadioGroup>
  <button type="submit">Submit</button>
</form>

// On submit: new FormData(form).get('size')`}
      >
        <InputExample>
          <FormDemo />
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
