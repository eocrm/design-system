import { MoreHorizontal, Plus, Filter } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Cluster,
  Code,
  DropdownMenu,
  Grid,
  Stack,
  Text,
  Title,
} from '@eocrm/design-system';
import { dealStages, deals, type DealStage } from '../../../data/mock';
import { CrossLinks } from '../../shared/CrossLinks';

const stageTone: Record<DealStage, 'neutral' | 'info' | 'warning' | 'success'> = {
  lead: 'neutral',
  qualified: 'info',
  proposal: 'warning',
  won: 'success',
};

export function Deals() {
  return (
    <Stack gap="lg">
      <Cluster justify="between" align="end" gap="md">
        <Stack gap="xs">
          <Title order={1}>Deals</Title>
          <Text tone="muted">{deals.length} active deals across 4 stages</Text>
        </Stack>
        <Cluster gap="sm">
          <Button variant="secondary">
            <Filter size={14} /> Filter
          </Button>
          <Button>
            <Plus size={14} /> New deal
          </Button>
        </Cluster>
      </Cluster>

      <Grid columns={4} gap="sm">
        {dealStages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.id);
          const total = stageDeals.reduce((sum, d) => sum + d.amount, 0);
          return (
            /* TODO: replace when <MutedBox> ships — see components/TODO.md.
               Each kanban column needs --color-bg-muted to read as a distinct
               lane against the white page; Card has the wrong default surface. */
            <div
              key={stage.id}
              style={{
                background: 'var(--color-bg-muted)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3)',
                minHeight: '400px',
              }}
            >
              <Stack gap="md">
                <Cluster justify="between" align="center" gap="sm">
                  <Cluster gap="sm" align="center">
                    <Badge tone={stageTone[stage.id]} dot="start" size="sm">
                      {stage.label}
                    </Badge>
                    <Badge tone="neutral" size="sm">
                      {stageDeals.length}
                    </Badge>
                  </Cluster>
                  <Text as="span" size="xs" tone="subtle">
                    ${total.toLocaleString()}
                  </Text>
                </Cluster>

                <Stack gap="sm">
                  {stageDeals.map((d) => (
                    <Card key={d.id} padding="md">
                      <Stack gap="sm">
                        <Cluster justify="between" align="start" gap="sm" wrap={false}>
                          <Code tone="muted">{d.id}</Code>
                          <DropdownMenu>
                            <DropdownMenu.Trigger>
                              <Button variant="ghost" size="sm" iconOnly aria-label="More">
                                <MoreHorizontal size={14} />
                              </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content align="end">
                              <DropdownMenu.Item onSelect={() => {}}>Open</DropdownMenu.Item>
                              <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
                              <DropdownMenu.Sub>
                                <DropdownMenu.SubTrigger>Move to stage</DropdownMenu.SubTrigger>
                                <DropdownMenu.SubContent>
                                  {dealStages
                                    .filter((s) => s.id !== stage.id)
                                    .map((s) => (
                                      <DropdownMenu.Item key={s.id} onSelect={() => {}}>
                                        {s.label}
                                      </DropdownMenu.Item>
                                    ))}
                                </DropdownMenu.SubContent>
                              </DropdownMenu.Sub>
                              <DropdownMenu.Separator />
                              <DropdownMenu.Item onSelect={() => {}} tone="danger">
                                Delete
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu>
                        </Cluster>
                        <Stack gap="xs">
                          <Title order={3} size="md">
                            {d.title}
                          </Title>
                          <Text as="span" size="sm" tone="muted">
                            {d.company}
                          </Text>
                        </Stack>
                        {d.tags.length > 0 && (
                          <Cluster gap="xs">
                            {d.tags.map((t) => (
                              <Badge key={t.label} tone={t.tone}>
                                {t.label}
                              </Badge>
                            ))}
                          </Cluster>
                        )}
                        <Cluster justify="between" align="center" gap="sm">
                          <Text as="span" weight="semibold">
                            ${d.amount.toLocaleString()}
                          </Text>
                          <Avatar name={d.owner} size="sm" />
                        </Cluster>
                      </Stack>
                    </Card>
                  ))}
                  <Button variant="ghost" size="sm">
                    <Plus size={14} /> Add deal
                  </Button>
                </Stack>
              </Stack>
            </div>
          );
        })}
      </Grid>

      <CrossLinks kind="mockup" slug="deals" />
    </Stack>
  );
}

export type { DealStage };
