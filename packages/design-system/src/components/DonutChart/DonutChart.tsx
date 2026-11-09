import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { EmptyState } from '../EmptyState';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { ChartTooltip } from '../Chart/ChartTooltip';
import { PALETTE_SIZE } from '../Chart/chartModel';
import { useTranslation } from '../../i18n/useTranslation';
import { useLocale } from '../../i18n/useLocale';
import { useSize } from '../_internal/useSize';
import { donutArcPath, donutRadii, resolveDonut, type DonutSegment } from './donutModel';
import styles from './DonutChart.module.scss';

export type { DonutSegment } from './donutModel';

export interface DonutChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Accessible name of the figure and caption of its data table, e.g. "Work items by stage". Required. */
  label: string;
  /**
   * Segments of the whole, drawn clockwise from 12 o'clock in array order. `color` pins a palette slot
   * (`--chart-series-N`); segments without one fill the free slots in order. Values of 0 are listed in
   * the legend and table but draw no arc; negative or non-finite values count as 0 (dev warning).
   * More than 8 segments repeat colours (dev warning): group the smallest into "Other".
   */
  segments: DonutSegment[];
  /** Formats a value for the centre, legend, tooltip, announcement and data table (the app owns i18n). Required. */
  formatValue: (n: number) => string;
  /** Caption under the total in the centre, e.g. "work items". Default: translated "Total". */
  centerLabel?: string;
  /**
   * Shows the formatted total and `centerLabel` in the centre; hovering or focusing a segment swaps
   * them for its value, share and label. `false` leaves the centre empty. Default `true`.
   */
  showTotal?: boolean;
  /**
   * Makes every non-zero segment activatable (arc click, Enter or Space on the focused ring, and a
   * legend button), called with the consumer's original segment, e.g. to open a filtered list. Omit
   * for an inspect-only donut with a plain-text legend.
   */
  onSegmentClick?: (segment: DonutSegment) => void;
  /** EmptyState title when there are no segments or every value is 0. Default: translated "No data". */
  emptyMessage?: ReactNode;
  /**
   * Short note under the donut, e.g. "Open items only". Takes its own row; also describes the ring
   * for screen readers. Shown in the empty state too.
   */
  footnote?: ReactNode;
}

/** Fallbacks for `--donut-thickness` / `--donut-gap` (`--space-6` / `--space-05`) where computed styles don't resolve (jsdom). */
const THICKNESS = 24;
const GAP = 2;

