import { useState, type ReactNode } from 'react';
import { RotateCcw, ScrollText } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Code,
  Input,
  Page,
  PageHeader,
  Progress,
  Select,
  SettingRow,
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

// The control varies by type; the row now owns everything around it
// (label, description, adornments, footer), so this returns just the
// control element.
function controlFor(
  setting: SettingDef,
  value: unknown,
  onChange: (next: unknown) => void,
): ReactNode {
  switch (setting.type) {
    case 'number':
      return (
        <Input
          type="number"
          value={String(value)}
          min={setting.min}
          max={setting.max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case 'boolean':
      return <Switch checked={Boolean(value)} onChange={(next) => onChange(next)} />;
    case 'string':
      return (
        <Input
          type="text"
          value={String(value)}
          placeholder={setting.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'select':
      return (
        <Select
          options={setting.options}
          value={String(value)}
          onChange={(next) => onChange(next)}
          clearable={false}
        />
      );
  }
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
        <SettingRow.List dividers labelWidth="20rem">
          {section.settings.map((setting) => {
            const value = values[setting.key];
            const modified = isModified(setting, value);
            return (
              <SettingRow
                key={setting.key}
                label={setting.label}
                labelAdornment={
                  <>
                    {setting.type === 'number' && setting.source && (
                      <Badge tone="neutral" size="sm">
                        {setting.source}
                      </Badge>
                    )}
                    <Code tone="muted">{setting.key}</Code>
                  </>
                }
                description={setting.description}
                controlWidth={setting.type === 'number' ? 'xs' : 'auto'}
                trailing={
                  <>
                    {setting.type === 'number' && setting.unit && (
                      <Text as="span" size="sm" tone="muted">
                        {setting.unit}
                      </Text>
                    )}
                    {modified && (
                      <>
                        <Tooltip content={`Default: ${String(setting.defaultValue)}`}>
                          <Badge tone="info" size="sm">
                            Modified
                          </Badge>
                        </Tooltip>
                        <Tooltip content={`Reset to ${String(setting.defaultValue)}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label={`Reset ${setting.label} to default`}
                            onClick={() =>
                              setValues((prev) => ({
                                ...prev,
                                [setting.key]: setting.defaultValue,
                              }))
                            }
                          >
                            <RotateCcw size={14} />
                          </Button>
                        </Tooltip>
                      </>
                    )}
                  </>
                }
                footer={
                  setting.type === 'number' && setting.used !== undefined ? (
                    <Stack gap="xs">
                      <Progress
                        value={setting.used}
                        max={Number(value)}
                        aria-label={`${setting.label} usage`}
                      />
                      <Text as="span" size="xs" tone="muted">
                        {setting.used} of {String(value)} used.
                      </Text>
                    </Stack>
                  ) : undefined
                }
              >
                {controlFor(setting, value, (next) =>
                  setValues((prev) => ({ ...prev, [setting.key]: next })),
                )}
              </SettingRow>
            );
          })}
        </SettingRow.List>
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
