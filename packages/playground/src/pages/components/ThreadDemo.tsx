import { Thread, Avatar, Stack, Text, Constrain } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

// Give the author/header line the avatar's line-height so its text centers on the
// avatar's vertical centre (the avatar is taller than a default text line). This is a
// consumer-side composition choice — Thread slots the node + content and top-aligns
// the row; centering the header against the avatar is the page's call.
const headerLine = { lineHeight: 'var(--size-sm)' } as const;

export function ThreadDemo() {
  return (
    <DemoLayout
      name="Thread"
      componentName="Thread"
      description="Nested-reply threading primitive — a per-level left vertical rail connecting a parent comment to its replies, with the leading node (avatar / icon) as the connection point. Replies are written as nested <Thread.Item>s; depth-capped (maxDepth, default 4) so deep threads stop marching right. Use compact for dense sidebars. For a flat activity feed use Timeline."
      files={getComponentFiles('Thread')}
    >
      <Example
        title="Comment thread (nested replies)"
        description="Each item's node is a slot — an Avatar for the author. Nested <Thread.Item>s render as replies under the rail; a reply can itself have replies. Each reply branches off the rail with an elbow connector to its avatar. (The author line gets the avatar's line-height so it centers on the avatar.)"
        code={`// center the author line on the avatar — the avatar is taller than a text line
const headerLine = { lineHeight: 'var(--size-sm)' };

<Thread>
  <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
    <Stack gap="xs">
      <Text size="sm" style={headerLine}><strong>Maya Chen</strong> · 2h ago</Text>
      <Text size="sm">
        Flagged the Acme renewal — usage dropped ~30% last quarter. Worth a
        check-in before we send the contract.
      </Text>
    </Stack>
    <Thread.Item node={<Avatar name="Tom Okafor" size="sm" />}>
      <Stack gap="xs">
        <Text size="sm" style={headerLine}><strong>Tom Okafor</strong> · 1h ago</Text>
        <Text size="sm">Good catch. I'll set up a call with their ops lead for Thursday.</Text>
      </Stack>
      <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
        <Stack gap="xs">
          <Text size="sm" style={headerLine}><strong>Maya Chen</strong> · 48m ago</Text>
          <Text size="sm">Perfect — loop in Priya, she owns the technical relationship.</Text>
        </Stack>
      </Thread.Item>
    </Thread.Item>
    <Thread.Item node={<Avatar name="Priya Nair" size="sm" />}>
      <Stack gap="xs">
        <Text size="sm" style={headerLine}><strong>Priya Nair</strong> · 20m ago</Text>
        <Text size="sm">On it — pulling the latest usage report so we walk in prepared.</Text>
      </Stack>
    </Thread.Item>
  </Thread.Item>
</Thread>`}
      >
        <Thread>
          <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
            <Stack gap="xs">
              <Text size="sm" style={headerLine}>
                <strong>Maya Chen</strong> · 2h ago
              </Text>
              <Text size="sm">
                Flagged the Acme renewal — usage dropped ~30% last quarter. Worth a check-in before
                we send the contract.
              </Text>
            </Stack>
            <Thread.Item node={<Avatar name="Tom Okafor" size="sm" />}>
              <Stack gap="xs">
                <Text size="sm" style={headerLine}>
                  <strong>Tom Okafor</strong> · 1h ago
                </Text>
                <Text size="sm">
                  Good catch. I'll set up a call with their ops lead for Thursday.
                </Text>
              </Stack>
              <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
                <Stack gap="xs">
                  <Text size="sm" style={headerLine}>
                    <strong>Maya Chen</strong> · 48m ago
                  </Text>
                  <Text size="sm">
                    Perfect — loop in Priya, she owns the technical relationship.
                  </Text>
                </Stack>
              </Thread.Item>
            </Thread.Item>
            <Thread.Item node={<Avatar name="Priya Nair" size="sm" />}>
              <Stack gap="xs">
                <Text size="sm" style={headerLine}>
                  <strong>Priya Nair</strong> · 20m ago
                </Text>
                <Text size="sm">
                  On it — pulling the latest usage report so we walk in prepared.
                </Text>
              </Stack>
            </Thread.Item>
          </Thread.Item>
        </Thread>
      </Example>

      <Example
        title="Depth cap (maxDepth)"
        description="A deep back-and-forth. With maxDepth={3}, replies stop indenting once the cap is reached — the chain past level 3 renders flat at the same indent so the thread stops marching right off the page."
        code={`<Thread maxDepth={3}>
  <Thread.Item node={<Avatar name="Dana Reyes" size="sm" />}>
    <Text size="sm" style={headerLine}><strong>Dana Reyes</strong> · who's covering the EU launch demo?</Text>
    <Thread.Item node={<Avatar name="Sam Cole" size="sm" />}>
      <Text size="sm" style={headerLine}><strong>Sam Cole</strong> · I can — what time zone is the client in?</Text>
      <Thread.Item node={<Avatar name="Lena Fischer" size="sm" />}>
        <Text size="sm" style={headerLine}><strong>Lena Fischer</strong> · CET. They asked for 10:00 their time.</Text>
        <Thread.Item node={<Avatar name="Raj Patel" size="sm" />}>
          {/* depth 3 hits the cap → this reply and deeper render flat */}
          <Text size="sm" style={headerLine}><strong>Raj Patel</strong> · Booked the room and sent the invite.</Text>
          <Thread.Item node={<Avatar name="Olivia Wong" size="sm" />}>
            <Text size="sm" style={headerLine}><strong>Olivia Wong</strong> · Added the deck link to the calendar event.</Text>
          </Thread.Item>
        </Thread.Item>
      </Thread.Item>
    </Thread.Item>
  </Thread.Item>
</Thread>`}
      >
        <Thread maxDepth={3}>
          <Thread.Item node={<Avatar name="Dana Reyes" size="sm" />}>
            <Text size="sm" style={headerLine}>
              <strong>Dana Reyes</strong> · who's covering the EU launch demo?
            </Text>
            <Thread.Item node={<Avatar name="Sam Cole" size="sm" />}>
              <Text size="sm" style={headerLine}>
                <strong>Sam Cole</strong> · I can — what time zone is the client in?
              </Text>
              <Thread.Item node={<Avatar name="Lena Fischer" size="sm" />}>
                <Text size="sm" style={headerLine}>
                  <strong>Lena Fischer</strong> · CET. They asked for 10:00 their time.
                </Text>
                <Thread.Item node={<Avatar name="Raj Patel" size="sm" />}>
                  {/* depth 3 hits the cap → this reply and deeper render flat */}
                  <Text size="sm" style={headerLine}>
                    <strong>Raj Patel</strong> · Booked the room and sent the invite.
                  </Text>
                  <Thread.Item node={<Avatar name="Olivia Wong" size="sm" />}>
                    <Text size="sm" style={headerLine}>
                      <strong>Olivia Wong</strong> · Added the deck link to the calendar event.
                    </Text>
                  </Thread.Item>
                </Thread.Item>
              </Thread.Item>
            </Thread.Item>
          </Thread.Item>
        </Thread>
      </Example>

      <Example
        title="Compact (dense sidebar thread)"
        description="compact tightens the node box and gaps for a narrow panel — a contact-record activity sidebar. The remapped tokens cascade to every nested reply."
        code={`<Thread compact>
  <Thread.Item node={<Avatar name="Grace Liu" size="sm" />}>
    <Text size="sm" style={headerLine}><strong>Grace Liu</strong> · renewed the contract</Text>
    <Thread.Item node={<Avatar name="Marcus Bell" size="sm" />}>
      <Text size="sm" style={headerLine}><strong>Marcus Bell</strong> · nice — invoice sent</Text>
    </Thread.Item>
  </Thread.Item>
</Thread>`}
      >
        <Constrain maxWidth="xs">
          <Thread compact>
            <Thread.Item node={<Avatar name="Grace Liu" size="sm" />}>
              <Text size="sm" style={headerLine}>
                <strong>Grace Liu</strong> · renewed the contract
              </Text>
              <Thread.Item node={<Avatar name="Marcus Bell" size="sm" />}>
                <Text size="sm" style={headerLine}>
                  <strong>Marcus Bell</strong> · nice — invoice sent
                </Text>
              </Thread.Item>
            </Thread.Item>
            <Thread.Item node={<Avatar name="Priya Nair" size="sm" />}>
              <Text size="sm" style={headerLine}>
                <strong>Priya Nair</strong> · logged a support call
              </Text>
            </Thread.Item>
          </Thread>
        </Constrain>
      </Example>
    </DemoLayout>
  );
}
