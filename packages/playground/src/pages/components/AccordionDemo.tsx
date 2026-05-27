import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Accordion, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function AccordionDemo() {
  const [controlled, setControlled] = useState<string>('');

  return (
    <DemoLayout
      name="Accordion"
      componentName="Accordion"
      description="Vertically-stacked collapsible panels. Compound component (Accordion.Item + Accordion.Trigger + Accordion.Content). Two modes: type='single' (one open at a time) or type='multiple' (any combination)."
      files={getComponentFiles('Accordion')}
    >
      <Example
        title="Single, collapsible (FAQ-style)"
        description="Only one item open at a time. Clicking the open item closes it (collapsible)."
        code={`<Accordion type="single" collapsible defaultValue="faq-1">
  <Accordion.Item value="faq-1">
    <Accordion.Trigger>How do I reset my password?</Accordion.Trigger>
    <Accordion.Content>Visit Settings → Security → Reset password.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="faq-2">
    <Accordion.Trigger>How do I export my data?</Accordion.Trigger>
    <Accordion.Content>Use the gear icon → Export → CSV.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="faq-3">
    <Accordion.Trigger>How do I invite teammates?</Accordion.Trigger>
    <Accordion.Content>Settings → Team → Invite via email.</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
      >
        <Accordion type="single" collapsible defaultValue="faq-1">
          <Accordion.Item value="faq-1">
            <Accordion.Trigger>How do I reset my password?</Accordion.Trigger>
            <Accordion.Content>Visit Settings → Security → Reset password.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="faq-2">
            <Accordion.Trigger>How do I export my data?</Accordion.Trigger>
            <Accordion.Content>Use the gear icon → Export → CSV.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="faq-3">
            <Accordion.Trigger>How do I invite teammates?</Accordion.Trigger>
            <Accordion.Content>Settings → Team → Invite via email.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>

      <Example
        title="Multiple — independent sections"
        description="Any combination of items can be open. Useful for settings panels where each section is independent."
        code={`<Accordion type="multiple" defaultValue={['account']}>
  <Accordion.Item value="account">
    <Accordion.Trigger>Account</Accordion.Trigger>
    <Accordion.Content>Email, name, profile picture.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="notifications">
    <Accordion.Trigger>Notifications</Accordion.Trigger>
    <Accordion.Content>Email digest, in-app alerts.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="security">
    <Accordion.Trigger>Security</Accordion.Trigger>
    <Accordion.Content>2FA, active sessions, API keys.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="billing">
    <Accordion.Trigger>Billing</Accordion.Trigger>
    <Accordion.Content>Plan, invoices, payment method.</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
      >
        <Accordion type="multiple" defaultValue={['account']}>
          <Accordion.Item value="account">
            <Accordion.Trigger>Account</Accordion.Trigger>
            <Accordion.Content>Email, name, profile picture.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="notifications">
            <Accordion.Trigger>Notifications</Accordion.Trigger>
            <Accordion.Content>Email digest, in-app alerts.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="security">
            <Accordion.Trigger>Security</Accordion.Trigger>
            <Accordion.Content>2FA, active sessions, API keys.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="billing">
            <Accordion.Trigger>Billing</Accordion.Trigger>
            <Accordion.Content>Plan, invoices, payment method.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>

      <Example
        title="Controlled"
        description="The consumer owns the open state via value + onValueChange. Useful for syncing with URL state or external state stores."
        code={`const [open, setOpen] = useState('');

<Accordion type="single" collapsible value={open} onValueChange={setOpen}>
  <Accordion.Item value="a">
    <Accordion.Trigger>Section A</Accordion.Trigger>
    <Accordion.Content>Content A</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="b">
    <Accordion.Trigger>Section B</Accordion.Trigger>
    <Accordion.Content>Content B</Accordion.Content>
  </Accordion.Item>
</Accordion>

<p>Currently open: {open || '(none)'}</p>`}
      >
        <Stack gap="sm">
          <Accordion type="single" collapsible value={controlled} onValueChange={setControlled}>
            <Accordion.Item value="a">
              <Accordion.Trigger>Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger>Section B</Accordion.Trigger>
              <Accordion.Content>Content B</Accordion.Content>
            </Accordion.Item>
          </Accordion>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
            Currently open: {controlled || '(none)'}
          </p>
        </Stack>
      </Example>

      <Example
        title="Disabled item"
        description="A disabled item is non-interactive (button disabled, keyboard nav skips). Useful for sections that aren't applicable to the current user/plan."
        code={`<Accordion type="single" collapsible>
  <Accordion.Item value="basic">
    <Accordion.Trigger>Basic settings</Accordion.Trigger>
    <Accordion.Content>Always available.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="premium" disabled>
    <Accordion.Trigger>Premium settings (upgrade required)</Accordion.Trigger>
    <Accordion.Content>You won't see this.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="advanced">
    <Accordion.Trigger>Advanced settings</Accordion.Trigger>
    <Accordion.Content>For power users.</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
      >
        <Accordion type="single" collapsible>
          <Accordion.Item value="basic">
            <Accordion.Trigger>Basic settings</Accordion.Trigger>
            <Accordion.Content>Always available.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="premium" disabled>
            <Accordion.Trigger>Premium settings (upgrade required)</Accordion.Trigger>
            <Accordion.Content>You won't see this.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="advanced">
            <Accordion.Trigger>Advanced settings</Accordion.Trigger>
            <Accordion.Content>For power users.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>

      <Example
        title="Custom icon (Plus)"
        description="Override the default ChevronDown indicator via the Trigger's icon prop. The icon rotates 180° when the item is open."
        code={`<Accordion type="single" collapsible>
  <Accordion.Item value="a">
    <Accordion.Trigger icon={<Plus size={16} />}>Toggle me</Accordion.Trigger>
    <Accordion.Content>The Plus icon rotates 180° to become a Minus when open.</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
      >
        <Accordion type="single" collapsible>
          <Accordion.Item value="a">
            <Accordion.Trigger icon={<Plus size={16} aria-hidden="true" />}>
              Toggle me
            </Accordion.Trigger>
            <Accordion.Content>
              The Plus icon rotates 180° to become a Minus when open.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>

      <Example
        title="Heading level override"
        description="Trigger is wrapped in <h3> by default. Override via Item.headerLevel to fit the surrounding page heading hierarchy."
        code={`<Accordion type="single" collapsible>
  <Accordion.Item value="a" headerLevel="h2">
    <Accordion.Trigger>This trigger sits inside an &lt;h2&gt;</Accordion.Trigger>
    <Accordion.Content>Inspect the DOM to verify.</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
      >
        <Accordion type="single" collapsible>
          <Accordion.Item value="a" headerLevel="h2">
            <Accordion.Trigger>This trigger sits inside an &lt;h2&gt;</Accordion.Trigger>
            <Accordion.Content>Inspect the DOM to verify.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>

      <Example
        title="Three sizes"
        description="size controls trigger font + padding (and content padding). Default is md."
        code={`<Accordion type="single" collapsible size="sm">...</Accordion>
<Accordion type="single" collapsible size="md">...</Accordion>
<Accordion type="single" collapsible size="lg">...</Accordion>`}
      >
        <Stack gap="md">
          <Accordion type="single" collapsible size="sm" defaultValue="a">
            <Accordion.Item value="a">
              <Accordion.Trigger>Small (sm)</Accordion.Trigger>
              <Accordion.Content>Tighter padding and smaller font.</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger>Second item</Accordion.Trigger>
              <Accordion.Content>...</Accordion.Content>
            </Accordion.Item>
          </Accordion>
          <Accordion type="single" collapsible size="md" defaultValue="a">
            <Accordion.Item value="a">
              <Accordion.Trigger>Medium (md, default)</Accordion.Trigger>
              <Accordion.Content>Default padding and font.</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger>Second item</Accordion.Trigger>
              <Accordion.Content>...</Accordion.Content>
            </Accordion.Item>
          </Accordion>
          <Accordion type="single" collapsible size="lg" defaultValue="a">
            <Accordion.Item value="a">
              <Accordion.Trigger>Large (lg)</Accordion.Trigger>
              <Accordion.Content>Larger padding and font.</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger>Second item</Accordion.Trigger>
              <Accordion.Content>...</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Example>

      <Example
        title="Borderless variant"
        description="variant='borderless' strips the outer border + item dividing lines. Use when the accordion lives inside another bordered container, or as a quiet section divider."
        code={`<Accordion type="multiple" variant="borderless" defaultValue={['account']}>
  <Accordion.Item value="account">...</Accordion.Item>
  <Accordion.Item value="notifications">...</Accordion.Item>
  <Accordion.Item value="security">...</Accordion.Item>
</Accordion>`}
      >
        <Accordion type="multiple" variant="borderless" defaultValue={['account']}>
          <Accordion.Item value="account">
            <Accordion.Trigger>Account</Accordion.Trigger>
            <Accordion.Content>Email, name, profile picture.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="notifications">
            <Accordion.Trigger>Notifications</Accordion.Trigger>
            <Accordion.Content>Email digest, in-app alerts.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="security">
            <Accordion.Trigger>Security</Accordion.Trigger>
            <Accordion.Content>2FA, active sessions, API keys.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>
    </DemoLayout>
  );
}
