import { Link } from 'react-router-dom';
import { Badge, Card, Cluster, Code, Grid, Stack, Text, Title } from '@eocrm/design-system';
import { MOCKUPS } from './registry';

export function MockupsIndex() {
  // Skip the parameterised contact-detail entry from the index — it isn't a top-level page.
  const indexMockups = MOCKUPS.filter((m) => !m.path.includes(':'));

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={1}>CRM mockups</Title>
        <Text size="lg" tone="muted">
          Full-page mockups built only from <Code>@eocrm/design-system</Code> primitives. Each page
          links the components it uses, and each component links back to the mockups it appears in.
        </Text>
      </Stack>

      <Grid minColumnWidth="280px" gap="md">
        {indexMockups.map((m) => (
          /* TODO: replace when <NavCard> ships — see components/TODO.md.
             Wrapping Card in a router Link to get nav; the inline style is the
             escape hatch to suppress default <a> underline + color. */
          <Link
            key={m.slug}
            to={m.path}
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            <Card padding="md">
              <Stack gap="sm">
                <Text size="lg" weight="semibold">
                  {m.title}
                </Text>
                <Text size="sm" tone="muted">
                  {m.blurb}
                </Text>
                <Cluster gap="xs">
                  {m.usesComponents.map((name) => (
                    <Badge key={name} tone="info">
                      {name}
                    </Badge>
                  ))}
                </Cluster>
              </Stack>
            </Card>
          </Link>
        ))}
      </Grid>
    </Stack>
  );
}
