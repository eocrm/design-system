import {
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { EmptyState } from '../EmptyState';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { ChartTooltip } from '../Chart/ChartTooltip';
import { readPx } from '../Chart/readPx';
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
   * legend button), called with the consumer's original segment. To navigate, prefer a segment's
   * `link` (a real link: new tab, copy link); this stays for non-navigating actions and analytics,
   * and also fires for linked segments. Omit both for an inspect-only donut with a plain-text legend.
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

const slotStyle = (slot: number) =>
  ({ '--chart-series-color': `var(--chart-series-${slot})` }) as CSSProperties;

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
  const badLinks = segments.filter((s) => s.link != null && !isValidElement(s.link));
  const fullLinks = segments.filter((s) => isValidElement(s.link) && s.link.props.children != null);
  const badLinkKeys = badLinks.map((s) => s.key).join(', ');
  const fullLinkKeys = fullLinks.map((s) => s.key).join(', ');
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (badLinkKeys)
      console.warn(
        `[DonutChart] \`link\` must be a React element (e.g. <a href> or a router Link); ignored for segment(s) ${badLinkKeys}.`,
      );
    if (fullLinkKeys)
      console.warn(
        `[DonutChart] \`link\` must be an empty element; its children are replaced for segment(s) ${fullLinkKeys}.`,
      );
  }, [badLinkKeys, fullLinkKeys]);

  const hintId = useId();
  const activateHintId = useId();
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

  // Two independent inspections, tracked by key so a reorder can't move them: the keyboard's (the
  // roving position, the Enter/Space target and the announcement) and a hover or legend focus, which
  // only overrides what the ring shows while it lasts.
  const [kbKey, setKbKey] = useState<string | null>(null);
  const [hover, setHover] = useState<{ key: string; from: 'pointer' | 'focus' } | null>(null);
  const indexOf = (key: string | null) =>
    key === null ? -1 : resolved.findIndex((s) => s.drawn && s.segment.key === key);
  // A key that is gone or no longer drawn: drop it during render, or regrowing would revive it.
  if (kbKey !== null && indexOf(kbKey) < 0) setKbKey(null);
  if (hover !== null && indexOf(hover.key) < 0) setHover(null);
  const kbIndex = indexOf(kbKey);
  const shownIndex = hover ? indexOf(hover.key) : kbIndex;
  const current = shownIndex >= 0 ? resolved[shownIndex] : null;
  const kbSegment = kbIndex >= 0 ? resolved[kbIndex] : null;
  const linkOf = (s: DonutSegment) =>
    isValidElement(s.link)
      ? (s.link as ReactElement<HTMLAttributes<HTMLElement> & { 'data-segment-link'?: string }>)
      : undefined;
  const clickable =
    onSegmentClick !== undefined || resolved.some((s) => s.drawn && linkOf(s.segment));
  const legendRef = useRef<HTMLUListElement>(null);
  // A linked segment is followed by clicking its legend link, so a router Link navigates via its own
  // onClick and modifier keys (new tab) work; that link's onClick also calls onSegmentClick.
  const activate = (
    segment: DonutSegment,
    e: Pick<MouseEvent, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'> & { button?: number },
  ) => {
    const linkEl = [...(legendRef.current?.querySelectorAll('[data-segment-link]') ?? [])].find(
      (el) => el.getAttribute('data-segment-link') === segment.key,
    );
    if (!linkEl) return onSegmentClick?.(segment);
    const { ctrlKey, metaKey, shiftKey, altKey, button = 0 } = e;
    linkEl.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        ctrlKey,
        metaKey,
        shiftKey,
        altKey,
        button,
      }),
    );
  };
  const drawnKeys = resolved.flatMap((s) => (s.drawn ? [s.segment.key] : []));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const pos = kbKey === null ? -1 : drawnKeys.indexOf(kbKey);
    const m = drawnKeys.length;
    let next: string | null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = drawnKeys[(pos + 1) % m];
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = drawnKeys[pos < 0 ? m - 1 : (pos - 1 + m) % m];
        break;
      case 'Home':
        next = drawnKeys[0];
        break;
      case 'End':
        next = drawnKeys[m - 1];
        break;
      case 'Enter':
      case ' ':
        if (!kbSegment || !clickable) return;
        e.preventDefault();
        activate(kbSegment.segment, e);
        return;
      case 'Escape':
        if (kbKey === null && hover === null) return; // let a surrounding dialog close
        setHover(null);
        next = null;
        break;
      default:
        return;
    }
    e.preventDefault();
    setKbKey(next);
  };

  // A tap leaves the tooltip open (touch fires pointerleave right after pointerup); dismiss it on
  // the next press outside the ring, as Chart does.
  const pointerActive = hover?.from === 'pointer';
  useEffect(() => {
    if (!pointerActive || !plotEl) return;
    const dismiss = (e: Event) => {
      if (e.composedPath().includes(plotEl)) return;
      setHover(null);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [pointerActive, plotEl]);
  const hoverOn = (key: string) => setHover({ key, from: 'pointer' });
  const clearPointer = () => setHover((h) => (h?.from === 'pointer' ? null : h));

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
  const liveText = kbIndex >= 0 ? summary(kbIndex) : '';

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
      {clickable && (
        <VisuallyHidden id={activateHintId}>{t('donutChart.activateHint')}</VisuallyHidden>
      )}
      <div className={styles.body}>
        <div
          ref={setPlotEl}
          className={styles.plot}
          role="group"
          aria-label={label}
          aria-describedby={[hintId, clickable && activateHintId, hasFootnote && footnoteId]
            .filter(Boolean)
            .join(' ')}
          tabIndex={0}
          data-clickable={clickable || undefined}
          onKeyDown={onKeyDown}
          onBlur={() => setKbKey(null)}
          // Touch fires pointerleave right after pointerup; keep the tapped tooltip (an outside press clears it).
          onPointerLeave={(e) => e.pointerType !== 'touch' && clearPointer()}
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
                      data-active={shownIndex === i ? '' : undefined}
                      onPointerEnter={() => hoverOn(s.segment.key)}
                      onPointerDown={() => hoverOn(s.segment.key)}
                      onClick={clickable ? (e) => activate(s.segment, e) : undefined}
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
        {/* Read-only: aria-hidden, the hidden data table is the screen reader's copy. */}
        <ul ref={legendRef} className={styles.legend} aria-hidden={clickable ? undefined : true}>
          {resolved.map((s, i) => {
            const content = (
              <>
                <span className={styles.swatch} aria-hidden="true" />
                <span className={styles.legendLabel}>{s.segment.label}</span>
                <span className={styles.legendValue}>{formatValue(s.value)}</span>
                <span className={styles.legendShare}>{pct(s.share)}</span>
              </>
            );
            const link = s.drawn ? linkOf(s.segment) : undefined;
            const itemProps = {
              className: styles.legendItem,
              style: slotStyle(s.slot),
              'aria-label': summary(i),
              // Pointer events, not mouse: touch emulates mouseenter but never mouseleave.
              onPointerEnter: (e: PointerEvent<HTMLElement>) =>
                e.pointerType !== 'touch' && hoverOn(s.segment.key),
              onPointerLeave: (e: PointerEvent<HTMLElement>) =>
                e.pointerType !== 'touch' && clearPointer(),
              // Focus needs no announcement: the entry's name already says it.
              onFocus: () => setHover({ key: s.segment.key, from: 'focus' }),
              onBlur: () => setHover((h) => (h?.from === 'focus' ? null : h)),
            };
            return (
              <li
                key={s.segment.key}
                className={styles.legendEntry}
                data-legend={s.segment.key}
                data-dimmed={current && shownIndex !== i ? '' : undefined}
                // A zero-value entry in a clickable legend has no button: hide the whole item.
                aria-hidden={clickable && !s.drawn ? true : undefined}
              >
                {link ? (
                  cloneElement(
                    link,
                    {
                      ...itemProps,
                      className: clsx(styles.legendItem, link.props.className),
                      'data-segment-link': s.segment.key,
                      onClick: (e: MouseEvent<HTMLElement>) => {
                        link.props.onClick?.(e);
                        onSegmentClick?.(s.segment);
                      },
                    },
                    content,
                  )
                ) : onSegmentClick && s.drawn ? (
                  <button type="button" {...itemProps} onClick={() => onSegmentClick(s.segment)}>
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
