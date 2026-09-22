import { useState } from 'react';
import {
  Badge,
  Button,
  Constrain,
  Input,
  Progress,
  Select,
  SettingRow,
  Stack,
  Switch,
  Text,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const MODES = [
  { value: 'hard', label: 'Hard limit' },
  { value: 'metered', label: 'Metered' },
];

const CURRENCIES = [
  { value: 'usd', label: 'US Dollar (USD)' },
  { value: 'eur', label: 'Euro (EUR)' },
  { value: 'gbp', label: 'British Pound (GBP)' },
];

export function SettingRowDemo() {
  const [seats, setSeats] = useState('50');
  const [mode, setMode] = useState('metered');
  const [currency, setCurrency] = useState('usd');
  const [notify, setNotify] = useState(true);
  const seatsError = Number(seats) < 1 ? 'Seats must be at least 1.' : undefined;

  return (
    <DemoLayout
      name="SettingRow"
      description="One row of a settings screen — label and description in a shared left column, control, adornments and an optional footer in the right. Wiring is Field's."
      files={getComponentFiles('SettingRow')}
      componentName="SettingRow"
    >
      <Example
        title="A list of rows"
        description="Every row resolves the same label-column length, so the controls line up. The List owns the rhythm and the dividers."
        code={`import { useState } from 'react';
import { Input, Select, SettingRow } from '@eocrm/design-system';

const CURRENCIES = [
  { value: 'usd', label: 'US Dollar (USD)' },
  { value: 'eur', label: 'Euro (EUR)' },
  { value: 'gbp', label: 'British Pound (GBP)' },
];

export function Demo() {
  const [seats, setSeats] = useState('50');
  const [currency, setCurrency] = useState('usd');

  return (
    <SettingRow.List dividers labelWidth="18rem">
      <SettingRow label="Seats" description="Member seats included for this tenant" controlWidth="xs">
        <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
      </SettingRow>
      <SettingRow label="Default currency" description="Currency preselected for new records">
        <Select
          options={CURRENCIES}
          value={currency}
          onChange={(v) => setCurrency(v as string)}
          clearable={false}
        />
      </SettingRow>
    </SettingRow.List>
  );
}`}
      >
        <SettingRow.List dividers labelWidth="18rem">
          <SettingRow
            label="Seats"
            description="Member seats included for this tenant"
            controlWidth="xs"
          >
            <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </SettingRow>
          <SettingRow label="Default currency" description="Currency preselected for new records">
            <Select
              options={CURRENCIES}
              value={currency}
              onChange={(v) => setCurrency(v as string)}
              clearable={false}
            />
          </SettingRow>
        </SettingRow.List>
      </Example>

      <Example
        title="Adornments — label, trailing, footer"
        description="labelAdornment sits outside the <label> so the badge never joins the control's accessible name. trailing acts on the control; footer carries the usage meter."
        code={`import { useState } from 'react';
import { Badge, Button, Constrain, Input, Progress, Select, SettingRow, Stack, Text } from '@eocrm/design-system';

const MODES = [
  { value: 'hard', label: 'Hard limit' },
  { value: 'metered', label: 'Metered' },
];

export function Demo() {
  const [seats, setSeats] = useState('50');
  const [mode, setMode] = useState('metered');

  return (
    <SettingRow.List dividers labelWidth="18rem">
      <SettingRow
        label="Seats"
        labelAdornment={<Badge tone="neutral" size="sm">From plan</Badge>}
        description="Member seats included for this tenant"
        controlWidth="xs"
        trailing={
          <>
            <Constrain width="xs">
              <Select
                options={MODES}
                value={mode}
                onChange={(v) => setMode(v as string)}
                clearable={false}
                aria-label="Seats limit mode"
              />
            </Constrain>
            <Badge tone="warning" size="sm">Overridden</Badge>
            <Button variant="ghost" size="sm">Reset to default</Button>
          </>
        }
        footer={
          <Constrain maxWidth="sm">
            <Stack gap="xs">
              <Progress value={12} max={50} aria-label="Seats usage" />
              <Text as="span" size="xs" tone="muted">
                12 of 50 included this month.
              </Text>
            </Stack>
          </Constrain>
        }
      >
        <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
      </SettingRow>
    </SettingRow.List>
  );
}`}
      >
        <SettingRow.List dividers labelWidth="18rem">
          <SettingRow
            label="Seats"
            labelAdornment={
              <Badge tone="neutral" size="sm">
                From plan
              </Badge>
            }
            description="Member seats included for this tenant"
            controlWidth="xs"
            trailing={
              <>
                <Constrain width="xs">
                  <Select
                    options={MODES}
                    value={mode}
                    onChange={(v) => setMode(v as string)}
                    clearable={false}
                    aria-label="Seats limit mode"
                  />
                </Constrain>
                <Badge tone="warning" size="sm">
                  Overridden
                </Badge>
                <Button variant="ghost" size="sm">
                  Reset to default
                </Button>
              </>
            }
            footer={
              <Constrain maxWidth="sm">
                <Stack gap="xs">
                  <Progress value={12} max={50} aria-label="Seats usage" />
                  <Text as="span" size="xs" tone="muted">
                    12 of 50 included this month.
                  </Text>
                </Stack>
              </Constrain>
            }
          >
            <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </SettingRow>
        </SettingRow.List>
      </Example>

      <Example
        title="Required + live error"
        description="error replaces only the aria-describedby link and flips the control invalid — the description stays visible, deliberately unlike Field. Set seats to 0."
        code={`import { useState } from 'react';
import { Input, SettingRow } from '@eocrm/design-system';

export function Demo() {
  const [seats, setSeats] = useState('50');
  const seatsError = Number(seats) < 1 ? 'Seats must be at least 1.' : undefined;

  return (
    <SettingRow.List>
      <SettingRow
        label="Seats"
        description="Member seats included for this tenant"
        controlWidth="xs"
        required
        error={seatsError}
      >
        <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
      </SettingRow>
    </SettingRow.List>
  );
}`}
      >
        <SettingRow.List>
          <SettingRow
            label="Seats"
            description="Member seats included for this tenant"
            controlWidth="xs"
            required
            error={seatsError}
          >
            <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </SettingRow>
        </SettingRow.List>
      </Example>

      <Example
        title="Switch as the control"
        description="A Switch self-labels, so pass it without its own label prop and let the row name it."
        code={`import { useState } from 'react';
import { SettingRow, Switch } from '@eocrm/design-system';

export function Demo() {
  const [notify, setNotify] = useState(true);

  return (
    <SettingRow.List>
      <SettingRow label="Email notifications" description="Send a digest when a deal changes stage.">
        <Switch checked={notify} onChange={setNotify} />
      </SettingRow>
    </SettingRow.List>
  );
}`}
      >
        <SettingRow.List>
          <SettingRow
            label="Email notifications"
            description="Send a digest when a deal changes stage."
          >
            <Switch checked={notify} onChange={setNotify} />
          </SettingRow>
        </SettingRow.List>
      </Example>
    </DemoLayout>
  );
}
