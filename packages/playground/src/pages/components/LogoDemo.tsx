import { Cluster, Logo } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function LogoDemo() {
  return (
    <DemoLayout
      name="Logo"
      componentName="Logo"
      description="The eocrm brand logo — the layered-hex mark, optionally with the eocrm wordmark beside it or below. Single-color inline SVG that inherits --logo-color (the brand accent); override that variable to recolor."
      files={getComponentFiles('Logo')}
    >
      <Example
        title="Mark + wordmark"
        description="The common header / auth lockup — text='eocrm' renders the wordmark beside the mark."
        code={`<Logo text="eocrm" />`}
      >
        <Logo text="eocrm" />
      </Example>

      <Example
        title="Mark only"
        description="Omit text for just the mark. Pass label for a standalone accessible name."
        code={`<Logo label="eocrm" />`}
      >
        <Logo label="eocrm" />
      </Example>

      <Example
        title="Wordmark below the mark"
        description="textPlacement='bottom' stacks the wordmark under the mark, centered."
        code={`<Logo text="eocrm" textPlacement="bottom" />`}
      >
        <Logo text="eocrm" textPlacement="bottom" />
      </Example>

      <Example
        title="With a muted subline"
        description="subtext adds a small muted line under the wordmark — the app-shell brand lockup (name + plan)."
        code={`<Logo text="eocrm" subtext="Free trial" size="sm" />`}
      >
        <Logo text="eocrm" subtext="Free trial" size="sm" />
      </Example>

      <Example
        title="Sizes"
        description="sm (24) / md (32, default) / lg (40)."
        code={`<Logo text="eocrm" size="sm" />
<Logo text="eocrm" size="md" />
<Logo text="eocrm" size="lg" />`}
      >
        <Cluster gap="lg" align="center">
          <Logo text="eocrm" size="sm" />
          <Logo text="eocrm" size="md" />
          <Logo text="eocrm" size="lg" />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
