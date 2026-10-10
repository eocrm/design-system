import type { CSSProperties } from 'react';
import { VisuallyHidden } from '../VisuallyHidden';
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
  maxItems,
  onToggle,
  onHoverKey,
  onFocusKey,
}: {
  items: ChartLegendItem[];
  hidden: readonly string[];
  maxItems: number;
  onToggle: (key: string) => void;
  onHoverKey: (key: string | null) => void;
  onFocusKey: (key: string | null) => void;
}) {
  const shown = items.slice(0, maxItems);
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
