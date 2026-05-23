import { Link as RouterLink } from 'react-router-dom';
import { Slash } from 'lucide-react';
import { Breadcrumb } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Breadcrumb/Breadcrumb.tsx?raw';
import scssSource from '@lib-source/components/Breadcrumb/Breadcrumb.module.scss?raw';

export function BreadcrumbDemo() {
  return (
    <DemoLayout
      name="Breadcrumb"
      componentName="Breadcrumb"
      description="Compound navigation breadcrumb. Last child auto-marks as the current page. Default separator is a ChevronRight icon."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Breadcrumb.tsx"
      scssFilename="Breadcrumb.module.scss"
    >
      <Example
        title="Basic — auto-current on last child"
        description="No explicit `current` prop needed; the last child becomes `<span aria-current='page'>` automatically."
        code={`<Breadcrumb>
  <Breadcrumb.Item as={RouterLink} to="/mockups">Mockups</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/mockups/contacts">Contacts</Breadcrumb.Item>
  <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>
</Breadcrumb>`}
      >
        <Breadcrumb>
          <Breadcrumb.Item as={RouterLink} to="/mockups">
            Mockups
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/mockups/contacts">
            Contacts
          </Breadcrumb.Item>
          <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>
        </Breadcrumb>
      </Example>

      <Example
        title="Custom separator"
        description="Pass any ReactNode as the separator. The wrapper applies aria-hidden automatically."
        code={`<Breadcrumb separator={<Slash size={12} />}>
  <Breadcrumb.Item as={RouterLink} to="/a">A</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/b">B</Breadcrumb.Item>
  <Breadcrumb.Item>C</Breadcrumb.Item>
</Breadcrumb>`}
      >
        <Breadcrumb separator={<Slash size={12} />}>
          <Breadcrumb.Item as={RouterLink} to="/a">
            A
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/b">
            B
          </Breadcrumb.Item>
          <Breadcrumb.Item>C</Breadcrumb.Item>
        </Breadcrumb>
      </Example>

      <Example
        title="Single crumb"
        description="A single child auto-becomes current (renders as <span>). Useful when programmatically rendering breadcrumbs from a route hierarchy that bottoms out at the root."
        code={`<Breadcrumb>
  <Breadcrumb.Item>Only crumb</Breadcrumb.Item>
</Breadcrumb>`}
      >
        <Breadcrumb>
          <Breadcrumb.Item>Only crumb</Breadcrumb.Item>
        </Breadcrumb>
      </Example>

      <Example
        title="Long trail (5+ items)"
        description="v1 has no truncation. Long trails wrap naturally; pick the separator/font-size that fits your layout."
        code={`<Breadcrumb>
  <Breadcrumb.Item as={RouterLink} to="/a">Workspace</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/b">Mockups</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/c">Contacts</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/d">Acme Corp</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/e">Deals</Breadcrumb.Item>
  <Breadcrumb.Item>Q4 Renewal</Breadcrumb.Item>
</Breadcrumb>`}
      >
        <Breadcrumb>
          <Breadcrumb.Item as={RouterLink} to="/a">
            Workspace
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/b">
            Mockups
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/c">
            Contacts
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/d">
            Acme Corp
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/e">
            Deals
          </Breadcrumb.Item>
          <Breadcrumb.Item>Q4 Renewal</Breadcrumb.Item>
        </Breadcrumb>
      </Example>

      <Example
        title="External crumb (default <a>)"
        description="No `as` prop = native <a> for external URLs."
        code={`<Breadcrumb>
  <Breadcrumb.Item href="https://docs.example.com" target="_blank" rel="noopener noreferrer">Docs</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/getting-started">Getting Started</Breadcrumb.Item>
  <Breadcrumb.Item>This page</Breadcrumb.Item>
</Breadcrumb>`}
      >
        <Breadcrumb>
          <Breadcrumb.Item
            href="https://example.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/mockups">
            Getting Started
          </Breadcrumb.Item>
          <Breadcrumb.Item>This page</Breadcrumb.Item>
        </Breadcrumb>
      </Example>
    </DemoLayout>
  );
}
