import { useState } from 'react';
import {
  Button,
  Card,
  Cluster,
  DashboardCanvas,
  Split,
  Stack,
  Sticky,
  Text,
  Title,
  type DashboardCanvasValue,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const CANVAS_VALUE: DashboardCanvasValue = {
  items: Array.from({ length: 12 }, (_, i) => ({
    id: `w${i + 1}`,
    x: (i % 3) * 8,
    y: Math.floor(i / 3) * 4,
    w: 8,
    h: 4,
  })),
  sections: [],
};

function PinnedToolbarOverCanvas() {
  const [value, setValue] = useState(CANVAS_VALUE);
  return (
    <Stack gap="md">
      <Sticky top="topbar" layer surface data-testid="sticky-toolbar">
        <Cluster gap="sm">
          <Button>Save layout</Button>
          <Text tone="muted">Edit toolbar</Text>
        </Cluster>
      </Sticky>
      <DashboardCanvas
        value={value}
        onChange={setValue}
        renderItem={(id) => (
          <Card>
            <Text>Widget {String(id)}</Text>
          </Card>
        )}
      />
    </Stack>
  );
}

const MAIN_ROWS = Array.from({ length: 14 }, (_, i) => i + 1);

// Deliberately more items than fit on a screen, so scroll-viewport mode has
// something to scroll internally (the box caps at the viewport height).
const SIDEBAR_ITEMS = Array.from({ length: 20 }, (_, i) => i + 1);

// A bordered, internally-scrolling box so the sticky behaviour is visible inside
// the demo (the box is the scroll container the aside pins within).
const scrollBox: React.CSSProperties = {
  maxHeight: 300,
  overflowY: 'auto',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
};

export function StickyDemo() {
  return (
    <DemoLayout
      name="Sticky"
      componentName="Sticky"
      description="Sticky-positioning primitive — pins its box to the top of the scroll container while the page scrolls past. The canonical use is a record-detail sidebar that stays in view while the main column scrolls. Sets align-self:start so it also works as a grid/flex (Split aside) item."
      files={getComponentFiles('Sticky')}
    >
      <Example
        title="Detail page: sticky sidebar in a Split"
        description="Scroll inside the box — the wide main column scrolls while the sidebar pins (top='md'). align='stretch' makes the aside track full-height so the Sticky has a tall containing block to pin within."
        code={`import { CSSProperties } from 'react';
import { Card, Split, Stack, Sticky, Text, Title } from '@eocrm/design-system';

const scrollBox: CSSProperties = {
  maxHeight: 300,
  overflowY: 'auto',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
};

const rows = [1, 2, 3, 4, 5];

export function Demo() {
  return (
    <div style={scrollBox}>
      <Split
        side="end"
        asideWidth="220px"
        gap="lg"
        align="stretch"
        aside={
          <Sticky top="md">
            <Card>
              <Stack gap="xs">
                <Title order={4} size="sm">
                  Sidebar
                </Title>
                <Text size="sm" tone="muted">
                  Owner · Tags · Linked records. Pins to the top as you scroll
                  the main column.
                </Text>
              </Stack>
            </Card>
          </Sticky>
        }
      >
        <Stack gap="md">
          {rows.map((n) => (
            <Card key={n}>
              <Text>Main column row {n}</Text>
            </Card>
          ))}
        </Stack>
      </Split>
    </div>
  );
}`}
      >
        <div style={scrollBox}>
          <Split
            side="end"
            asideWidth="220px"
            gap="lg"
            align="stretch"
            aside={
              <Sticky top="md">
                <Card>
                  <Stack gap="xs">
                    <Title order={4} size="sm">
                      Sidebar
                    </Title>
                    <Text size="sm" tone="muted">
                      Owner · Tags · Linked records. Pins to the top as you scroll the main column.
                    </Text>
                  </Stack>
                </Card>
              </Sticky>
            }
          >
            <Stack gap="md">
              {MAIN_ROWS.map((n) => (
                <Card key={n}>
                  <Text>Main column row {n}</Text>
                </Card>
              ))}
            </Stack>
          </Split>
        </div>
      </Example>

      <Example
        title="Top offset"
        description="top maps to the spacing scale (none / xs / sm / md / lg / xl). none (default) pins flush (top:0); a non-zero spacing step adds breathing room. Use topbar to clear the standard pinned TopBar plus the content gap."
        code={`import { CSSProperties } from 'react';
import { Card, Split, Stack, Sticky, Text } from '@eocrm/design-system';

const scrollBox: CSSProperties = {
  maxHeight: 300,
  overflowY: 'auto',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
};

const rows = [1, 2, 3, 4, 5];

export function Demo() {
  return (
    <div style={scrollBox}>
      <Split
        side="start"
        asideWidth="160px"
        gap="lg"
        align="stretch"
        aside={
          <Sticky top="lg">
            <Card>
              <Text size="sm" tone="muted">
                top=&quot;lg&quot;
              </Text>
            </Card>
          </Sticky>
        }
      >
        <Stack gap="md">
          {rows.map((n) => (
            <Card key={n}>
              <Text>Row {n}</Text>
            </Card>
          ))}
        </Stack>
      </Split>
    </div>
  );
}`}
      >
        <div style={scrollBox}>
          <Split
            side="start"
            asideWidth="160px"
            gap="lg"
            align="stretch"
            aside={
              <Sticky top="lg">
                <Card>
                  <Text size="sm" tone="muted">
                    top=&quot;lg&quot;
                  </Text>
                </Card>
              </Sticky>
            }
          >
            <Stack gap="md">
              {MAIN_ROWS.map((n) => (
                <Card key={n}>
                  <Text>Row {n}</Text>
                </Card>
              ))}
            </Stack>
          </Split>
        </div>
      </Example>

      <Example
        title="Scroll-viewport mode: a sidebar taller than the screen"
        description="With scroll, the pinned box is capped at the viewport height (minus the top offset and a bottom gap) and scrolls its own content — so a sidebar with more items than fit on screen stays fully reachable instead of running off below the fold. top='topbar' clears the pinned TopBar plus the standard content gap; its bottom gap stays at that content gap so the chrome height is not subtracted twice. Scroll the page: the sidebar pins, and once it hits the bottom its own scrollbar takes over (overscroll-behavior:contain keeps the page from scroll-chaining). collapseBelow='sm' stacks the Split on narrow screens — the Sticky aside then becomes a plain block (no pin, no cap, no inner scroll) so a phone swipe scrolls the page."
        code={`import { Card, Split, Stack, Sticky, Text, Title } from '@eocrm/design-system';

const sidebarItems = Array.from({ length: 5 }, (_, i) => i + 1);
const mainRows = [1, 2, 3, 4, 5];
export function Demo() {
  return (
    <Split
      side="end"
      asideWidth="240px"
      gap="lg"
      align="stretch"
      collapseBelow="sm"
      aside={
        <Sticky top="topbar" scroll>
          <Stack gap="md">
            {sidebarItems.map((n) => (
              <Card key={n}>
                <Stack gap="xs">
                  <Title order={4} size="sm">
                    Linked record {n}
                  </Title>
                  <Text size="sm" tone="muted">
                    Account · updated {n} day{n === 1 ? '' : 's'} ago
                  </Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Sticky>
      }
    >
      <Stack gap="md">
        {mainRows.map((n) => (
          <Card key={n}>
            <Text>Main column row {n}</Text>
          </Card>
        ))}
      </Stack>
    </Split>
  );
}`}
      >
        <Split
          side="end"
          asideWidth="240px"
          gap="lg"
          align="stretch"
          collapseBelow="sm"
          aside={
            <Sticky top="topbar" scroll>
              <Stack gap="md">
                {SIDEBAR_ITEMS.map((n) => (
                  <Card key={n}>
                    <Stack gap="xs">
                      <Title order={4} size="sm">
                        Linked record {n}
                      </Title>
                      <Text size="sm" tone="muted">
                        Account · updated {n} day{n === 1 ? '' : 's'} ago
                      </Text>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Sticky>
          }
        >
          <Stack gap="md">
            {MAIN_ROWS.map((n) => (
              <Card key={n}>
                <Text>Main column row {n}</Text>
              </Card>
            ))}
          </Stack>
        </Split>
      </Example>

      <Example
        title="Page-level toolbar: layer + surface"
        description="layer lifts the pinned bar above positioned content (here DashboardCanvas cells) so its buttons stay clickable while the grid scrolls underneath; surface gives it the page background and a bottom divider so content does not show through. Avoid layer on a Split aside that hosts inline popovers: it creates a stacking context."
        code={`import { useState } from 'react';
import { Button, Cluster, DashboardCanvas, Stack, Sticky, Text } from '@eocrm/design-system';

export function Demo({ initial }) {
  const [value, setValue] = useState(initial);
  return (
    <Stack gap="md">
      <Sticky top="topbar" layer surface>
        <Cluster gap="sm">
          <Button>Save layout</Button>
          <Text tone="muted">Edit toolbar</Text>
        </Cluster>
      </Sticky>
      <DashboardCanvas value={value} onChange={setValue} renderItem={(id) => <Text>{id}</Text>} />
    </Stack>
  );
}`}
      >
        <PinnedToolbarOverCanvas />
      </Example>
    </DemoLayout>
  );
}
