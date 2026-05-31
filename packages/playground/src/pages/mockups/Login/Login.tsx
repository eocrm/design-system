import { useState, type KeyboardEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  BrandIcon,
  Button,
  Card,
  Checkbox,
  Cluster,
  Divider,
  Input,
  Link,
  PasswordInput,
  Screen,
  Stack,
  Text,
  Title,
} from '@eocrm/design-system';

// Loose client-side shape check only — real validation is server-side.
const EMAIL_RE = /.+@.+\..+/;

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function submit() {
    const nextEmailError = EMAIL_RE.test(email) ? null : 'Enter a valid email address.';
    const nextPasswordError =
      password.length >= 6 ? null : 'Password must be at least 6 characters.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      setFormError(null);
      return;
    }
    // No backend in a mockup — simulate an auth failure so the error Alert
    // (the "error-state demo") is always reachable for stakeholders.
    setFormError('Invalid email or password.');
  }

  function onEnter(e: KeyboardEvent) {
    if (e.key === 'Enter') submit();
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
        <Text as="span" size="xl" weight="bold">
          eocrm
        </Text>

        <Card padding="lg">
          <Stack gap="lg">
            <Stack gap="xs">
              <Title order={1} size="lg">
                Sign in
              </Title>
              <Text size="sm" tone="muted">
                Welcome back. Enter your email to continue to your workspace.
              </Text>
            </Stack>

            <Button variant="secondary">
              <BrandIcon name="google" size={16} />
              Continue with Google
            </Button>

            <Divider>OR</Divider>

            {formError && (
              <Alert tone="error" title="Couldn't sign you in">
                {formError}
              </Alert>
            )}

            <Stack gap="md">
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
                    if (formError) setFormError(null);
                  }}
                  onKeyDown={onEnter}
                  invalid={!!emailError}
                  aria-describedby={emailError ? 'login-email-error' : undefined}
                />
                {emailError && (
                  <Text id="login-email-error" size="sm" tone="danger">
                    {emailError}
                  </Text>
                )}
              </Stack>

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
                  placeholder="••••••••"
                  capsLockWarning
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    if (formError) setFormError(null);
                  }}
                  onKeyDown={onEnter}
                  invalid={!!passwordError}
                  aria-describedby={passwordError ? 'login-password-error' : undefined}
                />
                {passwordError && (
                  <Text id="login-password-error" size="sm" tone="danger">
                    {passwordError}
                  </Text>
                )}
              </Stack>
            </Stack>

            <Checkbox label="Keep me signed in" defaultChecked />

            <Button variant="primary" onClick={submit}>
              Sign in
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Screen>
  );
}
