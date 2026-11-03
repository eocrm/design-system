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
  MIN_THICKNESS,
  orientationFor,
  resolveStages,
  stageGeometry,
  stageIndexAt,
  TAPER_HOLD,
  type FunnelShape,
  type FunnelStage,
  type ResolvedStage,
} from './funnelModel';
import styles from './FunnelChart.module.scss';

export type { FunnelShape, FunnelSlot, FunnelStage } from './funnelModel';

export interface FunnelChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Accessible name of the figure and caption of its data table, e.g. "Sales pipeline". Required. */
  label: string;
  /**
   * Stages, top of the funnel first. Heights are relative to the largest value. Colour is a one-hue ramp
   * from `--chart-series-1` (first stage) toward the surface; a stage's `color` slot overrides it.
   */
  stages: FunnelStage[];
  /** Formats a stage value for the footer, tooltip and data table (the app owns i18n and currency). Required. */
  formatValue: (n: number) => string;
  /**
   * Silhouette between stages, in both layouts (vertical slices follow the same geometry turned on
   * its side). Default `'taper'`.
   * - `'taper'` — each stage holds its height for most of its column, then a short straight diagonal
   *   leads into the next one's height.
   * - `'sharp'` — full-column trapezoids from one stage's height to the next.
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

/** Hero (first stage's value and label inside its band): px estimates, as for the pill. */
const HERO_PADDING = 8;
// ponytail: sizes mirror --funnel-chart-hero-*-size (24px / 14px) at line-height 1.2; measure with getBBox if those tokens change.
const HERO_MIN_HEIGHT = 64;
const HERO_VALUE_CHAR_WIDTH = 15;
const HERO_LABEL_CHAR_WIDTH = 8;

/** Stage colour: the `color` slot, else step `i` of `n` on the one-hue ramp (computed by CSS). */
const stageColor = (s: ResolvedStage, i: number, n: number) =>
  s.slot !== null
    ? `var(--chart-series-${s.slot})`
    : `color-mix(in oklab, var(--funnel-chart-ramp-color), var(--funnel-chart-surface) calc(var(--funnel-chart-ramp-max-mix) * ${n > 1 ? Math.round((i / (n - 1)) * 1000) / 1000 : 0}))`;
