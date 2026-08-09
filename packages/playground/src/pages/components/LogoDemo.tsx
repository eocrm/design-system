import { Cluster, Logo } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';
import eocrmLogo from '../../assets/eocrm-logo.svg';

export function LogoDemo() {
  return (
    <DemoLayout
      name="Logo"
      componentName="Logo"
      description="Brand logo lockup — a consumer-supplied mark image (src) with an optional wordmark beside it or below, plus an optional muted subline. The design system arranges the lockup; the mark asset is the consumer's."
      files={getComponentFiles('Logo')}
    >
      <Example
        title="Mark + wordmark"
        description="The common header / auth lockup — pass the mark via src and the wordmark via text."
        code={`import logo from '../assets/eocrm-logo.svg';
import { Logo } from '@eocrm/design-system';

export function Demo() {
  return <Logo src={logo} text="eocrm" />;
}`}
      >
        <Logo src={eocrmLogo} text="eocrm" />
      </Example>

      <Example
        title="Mark only"
        description="Omit text for just the mark. Pass label for a standalone accessible name (the image alt)."
        code={`import logo from '../assets/eocrm-logo.svg';
import { Logo } from '@eocrm/design-system';

export function Demo() {
  return <Logo src={logo} label="eocrm" />;
}`}
      >
        <Logo src={eocrmLogo} label="eocrm" />
      </Example>

      <Example
        title="Wordmark below the mark"
        description="textPlacement='bottom' stacks the wordmark under the mark, centered."
        code={`import logo from '../assets/eocrm-logo.svg';
import { Logo } from '@eocrm/design-system';

export function Demo() {
  return <Logo src={logo} text="eocrm" textPlacement="bottom" />;
}`}
      >
        <Logo src={eocrmLogo} text="eocrm" textPlacement="bottom" />
      </Example>

      <Example
        title="With a muted subline"
        description="subtext adds a small muted line under the wordmark — a name + plan lockup. A wordmark with descenders keeps its tails clear of the subline at every size, on either trim edge."
        code={`import logo from '../assets/eocrm-logo.svg';
import { Cluster, Logo } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="2xl" align="center">
      <Logo src={logo} text="eocrm" subtext="Free trial" size="sm" />
      <Logo src={logo} text="paygo" subtext="Free trial" size="lg" />
      <Logo src={logo} text="Lockbox" subtext="Free trial" size="lg" />
    </Cluster>
  );
}`}
      >
        <Cluster gap="2xl" align="center">
          <Logo src={eocrmLogo} text="eocrm" subtext="Free trial" size="sm" />
          <Logo src={eocrmLogo} text="paygo" subtext="Free trial" size="lg" />
          <Logo src={eocrmLogo} text="Lockbox" subtext="Free trial" size="lg" />
        </Cluster>
      </Example>

      <Example
        title="Optical alignment"
        description="The wordmark is trimmed to its x-height edge when every glyph tops out at x-height (eocrm), and to its cap edge otherwise — a capital, an ascender (b d f h k l t), a dotted i/j, a digit, or a non-Latin script. Nothing to configure; all three sit on the same optical centre against the mark despite using different trim edges."
        code={`import logo from '../assets/eocrm-logo.svg';
import { Cluster, Logo } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="2xl" align="center">
      {/* x-height edge — every glyph tops out at x-height */}
      <Logo src={logo} text="eocrm" size="lg" />
      {/* cap edge — the b/k ascenders */}
      <Logo src={logo} text="lockbox" size="lg" />
      {/* cap edge — a digit, with no ascender letter to confound it */}
      <Logo src={logo} text="nexus7" size="lg" />
    </Cluster>
  );
}`}
      >
        <Cluster gap="2xl" align="center">
          <Logo src={eocrmLogo} text="eocrm" size="lg" />
          <Logo src={eocrmLogo} text="lockbox" size="lg" />
          <Logo src={eocrmLogo} text="nexus7" size="lg" />
        </Cluster>
      </Example>

      <Example
        title="Sizes"
        description="sm (24) / md (32, default) / lg (40)."
        code={`import logo from '../assets/eocrm-logo.svg';
import { Cluster, Logo } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="lg" align="center">
      <Logo src={logo} text="eocrm" size="sm" />
      <Logo src={logo} text="eocrm" size="md" />
      <Logo src={logo} text="eocrm" size="lg" />
    </Cluster>
  );
}`}
      >
        <Cluster gap="lg" align="center">
          <Logo src={eocrmLogo} text="eocrm" size="sm" />
          <Logo src={eocrmLogo} text="eocrm" size="md" />
          <Logo src={eocrmLogo} text="eocrm" size="lg" />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
