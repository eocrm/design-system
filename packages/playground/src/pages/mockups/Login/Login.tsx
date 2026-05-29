import { useState, type KeyboardEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Cluster,
  Divider,
  Input,
  Link,
  PasswordInput,
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
    /* TODO: replace when <AuthScreen> ships — see components/TODO.md.
       Full-viewport centered auth layout with a tinted backdrop is page
       chrome no current primitive expresses. Inline style uses tokens only. */
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-6)',
        background:
          'radial-gradient(120% 90% at 50% -8%, var(--color-accent-subtle-bg) 0%, var(--color-bg-subtle) 52%)',
      }}
    >
      <Cluster justify="start">
        <Link as={RouterLink} to="/mockups" variant="muted">
          ← Back to mockups
        </Link>
      </Cluster>

      {/* TODO: replace when <AuthScreen> ships — see components/TODO.md.
          Centers the card in the remaining viewport height (same gap). */}
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
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
                {/* TODO: replace when a brand/social icon set ships — see components/TODO.md.
                    Multi-color Google "G"; not in lucide. Brand hex is intentional. */}
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.5z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.4 28.3c-.5-1.4-.8-3-.8-4.3s.3-2.9.8-4.3l-7.8-6.1C1 16.8 0 20.3 0 24s1 7.2 2.6 10.4l7.8-6.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.8-3.8-13.6-9.1l-7.8 6.1C6.4 42.6 14.6 48 24 48z"
                  />
                </svg>
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
      </div>

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
    </div>
  );
}
