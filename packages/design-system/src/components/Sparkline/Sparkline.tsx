import { forwardRef, useLayoutEffect, useMemo, useState, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { useLocale, useTranslation } from '../../i18n';
import { mergeRefs } from '../_internal/refs';
import {
  layoutSparkline,
  summarize,
  SPARKLINE_DOT_RADIUS,
  type SparklineType,
} from './sparklineModel';
import styles from './Sparkline.module.scss';

export type { SparklineType };

export interface SparklineProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What the series is, e.g. "Contacts per day". Starts the accessible name. */
  label: string;
  /** Values oldest → newest. `null` (or a non-finite number) = no data for that slot: a gap in a line/area, no bar. */
  values: readonly (number | null)[];
  /**
   * Mark type. Default `'line'`.
   * - `'line'` — smoothed line with a dot on the latest value. Trends of a rate or level.
   * - `'area'` — the line over a filled area anchored at zero. Volumes / counts over time.
   * - `'bar'` — one bar per value. Discrete per-period counts (daily signups).
   */
  type?: SparklineType;
  /** Formats numbers in the accessible summary. Default: `Intl.NumberFormat` for the current locale. */
  formatValue?: (n: number) => string;
}

function useSize() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setSize((prev) =>
        prev.width === Math.floor(width) && prev.height === Math.floor(height)
          ? prev
          : { width: Math.floor(width), height: Math.floor(height) },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, size] as const;
}

/**
 * Compact, static, axis-free trend graphic (line / area / bar) for KPI cards.
 * @see docs/components/Sparkline.md
 */
// {...rest} FIRST (Pattern B) so role="img" and the summary name always win.
export const Sparkline = forwardRef<HTMLDivElement, SparklineProps>(function Sparkline(
  { label, values, type = 'line', formatValue, className, ...rest },
  ref,
) {
  const t = useTranslation();
  const locale = useLocale();
  const [setMeasureEl, { width, height }] = useSize();
  const rootRef = useMemo(() => mergeRefs<HTMLDivElement>(ref, setMeasureEl), [ref, setMeasureEl]);

  const format = useMemo(
    () => formatValue ?? ((n: number) => new Intl.NumberFormat(locale).format(n)),
    [formatValue, locale],
  );
  const summary = summarize(values);
  const name = summary
    ? t('sparkline.summary', {
        label,
        first: format(summary.first),
        last: format(summary.last),
        min: format(summary.min),
        max: format(summary.max),
      })
    : t('sparkline.noData', { label });

  const geometry = useMemo(
    () => layoutSparkline(values, type, width, height),
    [values, type, width, height],
  );

  return (
    <div
      {...rest}
      ref={rootRef}
      className={clsx(styles.root, className)}
      role="img"
      aria-label={name}
    >
      <svg
        className={styles.svg}
        width={width}
        height={height}
        aria-hidden="true"
        focusable="false"
      >
        {geometry?.area && <path className={styles.area} d={geometry.area} />}
        {geometry?.line && <path className={styles.line} d={geometry.line} />}
        {geometry?.bars?.map((b, i) => (
          <rect key={i} className={styles.bar} x={b.x} y={b.y} width={b.width} height={b.height} />
        ))}
        {geometry?.dot && (
          <circle
            className={styles.dot}
            cx={geometry.dot.cx}
            cy={geometry.dot.cy}
            r={SPARKLINE_DOT_RADIUS}
          />
        )}
      </svg>
    </div>
  );
});
