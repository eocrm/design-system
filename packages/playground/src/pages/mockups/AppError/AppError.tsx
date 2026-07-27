import { useNavigate, Link as RouterLink } from 'react-router';
import { Button, Cluster, ErrorState, Link, Screen, Text } from '@eocrm/design-system';
import { TriangleAlert } from 'lucide-react';

export function AppError() {
  const navigate = useNavigate();
  return (
    <Screen
      fill="block"
      footer={
        <Cluster justify="center">
          <Link as={RouterLink} to="/mockups/error-standalone" variant="muted">
            View as standalone page →
          </Link>
        </Cluster>
      }
    >
      <ErrorState
        tone="danger"
        icon={<TriangleAlert size={48} aria-hidden="true" />}
        title="Something went wrong"
        description="An unexpected error occurred. We've logged it and our team is on it."
        actions={
          <Cluster gap="sm" justify="center">
            <Button onClick={() => navigate(0)}>Try again</Button>
            <Button variant="secondary" onClick={() => navigate('/mockups/dashboard')}>
              Back to dashboard
            </Button>
          </Cluster>
        }
        extra={
          <Text size="sm" tone="muted">
            Error ID: a1b2-c3d4
          </Text>
        }
      />
    </Screen>
  );
}
