import { Card, Cluster, DateTile, List, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const IMPORT = `import { DateTile } from '@eocrm/design-system';`;

// Relative offsets from the real "now"; static sections use fixed dates.
const DAY = 24 * 60 * 60 * 1000;
function offsetDay(days: number): Date {
  return new Date(Date.now() + days * DAY);
}

export function DateTileDemo() {
  const instant = '2026-11-12T14:30:00Z';
  return (
    <DemoLayout
      name="DateTile"
      componentName="DateTile"
      description="A compact calendar-style tile showing a date (or range): month, day and a weekday, time or relative word. Non-interactive; for picking dates use DatePicker / DateStrip."
      files={getComponentFiles('DateTile')}
    >
      <Example
        title="Sizes"
        description="sm (~40px, no bottom line) / md (default) / lg."
        code={`${IMPORT}

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <DateTile size="sm" date="2026-11-12" />
      <DateTile size="md" date="2026-11-12" />
      <DateTile size="lg" date="2026-11-12" />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <DateTile size="sm" date="2026-11-12" />
          <DateTile size="md" date="2026-11-12" />
          <DateTile size="lg" date="2026-11-12" />
        </Cluster>
      </Example>

      <Example
        title="Stacked vs page"
        description="layout='stacked' (default) or 'page', whose month band takes a palette color."
        code={`${IMPORT}

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <DateTile date="2026-11-12" />
      <DateTile layout="page" date="2026-11-12" />
      <DateTile layout="page" color="blue" date="2026-11-12" />
      <DateTile layout="page" color="green" date="2026-11-12" />
      <DateTile layout="page" color="violet" date="2026-11-12" />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <DateTile date="2026-11-12" />
          <DateTile layout="page" date="2026-11-12" />
          <DateTile layout="page" color="blue" date="2026-11-12" />
          <DateTile layout="page" color="green" date="2026-11-12" />
          <DateTile layout="page" color="violet" date="2026-11-12" />
        </Cluster>
      </Example>

      <Example
        title="Filled vs plain"
        description="surface='filled' (default) or 'plain' (no box)."
        code={`${IMPORT}

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <DateTile surface="filled" date="2026-11-12" />
      <DateTile surface="plain" date="2026-11-12" />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <DateTile surface="filled" date="2026-11-12" />
          <DateTile surface="plain" date="2026-11-12" />
        </Cluster>
      </Example>

      <Example
        title="Weekday / time / both"
        description="show selects the bottom line. Time needs an instant (a Date or ISO datetime), not a 'YYYY-MM-DD' day. Rendered in UTC here so the output is stable."
        code={`${IMPORT}

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <DateTile date="${instant}" timeZone="UTC" show="weekday" relative={false} />
      <DateTile date="${instant}" timeZone="UTC" show="time" relative={false} />
      <DateTile date="${instant}" timeZone="UTC" show="weekday-time" relative={false} />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <DateTile date={instant} timeZone="UTC" show="weekday" relative={false} />
          <DateTile date={instant} timeZone="UTC" show="time" relative={false} />
          <DateTile date={instant} timeZone="UTC" show="weekday-time" relative={false} />
        </Cluster>
      </Example>

      <Example
        title="Relative states"
        description="Uses the real current time: yesterday (muted), today (highlighted), tomorrow, next week, and a range that is ongoing today. relative={false} turns all of it off."
        code={`${IMPORT}

const DAY = 24 * 60 * 60 * 1000;
const offsetDay = (d: number) => new Date(Date.now() + d * DAY);

export function Demo() {
  return (
    <Stack gap="lg">
      <Cluster gap="md" align="start">
        <Stack gap="xs" align="center">
          <DateTile date={offsetDay(-1)} />
          <Text tone="muted" size="sm">Yesterday</Text>
        </Stack>
        <Stack gap="xs" align="center">
          <DateTile date={offsetDay(0)} />
          <Text tone="muted" size="sm">Today</Text>
        </Stack>
        <Stack gap="xs" align="center">
          <DateTile date={offsetDay(1)} />
          <Text tone="muted" size="sm">Tomorrow</Text>
        </Stack>
        <Stack gap="xs" align="center">
          <DateTile date={offsetDay(7)} />
          <Text tone="muted" size="sm">Next week</Text>
        </Stack>
        <Stack gap="xs" align="center">
          <DateTile date={offsetDay(-1)} end={offsetDay(1)} />
          <Text tone="muted" size="sm">Ongoing</Text>
        </Stack>
      </Cluster>
      <Cluster gap="md" align="center">
        <DateTile layout="page" color="blue" date={offsetDay(-1)} />
        <DateTile layout="page" color="blue" date={offsetDay(0)} />
        <DateTile layout="page" color="blue" date={offsetDay(1)} />
      </Cluster>
      <Cluster gap="md" align="center">
        <DateTile surface="plain" date={offsetDay(-1)} />
        <DateTile surface="plain" date={offsetDay(0)} />
        <DateTile surface="plain" date={offsetDay(1)} />
      </Cluster>
      <Cluster gap="md" align="center">
        <DateTile date={offsetDay(0)} relative={false} />
      </Cluster>
    </Stack>
  );
}`}
      >
        <Stack gap="lg">
          <Cluster gap="md" align="start">
            <Stack gap="xs" align="center">
              <DateTile date={offsetDay(-1)} />
              <Text tone="muted" size="sm">
                Yesterday
              </Text>
            </Stack>
            <Stack gap="xs" align="center">
              <DateTile date={offsetDay(0)} />
              <Text tone="muted" size="sm">
                Today
              </Text>
            </Stack>
            <Stack gap="xs" align="center">
              <DateTile date={offsetDay(1)} />
              <Text tone="muted" size="sm">
                Tomorrow
              </Text>
            </Stack>
            <Stack gap="xs" align="center">
              <DateTile date={offsetDay(7)} />
              <Text tone="muted" size="sm">
                Next week
              </Text>
            </Stack>
            <Stack gap="xs" align="center">
              <DateTile date={offsetDay(-1)} end={offsetDay(1)} />
              <Text tone="muted" size="sm">
                Ongoing
              </Text>
            </Stack>
          </Cluster>
          <Cluster gap="md" align="center">
            <DateTile layout="page" color="blue" date={offsetDay(-1)} />
            <DateTile layout="page" color="blue" date={offsetDay(0)} />
            <DateTile layout="page" color="blue" date={offsetDay(1)} />
          </Cluster>
          <Cluster gap="md" align="center">
            <DateTile surface="plain" date={offsetDay(-1)} />
            <DateTile surface="plain" date={offsetDay(0)} />
            <DateTile surface="plain" date={offsetDay(1)} />
          </Cluster>
          <Cluster gap="md" align="center">
            <DateTile date={offsetDay(0)} relative={false} />
          </Cluster>
        </Stack>
      </Example>

      <Example
        title="Ranges"
        description="Same month, cross month and cross year. The year appears only when it differs from the current year."
        code={`${IMPORT}

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <DateTile date="2026-11-12" end="2026-11-14" relative={false} />
      <DateTile date="2026-11-28" end="2026-12-02" relative={false} />
      <DateTile date="2026-12-30" end="2027-01-02" relative={false} />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <DateTile date="2026-11-12" end="2026-11-14" relative={false} />
          <DateTile date="2026-11-28" end="2026-12-02" relative={false} />
          <DateTile date="2026-12-30" end="2027-01-02" relative={false} />
        </Cluster>
      </Example>

      <Example
        title="In context"
        description="An agenda list with sm tiles, a Card header with a large page tile, and a timeline of plain tiles."
        code={`${IMPORT}

export function Demo() {
  return (
    <Stack gap="lg">
      <List variant="plain">
        <List.Item>
          <Cluster gap="md" align="center" wrap={false}>
            <DateTile size="sm" date="2026-11-12T09:00:00Z" timeZone="UTC" relative={false} />
            <Stack gap="xs">
              <Text weight="medium">Kickoff with Acme</Text>
              <Text tone="muted" size="sm">09:00 – 09:45</Text>
            </Stack>
          </Cluster>
        </List.Item>
        {/* …more rows */}
      </List>

      <Card>
        <Cluster gap="md" align="center" wrap={false}>
          <DateTile layout="page" size="lg" color="blue" date="2026-11-12" relative={false} />
          <Text weight="medium">Quarterly review</Text>
        </Cluster>
      </Card>

      <Stack gap="md">
        <Cluster gap="md" align="center" wrap={false}>
          <DateTile surface="plain" date="2026-11-10" relative={false} />
          <Text>Proposal sent</Text>
        </Cluster>
        {/* …more entries */}
      </Stack>
    </Stack>
  );
}`}
      >
        <Stack gap="lg">
          <List variant="plain">
            {[
              ['Kickoff with Acme', '09:00 – 09:45', '2026-11-12T09:00:00Z'],
              ['Pipeline review', '11:30 – 12:00', '2026-11-13T11:30:00Z'],
              ['Contract signing', '15:00 – 15:30', '2026-11-16T15:00:00Z'],
            ].map(([title, time, at]) => (
              <List.Item key={title}>
                <Cluster gap="md" align="center" wrap={false}>
                  <DateTile size="sm" date={at} timeZone="UTC" relative={false} />
                  <Stack gap="xs">
                    <Text weight="medium">{title}</Text>
                    <Text tone="muted" size="sm">
                      {time}
                    </Text>
                  </Stack>
                </Cluster>
              </List.Item>
            ))}
          </List>

          <Card>
            <Cluster gap="md" align="center" wrap={false}>
              <DateTile layout="page" size="lg" color="blue" date="2026-11-12" relative={false} />
              <Text weight="medium">Quarterly review</Text>
            </Cluster>
          </Card>

          <Stack gap="md">
            {[
              ['2026-11-10', 'Proposal sent'],
              ['2026-11-12', 'Demo call'],
              ['2026-11-19', 'Follow-up due'],
            ].map(([d, label]) => (
              <Cluster key={d} gap="md" align="center" wrap={false}>
                <DateTile surface="plain" date={d} relative={false} />
                <Text>{label}</Text>
              </Cluster>
            ))}
          </Stack>
        </Stack>
      </Example>

      <Example
        title="Time zone"
        description="The same instant (2026-11-12T23:30Z) lands on different days and times depending on timeZone."
        code={`${IMPORT}

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <DateTile date="2026-11-12T23:30:00Z" timeZone="Asia/Tokyo" show="weekday-time" relative={false} />
      <DateTile date="2026-11-12T23:30:00Z" timeZone="America/New_York" show="weekday-time" relative={false} />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <DateTile
            date="2026-11-12T23:30:00Z"
            timeZone="Asia/Tokyo"
            show="weekday-time"
            relative={false}
          />
          <DateTile
            date="2026-11-12T23:30:00Z"
            timeZone="America/New_York"
            show="weekday-time"
            relative={false}
          />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
