import { useState } from 'react';
import {
  Code,
  Field,
  I18nProvider,
  LocaleProvider,
  NumberField,
  Stack,
  Text,
  ru,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function NumberFieldDemo() {
  const [qty, setQty] = useState<number | null>(1);
  const [rate, setRate] = useState<number | null>(0.25);
  const [temp, setTemp] = useState<number | null>(-5);
  const [sm, setSm] = useState<number | null>(3);
  const [md, setMd] = useState<number | null>(3);
  const [lg, setLg] = useState<number | null>(3);
  const [price, setPrice] = useState<number | null>(1234.5);
  const [err, setErr] = useState<number | null>(120);

  return (
    <DemoLayout
      name="NumberField"
      componentName="NumberField"
      description="Split numeric stepper [ − | value | + ]. onChange fires live while typing; blur or Enter clamps to min/max and snaps to step. Arrow, Page, Home and End keys step; holding a button repeats. On touch devices the field and both buttons are 44px with 16px text."
      files={getComponentFiles('NumberField')}
    >
      <Example
        title="Quantity in a Field"
        description="min 0, max 99. Type 150 and tab away: it clamps to 99. The + button disables at 99, − at 0. Hold a button to repeat."
        code={`import { useState } from 'react';
import { Field, NumberField } from '@eocrm/design-system';

export function Demo() {
  const [qty, setQty] = useState<number | null>(1);
  return (
    <Field label="Quantity">
      <NumberField value={qty} onChange={setQty} min={0} max={99} />
    </Field>
  );
}`}
      >
        <Stack gap="sm">
          <Field label="Quantity">
            <NumberField value={qty} onChange={setQty} min={0} max={99} />
          </Field>
          <Text size="sm" tone="muted">
            value → <Code>{JSON.stringify(qty)}</Code>
          </Text>
        </Stack>
      </Example>

      <Example
        title="Fractional step"
        description="step 0.05 shows two decimals and snaps on blur: 0.33 becomes 0.35. PageUp / PageDown move by 10 × step."
        code={`<NumberField aria-label="Rate" value={rate} onChange={setRate} min={0} max={1} step={0.05} />`}
      >
        <Stack gap="sm">
          <NumberField
            aria-label="Rate"
            value={rate}
            onChange={setRate}
            min={0}
            max={1}
            step={0.05}
          />
          <Text size="sm" tone="muted">
            value → <Code>{JSON.stringify(rate)}</Code>
          </Text>
        </Stack>
      </Example>

      <Example
        title="Negative range"
        description="With min below 0 the field accepts a leading minus. A lone '-' stays as a draft without firing onChange."
        code={`<NumberField aria-label="Temperature" value={temp} onChange={setTemp} min={-40} max={40} />`}
      >
        <NumberField aria-label="Temperature" value={temp} onChange={setTemp} min={-40} max={40} />
      </Example>

      <Example
        title="Sizes"
        description="sm / md / lg, the same scale as Input."
        code={`<NumberField size="sm" aria-label="Small" value={v} onChange={setV} />
<NumberField size="md" aria-label="Medium" value={v} onChange={setV} />
<NumberField size="lg" aria-label="Large" value={v} onChange={setV} />`}
      >
        <Stack gap="sm">
          <NumberField size="sm" aria-label="Small" value={sm} onChange={setSm} />
          <NumberField size="md" aria-label="Medium" value={md} onChange={setMd} />
          <NumberField size="lg" aria-label="Large" value={lg} onChange={setLg} />
        </Stack>
      </Example>

      <Example
        title="Russian locale"
        description="Group and decimal characters follow the active locale: 1 234,5. Type 2,5 or use the numpad '.'."
        code={`<I18nProvider locale="ru" messages={ru}>
  <LocaleProvider locale="ru">
    <NumberField aria-label="Цена" value={price} onChange={setPrice} step={0.1} />
  </LocaleProvider>
</I18nProvider>`}
      >
        <I18nProvider locale="ru" messages={ru}>
          <LocaleProvider locale="ru">
            <NumberField aria-label="Цена" value={price} onChange={setPrice} step={0.1} />
          </LocaleProvider>
        </I18nProvider>
      </Example>

      <Example
        title="States"
        description="Field error flips the field invalid; disabled and readOnly lock both buttons."
        code={`<Field label="Seats" error="Max 100 seats">
  <NumberField value={seats} onChange={setSeats} max={100} />
</Field>
<NumberField aria-label="Disabled" value={5} onChange={() => {}} disabled />
<NumberField aria-label="Read-only" value={5} onChange={() => {}} readOnly />`}
      >
        <Stack gap="sm">
          <Field label="Seats" error={err !== null && err > 100 ? 'Max 100 seats' : undefined}>
            <NumberField value={err} onChange={setErr} max={100} />
          </Field>
          <NumberField aria-label="Disabled" value={5} onChange={() => {}} disabled />
          <NumberField aria-label="Read-only" value={5} onChange={() => {}} readOnly />
        </Stack>
      </Example>
    </DemoLayout>
  );
}
