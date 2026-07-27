import { useNavigate, Link as RouterLink } from 'react-router';
import { Button, Cluster, ErrorState, Link, Screen } from '@eocrm/design-system';
import { Compass } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <Screen
      fill="block"
      footer={
        <Cluster justify="center">
          <Link as={RouterLink} to="/mockups/404-standalone" variant="muted">
            View as standalone page →
          </Link>
        </Cluster>
      }
    >
      <ErrorState
        tone="neutral"
        icon={<Compass size={48} aria-hidden="true" />}
        title="Page not found"
        description="We couldn't find that page. It may have been moved or deleted."
        actions={
          <Cluster gap="sm" justify="center">
            <Button onClick={() => navigate('/mockups/dashboard')}>Back to dashboard</Button>
            <Button variant="secondary" onClick={() => navigate('/mockups/contacts')}>
              Search
            </Button>
          </Cluster>
        }
      />
    </Screen>
  );
}
