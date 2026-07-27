import { Button, Cluster, ErrorState, Link, Screen, Stack, Text } from '@eocrm/design-system';
import { Compass, TriangleAlert } from 'lucide-react';
import { Link as RouterLink } from 'react-router';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function ScreenDemo() {
  return (
    <DemoLayout
      name="Screen"
      componentName="Screen"
      description="Full-bleed / centered screen layout for chromeless pages — auth, 404, error, onboarding. Header + centered main + footer, with an optional tinted backdrop."
      files={getComponentFiles('Screen')}
    >
      <Example
        title="Block fill, accent backdrop"
        description={`fill="block" fills its container (not the viewport) so it's safe to embed here. backdrop="accent" paints the soft accent wash used by the login screen.`}
        code={`import { Compass } from 'lucide-react';
import { Button, ErrorState, Screen } from '@eocrm/design-system';

export function Demo() {
  return (
    <Screen fill="block" backdrop="accent">
      <ErrorState
        icon={<Compass size={48} aria-hidden="true" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        actions={<Button>Go to homepage</Button>}
      />
    </Screen>
  );
}`}
      >
        <Screen fill="block" backdrop="accent">
          <ErrorState
            icon={<Compass size={48} aria-hidden="true" />}
            title="Page not found"
            description="The page you're looking for doesn't exist or has been moved."
            actions={<Button>Go to homepage</Button>}
          />
        </Screen>
      </Example>

      <Example
        title="Danger backdrop + header / footer slots"
        description="Header is pinned top, footer pinned bottom, main centered between."
        code={`import { TriangleAlert } from 'lucide-react';
import { Button, Cluster, ErrorState, Link, Screen, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Screen
      fill="block"
      backdrop="danger"
      header={
        <Cluster justify="start">
          <Text as="span" weight="bold">eocrm</Text>
        </Cluster>
      }
      footer={
        <Cluster justify="center" gap="lg">
          <Link href="#" variant="muted">Privacy</Link>
          <Link href="#" variant="muted">Status</Link>
        </Cluster>
      }
    >
      <ErrorState
        tone="danger"
        icon={<TriangleAlert size={48} aria-hidden="true" />}
        title="Something went wrong"
        description="An unexpected error occurred."
        actions={<Button>Reload</Button>}
        extra={<Text size="sm" tone="muted">Error ID: a1b2-c3d4</Text>}
      />
    </Screen>
  );
}`}
      >
        <Screen
          fill="block"
          backdrop="danger"
          header={
            <Cluster justify="start">
              <Text as="span" weight="bold">
                eocrm
              </Text>
            </Cluster>
          }
          footer={
            <Cluster justify="center" gap="lg">
              <Link href="#" variant="muted">
                Privacy
              </Link>
              <Link href="#" variant="muted">
                Status
              </Link>
            </Cluster>
          }
        >
          <ErrorState
            tone="danger"
            icon={<TriangleAlert size={48} aria-hidden="true" />}
            title="Something went wrong"
            description="An unexpected error occurred."
            actions={<Button>Reload</Button>}
            extra={
              <Text size="sm" tone="muted">
                Error ID: a1b2-c3d4
              </Text>
            }
          />
        </Screen>
      </Example>

      <Example
        title="Live full-viewport screens"
        description={`fill="viewport" (the default) takes over the whole window — see it in the mockups.`}
        code={`import { Link as RouterLink } from 'react-router';
import { Link, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <Link as={RouterLink} to="/mockups/404-standalone" variant="default">
        404 — standalone page →
      </Link>
      <Link as={RouterLink} to="/mockups/error-standalone" variant="default">
        Error — standalone page →
      </Link>
      <Link as={RouterLink} to="/mockups/login" variant="default">
        Login →
      </Link>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Link as={RouterLink} to="/mockups/404-standalone" variant="default">
            404 — standalone page →
          </Link>
          <Link as={RouterLink} to="/mockups/error-standalone" variant="default">
            Error — standalone page →
          </Link>
          <Link as={RouterLink} to="/mockups/login" variant="default">
            Login →
          </Link>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
