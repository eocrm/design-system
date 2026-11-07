import {
  Fragment,
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { EmptyState } from '../EmptyState';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { useTranslation } from '../../i18n/useTranslation';
import { useSize } from '../_internal/useSize';
import { ChartTooltip } from '../Chart/ChartTooltip';
import { bucketOf, computeHeatmapLayout, heatmapBuckets, heatmapLegend } from './heatmapModel';
import styles from './Heatmap.module.scss';

export interface HeatmapProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Accessible name of the figure and caption of its data table, e.g. "Meals by hour". Required. */
  label: string;
  /** Row labels, top to bottom, e.g. weekdays. Drawn left of the grid and heading the data-table rows. Required. */
  rows: string[];
  /** Column labels, left to right, e.g. hours. Drawn under the grid (thinned to fit) and heading the data-table columns. Required. */
  columns: string[];
  /**
   * Cell values as `values[row][col]`. `null` (or a missing / non-finite value) is "no data": a neutral outlined
   * cell, never the lowest colour step. Values fall into up to five colour buckets with nice boundaries; integer data
   * spanning five or fewer integers gets one bucket per integer.
   */
  values: (number | null)[][];
  /** Formats a value for the legend, tooltip, announcement and data table, e.g. `n => \`${n} g\``. Required. */
  formatValue: (n: number) => string;
  /** EmptyState title when no cell has a value. Default: translated "No data for this period". */
  emptyMessage?: ReactNode;
  /** Short note under the grid; takes its own row, also describes the grid for screen readers and stays in the empty state. */
  footnote?: ReactNode;
}

/** Fallback for `--heatmap-gap` (`--border-width-emphasis`) where computed styles don't resolve (jsdom). */
const GAP = 2;

