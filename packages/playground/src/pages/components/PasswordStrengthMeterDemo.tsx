import { useState } from 'react';
import {
  I18nProvider,
  PasswordInput,
  PasswordStrengthMeter,
  Stack,
  type PasswordStrengthScore,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

function LiveWithInputDemo() {
  const [pw, setPw] = useState('');
  return (
    <Stack gap="xs">
      <PasswordInput
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Type a password"
        aria-describedby="live-demo-meter"
      />
      <PasswordStrengthMeter id="live-demo-meter" value={pw} />
    </Stack>
  );
}

function ScoreSliderDemo() {
  const [score, setScore] = useState<PasswordStrengthScore>(0);
  return (
    <Stack gap="sm">
      <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
        Score: {score}
        <input
          type="range"
          min={0}
          max={4}
          value={score}
          onChange={(e) => setScore(Number(e.target.value) as PasswordStrengthScore)}
          style={{ display: 'block', width: '100%', marginTop: 'var(--space-1)' }}
        />
      </label>
      <PasswordStrengthMeter score={score} />
    </Stack>
  );
}

export function PasswordStrengthMeterDemo() {
  return (
    <DemoLayout
      name="PasswordStrengthMeter"
      componentName="PasswordStrengthMeter"
      description="4-segment password-strength visualization. The default heuristic (length + character classes) is suitable for prototypes — pass `score` from zxcvbn or server-side scoring for production."
      files={getComponentFiles('PasswordStrengthMeter')}
    >
      <Example
        title="Live with PasswordInput"
        description="The canonical signup pattern — shared controlled state between a PasswordInput and the meter. Associate them with `aria-describedby` so screen readers announce the score."
        code={`const [pw, setPw] = useState('');
<PasswordInput
  value={pw}
  onChange={(e) => setPw(e.target.value)}
  aria-describedby="strength-meter"
/>
<PasswordStrengthMeter id="strength-meter" value={pw} />`}
      >
        <InputExample>
          <LiveWithInputDemo />
        </InputExample>
      </Example>

      <Example
        title="Standalone with score prop"
        description="Pass a pre-computed `score` (0–4) when scoring is done externally (zxcvbn, server-side). The `score` prop wins over `value` when both are present."
        code={`// score comes from zxcvbn(pw).score or similar
<PasswordStrengthMeter score={score} />`}
      >
        <InputExample>
          <ScoreSliderDemo />
        </InputExample>
      </Example>

      <Example
        title="No label"
        description="`showLabel={false}` renders segments only — useful when space is very tight or you're showing the label text elsewhere."
        code={`<PasswordStrengthMeter value="Hunter2!@#" showLabel={false} />`}
      >
        <InputExample>
          <PasswordStrengthMeter value="Hunter2!@#" showLabel={false} />
        </InputExample>
      </Example>

      <Example
        title="Localized labels (ru-RU)"
        description="Wrap in <I18nProvider locale='ru'> to swap the labels. The default Russian translations come from the library; consumers may further override individual keys via `overrides`."
        code={`<I18nProvider locale="ru">
  <PasswordStrengthMeter value="Hunter2!@#" />
</I18nProvider>`}
      >
        <InputExample>
          <I18nProvider locale="ru">
            <Stack gap="sm">
              <PasswordStrengthMeter value="" />
              <PasswordStrengthMeter value="abc" />
              <PasswordStrengthMeter value="AbcDef12" />
              <PasswordStrengthMeter value="Hunter2!@#" />
            </Stack>
          </I18nProvider>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
