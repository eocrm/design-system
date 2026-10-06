import { Fragment } from 'react';
import clsx from 'clsx';
import { Skeleton } from '../Skeleton';
import styles from './WidgetShape.module.scss';

/** Internal: which widget silhouette to draw. `lines` = generic text lines (standard widget loading). */
export type WidgetShapeKind = 'kpi' | 'list' | 'chart' | 'pipeline' | 'activity' | 'lines';
/** Internal: `preview` = static + accent hero (WidgetPreview); `loading` = pulsing, neutral, fills its box. */
export type WidgetShapeMode = 'preview' | 'loading';

// Loading mode repeats rows to fill a tall cell; the root clips the overflow.
const LOADING_ROWS = 12;
// 3 avatar rows fit the 16:10 box down to ~160px wide; dots are smaller so activity fits 4.
const PREVIEW_ROWS: Partial<Record<WidgetShapeKind, number>> = { list: 3 };
const PREVIEW_ROWS_DEFAULT = 4;
const BAR_HEIGHTS = ['40%', '65%', '50%', '85%', '70%', '55%'];
const PIPELINE_CARDS = [3, 2, 1];

/**
 * Internal widget silhouette shared by WidgetPreview (preview) and DashboardWidget (loading).
 * Built only from Skeleton pieces; sizes are relative so it scales with its box.
 */
export function WidgetShape({ kind, mode }: { kind: WidgetShapeKind; mode: WidgetShapeMode }) {
  const preview = mode === 'preview';
  const animation = preview ? 'none' : 'pulse';
  // `hero` marks the accent piece(s) — preview mode only, so a loading
  // skeleton never looks like real data.
  const hero = (on: boolean) => (preview && on ? { 'data-hero': '' } : {});
  const piece = (
    cls: string,
    on = false,
    variant: 'text' | 'circular' | 'rectangular' = 'rectangular',
    strong = false,
  ) => (
    <Skeleton
      variant={variant}
      animation={animation}
      className={clsx(
        styles.piece,
        cls,
        preview && on && styles.hero,
        preview && on && strong && styles.heroStrong,
      )}
      {...hero(on)}
    />
  );
  const rows = preview ? (PREVIEW_ROWS[kind] ?? PREVIEW_ROWS_DEFAULT) : LOADING_ROWS;

  let body;
  switch (kind) {
    case 'kpi':
      body = (
        <div className={styles.kpi}>
          {piece(styles.kpiLabel)}
          {piece(styles.kpiValue, true, 'rectangular', true)}
          {piece(styles.kpiTrend, true)}
        </div>
      );
      break;
    case 'list':
    case 'activity':
      body = (
        <div className={styles.rows}>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className={styles.row}>
              {piece(kind === 'list' ? styles.avatar : styles.dot, true, 'circular', i === 0)}
              {piece(clsx(styles.line, i % 3 === 2 && styles.lineShort))}
            </div>
          ))}
        </div>
      );
      break;
    case 'chart':
      body = (
        <div className={styles.chart}>
          {BAR_HEIGHTS.map((h, i) => (
            <div key={i} className={styles.barSlot}>
              {/* height is data-free decoration, set inline so the bars differ */}
              <Skeleton
                variant="rectangular"
                animation={animation}
                className={clsx(
                  styles.piece,
                  styles.bar,
                  preview && styles.hero,
                  preview && i === 3 && styles.heroStrong,
                )}
                style={{ height: h }}
                {...hero(true)}
              />
            </div>
          ))}
        </div>
      );
      break;
    case 'pipeline':
      body = (
        <div className={styles.pipeline}>
          {PIPELINE_CARDS.map((n, col) => (
            <div key={col} className={styles.column}>
              <Skeleton
                variant="rectangular"
                animation={animation}
                className={clsx(
                  styles.piece,
                  styles.stage,
                  preview && col < 2 && styles.hero,
                  preview && col === 0 && styles.heroStrong,
                )}
                {...hero(col < 2)}
              />
              {Array.from({ length: n }, (_, i) => (
                <Fragment key={i}>{piece(styles.dealCard, col === 0)}</Fragment>
              ))}
            </div>
          ))}
        </div>
      );
      break;
    default: // 'lines'
      body = (
        <div className={styles.rows}>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className={styles.row}>
              {piece(clsx(styles.line, i % 3 === 2 && styles.lineShort), false, 'text')}
            </div>
          ))}
        </div>
      );
  }

  return (
    <div className={styles.root} data-widget-shape={kind} data-mode={mode} aria-hidden="true">
      {body}
    </div>
  );
}
