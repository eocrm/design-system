import { useState } from 'react';
import { Pin } from 'lucide-react';
import { Button } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { DropdownMenu } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/DropdownMenu/DropdownMenu.tsx?raw';
import scssSource from '@lib-source/components/DropdownMenu/DropdownMenu.module.scss?raw';

export function DropdownMenuDemo() {
  return (
    <DemoLayout
      name="DropdownMenu"
      componentName="DropdownMenu"
      description="Action menu opened from a trigger. Compound API — pair Trigger / Content / Item / Separator. Portaled, Floating-UI-positioned, full WAI-ARIA menu keyboard behavior."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DropdownMenu.tsx"
      scssFilename="DropdownMenu.module.scss"
    >
      <Example
        title="Toolbar overflow"
        description={`"More" / overflow menu in a Cluster toolbar. Default align="start" anchors the menu to the trigger's left edge.`}
        code={`<Cluster gap="sm">
  <Button>New deal</Button>
  <Button variant="secondary">Filter</Button>
  <DropdownMenu>
    <DropdownMenu.Trigger>
      <Button variant="secondary">More ▾</Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Item onSelect={() => {}}>Import CSV</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => {}}>Export</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => {}}>Bulk edit</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu>
</Cluster>`}
      >
        <Cluster gap="sm">
          <Button>New deal</Button>
          <Button variant="secondary">Filter</Button>
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="secondary">More ▾</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => {}}>Import CSV</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Export</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Bulk edit</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Cluster>
      </Example>

      <Example
        title="Table row actions (kebab)"
        description={`Ghost-button kebab at the row's right edge, menu aligned to the trigger's right (align="end") so it doesn't overflow the table.`}
        code={`<Cluster justify="between" gap="sm">
  <span>Acme Inc.</span>
  <DropdownMenu>
    <DropdownMenu.Trigger>
      <Button variant="ghost" aria-label="Row actions">⋯</Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Item onSelect={() => {}}>View</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => {}}>Archive</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu>
</Cluster>`}
      >
        <Stack gap="sm">
          <Cluster justify="between" gap="sm">
            <span>Acme Inc.</span>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="ghost" aria-label="Row actions">
                  ⋯
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onSelect={() => {}}>View</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => {}}>Archive</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </Cluster>
          <Cluster justify="between" gap="sm">
            <span>Globex Corp.</span>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="ghost" aria-label="Row actions">
                  ⋯
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onSelect={() => {}}>View</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => {}}>Archive</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </Cluster>
        </Stack>
      </Example>

      <Example
        title="Destructive action with separator"
        description={`Group routine actions, drop a separator, end with a tone="danger" Delete. Reserve danger for irreversible destructive operations.`}
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Manage ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => {}} shortcut="⌘D">
      Duplicate
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onSelect={() => {}} tone="danger">
      Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <Cluster gap="sm">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="secondary">Manage ▾</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}} shortcut="⌘D">
                Duplicate
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={() => {}} tone="danger">
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Cluster>
      </Example>

      <Example
        title="Disabled item"
        description="Disabled items are skipped by keyboard nav, don't fire onSelect, and render dimmed."
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => {}}>Available</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => {}} disabled>
      Not yet permitted
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <Cluster gap="sm">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="secondary">Actions ▾</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => {}}>Available</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}} disabled>
                Not yet permitted
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Cluster>
      </Example>

      <Example
        title="Multi-select filter (CheckboxItem)"
        description="Checkbox items toggle in place and don't close the menu by default — natural for a filter chip menu."
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Filter ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.CheckboxItem checked={active} onCheckedChange={setActive}>
      Active
    </DropdownMenu.CheckboxItem>
    <DropdownMenu.CheckboxItem checked={pending} onCheckedChange={setPending}>
      Pending
    </DropdownMenu.CheckboxItem>
    <DropdownMenu.CheckboxItem checked={churned} onCheckedChange={setChurned}>
      Churned
    </DropdownMenu.CheckboxItem>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <FilterExample />
      </Example>

      <Example
        title="Single-select sort (RadioGroup)"
        description="Radio items default to close-on-select — picking a sort closes the menu."
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Sort: {sort} ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
      <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
      <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
      <DropdownMenu.RadioItem value="size">Size</DropdownMenu.RadioItem>
    </DropdownMenu.RadioGroup>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <SortExample />
      </Example>

      <Example
        title="Nested actions (Sub)"
        description={`A "More" submenu opens beside the parent. Hover to open after 100ms, or click. Use Escape to close just the sub, click outside to close everything.`}
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => {}}>JSON</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => {}}>PDF</DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <Cluster gap="sm">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="secondary">Actions ▾</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => {}}>JSON</DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => {}}>PDF</DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Cluster>
      </Example>

      <Example
        title="Grouped + labeled (Group + Label)"
        description="A combined menu — filters as checkboxes, sort as a radio group, both organized with labels. The View settings pattern."
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">View ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Show</DropdownMenu.Label>
      <DropdownMenu.CheckboxItem checked={active} onCheckedChange={setActive}>
        Active
      </DropdownMenu.CheckboxItem>
      <DropdownMenu.CheckboxItem checked={archived} onCheckedChange={setArchived}>
        Archived
      </DropdownMenu.CheckboxItem>
    </DropdownMenu.Group>
    <DropdownMenu.Separator />
    <DropdownMenu.Group>
      <DropdownMenu.Label>Sort by</DropdownMenu.Label>
      <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
        <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <ViewSettingsExample />
      </Example>

      <Example
        title="Custom indicators (ItemIndicator)"
        description="Checked items already get the info-tinted row + 2px left accent for free. Use <DropdownMenu.ItemIndicator> as a direct child to add a custom glyph on top — a Pin icon, a colored dot for a label-color picker, a custom animated check, etc. Indicators only render when the parent item is checked / selected."
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Label color ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.RadioGroup value={color} onValueChange={setColor}>
      <DropdownMenu.RadioItem value="red">
        <DropdownMenu.ItemIndicator>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--color-danger)' }} />
        </DropdownMenu.ItemIndicator>
        Red
      </DropdownMenu.RadioItem>
      <DropdownMenu.RadioItem value="green">
        <DropdownMenu.ItemIndicator>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--color-success)' }} />
        </DropdownMenu.ItemIndicator>
        Green
      </DropdownMenu.RadioItem>
      <DropdownMenu.RadioItem value="blue">
        <DropdownMenu.ItemIndicator>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--color-accent)' }} />
        </DropdownMenu.ItemIndicator>
        Blue
      </DropdownMenu.RadioItem>
    </DropdownMenu.RadioGroup>
    <DropdownMenu.Separator />
    <DropdownMenu.CheckboxItem checked={pinned} onCheckedChange={setPinned}>
      <DropdownMenu.ItemIndicator>
        <Pin size={14} />
      </DropdownMenu.ItemIndicator>
      Pin to top
    </DropdownMenu.CheckboxItem>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <CustomIndicatorExample />
      </Example>
    </DemoLayout>
  );
}

