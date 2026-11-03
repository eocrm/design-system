import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { EmptyState } from '../EmptyState';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { ChartTooltip } from '../Chart/ChartTooltip';
import { useTranslation } from '../../i18n/useTranslation';
import { useLocale } from '../../i18n/useLocale';
import { mergeRefs } from '../_internal/refs';
import { useSize } from '../_internal/useSize';
import {
  formatPercent,
  isFunnelEmpty,
  MIN_THICKNESS,
  orientationFor,
  resolveStages,
  stageGeometry,
  stageIndexAt,
  type FunnelShape,
  type FunnelStage,
} from './funnelModel';
import styles from './FunnelChart.module.scss';

export type { FunnelShape, FunnelSlot, FunnelStage } from './funnelModel';

export interface FunnelChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Accessible name of the figure and caption of its data table, e.g. "Sales pipeline". Required. */
  label: string;
  /**
   * Stages, top of the funnel first. Heights are relative to the largest value; colour follows position
   * (palette slots 1–8) unless `color` names a slot. More than 8 stages reuse colours, with a dev warning.
   */
  stages: FunnelStage[];
  /** Formats a stage value for the footer, tooltip and data table (the app owns i18n and currency). Required. */
  formatValue: (n: number) => string;
  /**
   * Silhouette between stages. Default `'eased'`.
   * - `'eased'` — each stage holds its height, then curves smoothly into the next one.
   * - `'sharp'` — straight trapezoids from one stage's height to the next.
   */
  shape?: FunnelShape;
  /**
   * Makes every stage a button that calls this with the consumer's original stage object and its index,
   * e.g. to drill through to the deals in that stage. Omit for a read-only funnel.
   */
  onStageClick?: (stage: FunnelStage, index: number) => void;
  /**
   * Called with the hovered or focused stage (the consumer's original object), or `null` when none is
   * active, e.g. so a surrounding headline can follow along.
   */
  onActiveStageChange?: (stage: FunnelStage | null) => void;
  /** EmptyState title when there are no stages or every value is 0. Default: translated "No data for this period". */
  emptyMessage?: ReactNode;
  /**
   * Short note under the funnel, e.g. "Closed deals only". Takes its own row (wraps, never truncates);
   * also describes the plot for screen readers. Shown in the empty state too.
   */
  footnote?: ReactNode;
}

/** Pill box height and text-width estimate (SVG text can't be measured before paint). */
const PILL_HEIGHT = 20;
const PILL_PADDING_X = 8;
// ponytail: per-character width estimate for the pill; measure with getBBox if wide glyphs overflow it.
const PILL_CHAR_WIDTH = 7;

const stageStyle = (slot: number) =>
  ({ '--chart-series-color': `var(--chart-series-${slot})` }) as CSSProperties;

function useDevWarnings(overflowCount: number) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (overflowCount > 0) {
      console.warn(
        `[FunnelChart] ${overflowCount} stages beyond the 8-colour palette reuse colours. Fold the tail into an "Other" stage or set \`color\`.`,
      );
    }
  }, [overflowCount]);
}

/**
 * Stage funnel (pipeline, campaign) showing drop-off by height and step conversion by pill.
 * @see docs/components/FunnelChart.md
 */
