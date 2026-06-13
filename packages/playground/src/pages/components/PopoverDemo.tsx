import { useState } from 'react';
import {
  Button,
  Cluster,
  ConfirmationPopover,
  DropdownMenu,
  FilterChip,
  Popover,
  Stack,
  Text,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function PopoverDemo() {
  return (
    <DemoLayout
      name="Popover"
      componentName="Popover"
      description="Non-modal floating panel for arbitrary small surfaces. Compound API — pair Trigger / Content / optionally Heading / Close. Focus moves to the panel on open; Tab traverses out; click-outside or Escape dismisses."
      files={getComponentFiles('Popover')}
    >
      <Example
        title="Default — filter panel"
        description="The canonical popover: a button trigger, a small panel of controls, and an Apply / Cancel footer."
        code={`<Popover>
  <Popover.Trigger>
    <Button variant="secondary">Filters</Button>
  </Popover.Trigger>
  <Popover.Content>
    <Stack gap="sm">
      <Popover.Heading>Filter results</Popover.Heading>
      <div>(form controls go here)</div>
      <Cluster justify="end" gap="sm">
        <Popover.Close>
          <Button variant="secondary" size="sm">Cancel</Button>
        </Popover.Close>
        <Popover.Close>
          <Button size="sm">Apply</Button>
        </Popover.Close>
      </Cluster>
    </Stack>
  </Popover.Content>
</Popover>`}
      >
        <Cluster gap="md" justify="center">
          <Popover>
            <Popover.Trigger>
              <Button variant="secondary">Filters</Button>
            </Popover.Trigger>
            <Popover.Content>
              <Stack gap="sm">
                <Popover.Heading>Filter results</Popover.Heading>
                <div>(form controls would go here once Checkbox lands)</div>
                <Cluster justify="end" gap="sm">
                  <Popover.Close>
                    <Button variant="secondary" size="sm">
                      Cancel
                    </Button>
                  </Popover.Close>
                  <Popover.Close>
                    <Button size="sm">Apply</Button>
                  </Popover.Close>
                </Cluster>
              </Stack>
            </Popover.Content>
          </Popover>
        </Cluster>
      </Example>

      <Example
        title="Sides"
        description="Floating UI auto-flips on collision; this row pins each popover to a specific side."
        code={`<Popover><Popover.Trigger><Button>Top</Button></Popover.Trigger><Popover.Content side="top">Top</Popover.Content></Popover>
<Popover><Popover.Trigger><Button>Right</Button></Popover.Trigger><Popover.Content side="right">Right</Popover.Content></Popover>
<Popover><Popover.Trigger><Button>Bottom</Button></Popover.Trigger><Popover.Content side="bottom">Bottom</Popover.Content></Popover>
<Popover><Popover.Trigger><Button>Left</Button></Popover.Trigger><Popover.Content side="left">Left</Popover.Content></Popover>`}
      >
        <Cluster gap="md" justify="center">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <Popover key={side}>
              <Popover.Trigger>
                <Button variant="secondary">{side}</Button>
              </Popover.Trigger>
              <Popover.Content side={side}>
                <Stack gap="xs">
                  <Popover.Heading>{`Side: ${side}`}</Popover.Heading>
                  <div>The arrow points back at the trigger.</div>
                </Stack>
              </Popover.Content>
            </Popover>
          ))}
        </Cluster>
      </Example>

      <Example
        title="Rich content with multiple Close buttons"
        description="A popover can contain any interactive content. Wrap each closing element in <Popover.Close>."
        code={`<Popover>
  <Popover.Trigger>
    <Button variant="secondary">Actions</Button>
  </Popover.Trigger>
  <Popover.Content>
    <Stack gap="sm">
      <Popover.Heading>Choose</Popover.Heading>
      <Popover.Close><Button variant="secondary" size="sm">Save and exit</Button></Popover.Close>
      <Popover.Close><Button variant="secondary" size="sm">Discard</Button></Popover.Close>
      <Popover.Close><Button variant="ghost" size="sm">Stay</Button></Popover.Close>
    </Stack>
  </Popover.Content>
</Popover>`}
      >
        <Cluster gap="md" justify="center">
          <Popover>
            <Popover.Trigger>
              <Button variant="secondary">Actions</Button>
            </Popover.Trigger>
            <Popover.Content>
              <Stack gap="sm">
                <Popover.Heading>Choose</Popover.Heading>
                <Stack gap="xs">
                  <Popover.Close>
                    <Button variant="secondary" size="sm">
                      Save and exit
                    </Button>
                  </Popover.Close>
                  <Popover.Close>
                    <Button variant="secondary" size="sm">
                      Discard
                    </Button>
                  </Popover.Close>
                  <Popover.Close>
                    <Button variant="ghost" size="sm">
                      Stay
                    </Button>
                  </Popover.Close>
                </Stack>
              </Stack>
            </Popover.Content>
          </Popover>
        </Cluster>
      </Example>

      <Example
        title="Inside a DropdownMenu — z-index sanity"
        description="Wrap a <DropdownMenu.Item closeOnSelect={false}> as the Popover trigger. Popover's z-layer is above DropdownMenu's (--z-popover: 1050 > --z-dropdown: 1000), so the popover floats over the menu."
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
    <Popover>
      <Popover.Trigger>
        <DropdownMenu.Item closeOnSelect={false} onSelect={() => {}}>
          Move to…
        </DropdownMenu.Item>
      </Popover.Trigger>
      <Popover.Content>
        <Stack gap="xs">
          <Popover.Heading>Move to folder</Popover.Heading>
          <div>(folder picker)</div>
          <Cluster justify="end">
            <Popover.Close>
              <Button size="sm">Done</Button>
            </Popover.Close>
          </Cluster>
        </Stack>
      </Popover.Content>
    </Popover>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <Cluster gap="md" justify="center">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="secondary">Actions</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
              <Popover>
                <Popover.Trigger>
                  <DropdownMenu.Item closeOnSelect={false} onSelect={() => {}}>
                    Move to…
                  </DropdownMenu.Item>
                </Popover.Trigger>
                <Popover.Content>
                  <Stack gap="xs">
                    <Popover.Heading>Move to folder</Popover.Heading>
                    <div>(folder picker would go here)</div>
                    <Cluster justify="end">
                      <Popover.Close>
                        <Button size="sm">Done</Button>
                      </Popover.Close>
                    </Cluster>
                  </Stack>
                </Popover.Content>
              </Popover>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Cluster>
      </Example>

      <Example
        title="Nested floating surfaces"
        description="A Popover panel can host its own floating surfaces — a kebab DropdownMenu, and a ConfirmationPopover opened from a menu item. They now render ABOVE the popover panel (z --z-overlay-floating: 1190) instead of behind it, so the menu and the confirm dialog are fully interactive. Open the panel, then open the kebab menu, then click Delete."
        code={`<Popover>
  <Popover.Trigger>
    <Button variant="secondary">Open panel</Button>
  </Popover.Trigger>
  <Popover.Content>
    <Stack gap="sm">
      <Cluster justify="between" align="center">
        <Popover.Heading>Record</Popover.Heading>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Button variant="ghost" size="sm" iconOnly aria-label="Record actions">⋯</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item onSelect={() => {}}>Rename</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
            <DropdownMenu.Separator />
            <ConfirmationPopover
              title="Delete record?"
              description="This action cannot be undone."
              variant="danger"
              confirmLabel="Delete"
              onConfirm={() => {}}
            >
              <DropdownMenu.Item closeOnSelect={false} tone="danger" onSelect={() => {}}>
                Delete
              </DropdownMenu.Item>
            </ConfirmationPopover>
          </DropdownMenu.Content>
        </DropdownMenu>
      </Cluster>
      <div>The kebab menu and the delete confirmation float above this panel.</div>
    </Stack>
  </Popover.Content>
</Popover>`}
      >
        <Cluster gap="md" justify="center">
          <Popover>
            <Popover.Trigger>
              <Button variant="secondary">Open panel</Button>
            </Popover.Trigger>
            <Popover.Content>
              <Stack gap="sm">
                <Cluster justify="between" align="center">
                  <Popover.Heading>Record</Popover.Heading>
                  <DropdownMenu>
                    <DropdownMenu.Trigger>
                      <Button variant="ghost" size="sm" iconOnly aria-label="Record actions">
                        ⋯
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item onSelect={() => {}}>Rename</DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <ConfirmationPopover
                        title="Delete record?"
                        description="This action cannot be undone."
                        variant="danger"
                        confirmLabel="Delete"
                        onConfirm={() => {}}
                      >
                        <DropdownMenu.Item closeOnSelect={false} tone="danger" onSelect={() => {}}>
                          Delete
                        </DropdownMenu.Item>
                      </ConfirmationPopover>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </Cluster>
                <div>The kebab menu and the delete confirmation float above this panel.</div>
              </Stack>
            </Popover.Content>
          </Popover>
        </Cluster>
      </Example>

      <Example
        title="Controlled open"
        description="Drive open externally — useful for orchestrating with other UI state."
        code={`const [open, setOpen] = useState(false);
<Popover open={open} onOpenChange={setOpen}>
  <Popover.Trigger>
    <Button onClick={() => setOpen((o) => !o)}>Toggle</Button>
  </Popover.Trigger>
  <Popover.Content>…</Popover.Content>
</Popover>`}
      >
        <Cluster gap="md" justify="center">
          <ControlledExample />
        </Cluster>
      </Example>

      <Example
        title="Anchor (controlled, no injected ARIA)"
        description="Popover.Anchor positions Content against its child but injects ONLY the floating ref — no onClick, no aria-haspopup/aria-expanded/aria-controls. Use it when the anchor already owns its toggle + ARIA. Here an interactive FilterChip (its body <button> carries aria-haspopup/aria-expanded via onActivate/expanded) drives a CONTROLLED popover: clicking the chip body opens/closes the panel, and the chip's role=group root stays free of popover ARIA. (Popover.Trigger would have redundantly stamped that ARIA onto the group root.)"
        code={`const [open, setOpen] = useState(false);
<Popover open={open} onOpenChange={setOpen}>
  <Popover.Anchor>
    <FilterChip
      onActivate={() => setOpen((o) => !o)}
      expanded={open}
      onDismiss={() => {/* remove the filter */}}
    >
      <FilterChip.Label>Date</FilterChip.Label>
      <FilterChip.Value>Jun 1 – Jun 13</FilterChip.Value>
    </FilterChip>
  </Popover.Anchor>
  <Popover.Content maxWidth={360}>
    <Stack gap="sm">
      <Popover.Heading>Audit log date range</Popover.Heading>
      <Text tone="muted">(date-range picker goes here)</Text>
      <Cluster justify="end" gap="sm">
        <Popover.Close>
          <Button variant="secondary" size="sm">Cancel</Button>
        </Popover.Close>
        <Popover.Close>
          <Button size="sm">Apply</Button>
        </Popover.Close>
      </Cluster>
    </Stack>
  </Popover.Content>
</Popover>`}
      >
        <Cluster gap="md" justify="center">
          <AnchorChipExample />
        </Cluster>
      </Example>

      <Example
        title="Wide content (maxWidth)"
        description="The panel caps at 360px by default, which clips wide content like a two-column filter or a date-range calendar. Pass maxWidth to let the panel grow — here a 480px two-column layout that would otherwise overflow."
        code={`<Popover>
  <Popover.Trigger>
    <Button variant="secondary">Date range filter</Button>
  </Popover.Trigger>
  <Popover.Content maxWidth={520}>
    <Stack gap="sm">
      <Popover.Heading>Pick a date range</Popover.Heading>
      <Cluster gap="md" align="start">
        {/* two side-by-side month grids ≈ 480px wide */}
        <div style={{ width: 220 }}>(start month)</div>
        <div style={{ width: 220 }}>(end month)</div>
      </Cluster>
      <Cluster justify="end" gap="sm">
        <Popover.Close>
          <Button variant="secondary" size="sm">Cancel</Button>
        </Popover.Close>
        <Popover.Close>
          <Button size="sm">Apply</Button>
        </Popover.Close>
      </Cluster>
    </Stack>
  </Popover.Content>
</Popover>`}
      >
        <Cluster gap="md" justify="center">
          <Popover>
            <Popover.Trigger>
              <Button variant="secondary">Default cap (clips at 360px)</Button>
            </Popover.Trigger>
            <Popover.Content>
              <WideRangeBody />
            </Popover.Content>
          </Popover>
          <Popover>
            <Popover.Trigger>
              <Button variant="secondary">maxWidth=520 (fits)</Button>
            </Popover.Trigger>
            <Popover.Content maxWidth={520}>
              <WideRangeBody />
            </Popover.Content>
          </Popover>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}