function FilterExample() {
  const [active, setActive] = useState(true);
  const [pending, setPending] = useState(false);
  const [churned, setChurned] = useState(false);
  return (
    <Cluster gap="sm">
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <Button variant="secondary">Filter ▾</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={active} onCheckedChange={setActive}>
            Active
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem checked={pending} onCheckedChange={setPending}>
            Pending
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem checked={churned} onCheckedChange={setChurned}>
            Churned
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>
    </Cluster>
  );
}

function SortExample() {
  const [sort, setSort] = useState('name');
  return (
    <Cluster gap="sm">
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <Button variant="secondary">Sort: {sort} ▾</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
            <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="size">Size</DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu>
    </Cluster>
  );
}

function ViewSettingsExample() {
  const [active, setActive] = useState(true);
  const [archived, setArchived] = useState(false);
  const [sort, setSort] = useState('name');
  return (
    <Cluster gap="sm">
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <Button variant="secondary">View ▾</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            <DropdownMenu.Label>Show</DropdownMenu.Label>
            <DropdownMenu.CheckboxItem checked={active} onCheckedChange={setActive}>
              Active
            </DropdownMenu.CheckboxItem>
            <DropdownMenu.CheckboxItem checked={archived} onCheckedChange={setArchived}>
              Archived
            </DropdownMenu.CheckboxItem>
          </DropdownMenu.Group>
          <DropdownMenu.Separator />
          <DropdownMenu.Group>
            <DropdownMenu.Label>Sort by</DropdownMenu.Label>
            <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
              <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>
    </Cluster>
  );
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: 999,
        background: color,
      }}
    />
  );
}

function CustomIndicatorExample() {
  const [color, setColor] = useState('blue');
  const [pinned, setPinned] = useState(false);
  return (
    <Cluster gap="sm">
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <Button variant="secondary">Label color ▾</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup value={color} onValueChange={setColor}>
            <DropdownMenu.RadioItem value="red">
              <DropdownMenu.ItemIndicator>
                <ColorDot color="var(--color-danger)" />
              </DropdownMenu.ItemIndicator>
              Red
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="green">
              <DropdownMenu.ItemIndicator>
                <ColorDot color="var(--color-success)" />
              </DropdownMenu.ItemIndicator>
              Green
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="blue">
              <DropdownMenu.ItemIndicator>
                <ColorDot color="var(--color-accent)" />
              </DropdownMenu.ItemIndicator>
              Blue
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator />
          <DropdownMenu.CheckboxItem checked={pinned} onCheckedChange={setPinned}>
            <DropdownMenu.ItemIndicator>
              <Pin size={14} />
            </DropdownMenu.ItemIndicator>
            Pin to top
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>
    </Cluster>
  );
}
