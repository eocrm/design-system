import { useState, type KeyboardEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Mail } from 'lucide-react';
import {
  Alert,
  BrandIcon,
  Button,
  Card,
  Checkbox,
  Cluster,
  Constrain,
  Divider,
  Input,
  Link,
  Logo,
  PasswordInput,
  Screen,
  Stack,
  Text,
  Title,
} from '@eocrm/design-system';

// Loose client-side shape check only — real validation is server-side.
const EMAIL_RE = /.+@.+\..+/;

export function Login() {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function continueToPassword() {
    const nextEmailError = EMAIL_RE.test(email) ? null : 'Enter a valid email address.';
    setEmailError(nextEmailError);
    if (nextEmailError) return;
    setStep('password');
  }

  // Back to step 1 — keep the typed email, drop the password attempt.
  function changeEmail() {
    setStep('email');
    setPassword('');
    setPasswordError(null);
    setFormError(null);
  }

  function signIn() {
    const nextPasswordError =
      password.length >= 6 ? null : 'Password must be at least 6 characters.';
    setPasswordError(nextPasswordError);
    if (nextPasswordError) return;
    // No backend in a mockup — simulate an auth failure so the error Alert
    // (the "error-state demo") is always reachable for stakeholders.
    setFormError('Invalid email or password.');
  }

  function onEmailKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') continueToPassword();
  }
  function onPasswordKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') signIn();
  }

  return (
    <Screen
      backdrop="accent"
      header={
        <Cluster justify="start">
          <Link as={RouterLink} to="/mockups" variant="muted">
            ← Back to mockups
          </Link>
        </Cluster>
      }
      footer={
        <Cluster justify="center" gap="lg">
          <Link href="/legal/privacy" variant="muted">
            Privacy
          </Link>
          <Link href="/legal/terms" variant="muted">
            Terms
          </Link>
          <Link href="/status" variant="muted">
            Status
          </Link>
        </Cluster>
      }
    >
      <Stack gap="lg" align="center">
        <Logo text="eocrm" size="lg" />

        <Constrain width="md">
          <Card padding="lg">
            <Stack gap="lg">
              <Stack gap="xs">
                <Title order={1} size="lg">
                  Sign in
                </Title>
                <Text size="sm" tone="muted">
                  {step === 'email'
                    ? 'Welcome back. Enter your email to continue to your workspace.'
                    : 'Enter your password to continue.'}
                </Text>
              </Stack>

              {step === 'email' ? (
                <>
                  <Button variant="secondary">
                    <BrandIcon name="google" size={16} />
                    Continue with Google
                  </Button>

                  <Divider>OR</Divider>

                  <Stack gap="xs">
                    <Text as="label" htmlFor="login-email" weight="medium" size="sm">
                      Email
                    </Text>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      onKeyDown={onEmailKeyDown}
                      invalid={!!emailError}
                      aria-describedby={emailError ? 'login-email-error' : undefined}
                    />
                    {emailError && (
                      <Text id="login-email-error" size="sm" tone="danger">
                        {emailError}
                      </Text>
                    )}
                  </Stack>

                  <Button variant="primary" onClick={continueToPassword}>
                    Continue
                  </Button>
                </>
              ) : (
                <>
                  <Card padding="sm">
                    <Cluster align="center" wrap={false} gap="sm">
                      <Mail size={16} />
                      <Constrain flex="grow">
                        <Text size="sm" truncate>
                          {email}
                        </Text>
                      </Constrain>
                      <Link as="button" type="button" variant="default" onClick={changeEmail}>
                        Change
                      </Link>
                    </Cluster>
                  </Card>

                  {formError && (
                    <Alert tone="error" title="Couldn't sign you in">
                      {formError}
                    </Alert>
                  )}

                  <Stack gap="xs">
                    <Cluster justify="between" align="baseline">
                      <Text as="label" htmlFor="login-password" weight="medium" size="sm">
                        Password
                      </Text>
                      <Link href="/forgot-password" variant="default">
                        Forgot?
                      </Link>
                    </Cluster>
                    <PasswordInput
                      id="login-password"
                      autoComplete="current-password"
                      capsLockWarning
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                        if (formError) setFormError(null);
                      }}
                      onKeyDown={onPasswordKeyDown}
                      invalid={!!passwordError}
                      aria-describedby={passwordError ? 'login-password-error' : undefined}
                    />
                    {passwordError && (
                      <Text id="login-password-error" size="sm" tone="danger">
                        {passwordError}
                      </Text>
                    )}
                  </Stack>

                  <Checkbox label="Keep me signed in" defaultChecked />

                  <Button variant="primary" onClick={signIn}>
                    Sign in
                  </Button>
                </>
              )}
            </Stack>
          </Card>
        </Constrain>
      </Stack>
    </Screen>
  );
}
