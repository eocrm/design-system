import { useState } from 'react';
import { Avatar, AvatarGroup, Cluster, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const TEAM = [
  'Alex Rivera',
  'Priya Patel',
  'Tom Kim',
  'Sara Chen',
  'Jaden Lee',
  'Mei Tanaka',
  'Diego Ortiz',
];

function GroupDemo() {
  const [clicked, setClicked] = useState<number | null>(null);
  return (
    <Stack gap="xs">
      <AvatarGroup max={4} size="md" onOverflowClick={(_e, count) => setClicked(count)}>
        {TEAM.map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </AvatarGroup>
      {clicked !== null && (
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          onOverflowClick fired with hiddenCount = {clicked}
        </code>
      )}
    </Stack>
  );
}

export function AvatarDemo() {
  return (
    <DemoLayout
      name="Avatar"
      description="Circular profile element. Renders an image if src is provided, otherwise the person's initials on a deterministic color background — the same name always gets the same color."
      files={getComponentFiles('Avatar')}
      componentName="Avatar"
    >
      <Example
        title="Sizes"
        description="Four sizes. sm (24px) for table rows and dense UI, md (32px) for general use, lg (40px) for detail page headers, xl (80px) for member-card popovers and profile headers."
        code={`import { Avatar, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <Avatar name="Alex Rivera" size="sm" />
      <Avatar name="Alex Rivera" size="md" />
      <Avatar name="Alex Rivera" size="lg" />
      <Avatar name="Alex Rivera" size="xl" />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <Avatar name="Alex Rivera" size="sm" />
          <Avatar name="Alex Rivera" size="md" />
          <Avatar name="Alex Rivera" size="lg" />
          <Avatar name="Alex Rivera" size="xl" />
        </Cluster>
      </Example>

      <Example
        title="Deterministic color"
        description="The color is computed from the name's hash, so a given user keeps the same avatar color across every page. Six colors in the palette."
        code={`import { Avatar, Cluster, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="sm">
      {[
        'Alex Rivera',
        'Aki Tanaka',
        'Jordan Park',
        'Sam Chen',
        'Maya Owens',
        'Priya Shah',
        'Lena Ivanova',
        'Diana Okafor',
      ].map((name) => (
        <Stack key={name} gap="xs" align="center">
          <Avatar name={name} />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-subtle)' }}>
            {name.split(' ')[0]}
          </span>
        </Stack>
      ))}
    </Cluster>
  );
}`}
      >
        <Cluster gap="sm">
          {[
            'Alex Rivera',
            'Aki Tanaka',
            'Jordan Park',
            'Sam Chen',
            'Maya Owens',
            'Priya Shah',
            'Lena Ivanova',
            'Diana Okafor',
          ].map((name) => (
            <Stack key={name} gap="xs" align="center">
              <Avatar name={name} />
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-subtle)' }}>
                {name.split(' ')[0]}
              </span>
            </Stack>
          ))}
        </Cluster>
      </Example>

      <Example
        title="With image"
        description="Pass src for a real photo. The name prop stays required and becomes the accessible label."
        code={`import { Avatar, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <Avatar name="Alex Rivera" src="https://i.pravatar.cc/64?u=alex" size="sm" />
      <Avatar name="Maya Owens" src="https://i.pravatar.cc/96?u=maya" size="md" />
      <Avatar name="Sam Chen" src="https://i.pravatar.cc/120?u=sam" size="lg" />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <Avatar name="Alex Rivera" src="https://i.pravatar.cc/64?u=alex" size="sm" />
          <Avatar name="Maya Owens" src="https://i.pravatar.cc/96?u=maya" size="md" />
          <Avatar name="Sam Chen" src="https://i.pravatar.cc/120?u=sam" size="lg" />
        </Cluster>
      </Example>

      <Example
        title="Status indicator"
        description="Presence dot in the bottom-right. Four states: online / busy / away / offline."
        code={`import { Avatar, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <Avatar name="Online Olivia" status="online" />
      <Avatar name="Busy Beatrice" status="busy" />
      <Avatar name="Away Adrien" status="away" />
      <Avatar name="Offline Otto" status="offline" />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <Avatar name="Online Olivia" status="online" />
          <Avatar name="Busy Beatrice" status="busy" />
          <Avatar name="Away Adrien" status="away" />
          <Avatar name="Offline Otto" status="offline" />
        </Cluster>
      </Example>

      <Example
        title="Name tooltip"
        description="Opt in with `tooltip` to surface the name on hover / keyboard focus. Defaults to off standalone; inside an `<AvatarGroup>` it defaults to on."
        code={`import { Avatar } from '@eocrm/design-system';

export function Demo() {
  return <Avatar name="Alex Rivera" tooltip />;
}`}
      >
        <Avatar name="Alex Rivera" tooltip />
      </Example>

      <Example
        title="Avatar group with overflow handler"
        description="Up to `max` avatars render in flow; the rest collapse into a +N button. The library does not render a popover — the app's `onOverflowClick` decides what happens."
        code={`import { useState } from 'react';
import { Avatar, AvatarGroup, Stack } from '@eocrm/design-system';

const TEAM = [
  'Alex Rivera',
  'Priya Patel',
  'Tom Kim',
  'Sara Chen',
  'Jaden Lee',
];

export function GroupDemo() {
  const [clicked, setClicked] = useState<number | null>(null);
  return (
    <Stack gap="xs">
      <AvatarGroup max={4} size="md" onOverflowClick={(_e, count) => setClicked(count)}>
        {TEAM.map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </AvatarGroup>
      {clicked !== null && (
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          onOverflowClick fired with hiddenCount = {clicked}
        </code>
      )}
    </Stack>
  );
}`}
      >
        <GroupDemo />
      </Example>

      <Example
        title="Group sizes"
        description="Four sizes — sm / md (default) / lg / xl. The group's size is the default for child avatars; per-child override still wins."
        code={`import { Avatar, AvatarGroup, Stack } from '@eocrm/design-system';

const TEAM = [
  'Alex Rivera',
  'Priya Patel',
  'Tom Kim',
  'Sara Chen',
  'Jaden Lee',
  'Mei Tanaka',
];

export function Demo() {
  return (
    <Stack gap="md">
      <AvatarGroup size="sm" max={5}>
        {TEAM.slice(0, 6).map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </AvatarGroup>
      <AvatarGroup size="md" max={5}>
        {TEAM.slice(0, 6).map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </AvatarGroup>
      <AvatarGroup size="lg" max={5}>
        {TEAM.slice(0, 6).map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </AvatarGroup>
      <AvatarGroup size="xl" max={5}>
        {TEAM.slice(0, 6).map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </AvatarGroup>
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <AvatarGroup size="sm" max={5}>
            {TEAM.slice(0, 6).map((n) => (
              <Avatar key={n} name={n} />
            ))}
          </AvatarGroup>
          <AvatarGroup size="md" max={5}>
            {TEAM.slice(0, 6).map((n) => (
              <Avatar key={n} name={n} />
            ))}
          </AvatarGroup>
          <AvatarGroup size="lg" max={5}>
            {TEAM.slice(0, 6).map((n) => (
              <Avatar key={n} name={n} />
            ))}
          </AvatarGroup>
          <AvatarGroup size="xl" max={5}>
            {TEAM.slice(0, 6).map((n) => (
              <Avatar key={n} name={n} />
            ))}
          </AvatarGroup>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
