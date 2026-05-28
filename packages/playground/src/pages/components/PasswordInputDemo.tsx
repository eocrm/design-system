import { useState } from 'react';
import {
  Button,
  I18nProvider,
  PasswordInput,
  PasswordStrengthMeter,
  Stack,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

function ControlledDemo() {
  const [revealed, setRevealed] = useState(false);
  return (
    <Stack gap="xs">
      <PasswordInput
        revealed={revealed}
        onRevealChange={setRevealed}
        defaultValue="hunter2"
        aria-label="Password"
      />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        revealed = {String(revealed)}
      </code>
    </Stack>
  );
}

function FormDemo() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setSubmitted(fd.get('password') ? '(received — not shown)' : '(empty)');
      }}
    >
      <Stack gap="sm">
        <PasswordInput
          name="password"
          required
          placeholder="Enter password"
          aria-label="Password"
          capsLockWarning
        />
        <Button type="submit" size="sm">
          Submit
        </Button>
        {submitted !== null && (
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            password = {submitted}
          </code>
        )}
      </Stack>
    </form>
  );
}

function StrengthDemo() {
  const [pw, setPw] = useState('');
  return (
    <Stack gap="xs">
      <PasswordInput
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        capsLockWarning
        wrongLayoutWarning
        placeholder="Create password"
        aria-describedby="strength-demo-meter"
      />
      <PasswordStrengthMeter id="strength-demo-meter" value={pw} />
    </Stack>
  );
}

export function PasswordInputDemo() {
  return (
    <DemoLayout
      name="PasswordInput"
      componentName="PasswordInput"
      description="Password text field with an eye toggle that reveals/hides the value. Optional caps-lock and wrong-keyboard-layout warnings. Pair with <PasswordStrengthMeter> for signup forms."
      files={getComponentFiles('PasswordInput')}
    >
      <Example
        title="Default"
        description="Uncontrolled, with a placeholder. The eye-toggle button reveals/hides the value."
        code={`<PasswordInput placeholder="Password" />`}
      >
        <InputExample>
          <PasswordInput placeholder="Password" />
        </InputExample>
      </Example>

      <Example
        title="Sizes"
        description="Three sizes — sm / md (default) / lg. Same scale as <Input>."
        code={`<PasswordInput size="sm" placeholder="Small" />
<PasswordInput size="md" placeholder="Medium" />
<PasswordInput size="lg" placeholder="Large" />`}
      >
        <InputExample>
          <Stack gap="sm">
            <PasswordInput size="sm" placeholder="Small" aria-label="Small password" />
            <PasswordInput size="md" placeholder="Medium" aria-label="Medium password" />
            <PasswordInput size="lg" placeholder="Large" aria-label="Large password" />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="Provide `revealed` + `onRevealChange` to control the toggle externally. The handler receives the next boolean."
        code={`const [revealed, setRevealed] = useState(false);
<PasswordInput
  revealed={revealed}
  onRevealChange={setRevealed}
  defaultValue="hunter2"
/>`}
      >
        <InputExample>
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="No toggle"
        description="Set `revealable={false}` to hide the eye button — for compliance or kiosk screens where revealing the password is forbidden."
        code={`<PasswordInput revealable={false} placeholder="No toggle" />`}
      >
        <InputExample>
          <PasswordInput revealable={false} placeholder="No toggle" />
        </InputExample>
      </Example>

      <Example
        title="Caps-lock warning"
        description="Opt in with `capsLockWarning`. When Caps Lock is active a warning icon appears and a polite aria-live region announces it. Cleared on blur."
        code={`<PasswordInput capsLockWarning placeholder="Try with Caps Lock on" />`}
      >
        <InputExample>
          <PasswordInput capsLockWarning placeholder="Try with Caps Lock on" />
        </InputExample>
      </Example>

      <Example
        title="Wrong-layout warning"
        description="Opt in with `wrongLayoutWarning`. Detects non-ASCII keystrokes (e.g. Cyrillic from a Russian layout) and shows a warning icon + live region. Only enable when the system expects Latin-only passwords."
        code={`<PasswordInput wrongLayoutWarning placeholder="Try typing while on a non-Latin keyboard" />`}
      >
        <InputExample>
          <PasswordInput
            wrongLayoutWarning
            placeholder="Try typing while on a non-Latin keyboard"
          />
        </InputExample>
      </Example>

      <Example
        title="Both warnings"
        description="Both warnings can be active at the same time — one icon per active warning."
        code={`<PasswordInput capsLockWarning wrongLayoutWarning placeholder="Password" />`}
      >
        <InputExample>
          <PasswordInput capsLockWarning wrongLayoutWarning placeholder="Password" />
        </InputExample>
      </Example>

      <Example
        title="Disabled"
        description="The native `disabled` attribute is forwarded — click is blocked, the eye toggle is also disabled, and the field mutes."
        code={`<PasswordInput disabled defaultValue="locked" />`}
      >
        <InputExample>
          <PasswordInput disabled defaultValue="locked" />
        </InputExample>
      </Example>

      <Example
        title="Invalid"
        description="`invalid` adds the danger border + sets `aria-invalid='true'`. Pair with a visible error message and `aria-describedby`."
        code={`<PasswordInput invalid aria-describedby="pw-error" placeholder="Password" />
<p id="pw-error">Password is required.</p>`}
      >
        <InputExample>
          <Stack gap="xs">
            <PasswordInput invalid aria-describedby="pw-error-demo" placeholder="Password" />
            <p
              id="pw-error-demo"
              style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}
            >
              Password is required.
            </p>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Localized labels (ru-RU)"
        description="Wrap in <I18nProvider locale='ru'> to translate all aria-labels and live-region strings."
        code={`<I18nProvider locale="ru">
  <PasswordInput capsLockWarning wrongLayoutWarning placeholder="Пароль" />
</I18nProvider>`}
      >
        <InputExample>
          <I18nProvider locale="ru">
            <PasswordInput capsLockWarning wrongLayoutWarning placeholder="Пароль" />
          </I18nProvider>
        </InputExample>
      </Example>

      <Example
        title="Form integration"
        description="`name` + `required` round-trip through native FormData. The capsLockWarning is active so login-form users get a hint if they're about to fail."
        code={`<form onSubmit={(e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  console.log(fd.get('password'));
}}>
  <PasswordInput name="password" required capsLockWarning placeholder="Enter password" />
  <button type="submit">Submit</button>
</form>`}
      >
        <InputExample>
          <FormDemo />
        </InputExample>
      </Example>

      <Example
        title="With strength meter (composition)"
        description="Pair with <PasswordStrengthMeter> using shared controlled state and `aria-describedby` for the accessible association."
        code={`const [pw, setPw] = useState('');
<PasswordInput
  value={pw}
  onChange={(e) => setPw(e.target.value)}
  capsLockWarning
  wrongLayoutWarning
  aria-describedby="strength-meter"
/>
<PasswordStrengthMeter id="strength-meter" value={pw} />`}
      >
        <InputExample>
          <StrengthDemo />
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