// ponytail: read once per plot element; a theme that changes the token at runtime needs a remount.
function readPx(el: Element | null, name: string, fallback: number) {
  if (!el) return fallback;
  const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

type Cell = { row: number; col: number };

const swatch = (step: number | null) =>
  ({
    '--heatmap-swatch': step === null ? 'var(--heatmap-empty)' : `var(--heatmap-step-${step})`,
  }) as CSSProperties;

/**
 * Grid of rows × columns coloured by value in up to five sequential steps.
 * @see docs/components/Heatmap.md
 */
// {...rest} FIRST (Pattern B) so the figure's role and accessible name always win.
export const Heatmap = forwardRef<HTMLElement, HeatmapProps>(function Heatmap(
  { label, rows, columns, values, formatValue, emptyMessage, footnote, className, ...rest },
  ref,
) {
  const t = useTranslation();
  const valueAt = (row: number, col: number): number | null => {
    const v = values[row]?.[col];
    return v !== null && v !== undefined && Number.isFinite(v) ? v : null;
  };
  // Only the rows × columns grid is drawn, so only it sets the buckets.
  const buckets = useMemo(
    () =>
      heatmapBuckets(
        values.slice(0, rows.length).map((r) => r.slice(0, columns.length)),
        formatValue,
      ),
    [values, rows.length, columns.length, formatValue],
  );
  const hasNull = rows.some((_, r) => columns.some((_, c) => valueAt(r, c) === null));
  const legend = buckets ? heatmapLegend(buckets, formatValue) : null;
  const stepOf = (v: number | null) =>
    v === null || !buckets ? null : buckets.steps[bucketOf(v, buckets)];
  const textOf = (v: number | null) => (v === null ? t('heatmap.noData') : formatValue(v));

  const hintId = useId();
  const footnoteId = useId();
  const hasFootnote = footnote != null && footnote !== false && footnote !== '';
  const footnoteEl = hasFootnote && (
    <div id={footnoteId} className={styles.footnote}>
      {footnote}
    </div>
  );

  const [setPlotEl, size, plotEl] = useSize<HTMLDivElement>();
  const gap = useMemo(() => readPx(plotEl, '--heatmap-gap', GAP), [plotEl]);
  const layout = useMemo(
    () =>
      buckets && size.width > 0 ? computeHeatmapLayout({ rows, columns, width: size.width }) : null,
    [buckets, rows, columns, size.width],
  );

  const [active, setActive] = useState<Cell | null>(null);
  const [activeSource, setActiveSource] = useState<'pointer' | 'keyboard' | null>(null);
  // New data can shrink the grid under the inspected cell: treat it as nothing inspected.
  const current = active && active.row < rows.length && active.col < columns.length ? active : null;

  const inspect = (next: Cell | null, source: 'pointer' | 'keyboard' | null) => {
    setActive(next);
    setActiveSource(next === null ? null : source);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const lastRow = rows.length - 1;
    const lastCol = columns.length - 1;
    if (lastRow < 0 || lastCol < 0) return;
    const at = current ?? { row: 0, col: 0 };
    const clampCol = (c: number) => Math.max(0, Math.min(lastCol, c));
    const clampRow = (r: number) => Math.max(0, Math.min(lastRow, r));
    let next: Cell | null;
    // The first key press lands on the top-left cell (or the corner / row end it asks for).
    switch (e.key) {
      case 'ArrowRight':
        next = current ? { row: at.row, col: clampCol(at.col + 1) } : at;
        break;
      case 'ArrowLeft':
        next = current ? { row: at.row, col: clampCol(at.col - 1) } : at;
        break;
      case 'ArrowDown':
        next = current ? { row: clampRow(at.row + 1), col: at.col } : at;
        break;
      case 'ArrowUp':
        next = current ? { row: clampRow(at.row - 1), col: at.col } : at;
        break;
      case 'Home':
        next = e.ctrlKey || e.metaKey ? { row: 0, col: 0 } : { row: at.row, col: 0 };
        break;
      case 'End':
        next =
          e.ctrlKey || e.metaKey ? { row: lastRow, col: lastCol } : { row: at.row, col: lastCol };
        break;
      case 'Escape':
        if (!current) return; // let a surrounding dialog close
        next = null;
        break;
      default:
        return;
    }
    e.preventDefault();
    inspect(next, 'keyboard');
  };

  // A tap leaves the tooltip open (touch fires pointerleave right after pointerup, which we ignore);
  // dismiss it on the next press outside the grid, as Chart does.
  const pointerActive = activeSource === 'pointer' && current !== null;
  useEffect(() => {
    if (!pointerActive || !plotEl) return;
    const dismiss = (e: Event) => {
      if (e.composedPath().includes(plotEl)) return;
      setActive(null);
      setActiveSource(null);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [pointerActive, plotEl]);

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!layout) return;
    const r = e.currentTarget.getBoundingClientRect();
    const hit = layout.cellAt(e.clientX - r.left, e.clientY - r.top);
    if (hit) inspect(hit, 'pointer');
    // A miss clears a pointer inspection (and any press in the grid), but a hover never steals the keyboard's.
    else if (e.type === 'pointerdown' || activeSource === 'pointer') inspect(null, null);
  };

  const anchorX =
    current && layout ? layout.plot.x + (current.col + 0.5) * layout.cellWidth : undefined;
  const anchorY = current && layout ? layout.plot.y + current.row * layout.cellHeight : undefined;
  const point = useMemo(
    () => (anchorX === undefined || anchorY === undefined ? null : { x: anchorX, y: anchorY }),
    [anchorX, anchorY],
  );

  const currentValue = current ? valueAt(current.row, current.col) : null;
  const currentName = current ? `${rows[current.row]}, ${columns[current.col]}` : '';
  const liveText =
    activeSource === 'keyboard' && current ? `${currentName}: ${textOf(currentValue)}` : '';

  if (!buckets) {
    return (
      <figure
        {...rest}
        ref={ref}
        role="figure"
        aria-label={label}
        aria-labelledby={undefined}
        data-empty=""
        className={clsx(styles.root, className)}
      >
        <EmptyState title={emptyMessage || t('chart.empty')} size="sm" />
        {footnoteEl}
      </figure>
    );
  }

  const inset = gap / 2;
  return (
    <figure
      {...rest}
      ref={ref}
      role="figure"
      aria-label={label}
      aria-labelledby={undefined}
      className={clsx(styles.root, className)}
    >
      <ul className={styles.legend} data-heatmap-legend="">
        {legend?.kind === 'ranges' &&
          legend.items.map((entry) => (
            <li key={entry.step} className={styles.legendItem} data-heatmap-legend-item="">
              <span className={styles.swatch} style={swatch(entry.step)} aria-hidden="true" />
              {entry.text}
            </li>
          ))}
        {/* Stepped bar: each boundary value printed once, between the swatches it separates. */}
        {legend?.kind === 'scale' && (
          <li className={styles.legendItem} data-heatmap-scale="">
            <span data-heatmap-boundary="">{legend.boundaries[0]}</span>
            {legend.steps.map((step, i) => (
              <Fragment key={step}>
                <span className={styles.swatch} style={swatch(step)} aria-hidden="true" />
                <span data-heatmap-boundary="">{legend.boundaries[i + 1]}</span>
              </Fragment>
            ))}
          </li>
        )}
        {hasNull && (
          <li className={styles.legendItem} data-heatmap-legend-item="">
            <span
              className={clsx(styles.swatch, styles.swatchEmpty)}
              style={swatch(null)}
              aria-hidden="true"
            />
            {t('heatmap.noData')}
          </li>
        )}
      </ul>
      <VisuallyHidden id={hintId}>{t('heatmap.keyboardHint')}</VisuallyHidden>
      <div
        ref={setPlotEl}
        className={styles.plot}
        role="group"
        aria-label={label}
        aria-describedby={hasFootnote ? `${hintId} ${footnoteId}` : hintId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        // Touch fires pointerleave right after pointerup; keep the tapped tooltip (an outside press clears it).
        onPointerLeave={(e) =>
          e.pointerType !== 'touch' && activeSource === 'pointer' && inspect(null, null)
        }
        onBlur={() => inspect(null, null)}
      >
        {layout && (
          <svg
            className={styles.svg}
            width={size.width}
            height={layout.height}
            aria-hidden="true"
            focusable="false"
          >
            <g className={styles.axis}>
              {layout.rowLabels.map((l) => (
                <text key={l.index} x={l.x} y={l.y} dy="0.32em" textAnchor="end">
                  {rows[l.index]}
                </text>
              ))}
              {layout.columnLabels.map((l) => (
                <text key={l.index} x={l.x} y={l.y} textAnchor="middle">
                  {columns[l.index]}
                </text>
              ))}
            </g>
            {rows.map((_, r) =>
              columns.map((_, c) => {
                const step = stepOf(valueAt(r, c));
                return (
                  <rect
                    key={`${r}:${c}`}
                    className={step === null ? styles.empty : styles.cell}
                    style={step === null ? undefined : swatch(step)}
                    x={layout.plot.x + c * layout.cellWidth + inset}
                    y={layout.plot.y + r * layout.cellHeight + inset}
                    width={Math.max(0, layout.cellWidth - gap)}
                    height={Math.max(0, layout.cellHeight - gap)}
                    data-heatmap-cell=""
                    data-row={r}
                    data-col={c}
                    data-step={step ?? undefined}
                  />
                );
              }),
            )}
            {current && (
              <rect
                className={styles.active}
                x={layout.plot.x + current.col * layout.cellWidth + inset}
                y={layout.plot.y + current.row * layout.cellHeight + inset}
                width={Math.max(0, layout.cellWidth - gap)}
                height={Math.max(0, layout.cellHeight - gap)}
              />
            )}
          </svg>
        )}
      </div>
      {footnoteEl}
      <ChartTooltip
        anchor={plotEl}
        point={point}
        title={currentName}
        rows={
          current
            ? [
                {
                  key: 'value',
                  label,
                  slot: 0,
                  comparison: false,
                  value: textOf(currentValue),
                  color: `var(--heatmap-${currentValue === null ? 'empty' : `step-${stepOf(currentValue)}`})`,
                },
              ]
            : []
        }
        notes={[]}
      />
      <LiveRegion>{liveText}</LiveRegion>
      <VisuallyHidden as="div">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <td />
              {columns.map((c, i) => (
                <th key={i} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rowLabel, r) => (
              <tr key={r}>
                <th scope="row">{rowLabel}</th>
                {columns.map((_, c) => (
                  <td key={c}>{textOf(valueAt(r, c))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </VisuallyHidden>
    </figure>
  );
});
