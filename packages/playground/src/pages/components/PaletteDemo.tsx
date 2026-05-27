import { useState, type ReactNode } from 'react';
import {
  Checkbox,
  Grid,
  PALETTE_COLORS,
  Stack,
  Text,
  paletteTokens,
  type PaletteColor,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import paletteSource from '@lib-source/palette/palette.ts?raw';
import tokensSource from '@lib-source/styles/tokens.scss?raw';

// Consumer-side mapping (lives in playground, NOT in the library).
const EVENT_NAMESPACE_COLOR: Record<string, PaletteColor> = {
  auth: 'blue',
  user: 'violet',
  role: 'amber',
  invitation: 'pink',
  contact: 'teal',
  deal: 'emerald',
  membership: 'gold',
  system_setting: 'slate',
};

function eventPaletteColor(event: string): PaletteColor {
  const namespace = event.split('.')[0];
  return EVENT_NAMESPACE_COLOR[namespace] ?? 'stone';
}

function CategoryChip({ color, children }: { color: PaletteColor; children: ReactNode }) {
  const { bg, fg } = paletteTokens(color);
  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

function Swatch({ color }: { color: PaletteColor }) {
  const { bg, fg } = paletteTokens(color);
  return (
    <div
      style={{
        background: bg,
        color: fg,
        padding: '12px 8px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      {color}
    </div>
  );
}

const TEAM_COLORS: { team: string; color: PaletteColor }[] = [
  { team: 'Marketing', color: 'violet' },
  { team: 'Engineering', color: 'teal' },
  { team: 'Sales', color: 'amber' },
  { team: 'Support', color: 'rose' },
  { team: 'Design', color: 'fuchsia' },
  { team: 'Operations', color: 'slate' },
];

export function PaletteDemo() {
  const [teams, setTeams] = useState<Record<string, boolean>>({
    Marketing: true,
    Engineering: true,
    Sales: false,
    Support: false,
    Design: true,
    Operations: false,
  });

  return (
    <DemoLayout
      name="Palette"
      componentName="Palette"
      description="30 categorical bg + fg color pairs in the --color-palette-* namespace. Consumer-defined domain → color mapping; library Checkbox accepts palette colors out-of-the-box."
      tsxSource={paletteSource}
      scssSource={tokensSource}
      tsxFilename="palette.ts"
      scssFilename="tokens.scss"
    >
      <Example
        title="All 30 colors"
        description="Each swatch shows the bg fill and the fg text. Reference grid for picking colors by name."
        code={`import { PALETTE_COLORS, paletteTokens } from '@eocrm/design-system';

PALETTE_COLORS.map((color) => {
  const { bg, fg } = paletteTokens(color);
  return <div style={{ background: bg, color: fg }}>{color}</div>;
});`}
      >
        <InputExample width="auto">
          <Grid minColumnWidth="100px" gap="sm">
            {PALETTE_COLORS.map((color) => (
              <Swatch key={color} color={color} />
            ))}
          </Grid>
        </InputExample>
      </Example>

      <Example
        title="Consumer pattern — domain → color"
        description="Consumers own the mapping. Here: each audit-event namespace gets a distinct color, and a small custom <CategoryChip /> uses paletteTokens(color) to render."
        code={`const EVENT_NAMESPACE_COLOR: Record<string, PaletteColor> = {
  auth: 'blue',
  user: 'violet',
  role: 'amber',
  invitation: 'pink',
  contact: 'teal',
  deal: 'emerald',
};

function CategoryChip({ color, children }: { color: PaletteColor; children: ReactNode }) {
  const { bg, fg } = paletteTokens(color);
  return <span style={{ background: bg, color: fg }}>{children}</span>;
}

const events = ['auth.login_succeeded', 'user.created', 'role.assigned', /* … */];
events.map((e) => <CategoryChip color={eventPaletteColor(e)}>{e}</CategoryChip>);`}
      >
        <InputExample width="auto">
          <Stack gap="sm" align="start">
            {[
              'auth.login_succeeded',
              'auth.login_failed',
              'user.created',
              'user.deleted',
              'role.assigned',
              'invitation.sent',
              'contact.updated',
              'deal.won',
              'system_setting.changed',
            ].map((event) => (
              <CategoryChip key={event} color={eventPaletteColor(event)}>
                {event}
              </CategoryChip>
            ))}
          </Stack>
        </InputExample>
      </Example>

      <Example
        title='Checkbox color="…"'
        description="The library Checkbox accepts a palette color and tints the checked / indeterminate fill. Focus ring and hover stay accent-colored."
        code={`<Checkbox color="violet" label="Marketing" />
<Checkbox color="teal" label="Engineering" />
<Checkbox color="amber" label="Sales" />`}
      >
        <InputExample width="auto">
          <Stack gap="sm" align="start">
            {TEAM_COLORS.map(({ team, color }) => (
              <Checkbox
                key={team}
                color={color}
                label={team}
                checked={teams[team] ?? false}
                onChange={(next) => setTeams((prev) => ({ ...prev, [team]: next }))}
              />
            ))}
            <Text size="sm" tone="muted">
              Selected:{' '}
              {Object.entries(teams)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(', ') || 'none'}
            </Text>
          </Stack>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
