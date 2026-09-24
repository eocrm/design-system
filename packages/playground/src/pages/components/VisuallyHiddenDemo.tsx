import { Link, Stack, Text, Title, VisuallyHidden } from '@eocrm/design-system';
import { ExternalLink } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function VisuallyHiddenDemo() {
  return (
    <DemoLayout
      name="VisuallyHidden"
      componentName="VisuallyHidden"
      description="Content removed from the visual layout but kept in the accessibility tree — the standard 'clip' technique (no display: none / visibility: hidden, which would also remove it from assistive tech). Use for text that only screen reader users need."
      files={getComponentFiles('VisuallyHidden')}
    >
      <Example
        title="Icon-only link"
        description="The link renders only an icon — VisuallyHidden supplies its whole accessible name, including the '(opens in a new tab)' context a sighted user never sees rendered anywhere on the page."
        code={`import { Link, VisuallyHidden } from '@eocrm/design-system';
import { ExternalLink } from 'lucide-react';

export function Demo() {
  return (
    <Link href="https://example.com/docs" target="_blank" rel="noopener noreferrer">
      <ExternalLink size={16} aria-hidden="true" />
      <VisuallyHidden>Documentation (opens in a new tab)</VisuallyHidden>
    </Link>
  );
}`}
      >
        <Stack gap="xs" align="start">
          <Link href="https://example.com/docs" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            <VisuallyHidden>Documentation (opens in a new tab)</VisuallyHidden>
          </Link>
          <Text size="sm" tone="muted">
            Sighted users see only the icon. A screen reader announces "Documentation, opens in a
            new tab, link" — the text is in the accessibility tree but never painted.
          </Text>
        </Stack>
      </Example>

      <Example
        title="Hidden section heading"
        description="A landmark labelled by a heading only screen reader users perceive — sighted users infer the section from its position on the page, so painting the heading would be redundant."
        code={`import { Title, VisuallyHidden } from '@eocrm/design-system';

export function Demo() {
  return (
    <nav aria-labelledby="section-nav-heading">
      <VisuallyHidden as="div">
        <Title id="section-nav-heading" order={2}>
          Section navigation
        </Title>
      </VisuallyHidden>
      {/* visible nav links */}
    </nav>
  );
}`}
      >
        <Stack gap="xs" align="start">
          <nav aria-labelledby="demo-section-nav-heading">
            <VisuallyHidden as="div">
              <Title id="demo-section-nav-heading" order={2}>
                Section navigation
              </Title>
            </VisuallyHidden>
            <Text size="sm">Overview · Settings · Members</Text>
          </nav>
          <Text size="sm" tone="muted">
            The "Section navigation" heading is never rendered visually, but a screen reader
            announces it on reaching the landmark — that's what aria-labelledby points at.
          </Text>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
