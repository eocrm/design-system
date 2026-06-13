import { useState } from 'react';
import { Button, Cluster, DropdownMenu, Popover, Stack } from '@eocrm/design-system';
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
