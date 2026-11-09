import { useState, type ComponentPropsWithoutRef } from 'react';
import { CalendarDays, Settings2, Sun, TrendingUp } from 'lucide-react';
import { Badge, Card, Stack, TabNav, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

// Stand-in for react-router's NavLink so the demo doesn't change the
// playground's URL: it sets aria-current="page" itself, like NavLink does.
function DemoNavLink({
  to,
  path,
  go,
  ...rest
}: { to: string; path: string; go: (to: string) => void } & ComponentPropsWithoutRef<'a'>) {
  return (
    <a
      {...rest}
      href={`#${to}`}
      aria-current={path === to ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault();
        go(to);
      }}
    />
  );
}

const PET_PAGES = [
  { to: '/pets/today', label: 'Today', icon: <Sun size={16} aria-hidden /> },
  { to: '/pets/trends', label: 'Trends', icon: <TrendingUp size={16} aria-hidden /> },
  { to: '/pets/calendar', label: 'Calendar', icon: <CalendarDays size={16} aria-hidden /> },
  { to: '/pets/manage', label: 'Manage', icon: <Settings2 size={16} aria-hidden /> },
];

const RECORD_SECTIONS = [
  'Overview',
  'Activity',
  'Files',
  'Contacts',
  'Deals',
  'Invoices',
  'Tickets',
  'Settings',
];

export function TabNavDemo() {
  const [pet, setPet] = useState('/pets/today');
  const [section, setSection] = useState('Tickets');

  return (
    <DemoLayout
      name="TabNav"
      componentName="TabNav"
      description="Tab-styled page sub-navigation: real links with aria-current, the same look as horizontal Tabs. Use it when each item is its own route; use Tabs for views inside one page."
      files={getComponentFiles('TabNav')}
    >
      <Example
        title="Router sub-navigation"
        description="Pass a router NavLink as `as`. NavLink sets aria-current itself, so no `current` prop is needed; the underline follows the route while the strip stays mounted. This demo fakes the router so the playground URL doesn't change."
        code={`import { NavLink } from 'react-router-dom';
import { Badge, TabNav } from '@eocrm/design-system';

<TabNav aria-label="Pet Control">
  <TabNav.Link as={NavLink} to="/pets/today" leading={<Sun size={16} aria-hidden />}>
    Today
  </TabNav.Link>
  <TabNav.Link as={NavLink} to="/pets/trends" leading={<TrendingUp size={16} aria-hidden />}>
    Trends
  </TabNav.Link>
  <TabNav.Link as={NavLink} to="/pets/calendar" leading={<CalendarDays size={16} aria-hidden />}>
    Calendar
  </TabNav.Link>
  <TabNav.Link
    as={NavLink}
    to="/pets/manage"
    leading={<Settings2 size={16} aria-hidden />}
    trailing={<Badge tone="danger">2</Badge>}
  >
    Manage
  </TabNav.Link>
</TabNav>`}
      >
        <Stack gap="md">
          <TabNav aria-label="Pet Control">
            {PET_PAGES.map((p) => (
              <TabNav.Link
                key={p.to}
                as={DemoNavLink}
                to={p.to}
                path={pet}
                go={setPet}
                leading={p.icon}
                trailing={p.to === '/pets/manage' ? <Badge tone="danger">2</Badge> : undefined}
              >
                {p.label}
              </TabNav.Link>
            ))}
          </TabNav>
          <Card>
            <Text>Route: {pet}</Text>
          </Card>
        </Stack>
      </Example>

      <Example
        title="Plain anchors with `current`"
        description="Without a router, mark the current page with `current` — it sets aria-current='page'."
        code={`<TabNav aria-label="Record sections">
  <TabNav.Link href="/deals/42">Overview</TabNav.Link>
  <TabNav.Link href="/deals/42/activity" current>Activity</TabNav.Link>
  <TabNav.Link href="/deals/42/files">Files</TabNav.Link>
</TabNav>`}
      >
        <TabNav aria-label="Record sections (static)">
          <TabNav.Link href="#overview">Overview</TabNav.Link>
          <TabNav.Link href="#activity" current>
            Activity
          </TabNav.Link>
          <TabNav.Link href="#files">Files</TabNav.Link>
        </TabNav>
      </Example>

      <Example
        title="Overflow at 390px"
        description="On a narrow screen the strip scrolls horizontally (the scrollbar appears only on real overflow) and the current link is scrolled into view."
        code={`<TabNav aria-label="Record sections">
  {sections.map((s) => (
    <TabNav.Link as={NavLink} key={s} to={\`/deals/42/\${s.toLowerCase()}\`}>
      {s}
    </TabNav.Link>
  ))}
</TabNav>`}
      >
        <Stack style={{ maxWidth: 390 }}>
          <TabNav aria-label="Record sections (overflow)">
            {RECORD_SECTIONS.map((s) => (
              <TabNav.Link key={s} as={DemoNavLink} to={s} path={section} go={setSection}>
                {s}
              </TabNav.Link>
            ))}
          </TabNav>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