// Wide two-column body (~480px) that overflows the 360px default cap.
// Both popovers share it so the only difference between them is maxWidth.
function WideRangeBody() {
  return (
    <Stack gap="sm">
      <Popover.Heading>Pick a date range</Popover.Heading>
      <Cluster gap="md" align="start">
        <Stack gap="xs" style={{ width: 220 }}>
          <strong>Start month</strong>
          <div>A 31-cell month grid would render here (~220px wide).</div>
        </Stack>
        <Stack gap="xs" style={{ width: 220 }}>
          <strong>End month</strong>
          <div>The second month grid sits beside it (~220px wide).</div>
        </Stack>
      </Cluster>
      <Cluster justify="end" gap="sm">
        <Popover.Close>
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
        </Popover.Close>
        <Popover.Close>
          <Button size="sm">Apply</Button>
        </Popover.Close>
      </Cluster>
    </Stack>
  );
}

// Popover.Anchor + a controlled popover. The interactive FilterChip owns its
// own toggle + ARIA (via onActivate/expanded on its body <button>); the Anchor
// contributes only the positioning ref, so the chip's role="group" root carries
// no popover ARIA. Realistic surface: an audit-log date-range filter chip.
function AnchorChipExample() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Anchor>
        <FilterChip
          onActivate={() => setOpen((o) => !o)}
          expanded={open}
          onDismiss={() => {
            /* a real screen would remove this filter from state */
          }}
        >
          <FilterChip.Label>Date</FilterChip.Label>
          <FilterChip.Value>Jun 1 – Jun 13</FilterChip.Value>
        </FilterChip>
      </Popover.Anchor>
      <Popover.Content maxWidth={360}>
        <Stack gap="sm">
          <Popover.Heading>Audit log date range</Popover.Heading>
          <Text tone="muted">(a date-range picker would render here)</Text>
          <Cluster justify="end" gap="sm">
            <Popover.Close>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </Popover.Close>
            <Popover.Close>
              <Button size="sm">Apply</Button>
            </Popover.Close>
          </Cluster>
        </Stack>
      </Popover.Content>
    </Popover>
  );
}

function ControlledExample() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Open'}</Button>
      </Popover.Trigger>
      <Popover.Content>
        <Stack gap="sm">
          <Popover.Heading>Controlled</Popover.Heading>
          <div>This popover is driven from external state.</div>
          <Cluster justify="end">
            <Popover.Close>
              <Button size="sm">Close</Button>
            </Popover.Close>
          </Cluster>
        </Stack>
      </Popover.Content>
    </Popover>
  );
}