// {...rest} FIRST (Pattern B) so the figure's role and accessible name (incl. aria-labelledby) always win.
export const FunnelChart = forwardRef<HTMLElement, FunnelChartProps>(function FunnelChart(
  {
    label,
    stages,
    formatValue,
    shape = 'eased',
    onStageClick,
    onActiveStageChange,
    emptyMessage,
    footnote,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const locale = useLocale();
  const resolved = useMemo(() => resolveStages(stages), [stages]);
  useDevWarnings(resolved.filter((s) => s.overflow).length);
  const empty = isFunnelEmpty(stages);

  const hintId = useId();
  const footnoteId = useId();
  const hasFootnote = footnote != null && footnote !== false && footnote !== '';
  const footnoteEl = hasFootnote && (
    <div id={footnoteId} className={styles.footnote}>
      {footnote}
    </div>
  );

  const [plotEl, setPlotEl] = useState<HTMLDivElement | null>(null);
  const [setShapesEl, size, shapesEl] = useSize<HTMLDivElement>();
  const [setRootEl, rootSize] = useSize<HTMLElement>();
  const figureRef = useMemo(
    () => mergeRefs(ref, (el: HTMLElement | null) => setRootEl(el)),
    [ref, setRootEl],
  );
  const n = resolved.length;
  // Unmeasured (first paint, SSR): assume horizontal rather than flash the narrow layout.
  const orientation = rootSize.width > 0 ? orientationFor(rootSize.width, n) : 'horizontal';
  const vertical = orientation === 'vertical';

  const geometry = useMemo(
    () =>
      !empty && !vertical && size.width > 0 && size.height > 0
        ? stageGeometry({ stages: resolved, width: size.width, height: size.height, shape })
        : null,
    [empty, vertical, resolved, size.width, size.height, shape],
  );

  const [active, setActive] = useState<number | null>(null);
  // 'focus' = a stage button has focus; its accessible name already says what the live region would.
  const [activeSource, setActiveSource] = useState<'pointer' | 'keyboard' | 'focus' | null>(null);
  const current = active !== null && active < n ? active : null;
  const clickable = onStageClick !== undefined;

  // Fire once per change of the active stage's key (not on mount, not for a new-but-equal stages array).
  const activeKey = current === null ? null : resolved[current].key;
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (activeKey === lastKey.current) return;
    lastKey.current = activeKey;
    onActiveStageChange?.(current === null ? null : stages[current]);
  });

  const inspect = (index: number | null, source: 'pointer' | 'keyboard' | 'focus' | null) => {
    setActive(index);
    setActiveSource(index === null ? null : source);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Clickable: buttons are the tab stops and own their keys; only Escape (dismiss tooltip) applies.
    if (clickable && e.key !== 'Escape') return;
    let next: number | null;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        // Horizontal: leave Up/Down to page scrolling.
        if (!vertical) return;
        next =
          e.key === 'ArrowDown'
            ? current === null
              ? 0
              : Math.min(n - 1, current + 1)
            : current === null
              ? n - 1
              : Math.max(0, current - 1);
        break;
      case 'ArrowRight':
        next = current === null ? 0 : Math.min(n - 1, current + 1);
        break;
      case 'ArrowLeft':
        next = current === null ? n - 1 : Math.max(0, current - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = n - 1;
        break;
      case 'Escape':
        if (current === null) return; // let a surrounding dialog close
        next = null;
        break;
      default:
        return;
    }
    e.preventDefault();
    inspect(next, 'keyboard');
  };

  // A tap leaves the tooltip open (touch fires pointerleave right after pointerup, which we
  // ignore); dismiss it on the next press outside the plot, as Chart does.
  const pointerActive = activeSource === 'pointer' && current !== null;
  useEffect(() => {
    if (!pointerActive || !plotEl) return;
    const dismiss = (e: Event) => {
      // composedPath, not target: inside a shadow root the target is retargeted to the host.
      if (e.composedPath().includes(plotEl)) return;
      setActive(null);
      setActiveSource(null);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [pointerActive, plotEl]);

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!geometry || !shapesEl) return;
    const rect = shapesEl.getBoundingClientRect();
    inspect(stageIndexAt(size.width, n, e.clientX - rect.left), 'pointer');
  };

  const onStripClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onStageClick || !shapesEl) return;
    const rect = shapesEl.getBoundingClientRect();
    const i = stageIndexAt(size.width, n, e.clientX - rect.left);
    if (i !== null) onStageClick(stages[i], i);
  };

  // Moving focus between stage buttons must not clear (and re-fire onActiveStageChange) in between.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!(e.relatedTarget instanceof Node && plotEl?.contains(e.relatedTarget)))
      inspect(null, null);
  };

  const pct = (ratio: number | null) =>
    ratio === null ? t('funnelChart.noData') : formatPercent(ratio, locale);
  const ofStage = (ratio: number | null, i: number) =>
    t('funnelChart.ofStage', { percent: pct(ratio), stage: resolved[i].label });
  const notesFor = (i: number) =>
    i === 0
      ? [ofStage(resolved[0].shareRatio, 0)]
      : [ofStage(resolved[i].stepRatio, i - 1), ofStage(resolved[i].shareRatio, 0)];
  // Button name: like the notes, but undefined ratios are left out rather than read as "—".
  const buttonName = (i: number) => {
    const s = resolved[i];
    const parts = [`${s.label}: ${formatValue(s.value)}`];
    if (i > 0 && s.stepRatio !== null) parts.push(ofStage(s.stepRatio, i - 1));
    if (s.shareRatio !== null) parts.push(ofStage(s.shareRatio, 0));
    return `${parts.join('. ')}.`;
  };

  // One cell per stage (horizontal: footer column; vertical: a row with its band); a button when
  // clickable. Spans, not divs, since the cell may be a <button>.
  const renderCell = (s: (typeof resolved)[number], i: number) => {
    const content = vertical ? (
      <>
        <span className={styles.bandTrack}>
          <span
            className={styles.band}
            data-band=""
            style={{ inlineSize: `${s.heightRatio * 100}%` }}
          />
        </span>
        <span className={styles.line}>
          <span className={styles.label}>{s.label}</span>
          <span className={styles.value}>{formatValue(s.value)}</span>
          {i > 0 && s.stepRatio !== null && (
            <span className={styles.rowPill}>{pct(s.stepRatio)}</span>
          )}
        </span>
      </>
    ) : (
      <>
        <span className={styles.value}>{formatValue(s.value)}</span>
        <span className={styles.label}>{s.label}</span>
      </>
    );
    const common = {
      className: styles.cell,
      style: stageStyle(s.slot),
      'data-stage-cell': s.key,
      'data-dimmed': dimmed(i),
      // Vertical rows are hit-tested per row; horizontal uses the plot's x position (stageIndexAt).
      onPointerEnter: vertical ? () => inspect(i, 'pointer') : undefined,
    };
    return onStageClick ? (
      <button
        key={s.key}
        {...common}
        type="button"
        aria-label={buttonName(i)}
        onFocus={() => inspect(i, 'focus')}
        onClick={() => onStageClick(stages[i], i)}
      >
        {content}
      </button>
    ) : (
      <div key={s.key} {...common}>
        {content}
      </div>
    );
  };

  const stage = current === null ? null : resolved[current];
  const notes = current === null ? [] : notesFor(current);
  const rows = stage
    ? [
        {
          key: 'value',
          label: t('funnelChart.value'),
          slot: stage.slot,
          comparison: false,
          value: formatValue(stage.value),
        },
      ]
    : [];

  // The shapes strip sits at the plot's top-left, so geometry is plot-local; scalars keep `point` stable.
  const anchorX = current !== null && geometry ? geometry[current].cx : undefined;
  const anchorY =
    stage && geometry
      ? geometry[current!].cy - Math.max(MIN_THICKNESS / 2, (stage.heightRatio * size.height) / 2)
      : undefined;
  const horizontalPoint = useMemo(
    () => (anchorX === undefined || anchorY === undefined ? null : { x: anchorX, y: anchorY }),
    [anchorX, anchorY],
  );

  // Vertical: rows scroll inside the plot, so read the active band's position from the DOM
  // (bounding rects already include the scroll offset). Keyboard inspection scrolls the row in first.
  const [verticalPoint, setVerticalPoint] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const row =
      vertical && activeKey !== null && plotEl
        ? plotEl.querySelector<HTMLElement>(`[data-stage-cell="${CSS.escape(activeKey)}"]`)
        : null;
    const band = row?.querySelector<HTMLElement>('[data-band]');
    if (!row || !band || !plotEl) {
      setVerticalPoint(null);
      return;
    }
    if (activeSource === 'keyboard') row.scrollIntoView?.({ block: 'nearest' });
    const p = plotEl.getBoundingClientRect();
    const b = band.getBoundingClientRect();
    const x = b.left - p.left + b.width / 2;
    const y = b.top - p.top;
    setVerticalPoint((prev) => (prev && prev.x === x && prev.y === y ? prev : { x, y }));
  }, [vertical, activeKey, activeSource, plotEl]);
  const point = vertical ? verticalPoint : horizontalPoint;

  const liveText =
    activeSource === 'keyboard' && stage
      ? `${stage.label}: ${formatValue(stage.value)}. ${notes.join('. ')}.`
      : '';
  const dimmed = (i: number) => (current !== null && i !== current ? '' : undefined);

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
        <EmptyState title={emptyMessage || t('chart.empty')} size="sm" />
        {footnoteEl}
      </figure>
    );
  }

  return (
    <figure
      {...rest}
      ref={figureRef}
      role="figure"
      aria-label={label}
      aria-labelledby={undefined}
      data-orientation={orientation}
      data-shape={shape}
      data-footnote={hasFootnote || undefined}
      className={clsx(styles.root, className)}
    >
      {!clickable && <VisuallyHidden id={hintId}>{t('funnelChart.keyboardHint')}</VisuallyHidden>}
      {/* Clickable: the stage buttons are the tab stops, so the plot isn't one and needs no hint. */}
      <div
        ref={setPlotEl}
        className={styles.plot}
        role="group"
        aria-label={label}
        aria-describedby={
          [!clickable && hintId, hasFootnote && footnoteId].filter(Boolean).join(' ') || undefined
        }
        tabIndex={clickable ? undefined : 0}
        data-clickable={clickable || undefined}
        onKeyDown={onKeyDown}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        // Touch fires pointerleave right after pointerup; keep the tapped tooltip (an outside press clears it).
        onPointerLeave={(e) =>
          e.pointerType !== 'touch' && activeSource === 'pointer' && inspect(null, null)
        }
        onBlur={onBlur}
      >
        {vertical ? (
          resolved.map(renderCell)
        ) : (
          <>
            <div ref={setShapesEl} className={styles.shapes} onClick={onStripClick}>
              {geometry && (
                <svg
                  className={styles.svg}
                  width={size.width}
                  height={size.height}
                  aria-hidden="true"
                  focusable="false"
                >
                  {resolved.map((s, i) => {
                    const g = geometry[i];
                    const pill = i > 0 && s.stepRatio !== null ? pct(s.stepRatio) : null;
                    const pillWidth = pill ? pill.length * PILL_CHAR_WIDTH + PILL_PADDING_X * 2 : 0;
                    return (
                      <g
                        key={s.key}
                        className={styles.stage}
                        style={stageStyle(s.slot)}
                        data-stage={s.key}
                        data-dimmed={dimmed(i)}
                      >
                        <path className={styles.shape} d={g.d} />
                        {pill && (
                          <>
                            <rect
                              className={styles.pill}
                              x={g.cx - pillWidth / 2}
                              y={g.cy - PILL_HEIGHT / 2}
                              width={pillWidth}
                              height={PILL_HEIGHT}
                              rx={PILL_HEIGHT / 2}
                            />
                            <text
                              className={styles.pillText}
                              x={g.cx}
                              y={g.cy}
                              dy="0.35em"
                              textAnchor="middle"
                            >
                              {pill}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
            <div className={styles.footer}>{resolved.map(renderCell)}</div>
          </>
        )}
      </div>
      {footnoteEl}
      <ChartTooltip
        anchor={plotEl}
        point={point}
        title={stage?.label ?? ''}
        rows={rows}
        notes={notes}
      />
      <LiveRegion>{liveText}</LiveRegion>
      <VisuallyHidden as="div">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{t('funnelChart.stage')}</th>
              <th scope="col">{t('funnelChart.value')}</th>
              <th scope="col">{t('funnelChart.stepConversion')}</th>
              <th scope="col">{t('funnelChart.shareOfFirst')}</th>
            </tr>
          </thead>
          <tbody>
            {resolved.map((s) => (
              <tr key={s.key}>
                <th scope="row">{s.label}</th>
                <td>{formatValue(s.value)}</td>
                <td>{pct(s.stepRatio)}</td>
                <td>{pct(s.shareRatio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </VisuallyHidden>
    </figure>
  );
});
