import { Button, Cluster, Link, Popover, ScrollArea, Stack, Text } from '@eocrm/design-system';
import { Bell } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const ROWS = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  text: `ENG-${100 + i} was moved to In review`,
}));

const LINES = Array.from({ length: 30 }, (_, i) => `Imported row ${i + 1} of 30`);

export function ScrollAreaDemo() {
  return (
    <DemoLayout
      name="ScrollArea"
      componentName="ScrollArea"
      description="A region that scrolls only its own content vertically, capped by a token-sized maxHeight. Inside a Popover it also caps the popover at the viewport, with only the ScrollArea shrinking, so a header above it stays put. It becomes a named keyboard tab stop only while it overflows with nothing focusable inside."
      files={getComponentFiles('ScrollArea')}
    >
      <Example
        title="Notification centre (Popover + ScrollArea)"
        description="The #598 recipe: a fixed header with a 'Mark all as read' action over a scrolling feed. Shrink the window's height and the popover caps at the viewport, with only the feed shrinking. The rows are links, so the feed adds no extra tab stop."
        code={`import { Button, Cluster, Link, Popover, ScrollArea, Stack } from '@eocrm/design-system';
import { Bell } from 'lucide-react';

export function Demo({ rows }) {
  return (
    <Cluster gap="md" justify="center">
      <Popover>
        <Popover.Trigger>
          <Button variant="secondary" iconOnly aria-label="Notifications">
            <Bell size={16} />
          </Button>
        </Popover.Trigger>
        <Popover.Content minWidth={380}>
          <Stack gap="sm">
            <Cluster justify="between" align="center">
              <Popover.Heading>Notifications</Popover.Heading>
              <Button variant="ghost" size="sm">Mark all as read</Button>
            </Cluster>
            <ScrollArea maxHeight="md" aria-label="Notifications">
              <Stack gap="xs">
                {rows.map((row) => (
                  <Link key={row.id} href="#">{row.text}</Link>
                ))}
              </Stack>
            </ScrollArea>
          </Stack>
        </Popover.Content>
      </Popover>
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" justify="center">
          <Popover>
            <Popover.Trigger>
              <Button variant="secondary" iconOnly aria-label="Notifications">
                <Bell size={16} />
              </Button>
            </Popover.Trigger>
            <Popover.Content minWidth={380}>
              <Stack gap="sm">
                <Cluster justify="between" align="center">
                  <Popover.Heading>Notifications</Popover.Heading>
                  <Button variant="ghost" size="sm">
                    Mark all as read
                  </Button>
                </Cluster>
                <ScrollArea maxHeight="md" aria-label="Notifications">
                  <Stack gap="xs">
                    {ROWS.map((row) => (
                      <Link key={row.id} href="#">
                        {row.text}
                      </Link>
                    ))}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Popover.Content>
          </Popover>
        </Cluster>
      </Example>

      <Example
        title="Height scale"
        description="sm (240px), md (400px), lg (560px), and a one-off number (px). Prefer the scale."
        code={`<Cluster gap="md" align="start">
  <ScrollArea maxHeight="sm" aria-label="Small">{lines}</ScrollArea>
  <ScrollArea maxHeight="md" aria-label="Medium">{lines}</ScrollArea>
  <ScrollArea maxHeight="lg" aria-label="Large">{lines}</ScrollArea>
  <ScrollArea maxHeight={320} aria-label="320px">{lines}</ScrollArea>
</Cluster>`}
      >
        <Cluster gap="md" align="start">
          {(['sm', 'md', 'lg', 320] as const).map((size) => (
            <Stack key={size} gap="xs">
              <Text size="sm" tone="muted">
                maxHeight={typeof size === 'number' ? `{${size}}` : `"${size}"`}
              </Text>
              <ScrollArea maxHeight={size} aria-label={`Log, ${size}`}>
                <Stack gap="xs">
                  {LINES.map((line) => (
                    <Text key={line} size="sm">
                      {line}
                    </Text>
                  ))}
                </Stack>
              </ScrollArea>
            </Stack>
          ))}
        </Cluster>
      </Example>

      <Example
        title="Keyboard: a tab stop only when it must be"
        description="Tab through both. The link list adds no stop of its own, since tabbing to a link scrolls it into view. The plain-text list has nothing to tab to, so the area itself becomes a named region you can focus and scroll with the arrow keys."
        code={`<Cluster gap="md" align="start">
  <ScrollArea maxHeight="sm" aria-label="Links">{links}</ScrollArea>
  <ScrollArea maxHeight="sm" aria-label="Import log">{plainText}</ScrollArea>
</Cluster>`}
      >
        <Cluster gap="md" align="start">
          <ScrollArea maxHeight="sm" aria-label="Links">
            <Stack gap="xs">
              {ROWS.map((row) => (
                <Link key={row.id} href="#">
                  {row.text}
                </Link>
              ))}
            </Stack>
          </ScrollArea>
          <ScrollArea maxHeight="sm" aria-label="Import log">
            <Stack gap="xs">
              {LINES.map((line) => (
                <Text key={line} size="sm">
                  {line}
                </Text>
              ))}
            </Stack>
          </ScrollArea>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
