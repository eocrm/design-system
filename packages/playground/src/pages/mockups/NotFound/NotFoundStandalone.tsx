import { useNavigate, Link as RouterLink } from 'react-router';
import { Button, Cluster, ErrorState, Link, Screen, Stack, Text } from '@eocrm/design-system';
import { Compass } from 'lucide-react';

export function NotFoundStandalone() {
  const navigate = useNavigate();
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
        <ErrorState
          tone="neutral"
          icon={<Compass size={48} aria-hidden="true" />}
          title="Page not found"
          description="The page you're looking for doesn't exist or has been moved."
          actions={
            <Cluster gap="sm" justify="center">
              <Button onClick={() => navigate('/mockups')}>Go to homepage</Button>
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Go back
              </Button>
            </Cluster>
          }
        />
      </Stack>
    </Screen>
  );
}
