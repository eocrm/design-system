import { useState } from 'react';
import {
  Badge,
  Button,
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
        code={`import { Input, Select, SettingRow } from '@eocrm/design-system';

export function Demo() {
  return (
    <SettingRow.List dividers labelWidth="18rem">
      <SettingRow label="Seats" description="Member seats included for this tenant" controlWidth="xs">
        <Input type="number" />
      </SettingRow>
      <SettingRow label="Default currency" description="Currency preselected for new records">
        <Select options={currencies} value={currency} onChange={setCurrency} clearable={false} />
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
        code={`import { Badge, Button, Input, Progress, Select, SettingRow, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <SettingRow.List dividers labelWidth="18rem">
      <SettingRow
        label="Seats"
        labelAdornment={<Badge tone="neutral" size="sm">From plan</Badge>}
        description="Member seats included for this tenant"
        controlWidth="xs"
        trailing={
          <>
            <Select
              size="sm"
              options={modes}
              value={mode}
              onChange={setMode}
              clearable={false}
              aria-label="Seats limit mode"
            />
            <Badge tone="warning" size="sm">Overridden</Badge>
            <Button variant="ghost" size="sm">Reset to default</Button>
          </>
        }
        footer={
          <Stack gap="xs">
            <Progress value={12} max={50} aria-label="Seats usage" />
            <Text as="span" size="xs" tone="muted">
              12 of 50 included this month.
            </Text>
          </Stack>
        }
      >
        <Input type="number" />
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
                <Select
                  size="sm"
                  options={MODES}
                  value={mode}
                  onChange={(v) => setMode(v as string)}
                  clearable={false}
                  aria-label="Seats limit mode"
                />
                <Badge tone="warning" size="sm">
                  Overridden
                </Badge>
                <Button variant="ghost" size="sm">
                  Reset to default
                </Button>
              </>
            }
            footer={
              <Stack gap="xs">
                <Progress value={12} max={50} aria-label="Seats usage" />
                <Text as="span" size="xs" tone="muted">
                  12 of 50 included this month.
                </Text>
              </Stack>
            }
          >
            <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </SettingRow>
        </SettingRow.List>
      </Example>

      <Example
        title="Required + live error"
        description="error replaces the description, links the message, and flips the control invalid — same contract as Field. Set seats to 0."
        code={`import { Input, SettingRow } from '@eocrm/design-system';

export function Demo() {
  const seatsError = Number(seats) < 1 ? 'Seats must be at least 1.' : undefined;

  return (
    <SettingRow
      label="Seats"
      description="Member seats included for this tenant"
      controlWidth="xs"
      required
      error={seatsError}
    >
      <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
    </SettingRow>
  );
}`}
      >
        <SettingRow
          label="Seats"
          description="Member seats included for this tenant"
          controlWidth="xs"
          required
          error={seatsError}
        >
          <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
        </SettingRow>
      </Example>

      <Example
        title="Switch as the control"
        description="A Switch self-labels, so pass it without its own label prop and let the row name it."
        code={`import { SettingRow, Switch } from '@eocrm/design-system';

export function Demo() {
  return (
    <SettingRow label="Email notifications" description="Send a digest when a deal changes stage.">
      <Switch checked={notify} onChange={setNotify} />
    </SettingRow>
  );
}`}
      >
        <SettingRow
          label="Email notifications"
          description="Send a digest when a deal changes stage."
        >
          <Switch checked={notify} onChange={setNotify} />
        </SettingRow>
      </Example>
    </DemoLayout>
  );
}
