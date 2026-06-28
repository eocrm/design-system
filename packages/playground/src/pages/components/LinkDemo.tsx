import { Link as RouterLink } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Cluster, Link, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function LinkDemo() {
  return (
    <DemoLayout
      name="Link"
      componentName="Link"
      description="Polymorphic styled anchor. Default <a>; consumers pass `as={RouterLink}` for SPA navigation. Three visual variants cover inline CTA, muted nav, and subtle name-link patterns."
      files={getComponentFiles('Link')}
    >
      <Example
        title="Default — external link"
        description="No `as` prop = native <a>. Use for external URLs."
        code={`import { Link } from '@eocrm/design-system';

export function Demo() {
  return (
    <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
      Documentation
    </Link>
  );
}`}
      >
        <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
          Documentation
        </Link>
      </Example>

      <Example
        title="Three variants side by side"
        description="Pure visual difference. Pick by emphasis level."
        code={`import { Link, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <Link href="#default" onClick={(e) => e.preventDefault()}>
        default — accent + hover-underline
      </Link>
      <Link href="#muted" variant="muted" onClick={(e) => e.preventDefault()}>
        muted — subdued nav
      </Link>
      <Link href="#subtle" variant="subtle" onClick={(e) => e.preventDefault()}>
        subtle — fg, hover-accent + underline
      </Link>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Link href="#default" onClick={(e) => e.preventDefault()}>
            default — accent + hover-underline
          </Link>
          <Link href="#muted" variant="muted" onClick={(e) => e.preventDefault()}>
            muted — subdued nav
          </Link>
          <Link href="#subtle" variant="subtle" onClick={(e) => e.preventDefault()}>
            subtle — fg, hover-accent + underline
          </Link>
        </Stack>
      </Example>

      <Example
        title="SPA navigation via `as={RouterLink}`"
        description="Passes through router's `to`, `replace`, etc. with full type inference."
        code={`import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@eocrm/design-system';

export function Demo() {
  return (
    <Link as={RouterLink} to="/mockups/contacts">
      Go to Contacts
    </Link>
  );
}`}
      >
        <Link as={RouterLink} to="/mockups/contacts">
          Go to Contacts
        </Link>
      </Example>

      <Example
        title={'Link-styled action via `as="button"`'}
        description="An action that must visually match a sibling Link but can't be a real href (a fake href is the Link anti-pattern) → render a real <button>. It inherits the link look AND the pointer cursor."
        code={`import { Cluster, Link } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="md">
      <Link href="#forgot" onClick={(e) => e.preventDefault()}>
        Forgot?
      </Link>
      <Link as="button" type="button" onClick={() => {}}>
        Change email
      </Link>
    </Cluster>
  );
}`}
      >
        <Cluster gap="md">
          <Link href="#forgot" onClick={(e) => e.preventDefault()}>
            Forgot?
          </Link>
          <Link as="button" type="button" onClick={() => {}}>
            Change email
          </Link>
        </Cluster>
      </Example>

      <Example
        title="Composed with an icon"
        description="Compose Link with whatever children you want — it's just a styled anchor."
        code={`import { ExternalLink } from 'lucide-react';
import { Link } from '@eocrm/design-system';

export function Demo() {
  return (
    <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
      Open docs <ExternalLink size={12} />
    </Link>
  );
}`}
      >
        <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
          Open docs <ExternalLink size={12} />
        </Link>
      </Example>

      <Example
        title="Inline in body text"
        description="Inherits font-size and color context from the surrounding paragraph."
        code={`import { Link } from '@eocrm/design-system';

export function Demo() {
  return (
    <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-fg)', margin: 0 }}>
      See the{' '}
      <Link href="#docs" onClick={(e) => e.preventDefault()}>
        documentation
      </Link>{' '}
      for more info, or skip to the{' '}
      <Link href="#examples" variant="muted" onClick={(e) => e.preventDefault()}>
        examples
      </Link>
      .
    </p>
  );
}`}
      >
        <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-fg)', margin: 0 }}>
          See the{' '}
          <Link href="#docs" onClick={(e) => e.preventDefault()}>
            documentation
          </Link>{' '}
          for more info, or skip to the{' '}
          <Link href="#examples" variant="muted" onClick={(e) => e.preventDefault()}>
            examples
          </Link>
          .
        </p>
      </Example>

      <Example
        title="Cluster of links"
        description="Multiple links lay out via Cluster — no special grouping primitive needed."
        code={`import { Cluster, Link } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="md">
      <Link href="#home" onClick={(e) => e.preventDefault()}>
        Home
      </Link>
      <Link href="#features" onClick={(e) => e.preventDefault()}>
        Features
      </Link>
      <Link href="#pricing" onClick={(e) => e.preventDefault()}>
        Pricing
      </Link>
    </Cluster>
  );
}`}
      >
        <Cluster gap="md">
          <Link href="#home" onClick={(e) => e.preventDefault()}>
            Home
          </Link>
          <Link href="#features" onClick={(e) => e.preventDefault()}>
            Features
          </Link>
          <Link href="#pricing" onClick={(e) => e.preventDefault()}>
            Pricing
          </Link>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
