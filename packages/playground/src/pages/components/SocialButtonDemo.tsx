import { SocialButton, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function SocialButtonDemo() {
  return (
    <DemoLayout
      name="SocialButton"
      componentName="SocialButton"
      description="A provider sign-in button — a secondary Button with the provider's brand mark (BrandIcon) and a label. The common SSO row."
      files={getComponentFiles('SocialButton')}
    >
      <Example
        title="Providers"
        description="provider picks the brand mark; label is the (consumer-supplied) text. Width comes from the parent."
        code={`import { SocialButton, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <SocialButton provider="google" label="Continue with Google" />
      <SocialButton provider="yandex" label="Continue with Yandex" />
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <SocialButton provider="google" label="Continue with Google" />
          <SocialButton provider="yandex" label="Continue with Yandex" />
        </Stack>
      </Example>

      <Example
        title="Disabled"
        description="Spreads Button props (disabled, onClick, size, …)."
        code={`import { SocialButton } from '@eocrm/design-system';

export function Demo() {
  return <SocialButton provider="google" label="Continue with Google" disabled />;
}`}
      >
        <SocialButton provider="google" label="Continue with Google" disabled />
      </Example>
    </DemoLayout>
  );
}
