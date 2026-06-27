import { useState } from 'react';
import { Smile } from 'lucide-react';
import {
  EmojiPicker,
  EmojiPickerPopover,
  Popover,
  Button,
  Badge,
  Stack,
  Cluster,
  Text,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

/** Tally selections into emoji → count so picking the same emoji twice bumps it. */
function tally(reactions: Record<string, number>, emoji: string): Record<string, number> {
  return { ...reactions, [emoji]: (reactions[emoji] ?? 0) + 1 };
}

export function EmojiPickerDemo() {
  const [reactions, setReactions] = useState<Record<string, number>>({ '👍': 2, '🎉': 1 });
  const [draft, setDraft] = useState('Great work shipping the Q3 renewal flow ');
  const [lastInserted, setLastInserted] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(['👍', '🎉', '❤️', '🔥', '✅']);
  // Canonical recent pattern: move the pick to the front, de-dupe, cap the list.
  const addRecent = (emoji: string) =>
    setRecent((r) => [emoji, ...r.filter((c) => c !== emoji)].slice(0, 16));

  return (
    <DemoLayout
      name="EmojiPicker"
      componentName="EmojiPicker"
      description="Searchable, categorized, keyboard-navigable emoji grid over a curated common set (reactions + everyday input — not the full Unicode catalog). Lives inside a Popover; calls onSelect(emoji) on click or Enter/Space. Use EmojiPickerPopover for the batteries-included trigger + close-on-select wrapper."
      files={getComponentFiles('EmojiPicker')}
    >
      <Example
        title="Reaction picker in a Popover"
        description="The canonical use: an icon-only trigger opens the grid inside a Popover you control. onSelect tallies the chosen emoji into a reaction count shown as a Cluster of Badges."
        code={`const [reactions, setReactions] = useState<Record<string, number>>({ '👍': 2, '🎉': 1 });

<Cluster gap="xs" align="center">
  {Object.entries(reactions).map(([emoji, count]) => (
    <Badge key={emoji} tone="neutral">{emoji} {count}</Badge>
  ))}
  <Popover>
    <Popover.Trigger>
      <Button iconOnly variant="ghost" size="sm" aria-label="Add reaction">
        <Smile size={16} />
      </Button>
    </Popover.Trigger>
    <Popover.Content>
      <EmojiPicker onSelect={(emoji) => setReactions((r) => tally(r, emoji))} />
    </Popover.Content>
  </Popover>
</Cluster>`}
      >
        <Stack gap="sm">
          <Text size="sm">
            <strong>Maya Chen</strong> closed the Acme renewal — nice quarter.
          </Text>
          <Cluster gap="xs" align="center">
            {Object.entries(reactions).map(([emoji, count]) => (
              <Badge key={emoji} tone="neutral">
                {emoji} {count}
              </Badge>
            ))}
            <Popover>
              <Popover.Trigger>
                <Button iconOnly variant="ghost" size="sm" aria-label="Add reaction">
                  <Smile size={16} />
                </Button>
              </Popover.Trigger>
              <Popover.Content>
                <EmojiPicker onSelect={(emoji) => setReactions((r) => tally(r, emoji))} />
              </Popover.Content>
            </Popover>
          </Cluster>
        </Stack>
      </Example>

      <Example
        title="EmojiPickerPopover wrapper (opens + closes for you)"
        description="The batteries-included wrapper owns the Popover and closes on select. Pass a trigger and an onSelect — here it appends the chosen emoji to a comment draft."
        code={`<Cluster gap="sm" align="center">
  <Text size="sm">{draft || 'Write a comment…'}</Text>
  <EmojiPickerPopover
    trigger={<Button variant="secondary" size="sm">Add reaction</Button>}
    onSelect={(emoji) => setDraft((d) => d + emoji)}
  />
</Cluster>`}
      >
        <Cluster gap="sm" align="center">
          <Text size="sm">{draft || 'Write a comment…'}</Text>
          <EmojiPickerPopover
            trigger={
              <Button variant="secondary" size="sm">
                Add reaction
              </Button>
            }
            onSelect={(emoji) => setDraft((d) => d + emoji)}
          />
        </Cluster>
      </Example>

      <Example
        title="Bare grid (no Popover)"
        description="The picker surface on its own — search box + category-sectioned 8-column grid, navigable by arrow keys. Drop it into any container; here onSelect echoes the most recent pick."
        code={`<Stack gap="sm">
  <EmojiPicker onSelect={setLastInserted} />
  <Text size="sm" tone="muted">
    Last picked: {lastInserted ?? '—'}
  </Text>
</Stack>`}
      >
        <Stack gap="sm">
          <EmojiPicker onSelect={setLastInserted} />
          <Text size="sm" tone="muted">
            Last picked: {lastInserted ?? '—'}
          </Text>
        </Stack>
      </Example>

      <Example
        title="Recently used (recent prop)"
        description="Pass recent={[...]} to pin a 'Recently used' section at the top (shown only while not searching). The consumer owns persistence — keep the list yourself (e.g. localStorage), update it in onSelect, and pass it back. Here, picking an emoji moves it to the front of the recent row."
        code={`const [recent, setRecent] = useState<string[]>(['👍', '🎉', '❤️', '🔥', '✅']);
const addRecent = (emoji: string) =>
  setRecent((r) => [emoji, ...r.filter((c) => c !== emoji)].slice(0, 16));

<EmojiPicker recent={recent} onSelect={addRecent} />`}
      >
        <Stack gap="sm">
          <EmojiPicker recent={recent} onSelect={addRecent} />
          <Text size="sm" tone="muted">
            recent: {recent.join(' ')}
          </Text>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
