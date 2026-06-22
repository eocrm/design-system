import { Sticky, Split, Stack, Card, Text, Title } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const MAIN_ROWS = Array.from({ length: 14 }, (_, i) => i + 1);

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
        code={`<Split side="end" asideWidth="220px" align="stretch"
  aside={<Sticky top="md"><Card>…sidebar…</Card></Sticky>}>
  <Stack gap="md">…long main column…</Stack>
</Split>`}
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
        description="top maps to the spacing scale (none / xs / sm / md / lg / xl). none (default) pins flush (top:0); a non-zero step clears a sticky header or adds breathing room."
        code={`<Sticky top="lg"><FilterPanel /></Sticky>`}
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
    </DemoLayout>
  );
}
