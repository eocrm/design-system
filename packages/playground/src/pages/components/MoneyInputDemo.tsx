import { useState } from 'react';
import {
  Cluster,
  Code,
  Field,
  LocaleProvider,
  MoneyInput,
  Stack,
  Text,
  type MoneyValue,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const MULTI = ['EUR', 'USD', 'GBP', 'JPY'];

export function MoneyInputDemo() {
  const [multi, setMulti] = useState<MoneyValue>({ amount: null, currency: 'EUR' });
  const [single, setSingle] = useState<MoneyValue>({ amount: '1234.5', currency: 'USD' });
  const [display, setDisplay] = useState<MoneyValue>({ amount: '99', currency: 'EUR' });
  const [jpy, setJpy] = useState<MoneyValue>({ amount: '1500', currency: 'JPY' });
  const [kwd, setKwd] = useState<MoneyValue>({ amount: '12.345', currency: 'KWD' });
  const [neg, setNeg] = useState<MoneyValue>({ amount: '-250', currency: 'EUR' });
  const [field, setField] = useState<MoneyValue>({ amount: null, currency: 'EUR' });
  const [size, setSize] = useState<MoneyValue>({ amount: '10', currency: 'EUR' });
  const [de, setDe] = useState<MoneyValue>({ amount: '1234567.89', currency: 'EUR' });

  return (
    <DemoLayout
      name="MoneyInput"
      componentName="MoneyInput"
      description="Money field — currency picker + formatted amount, controlled on one MoneyValue. The amount is a canonical decimal string, never a JS number."
      files={getComponentFiles('MoneyInput')}
    >
      <Example
        title="Multi-currency"
        description="Several currencies render a picker. Switching rounds the amount half-up to the new precision; the emitted MoneyValue is shown live."
        code={`import { useState } from 'react';
import { MoneyInput, Stack, Text, Code, type MoneyValue } from '@eocrm/design-system';

export function Demo() {
  const [price, setPrice] = useState<MoneyValue>({ amount: null, currency: 'EUR' });
  return (
    <Stack gap="sm">
      <MoneyInput
        aria-label="Price"
        currencies={['EUR', 'USD', 'GBP', 'JPY']}
        value={price}
        onChange={setPrice}
      />
      <Text size="sm" tone="muted">
        value → <Code>{JSON.stringify(price)}</Code>
      </Text>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <MoneyInput aria-label="Price" currencies={MULTI} value={multi} onChange={setMulti} />
          <Text size="sm" tone="muted">
            value → <Code>{JSON.stringify(multi)}</Code>
          </Text>
        </Stack>
      </Example>

      <Example
        title="Single currency (prefix)"
        description="Exactly one currency renders a static prefix instead of a picker."
        code={`import { useState } from 'react';
import { MoneyInput, type MoneyValue } from '@eocrm/design-system';

export function Demo() {
  const [v, setV] = useState<MoneyValue>({ amount: '1234.5', currency: 'USD' });
  return <MoneyInput aria-label="Amount" currencies={['USD']} value={v} onChange={setV} />;
}`}
      >
        <MoneyInput aria-label="Amount" currencies={['USD']} value={single} onChange={setSingle} />
      </Example>

      <Example
        title="Currency display (currencyDisplay)"
        description="How the selected currency shows: code (default), symbol or both. All three share one value."
        code={`import { useState } from 'react';
import { MoneyInput, Stack, Cluster, Code, type MoneyValue } from '@eocrm/design-system';

export function Demo() {
  const [v, setV] = useState<MoneyValue>({ amount: '99', currency: 'EUR' });
  return (
    <Stack gap="sm">
      {(['code', 'symbol', 'both'] as const).map((mode) => (
        <Cluster key={mode} gap="sm">
          <Code>{mode}</Code>
          <MoneyInput
            aria-label={\`\${mode} display\`}
            currencies={['EUR', 'USD', 'GBP']}
            currencyDisplay={mode}
            value={v}
            onChange={setV}
          />
        </Cluster>
      ))}
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          {(['code', 'symbol', 'both'] as const).map((mode) => (
            <Cluster key={mode} gap="sm">
              <Code>{mode}</Code>
              <MoneyInput
                aria-label={`${mode} display`}
                currencies={['EUR', 'USD', 'GBP']}
                currencyDisplay={mode}
                value={display}
                onChange={setDisplay}
              />
            </Cluster>
          ))}
        </Stack>
      </Example>

      <Example
        title="Precision (JPY 0, KWD 3)"
        description="Keystrokes past the currency's precision are rejected: JPY takes no decimals, KWD three. EUR/USD take two."
        code={`import { useState } from 'react';
import { MoneyInput, Stack, type MoneyValue } from '@eocrm/design-system';

export function Demo() {
  const [jpy, setJpy] = useState<MoneyValue>({ amount: '1500', currency: 'JPY' });
  const [kwd, setKwd] = useState<MoneyValue>({ amount: '12.345', currency: 'KWD' });
  return (
    <Stack gap="sm">
      <MoneyInput aria-label="JPY" currencies={['JPY']} value={jpy} onChange={setJpy} />
      <MoneyInput aria-label="KWD" currencies={['KWD']} value={kwd} onChange={setKwd} />
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <MoneyInput aria-label="JPY" currencies={['JPY']} value={jpy} onChange={setJpy} />
          <MoneyInput aria-label="KWD" currencies={['KWD']} value={kwd} onChange={setKwd} />
        </Stack>
      </Example>

      <Example
        title="Negative amounts (allowNegative)"
        description="Permits a leading minus; off by default."
        code={`import { useState } from 'react';
import { MoneyInput, type MoneyValue } from '@eocrm/design-system';

export function Demo() {
  const [v, setV] = useState<MoneyValue>({ amount: '-250', currency: 'EUR' });
  return <MoneyInput aria-label="Adjustment" currencies={['EUR']} allowNegative value={v} onChange={setV} />;
}`}
      >
        <MoneyInput
          aria-label="Adjustment"
          currencies={['EUR']}
          allowNegative
          value={neg}
          onChange={setNeg}
        />
      </Example>

      <Example
        title="Inside a Field (label + error)"
        description="Field wires the label and error; the picker is named “Price Currency”."
        code={`import { useState } from 'react';
import { MoneyInput, Field, type MoneyValue } from '@eocrm/design-system';

export function Demo() {
  const [price, setPrice] = useState<MoneyValue>({ amount: null, currency: 'EUR' });
  return (
    <Field label="Price" error={price.amount === null ? 'Required' : undefined}>
      <MoneyInput currencies={['EUR', 'USD']} value={price} onChange={setPrice} />
    </Field>
  );
}`}
      >
        <Field label="Price" error={field.amount === null ? 'Required' : undefined}>
          <MoneyInput currencies={['EUR', 'USD']} value={field} onChange={setField} />
        </Field>
      </Example>

      <Example
        title="Sizes"
        description="size is forwarded to both the picker and the amount field."
        code={`import { useState } from 'react';
import { MoneyInput, Stack, type MoneyValue } from '@eocrm/design-system';

export function Demo() {
  const [v, setV] = useState<MoneyValue>({ amount: '10', currency: 'EUR' });
  return (
    <Stack gap="sm">
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <MoneyInput key={s} size={s} aria-label={s} currencies={['EUR', 'USD']} value={v} onChange={setV} />
      ))}
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <MoneyInput
              key={s}
              size={s}
              aria-label={s}
              currencies={['EUR', 'USD']}
              value={size}
              onChange={setSize}
            />
          ))}
        </Stack>
      </Example>

      <Example
        title="Locale (de-DE)"
        description="Separators follow the locale (here 1.234.567,89). Wrap in LocaleProvider or pass locale. The emitted amount stays canonical."
        code={`import { useState } from 'react';
import { MoneyInput, LocaleProvider, Stack, Text, Code, type MoneyValue } from '@eocrm/design-system';

export function Demo() {
  const [v, setV] = useState<MoneyValue>({ amount: '1234567.89', currency: 'EUR' });
  return (
    <LocaleProvider locale="de-DE">
      <Stack gap="sm">
        <MoneyInput aria-label="Betrag" currencies={['EUR', 'USD']} value={v} onChange={setV} />
        <Text size="sm" tone="muted">
          amount → <Code>{v.amount ?? 'null'}</Code>
        </Text>
      </Stack>
    </LocaleProvider>
  );
}`}
      >
        <LocaleProvider locale="de-DE">
          <Stack gap="sm">
            <MoneyInput
              aria-label="Betrag"
              currencies={['EUR', 'USD']}
              value={de}
              onChange={setDe}
            />
            <Text size="sm" tone="muted">
              amount → <Code>{de.amount ?? 'null'}</Code>
            </Text>
          </Stack>
        </LocaleProvider>
      </Example>
    </DemoLayout>
  );
}
