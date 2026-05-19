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
      </Example>
    </DemoLayout>
  );
}