// ponytail: read once per plot element; a theme that changes these tokens at runtime needs a remount.
function readPx(el: Element | null, name: string, fallback: number) {
  if (!el) return fallback;
  const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const slotStyle = (slot: number) =>
  ({ '--chart-series-color': `var(--chart-series-${slot})` }) as CSSProperties;

type Source = 'pointer' | 'keyboard' | 'focus';

/**
 * Ring of the parts of one whole, with the total in the centre and a legend of values and shares.
 * @see docs/components/DonutChart.md
 */
// {...rest} FIRST (Pattern B) so the figure's role and accessible name always win.
export const DonutChart = forwardRef<HTMLElement, DonutChartProps>(function DonutChart(
  {
    label,
    segments,
    formatValue,
    centerLabel,
    showTotal = true,
    onSegmentClick,
    emptyMessage,
    footnote,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const locale = useLocale();
  const donut = useMemo(() => resolveDonut(segments), [segments]);
  const resolved = donut.segments;
  const empty = donut.total === 0;
  const percent = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }),
    [locale],
  );

  const invalidKey = donut.invalid.join(', ');
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !invalidKey) return;
    console.warn(
      `[DonutChart] Ignored non-finite or negative value for segment(s) ${invalidKey}: counted as 0.`,
    );
  }, [invalidKey]);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !donut.overflow) return;
    console.warn(
      `[DonutChart] More than ${PALETTE_SIZE} segments: colours repeat. Group the smallest into "Other".`,
    );
  }, [donut.overflow]);

  const hintId = useId();
  const footnoteId = useId();
  const hasFootnote = footnote != null && footnote !== false && footnote !== '';
  const footnoteEl = hasFootnote && (
    <div id={footnoteId} className={styles.footnote}>
      {footnote}
    </div>
  );

  const [setPlotEl, size, plotEl] = useSize<HTMLDivElement>();
  const thickness = useMemo(() => readPx(plotEl, '--donut-thickness', THICKNESS), [plotEl]);
  const gap = useMemo(() => readPx(plotEl, '--donut-gap', GAP), [plotEl]);
  const side = Math.min(size.width, size.height);
  const { outer, inner } = donutRadii(side, thickness);
  // padAngle * padRadius (d3's default sqrt(inner² + outer²)) is the gap's width in px.
  const padAngle = outer > 0 ? gap / Math.hypot(inner, outer) : 0;

  const [active, setActive] = useState<number | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  // Segments changed under the active index (gone or no longer drawn): drop it during render.
  if (active !== null && !resolved[active]?.drawn) {
    setActive(null);
    setSource(null);
  }
  const current = active !== null && resolved[active]?.drawn ? resolved[active] : null;
  const inspect = (index: number | null, from: Source | null) => {
    setActive(index);
    setSource(index === null ? null : from);
  };
  const clickable = onSegmentClick !== undefined;
  const drawnIdx = resolved.flatMap((s, i) => (s.drawn ? [i] : []));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const pos = active === null ? -1 : drawnIdx.indexOf(active);
    const m = drawnIdx.length;
    let next: number | null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = drawnIdx[(pos + 1) % m];
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = drawnIdx[pos < 0 ? m - 1 : (pos - 1 + m) % m];
        break;
      case 'Home':
        next = drawnIdx[0];
        break;
      case 'End':
        next = drawnIdx[m - 1];
        break;
      case 'Enter':
      case ' ':
        if (!current || !onSegmentClick) return;
        e.preventDefault();
        onSegmentClick(current.segment);
        return;
      case 'Escape':
        if (active === null) return; // let a surrounding dialog close
        next = null;
        break;
      default:
        return;
    }
    e.preventDefault();
    inspect(next, 'keyboard');
  };

  // A tap leaves the tooltip open (touch fires pointerleave right after pointerup); dismiss it on
  // the next press outside the ring, as Chart does.
  const pointerActive = source === 'pointer' && active !== null;
  useEffect(() => {
    if (!pointerActive || !plotEl) return;
    const dismiss = (e: Event) => {
      if (e.composedPath().includes(plotEl)) return;
      setActive(null);
      setSource(null);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [pointerActive, plotEl]);

  const pct = (share: number) => percent.format(share);
  const summary = (i: number) =>
    `${resolved[i].segment.label}: ${formatValue(resolved[i].value)}, ${pct(resolved[i].share)}`;

  // Tooltip at the outer edge of the active arc's middle, plot-local (the ring is centred in the plot).
  const mid = current ? (current.start + current.end) / 2 : 0;
  const pointX = current ? size.width / 2 + outer * Math.sin(mid) : undefined;
  const pointY = current ? size.height / 2 - outer * Math.cos(mid) : undefined;
  const point = useMemo(
    () => (pointX === undefined || pointY === undefined ? null : { x: pointX, y: pointY }),
    [pointX, pointY],
  );

  if (empty) {
    return (
      <figure
        {...rest}
        ref={ref}
        role="figure"
        aria-label={label}
        aria-labelledby={undefined}
        data-empty=""
        data-footnote={hasFootnote || undefined}
        className={clsx(styles.root, className)}
      >
        <EmptyState title={emptyMessage || t('donutChart.empty')} size="sm" />
        {footnoteEl}
      </figure>
    );
  }

  const centerValue = formatValue(current ? current.value : donut.total);
  const liveText = source === 'keyboard' && active !== null && current ? summary(active) : '';

  return (
    <figure
      {...rest}
      ref={ref}
      role="figure"
      aria-label={label}
      aria-labelledby={undefined}
      data-footnote={hasFootnote || undefined}
      className={clsx(styles.root, className)}
    >
      <VisuallyHidden id={hintId}>{t('donutChart.keyboardHint')}</VisuallyHidden>
      <div className={styles.body}>
        <div
          ref={setPlotEl}
          className={styles.plot}
          role="group"
          aria-label={label}
          aria-describedby={[hintId, hasFootnote && footnoteId].filter(Boolean).join(' ')}
          tabIndex={0}
          data-clickable={clickable || undefined}
          onKeyDown={onKeyDown}
          onBlur={() => source === 'keyboard' && inspect(null, null)}
          // Touch fires pointerleave right after pointerup; keep the tapped tooltip (an outside press clears it).
          onPointerLeave={(e) =>
            e.pointerType !== 'touch' && source === 'pointer' && inspect(null, null)
          }
        >
          {outer > 0 && (
            <svg
              className={styles.svg}
              width={side}
              height={side}
              viewBox={`${-outer} ${-outer} ${side} ${side}`}
              aria-hidden="true"
              focusable="false"
              data-inspecting={current ? '' : undefined}
            >
              {resolved.map(
                (s, i) =>
                  s.drawn && (
                    <path
                      key={s.segment.key}
                      className={styles.arc}
                      style={slotStyle(s.slot)}
                      d={donutArcPath(s.start, s.end, outer, inner, padAngle)}
                      data-segment={s.segment.key}
                      data-slot={s.slot}
                      data-active={active === i ? '' : undefined}
                      onPointerEnter={() => inspect(i, 'pointer')}
                      onPointerDown={() => inspect(i, 'pointer')}
                      onClick={onSegmentClick && (() => onSegmentClick(s.segment))}
                    />
                  ),
              )}
              {showTotal && (
                // ponytail: no fit check; a long label can overrun a small ring's hole. Measure with getBBox if it bites.
                <g data-center="">
                  <text
                    className={styles.centerValue}
                    y={0}
                    dy={current ? '-0.6em' : '-0.25em'}
                    data-center-value=""
                  >
                    {centerValue}
                  </text>
                  <text className={styles.centerCaption} y={0} data-center-caption="">
                    {current ? (
                      <>
                        <tspan x={0} dy="0.9em">
                          {pct(current.share)}
                        </tspan>
                        <tspan x={0} dy="1.3em">
                          {current.segment.label}
                        </tspan>
                      </>
                    ) : (
                      <tspan x={0} dy="1.1em">
                        {centerLabel || t('donutChart.total')}
                      </tspan>
                    )}
                  </text>
                </g>
              )}
            </svg>
          )}
        </div>
        <ul className={styles.legend}>
          {resolved.map((s, i) => {
            const content = (
              <>
                <span className={styles.swatch} aria-hidden="true" />
                <span className={styles.legendLabel}>{s.segment.label}</span>
                <span className={styles.legendValue}>{formatValue(s.value)}</span>
                <span className={styles.legendShare}>{pct(s.share)}</span>
              </>
            );
            return (
              <li
                key={s.segment.key}
                className={styles.legendEntry}
                data-legend={s.segment.key}
                data-dimmed={current && active !== i ? '' : undefined}
              >
                {onSegmentClick && s.drawn ? (
                  <button
                    type="button"
                    className={styles.legendItem}
                    style={slotStyle(s.slot)}
                    aria-label={summary(i)}
                    onClick={() => onSegmentClick(s.segment)}
                    // Pointer events, not mouse: touch emulates mouseenter but never mouseleave.
                    onPointerEnter={(e) => e.pointerType !== 'touch' && inspect(i, 'pointer')}
                    onPointerLeave={(e) =>
                      e.pointerType !== 'touch' && source === 'pointer' && inspect(null, null)
                    }
                    onFocus={() => inspect(i, 'focus')}
                    onBlur={() => source === 'focus' && inspect(null, null)}
                  >
                    {content}
                  </button>
                ) : (
                  <span className={styles.legendItem} style={slotStyle(s.slot)}>
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {footnoteEl}
      <ChartTooltip
        anchor={plotEl}
        point={point}
        title={current?.segment.label ?? ''}
        rows={
          current
            ? [
                {
                  key: 'value',
                  label: t('donutChart.value'),
                  slot: current.slot,
                  comparison: false,
                  value: formatValue(current.value),
                },
              ]
            : []
        }
        notes={[]}
        details={current ? [`${t('donutChart.share')}: ${pct(current.share)}`] : []}
      />
      <LiveRegion>{liveText}</LiveRegion>
      <VisuallyHidden as="div">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{t('donutChart.segment')}</th>
              <th scope="col">{t('donutChart.value')}</th>
              <th scope="col">{t('donutChart.share')}</th>
            </tr>
          </thead>
          <tbody>
            {resolved.map((s) => (
              <tr key={s.segment.key}>
                <th scope="row">{s.segment.label}</th>
                <td>{formatValue(s.value)}</td>
                <td>{pct(s.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </VisuallyHidden>
    </figure>
  );
});
