import { useLayoutEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import styles from './Chart.module.scss';

export interface ChartTooltipRow {
  key: string;
  label: string;
  slot: number;
  comparison: boolean;
  value: string;
}

const swatchStyle = (slot: number) =>
  ({
    '--chart-series-color':
      slot === 0 ? 'var(--chart-total-comparison)' : `var(--chart-series-${slot})`,
  }) as CSSProperties;

/**
 * Internal: values at the active category. Portalled because DashboardWidget clips its body.
 * aria-hidden: screen readers get the same text from Chart's live line and the data table.
 * `point` must be referentially stable between renders with the same x/y.
 */
export function ChartTooltip({
  point,
  title,
  rows,
}: {
  point: { x: number; y: number } | null;
  title: string;
  rows: ChartTooltipRow[];
}) {
  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    transform: false,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  useLayoutEffect(() => {
    if (!point) return;
    const { x, y } = point;
    refs.setReference({
      getBoundingClientRect: () =>
        ({ x, y, left: x, right: x, top: y, bottom: y, width: 0, height: 0 }) as DOMRect,
    });
  }, [point, refs]);

  if (!point) return null;
  return createPortal(
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className={styles.tooltip}
      aria-hidden="true"
      data-chart-tooltip=""
    >
      <div className={styles.tooltipTitle}>{title}</div>
      {rows.map((r) => (
        <div key={r.key} className={styles.tooltipRow} data-nested={r.comparison || undefined}>
          <span
            className={styles.swatch}
            style={swatchStyle(r.slot)}
            data-comparison={r.comparison || undefined}
          />
          <span className={styles.tooltipLabel}>{r.label}</span>
          <span className={styles.tooltipValue}>{r.value}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
