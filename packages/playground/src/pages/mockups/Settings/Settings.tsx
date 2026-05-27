import { useState, type ReactNode } from 'react';
import { RotateCcw, ScrollText } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Cluster,
  Code,
  Divider,
  Input,
  Page,
  PageHeader,
  Select,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from '@eocrm/design-system';
import {
  lastUpdatedAt,
  lastUpdatedBy,
  settingsSections,
  type SettingDef,
} from '../../../data/systemSettings';
import { CrossLinks } from '../../shared/CrossLinks';

function formatLastUpdated(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function isModified(setting: SettingDef, currentValue: unknown): boolean {
  return String(currentValue) !== String(setting.defaultValue);
}

interface SettingRowProps {
  setting: SettingDef;
  value: unknown;
  onChange: (next: unknown) => void;
  onReset: () => void;
}

function SettingRow({ setting, value, onChange, onReset }: SettingRowProps) {
  const modified = isModified(setting, value);

  // Right-hand control varies by type.
  let control: ReactNode = null;
  switch (setting.type) {
    case 'number':
      control = (
        <Cluster gap="sm" align="center" wrap={false}>
          <Input
            type="number"
            value={String(value)}
            min={setting.min}
            max={setting.max}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={setting.label}
          />
          {setting.unit && (
            <Text as="span" size="sm" tone="muted">
              {setting.unit}
            </Text>
          )}
        </Cluster>
      );
      break;
    case 'boolean':
      control = (
        <Switch
          checked={Boolean(value)}
          onChange={(next) => onChange(next)}
          aria-label={setting.label}
        />
      );
      break;
    case 'string':
      control = (
        <Input
          type="text"
          value={String(value)}
          placeholder={setting.placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-label={setting.label}
        />
      );
      break;
    case 'select':
      control = (
        <Select
          options={setting.options}
          value={String(value)}
          onChange={(next) => onChange(next)}
          aria-label={setting.label}
        />
      );
      break;
  }

  return (
    <Cluster justify="between" align="start" gap="lg" wrap={false}>
      <Stack gap="xs">
        <Cluster gap="sm" align="center">
          <Text as="span" weight="semibold">
            {setting.label}
          </Text>
          {modified && (
            <Tooltip content={`Default: ${String(setting.defaultValue)}`}>
              <Badge tone="info" size="sm">
                Modified
              </Badge>
            </Tooltip>
          )}
          <Code tone="muted">{setting.key}</Code>
        </Cluster>
        <Text size="sm" tone="muted">
          {setting.description}
        </Text>
      </Stack>
      <Cluster gap="sm" align="center" wrap={false}>
        {control}
        {modified && (
          <Tooltip content={`Reset to ${String(setting.defaultValue)}`}>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Reset ${setting.label} to default`}
              onClick={onReset}
            >
              <RotateCcw size={14} />
            </Button>
          </Tooltip>
        )}
      </Cluster>
    </Cluster>
  );
}

function SectionCard({ section }: { section: (typeof settingsSections)[number] }) {
  // Per-section local state seeded from the data file. Each setting tracks
  // its own value; reset rewrites just that one back to its default.
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(section.settings.map((s) => [s.key, s.currentValue])),
  );

  return (
    <Card padding="md">
      <Stack gap="md">
        <Stack gap="xs">
          <Title order={2} size="md">
            {section.title}
          </Title>
          <Text size="sm" tone="muted">
            {section.description}
          </Text>
        </Stack>
        <Stack gap="md">
          {section.settings.map((setting, i) => (
            <Stack key={setting.key} gap="md">
              {i > 0 && <Divider />}
              <SettingRow
                setting={setting}
                value={values[setting.key]}
                onChange={(next) => setValues((prev) => ({ ...prev, [setting.key]: next }))}
                onReset={() =>
                  setValues((prev) => ({ ...prev, [setting.key]: setting.defaultValue }))
                }
              />
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

export function Settings() {
  return (
    <Page>
      <PageHeader>
        <PageHeader.Title>System settings</PageHeader.Title>
        <PageHeader.Subtitle>
          Global configuration for the EOCRM platform. Changes apply to every tenant — adjust with
          care.
        </PageHeader.Subtitle>
        <PageHeader.Meta>
          <Text size="sm" tone="muted">
            Last changed by {lastUpdatedBy} · {formatLastUpdated(lastUpdatedAt)}
          </Text>
        </PageHeader.Meta>
        <PageHeader.Actions>
          <Button variant="secondary">
            <ScrollText size={14} /> View audit log
          </Button>
        </PageHeader.Actions>
      </PageHeader>

      {settingsSections.map((section) => (
        <SectionCard key={section.id} section={section} />
      ))}

      <CrossLinks kind="mockup" slug="system-settings" />
    </Page>
  );
}
