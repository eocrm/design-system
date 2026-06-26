import { Badge, PersonDisplay, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

export function PersonDisplayDemo() {
  return (
    <DemoLayout
      name="PersonDisplay"
      componentName="PersonDisplay"
      description="Avatar + name (+ optional description lines) — the canonical person-row composition. Three sizes (sm / md / lg) drive Avatar + Text scales."
      files={getComponentFiles('PersonDisplay')}
    >
      <Example
        title="All three sizes"
        description="The same person rendered at sm, md, and lg so you can compare scale. sm is for tight table cells, md is the default, lg is the detail-page hero."
        code={`<PersonDisplay size="sm">…</PersonDisplay>
<PersonDisplay size="md">…</PersonDisplay>
<PersonDisplay size="lg">…</PersonDisplay>`}
      >
        <InputExample width="auto">
          <Stack gap="md">
            <PersonDisplay size="sm">
              <PersonDisplay.Avatar name="Sarah Chen" />
              <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
            </PersonDisplay>
            <PersonDisplay size="md">
              <PersonDisplay.Avatar name="Sarah Chen" />
              <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
            </PersonDisplay>
            <PersonDisplay size="lg">
              <PersonDisplay.Avatar name="Sarah Chen" />
              <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
            </PersonDisplay>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Avatar + name only"
        description="The compact owner-column shape — no description line."
        code={`<PersonDisplay size="sm">
  <PersonDisplay.Avatar name="Avery Liu" />
  <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
</PersonDisplay>`}
      >
        <InputExample width="auto">
          <PersonDisplay size="sm">
            <PersonDisplay.Avatar name="Avery Liu" />
            <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
          </PersonDisplay>
        </InputExample>
      </Example>

      <Example
        title="Linked name"
        description="Name renders as a real <a> when href is set. Uses Link variant=subtle so it doesn't compete with action CTAs."
        code={`<PersonDisplay size="md">
  <PersonDisplay.Avatar name="Sarah Chen" src="/avatars/sarah.png" />
  <PersonDisplay.Name href="/contacts/sarah-chen">Sarah Chen</PersonDisplay.Name>
  <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
</PersonDisplay>`}
      >
        <InputExample width="auto">
          <PersonDisplay size="md">
            <PersonDisplay.Avatar name="Sarah Chen" />
            <PersonDisplay.Name href="#sarah-chen">Sarah Chen</PersonDisplay.Name>
            <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
          </PersonDisplay>
        </InputExample>
      </Example>

      <Example
        title="Multiple description lines"
        description="Repeat <PersonDisplay.Description> for additional lines — email then role then company, etc."
        code={`<PersonDisplay size="md">
  <PersonDisplay.Avatar name="Marcus Vega" />
  <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
  <PersonDisplay.Description>marcus@acme.com</PersonDisplay.Description>
  <PersonDisplay.Description>Account Executive</PersonDisplay.Description>
</PersonDisplay>`}
      >
        <InputExample width="auto">
          <PersonDisplay size="md">
            <PersonDisplay.Avatar name="Marcus Vega" />
            <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
            <PersonDisplay.Description>marcus@acme.com</PersonDisplay.Description>
            <PersonDisplay.Description>Account Executive</PersonDisplay.Description>
          </PersonDisplay>
        </InputExample>
      </Example>

      <Example
        title="With status dot"
        description="Pass status to <PersonDisplay.Avatar> for the presence dot (online / busy / away / offline)."
        code={`<PersonDisplay size="md">
  <PersonDisplay.Avatar name="Priya Mehta" status="online" />
  <PersonDisplay.Name>Priya Mehta</PersonDisplay.Name>
  <PersonDisplay.Description>priya@acme.com</PersonDisplay.Description>
</PersonDisplay>`}
      >
        <InputExample width="auto">
          <PersonDisplay size="md">
            <PersonDisplay.Avatar name="Priya Mehta" status="online" />
            <PersonDisplay.Name>Priya Mehta</PersonDisplay.Name>
            <PersonDisplay.Description>priya@acme.com</PersonDisplay.Description>
          </PersonDisplay>
        </InputExample>
      </Example>

      <Example
        title="Description with inline Badge"
        description="Description accepts ReactNode children — inline a small Badge for context like an audit-log 'impersonating' marker."
        code={`<PersonDisplay size="md">
  <PersonDisplay.Avatar name="System Admin" />
  <PersonDisplay.Name>System Admin</PersonDisplay.Name>
  <PersonDisplay.Description>
    admin@acme.com <Badge tone="warning" size="sm">impersonating Sarah Chen</Badge>
  </PersonDisplay.Description>
</PersonDisplay>`}
      >
        <InputExample width="auto">
          <PersonDisplay size="md">
            <PersonDisplay.Avatar name="System Admin" />
            <PersonDisplay.Name>System Admin</PersonDisplay.Name>
            <PersonDisplay.Description>
              admin@acme.com{' '}
              <Badge tone="warning" size="sm">
                impersonating Sarah Chen
              </Badge>
            </PersonDisplay.Description>
          </PersonDisplay>
        </InputExample>
      </Example>

      <Example
        title="Shrink-wrap for overlay triggers"
        description="Inside a STRETCHING flex/grid column (here a Stack, which stretches its children), a default PersonDisplay blockifies and stretches to the full column width — the dashed outline shows the box reaching the right edge, so a Popover/Tooltip cloned onto it anchors to that wide box and centers far right of the person. With shrink (second row) the box hugs the avatar+name, so overlays anchor to the visible person. The dashed outlines are demo-only, to make each box's width visible."
        code={`// In a stretching column, keep the overlay trigger content-width so it anchors right
<PersonDisplay shrink>
  <PersonDisplay.Avatar name="Sarah Chen" />
  <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
  <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
</PersonDisplay>`}
      >
        <InputExample>
          <Stack gap="md">
            <PersonDisplay style={{ outline: '1px dashed var(--color-border)' }}>
              <PersonDisplay.Avatar name="Sarah Chen" />
              <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              <PersonDisplay.Description>
                sarah@acme.com (default — stretches)
              </PersonDisplay.Description>
            </PersonDisplay>
            <PersonDisplay shrink style={{ outline: '1px dashed var(--color-border)' }}>
              <PersonDisplay.Avatar name="Sarah Chen" />
              <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              <PersonDisplay.Description>
                sarah@acme.com (shrink — content-width)
              </PersonDisplay.Description>
            </PersonDisplay>
          </Stack>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
