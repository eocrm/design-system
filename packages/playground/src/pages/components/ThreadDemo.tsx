import { Thread, Avatar, Stack, Text, Constrain } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

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
        description="Each item's node is a slot — an Avatar for the author. Nested <Thread.Item>s render as replies under the rail; a reply can itself have replies, each branching off the rail with an elbow connector. The avatar centers on the first body line (the author/timestamp header) automatically — no consumer line-height tweaks needed."
        code={`import { Avatar, Stack, Text, Thread } from '@eocrm/design-system';

export function Demo() {
  return (
    <Thread>
      <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
        <Stack gap="xs">
          <Text size="sm">
            <strong>Maya Chen</strong> · 2h ago
          </Text>
          <Text size="sm">
            Flagged the Acme renewal — usage dropped ~30% last quarter. Worth a
            check-in before we send the contract.
          </Text>
        </Stack>
        <Thread.Item node={<Avatar name="Tom Okafor" size="sm" />}>
          <Stack gap="xs">
            <Text size="sm">
              <strong>Tom Okafor</strong> · 1h ago
            </Text>
            <Text size="sm">
              Good catch. I'll set up a call with their ops lead for Thursday.
            </Text>
          </Stack>
          <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
            <Stack gap="xs">
              <Text size="sm">
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
            <Text size="sm">
              <strong>Priya Nair</strong> · 20m ago
            </Text>
            <Text size="sm">
              On it — pulling the latest usage report so we walk in prepared.
            </Text>
          </Stack>
        </Thread.Item>
      </Thread.Item>
    </Thread>
  );
}`}
      >
        <Thread>
          <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
            <Stack gap="xs">
              <Text size="sm">
                <strong>Maya Chen</strong> · 2h ago
              </Text>
              <Text size="sm">
                Flagged the Acme renewal — usage dropped ~30% last quarter. Worth a check-in before
                we send the contract.
              </Text>
            </Stack>
            <Thread.Item node={<Avatar name="Tom Okafor" size="sm" />}>
              <Stack gap="xs">
                <Text size="sm">
                  <strong>Tom Okafor</strong> · 1h ago
                </Text>
                <Text size="sm">
                  Good catch. I'll set up a call with their ops lead for Thursday.
                </Text>
              </Stack>
              <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
                <Stack gap="xs">
                  <Text size="sm">
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
                <Text size="sm">
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
        title="On a tinted surface (no rail mask)"
        description="The rail terminates exactly at the last reply's elbow, so it's independent of the surface the thread sits on — no faint stripe below the final branch even on a tinted background. (Earlier the trunk was drawn full-height and painted over with the page colour, which leaked on non-white surfaces.)"
        code={`import { Avatar, Stack, Text, Thread } from '@eocrm/design-system';

export function Demo() {
  return (
    <div
      style={{
        background: 'var(--color-bg-muted)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <Thread>
        <Thread.Item node={<Avatar name="Dana Reyes" size="sm" />}>
          <Stack gap="xs">
            <Text size="sm">
              <strong>Dana Reyes</strong> · 3h ago
            </Text>
            <Text size="sm">Moved the kickoff to Wednesday — does that still work?</Text>
          </Stack>
          <Thread.Item node={<Avatar name="Sam Cole" size="sm" />}>
            <Text size="sm">
              <strong>Sam Cole</strong> · works for me
            </Text>
          </Thread.Item>
          <Thread.Item node={<Avatar name="Lena Fischer" size="sm" />}>
            <Text size="sm">
              <strong>Lena Fischer</strong> · same here, see you then
            </Text>
          </Thread.Item>
        </Thread.Item>
      </Thread>
    </div>
  );
}`}
      >
        <div
          style={{
            background: 'var(--color-bg-muted)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Thread>
            <Thread.Item node={<Avatar name="Dana Reyes" size="sm" />}>
              <Stack gap="xs">
                <Text size="sm">
                  <strong>Dana Reyes</strong> · 3h ago
                </Text>
                <Text size="sm">Moved the kickoff to Wednesday — does that still work?</Text>
              </Stack>
              <Thread.Item node={<Avatar name="Sam Cole" size="sm" />}>
                <Text size="sm">
                  <strong>Sam Cole</strong> · works for me
                </Text>
              </Thread.Item>
              <Thread.Item node={<Avatar name="Lena Fischer" size="sm" />}>
                <Text size="sm">
                  <strong>Lena Fischer</strong> · same here, see you then
                </Text>
              </Thread.Item>
            </Thread.Item>
          </Thread>
        </div>
      </Example>

      <Example
        title="Node alignment (header vs top)"
        description={
          'By default the node centers on the first body line (the header), so a taller avatar reads as centered against the name (Jira/GitHub style). Pass nodeAlign="top" to top-align the node with the body instead — useful when the node is about one line tall.'
        }
        code={`import { Avatar, Stack, Text, Thread } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="lg">
      {/* default: nodeAlign="header" — avatar centered on the author line */}
      <Thread>
        <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
          <Stack gap="xs">
            <Text size="sm">
              <strong>Maya Chen</strong> · 2h ago
            </Text>
            <Text size="sm">Centered on the header line.</Text>
          </Stack>
        </Thread.Item>
      </Thread>

      {/* nodeAlign="top" — avatar top-aligned with the body */}
      <Thread nodeAlign="top">
        <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
          <Stack gap="xs">
            <Text size="sm">
              <strong>Maya Chen</strong> · 2h ago
            </Text>
            <Text size="sm">Top-aligned with the body.</Text>
          </Stack>
        </Thread.Item>
      </Thread>
    </Stack>
  );
}`}
      >
        <Stack gap="lg">
          <Thread>
            <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
              <Stack gap="xs">
                <Text size="sm">
                  <strong>Maya Chen</strong> · 2h ago
                </Text>
                <Text size="sm">Centered on the header line.</Text>
              </Stack>
            </Thread.Item>
          </Thread>

          <Thread nodeAlign="top">
            <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
              <Stack gap="xs">
                <Text size="sm">
                  <strong>Maya Chen</strong> · 2h ago
                </Text>
                <Text size="sm">Top-aligned with the body.</Text>
              </Stack>
            </Thread.Item>
          </Thread>
        </Stack>
      </Example>

      <Example
        title="Depth cap (maxDepth)"
        description="A deep back-and-forth. With maxDepth={3}, replies stop indenting once the cap is reached — the chain past level 3 renders flat at the same indent so the thread stops marching right off the page."
        code={`import { Avatar, Text, Thread } from '@eocrm/design-system';

export function Demo() {
  return (
    <Thread maxDepth={3}>
      <Thread.Item node={<Avatar name="Dana Reyes" size="sm" />}>
        <Text size="sm">
          <strong>Dana Reyes</strong> · who's covering the EU launch demo?
        </Text>
        <Thread.Item node={<Avatar name="Sam Cole" size="sm" />}>
          <Text size="sm">
            <strong>Sam Cole</strong> · I can — what time zone is the client in?
          </Text>
          <Thread.Item node={<Avatar name="Lena Fischer" size="sm" />}>
            <Text size="sm">
              <strong>Lena Fischer</strong> · CET. They asked for 10:00 their time.
            </Text>
            <Thread.Item node={<Avatar name="Raj Patel" size="sm" />}>
              {/* depth 3 hits the cap → this reply and deeper render flat */}
              <Text size="sm">
                <strong>Raj Patel</strong> · Booked the room and sent the invite.
              </Text>
              <Thread.Item node={<Avatar name="Olivia Wong" size="sm" />}>
                <Text size="sm">
                  <strong>Olivia Wong</strong> · Added the deck link to the calendar event.
                </Text>
              </Thread.Item>
            </Thread.Item>
          </Thread.Item>
        </Thread.Item>
      </Thread.Item>
    </Thread>
  );
}`}
      >
        <Thread maxDepth={3}>
          <Thread.Item node={<Avatar name="Dana Reyes" size="sm" />}>
            <Text size="sm">
              <strong>Dana Reyes</strong> · who's covering the EU launch demo?
            </Text>
            <Thread.Item node={<Avatar name="Sam Cole" size="sm" />}>
              <Text size="sm">
                <strong>Sam Cole</strong> · I can — what time zone is the client in?
              </Text>
              <Thread.Item node={<Avatar name="Lena Fischer" size="sm" />}>
                <Text size="sm">
                  <strong>Lena Fischer</strong> · CET. They asked for 10:00 their time.
                </Text>
                <Thread.Item node={<Avatar name="Raj Patel" size="sm" />}>
                  {/* depth 3 hits the cap → this reply and deeper render flat */}
                  <Text size="sm">
                    <strong>Raj Patel</strong> · Booked the room and sent the invite.
                  </Text>
                  <Thread.Item node={<Avatar name="Olivia Wong" size="sm" />}>
                    <Text size="sm">
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
        description="compact tightens the gaps for a narrow panel — a contact-record activity sidebar. The remapped tokens cascade to every nested reply."
        code={`import { Avatar, Constrain, Text, Thread } from '@eocrm/design-system';

export function Demo() {
  return (
    <Constrain maxWidth="xs">
      <Thread compact>
        <Thread.Item node={<Avatar name="Grace Liu" size="sm" />}>
          <Text size="sm">
            <strong>Grace Liu</strong> · renewed the contract
          </Text>
          <Thread.Item node={<Avatar name="Marcus Bell" size="sm" />}>
            <Text size="sm">
              <strong>Marcus Bell</strong> · nice — invoice sent
            </Text>
          </Thread.Item>
        </Thread.Item>
        <Thread.Item node={<Avatar name="Priya Nair" size="sm" />}>
          <Text size="sm">
            <strong>Priya Nair</strong> · logged a support call
          </Text>
        </Thread.Item>
      </Thread>
    </Constrain>
  );
}`}
      >
        <Constrain maxWidth="xs">
          <Thread compact>
            <Thread.Item node={<Avatar name="Grace Liu" size="sm" />}>
              <Text size="sm">
                <strong>Grace Liu</strong> · renewed the contract
              </Text>
              <Thread.Item node={<Avatar name="Marcus Bell" size="sm" />}>
                <Text size="sm">
                  <strong>Marcus Bell</strong> · nice — invoice sent
                </Text>
              </Thread.Item>
            </Thread.Item>
            <Thread.Item node={<Avatar name="Priya Nair" size="sm" />}>
              <Text size="sm">
                <strong>Priya Nair</strong> · logged a support call
              </Text>
            </Thread.Item>
          </Thread>
        </Constrain>
      </Example>
    </DemoLayout>
  );
}