const colorStyle = (color: string) => ({ '--chart-series-color': color }) as CSSProperties;

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
    shape = 'taper',
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
  const empty = resolved.every((s) => s.value === 0);

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
  // Hero: the first stage's value and label inside its band, centred in its column, when the band is
  // tall enough at the text's right edge (the band narrows there) and the text fits the column.
  const heroValue = n > 0 ? formatValue(resolved[0].value) : '';
  const hero = (() => {
    if (!geometry) return null;
    const g = geometry[0];
    const colW = g.x1 - g.x0;
    const thick = (s: ResolvedStage) => Math.max(MIN_THICKNESS, s.heightRatio * size.height);
    const a = thick(resolved[0]);
    const b = n > 1 ? thick(resolved[1]) : a;
    const hold = shape === 'taper' ? colW * TAPER_HOLD : 0;
    const textW = Math.max(
      heroValue.length * HERO_VALUE_CHAR_WIDTH,
      resolved[0].label.length * HERO_LABEL_CHAR_WIDTH,
    );
    const edge = colW / 2 + textW / 2 + HERO_PADDING;
    const f = Math.min(1, Math.max(0, (edge - hold) / (colW - hold || 1)));
    const fits = textW + 2 * HERO_PADDING <= colW && a + (b - a) * f >= HERO_MIN_HEIGHT;
    return fits ? { x: g.cx, y: g.cy } : null;
  })();

  // Vertical: the same outline in a 100-unit box per stage (flow x ∈ [100i, 100i+100], cross y ∈
  // [0, 100]); each row's SVG views its slice with the axes swapped and stretches it to the row.
  // MIN_THICKNESS (px in the horizontal strip) becomes 6% of the band track here.
  const bands = useMemo(
    () =>
      !empty && vertical
        ? stageGeometry({ stages: resolved, width: 100 * n, height: 100, shape })
        : null,
    [empty, vertical, resolved, n, shape],
  );

  const [active, setActive] = useState<number | null>(null);
  // 'focus' = a stage button has focus; its accessible name already says what the live region would.
  const [activeSource, setActiveSource] = useState<'pointer' | 'keyboard' | 'focus' | null>(null);
  // Stages shrank past the active index: drop it (during render, React's "adjust state on prop
  // change" pattern), or regrowing would revive it with no user action.
  if (active !== null && active >= n) {
    setActive(null);
    setActiveSource(null);
  }
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

  // One cell per stage (horizontal: footer column; vertical: a table-like row with its funnel slice); a
  // button when clickable. Spans, not divs, since the cell may be a <button>. With the hero shown, the
  // first footer cell stays (empty) for grid alignment, hover and the button.
  const renderCell = (s: ResolvedStage, i: number) => {
    const content = vertical ? (
      <>
        <span className={styles.bandTrack} data-band="">
          {bands && (
            <svg
              className={styles.svg}
              viewBox={`0 ${100 * i} 100 100`}
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              {/* Swap x/y so the funnel flows top to bottom. */}
              <path className={styles.shape} d={bands[i].d} transform="matrix(0 1 1 0 0 0)" />
            </svg>
          )}
        </span>
        <span className={styles.swatch} data-swatch="" />
        <span className={styles.label}>{s.label}</span>
        <span className={styles.value}>{formatValue(s.value)}</span>
        <span className={styles.step}>
          {i > 0 && s.stepRatio !== null ? (
            <span className={styles.rowPill}>{pct(s.stepRatio)}</span>
          ) : (
            t('funnelChart.noData')
          )}
        </span>
      </>
    ) : i === 0 && hero ? null : (
      <>
        <span className={styles.value}>{formatValue(s.value)}</span>
        <span className={styles.label}>{s.label}</span>
      </>
    );
    const common = {
      className: styles.cell,
      style: colorStyle(stageColor(s, i, n)),
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
          slot: 0,
          color: stageColor(stage, current!, n),
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
  // (bounding rects already include the scroll offset), again on plot scroll and on resize.
  // Keyboard inspection scrolls the row in first.
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
    const measure = () => {
      const p = plotEl.getBoundingClientRect();
      const b = band.getBoundingClientRect();
      const x = b.left - p.left + b.width / 2;
      const y = b.top - p.top;
      setVerticalPoint((prev) => (prev && prev.x === x && prev.y === y ? prev : { x, y }));
    };
    if (activeSource === 'keyboard') row.scrollIntoView?.({ block: 'nearest' });
    measure();
    plotEl.addEventListener('scroll', measure, { passive: true });
    return () => plotEl.removeEventListener('scroll', measure);
  }, [vertical, activeKey, activeSource, plotEl, rootSize.width, rootSize.height]);
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
          <>
            <div className={styles.header} aria-hidden="true" data-funnel-header="">
              <span />
              <span />
              <span>{t('funnelChart.stage')}</span>
              <span className={styles.headerValue}>{t('funnelChart.value')}</span>
              <span>{t('funnelChart.vsPrevious')}</span>
            </div>
            {resolved.map(renderCell)}
          </>
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
                        style={colorStyle(stageColor(s, i, n))}
                        data-stage={s.key}
                        data-dimmed={dimmed(i)}
                      >
                        <path className={styles.shape} d={g.d} />
                        {i === 0 && hero && (
                          <g data-hero="">
                            <text
                              className={styles.heroValue}
                              x={hero.x}
                              y={hero.y}
                              dy="-0.15em"
                              textAnchor="middle"
                            >
                              {heroValue}
                            </text>
                            <text
                              className={styles.heroLabel}
                              x={hero.x}
                              y={hero.y}
                              dy="1.1em"
                              textAnchor="middle"
                            >
                              {s.label}
                            </text>
                          </g>
                        )}
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
