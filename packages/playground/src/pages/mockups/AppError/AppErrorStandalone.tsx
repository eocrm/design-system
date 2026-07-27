import { useNavigate, Link as RouterLink } from 'react-router';
import { Button, Cluster, ErrorState, Link, Screen, Stack, Text } from '@eocrm/design-system';
import { TriangleAlert } from 'lucide-react';

export function AppErrorStandalone() {
  const navigate = useNavigate();
  return (
    <Screen
      backdrop="danger"
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
        <ErrorState
          tone="danger"
          // Standalone full-page error: opt out of ErrorState's danger-tone
          // role="alert" so a screen reader doesn't announce the whole screen
          // assertively on load (per ErrorState's a11y guidance). The in-app
          // boundary variant keeps role="alert" — it mounts on a live error.
          role={undefined}
          icon={<TriangleAlert size={48} aria-hidden="true" />}
          title="Something went wrong"
          description="The app hit an unexpected error. Reloading usually fixes it."
          actions={
            <Cluster gap="sm" justify="center">
              <Button onClick={() => navigate(0)}>Reload</Button>
              <Button variant="secondary" onClick={() => navigate('/mockups')}>
                Go to homepage
              </Button>
            </Cluster>
          }
          extra={
            <Text size="sm" tone="muted">
              Error ID: a1b2-c3d4
            </Text>
          }
        />
      </Stack>
    </Screen>
  );
}
