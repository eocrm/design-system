import { useState } from 'react';
import { MoreHorizontal, Plus, Filter } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Cluster,
  Code,
  DropdownMenu,
  Kanban,
  Page,
  PageHeader,
  Stack,
  Text,
  Title,
  type KanbanMoveEvent,
} from '@eocrm/design-system';
import { dealStages, deals, type Deal, type DealStage } from '../../../data/mock';
import { CrossLinks } from '../../shared/CrossLinks';

const stageTone: Record<DealStage, 'neutral' | 'info' | 'warning' | 'success'> = {
  lead: 'neutral',
  qualified: 'info',
  proposal: 'warning',
  won: 'success',
};

function groupByStage(dealList: Deal[]): Record<DealStage, Deal[]> {
  return {
    lead: dealList.filter((d) => d.stage === 'lead'),
    qualified: dealList.filter((d) => d.stage === 'qualified'),
    proposal: dealList.filter((d) => d.stage === 'proposal'),
    won: dealList.filter((d) => d.stage === 'won'),
  };
}

export function Deals() {
  const [dealsByStage, setDealsByStage] = useState<Record<DealStage, Deal[]>>(groupByStage(deals));

  function handleMove(event: KanbanMoveEvent) {
    const { from, to, cardId } = event;
    setDealsByStage((curr) => {
      const fromCol = from.columnId as DealStage;
      const toCol = to.columnId as DealStage;
      const next: Record<DealStage, Deal[]> = {
        lead: [...curr.lead],
        qualified: [...curr.qualified],
        proposal: [...curr.proposal],
        won: [...curr.won],
      };
      const sourceArr = next[fromCol];
      const idx = sourceArr.findIndex((d) => d.id === cardId);
      if (idx < 0) return curr;
      const [moved] = sourceArr.splice(idx, 1);
      const movedWithStage = { ...moved, stage: toCol };
      const targetArr = fromCol === toCol ? sourceArr : next[toCol];
      const insertAt = Math.min(to.index, targetArr.length);
      targetArr.splice(insertAt, 0, movedWithStage);
      return next;
    });
  }

  const totalDeals = Object.values(dealsByStage).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Page>
      <PageHeader>
        <PageHeader.Title>Deals</PageHeader.Title>
        <PageHeader.Subtitle>{totalDeals} active deals across 4 stages</PageHeader.Subtitle>
        <PageHeader.Actions>
          <Cluster gap="sm">
            <Button variant="secondary">
              <Filter size={14} /> Filter
            </Button>
            <Button>
              <Plus size={14} /> New deal
            </Button>
          </Cluster>
        </PageHeader.Actions>
      </PageHeader>

      <Kanban onMove={handleMove}>
        {dealStages.map((stage) => {
          const stageDeals = dealsByStage[stage.id];
          const total = stageDeals.reduce((sum, d) => sum + d.amount, 0);
          return (
            <Kanban.Column key={stage.id} id={stage.id}>
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

              {stageDeals.map((d) => (
                <Kanban.Card key={d.id} id={d.id}>
                  <Card padding="md">
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
                </Kanban.Card>
              ))}

              <Button variant="ghost" size="sm">
                <Plus size={14} /> Add deal
              </Button>
            </Kanban.Column>
          );
        })}
      </Kanban>

      <CrossLinks kind="mockup" slug="deals" />
    </Page>
  );
}

export type { DealStage };
