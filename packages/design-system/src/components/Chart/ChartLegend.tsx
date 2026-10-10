import type { CSSProperties } from 'react';
import { VisuallyHidden } from '../VisuallyHidden';
import { fitLegend } from './chartModel';
import styles from './Chart.module.scss';

export interface ChartLegendItem {
  key: string;
  label: string;
  slot: number;
  comparison: boolean;
  overflow: boolean;
  /** Last visible primary series: can't be hidden. */
  locked: boolean;
  parentLabel?: string;
  parentHidden: boolean;
}

const swatchStyle = (slot: number) =>
  ({
    '--chart-series-color':
      slot === 0 ? 'var(--chart-total-comparison)' : `var(--chart-series-${slot})`,
  }) as CSSProperties;

/** Internal: legend toggles. Label text stays in text ink; the swatch carries identity. */
export function ChartLegend({
  items,
  hidden,
  fitWidth,
  onToggle,
  onHoverKey,
  onFocusKey,
}: {
  items: ChartLegendItem[];
  hidden: readonly string[];
  /** Compact mode: the row width the legend must fit on one line. Omit to show every item. */
  fitWidth?: number;
  onToggle: (key: string) => void;
  onHoverKey: (key: string | null) => void;
  onFocusKey: (key: string | null) => void;
}) {
  // Items the user hid always render (so they can be re-shown); visible ones fill what fits, in source order.
  const forced = (i: ChartLegendItem) => hidden.includes(i.key);
  const optional = items.filter((i) => !forced(i));
  const pick = (k: number) => {
    let room = k;
    return items.filter((i) => forced(i) || room-- > 0);
  };
  let k = optional.length;
  if (fitWidth !== undefined) {
    // Largest k whose row (plus the "+N" counter when something is left out) fits.
    for (; k > 0; k--) {
      const labels = pick(k).map((i) => i.label);
      if (k < optional.length) labels.push('+99');
      if (fitLegend(labels, fitWidth) >= labels.length) break;
    }
    if (k === 0 && !items.some(forced)) k = Math.min(1, optional.length);
  }
  const shown = pick(k);
  const more = items.length - shown.length;
  return (
    <ul className={styles.legend}>
      {shown.map((item) => {
        const on = !hidden.includes(item.key) && !item.parentHidden;
        return (
          <li key={item.key} className={styles.legendEntry}>
            <button
              type="button"
              className={styles.legendItem}
              aria-pressed={on}
              aria-disabled={item.locked || undefined}
              disabled={item.parentHidden}
              style={swatchStyle(item.slot)}
              onClick={() => onToggle(item.key)}
              // Pointer events, not mouse: touch emulates mouseenter but never mouseleave, which stuck the dimming.
              onPointerEnter={(e) => e.pointerType !== 'touch' && onHoverKey(item.key)}
              onPointerLeave={(e) => e.pointerType !== 'touch' && onHoverKey(null)}
              onFocus={() => onFocusKey(item.key)}
              onBlur={() => onFocusKey(null)}
            >
              <span
                className={styles.swatch}
                data-comparison={item.comparison || undefined}
                data-overflow={item.overflow || undefined}
                aria-hidden="true"
              />
              {item.label}
              {item.parentLabel && <VisuallyHidden>, {item.parentLabel}</VisuallyHidden>}
            </button>
          </li>
        );
      })}
      {more > 0 && (
        <li className={styles.legendMore} aria-hidden="true">
          +{more}
        </li>
      )}
    </ul>
  );
}
