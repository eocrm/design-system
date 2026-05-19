import { MoreHorizontal, Plus, Filter } from 'lucide-react';
import { Avatar } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { dealStages, deals, type DealStage } from '../../../data/mock';
import styles from './Deals.module.scss';
import { CrossLinks } from '../../shared/CrossLinks';

export function Deals() {
  return (
    <Stack gap="lg">
      <Cluster justify="between" align="end" gap="md">
        <div>
          <h1 className={styles.title}>Deals</h1>
          <p className={styles.subtitle}>{deals.length} active deals across 4 stages</p>
        </div>
        <Cluster gap="sm">
          <Button variant="secondary">
            <Filter size={14} /> Filter
          </Button>
          <Button>
            <Plus size={14} /> New deal
          </Button>
        </Cluster>
      </Cluster>

      <div className={styles.board}>
        {dealStages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.id);
          const total = stageDeals.reduce((sum, d) => sum + d.amount, 0);
          return (
            <section key={stage.id} className={styles.column}>
              <header className={styles.columnHeader}>
                <Cluster gap="sm" align="center">
                  <span
                    className={`${styles.stageDot} ${styles[`stage-${stage.id}`]}`}
                    aria-hidden
                  />
                  <span className={styles.columnTitle}>{stage.label}</span>
                  <span className={styles.columnCount}>{stageDeals.length}</span>
                </Cluster>
                <span className={styles.columnTotal}>${total.toLocaleString()}</span>
              </header>

              <Stack gap="sm" className={styles.columnList}>
                {stageDeals.map((d) => (
                  <article key={d.id} className={styles.dealCard}>
                    <Cluster justify="between" align="start" gap="sm" wrap={false}>
                      <span className={styles.dealId}>{d.id}</span>
                      <button type="button" aria-label="More" className={styles.cardActionBtn}>
                        <MoreHorizontal size={14} />
                      </button>
                    </Cluster>
                    <h3 className={styles.dealTitle}>{d.title}</h3>
                    <span className={styles.dealCompany}>{d.company}</span>
                    {d.tags.length > 0 && (
                      <Cluster gap="xs">
                        {d.tags.map((t) => (
                          <Badge key={t.label} tone={t.tone}>
                            {t.label}
                          </Badge>
                        ))}
                      </Cluster>
                    )}
                    <footer className={styles.dealFooter}>
                      <span className={styles.dealAmount}>${d.amount.toLocaleString()}</span>
                      <Avatar name={d.owner} size="sm" />
                    </footer>
                  </article>
                ))}
                <button type="button" className={styles.addCardBtn}>
                  <Plus size={14} /> Add deal
                </button>
              </Stack>
            </section>
          );
        })}
      </div>

      <CrossLinks kind="mockup" slug="deals" />
    </Stack>
  );
}

export type { DealStage };
