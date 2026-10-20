import { useState } from 'react';
import { Cluster, Code, CurrencySelect, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const SHORT = ['EUR', 'USD', 'GBP'];
const LONG = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'SEK', 'NOK'];

export function CurrencySelectDemo() {
  const [one, setOne] = useState<string | null>('EUR');
  const [clr, setClr] = useState<string | null>('USD');
  const [chips, setChips] = useState<string[]>(['EUR', 'GBP']);
  const [summary, setSummary] = useState<string[]>(['EUR', 'GBP']);
  const [long, setLong] = useState<string | null>('CHF');
  const [short, setShort] = useState<string | null>('EUR');
  const [disp, setDisp] = useState<string | null>('EUR');

  return (
    <DemoLayout
      name="CurrencySelect"
      componentName="CurrencySelect"
      description="Currency picker over Select — you pass the ISO 4217 codes to offer; rows read CODE — Name with localized names."
      files={getComponentFiles('CurrencySelect')}
    >
      <Example
        title="Single and clearable"
        description="Controlled on a code string or null. clearable adds a clear button."
        code={`import { useState } from 'react';
import { CurrencySelect, Stack } from '@eocrm/design-system';

export function Demo() {
  const [one, setOne] = useState<string | null>('EUR');
  const [clr, setClr] = useState<string | null>('USD');
  return (
    <Stack gap="sm">
      <CurrencySelect aria-label="Currency" currencies={['EUR', 'USD', 'GBP']} value={one} onChange={setOne} />
      <CurrencySelect aria-label="Clearable" clearable currencies={['EUR', 'USD', 'GBP']} value={clr} onChange={setClr} />
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <CurrencySelect aria-label="Currency" currencies={SHORT} value={one} onChange={setOne} />
          <CurrencySelect
            aria-label="Clearable"
            clearable
            currencies={SHORT}
            value={clr}
            onChange={setClr}
          />
        </Stack>
      </Example>

      <Example
        title="Multiple (chips / summary)"
        description="multiple switches to string[]; triggerDisplay picks chips (default) or a summary."
        code={`import { useState } from 'react';
import { CurrencySelect, Stack } from '@eocrm/design-system';

export function Demo() {
  const [chips, setChips] = useState<string[]>(['EUR', 'GBP']);
  const [summary, setSummary] = useState<string[]>(['EUR', 'GBP']);
  return (
    <Stack gap="sm">
      <CurrencySelect multiple aria-label="Chips" currencies={['EUR', 'USD', 'GBP']} value={chips} onChange={setChips} />
      <CurrencySelect multiple triggerDisplay="summary" aria-label="Summary" currencies={['EUR', 'USD', 'GBP']} value={summary} onChange={setSummary} />
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <CurrencySelect
            multiple
            aria-label="Chips"
            currencies={SHORT}
            value={chips}
            onChange={setChips}
          />
          <CurrencySelect
            multiple
            triggerDisplay="summary"
            aria-label="Summary"
            currencies={SHORT}
            value={summary}
            onChange={setSummary}
          />
        </Stack>
      </Example>

      <Example
        title="Searchable vs short list"
        description="Search turns on automatically above 7 currencies (matches code, name and symbol); a short list stays a plain picker."
        code={`import { useState } from 'react';
import { CurrencySelect, Stack } from '@eocrm/design-system';

const LONG = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'SEK', 'NOK'];

export function Demo() {
  const [long, setLong] = useState<string | null>('CHF');
  const [short, setShort] = useState<string | null>('EUR');
  return (
    <Stack gap="sm">
      <CurrencySelect aria-label="9 currencies" currencies={LONG} value={long} onChange={setLong} />
      <CurrencySelect aria-label="3 currencies" currencies={['EUR', 'USD', 'GBP']} value={short} onChange={setShort} />
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <CurrencySelect
            aria-label="9 currencies"
            currencies={LONG}
            value={long}
            onChange={setLong}
          />
          <CurrencySelect
            aria-label="3 currencies"
            currencies={SHORT}
            value={short}
            onChange={setShort}
          />
        </Stack>
      </Example>

      <Example
        title="Display modes (currencyDisplay)"
        description="How the SELECTED currency shows in the trigger. Dropdown rows always read CODE — Name."
        code={`import { useState } from 'react';
import { CurrencySelect, Stack, Cluster, Code } from '@eocrm/design-system';

export function Demo() {
  const [v, setV] = useState<string | null>('EUR');
  return (
    <Stack gap="sm">
      {(['code', 'symbol', 'both'] as const).map((mode) => (
        <Cluster key={mode} gap="sm">
          <Code>{mode}</Code>
          <CurrencySelect aria-label={mode} currencyDisplay={mode} currencies={['EUR', 'USD', 'GBP']} value={v} onChange={setV} />
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
              <CurrencySelect
                aria-label={mode}
                currencyDisplay={mode}
                currencies={SHORT}
                value={disp}
                onChange={setDisp}
              />
            </Cluster>
          ))}
        </Stack>
      </Example>
    </DemoLayout>
  );
}
