import { Fragment, useId, type ReactNode } from 'react';
import {
  renderAnnotations,
  renderReferenceLines,
  renderSeriesMarks,
  seriesStyle,
} from '../Chart/chartMarks';
import {
  LABEL_GAP,
  layoutMarkers,
  MARKER_LABEL_BASELINE,
  MARKER_RADIUS,
  markerPath,
  markerShape,
  PAD_TOP,
  X_LABEL_BASELINE,
  type ResolvedMarker,
} from '../Chart/chartModel';
import { laneDotRadius, laneSlot, type Lane, type LaneChartLayout } from './laneModel';
import chartStyles from '../Chart/Chart.module.scss';
import styles from './LaneChart.module.scss';

// Lifts descenders off the row below; as Chart's gutter.
const gutterBaseline = (row: number) => PAD_TOP + row * MARKER_LABEL_BASELINE - 2;

/** Internal: LaneChart's SVG. Lanes in `translate(0, top)` groups; markers, selection and inspection across all. */
export function LaneChartPlot({
  layout,
  lanes,
  size,
  markers,
  gutterRows,
  gutterGap,
  current,
  echoAttr,
  shownRange,
  clipped,
  tokens,
}: {
  layout: LaneChartLayout;
  /** The view's lanes, in `layout.lanes` order. */
  lanes: Lane[];
  size: { width: number; height: number };
  markers: readonly ResolvedMarker[];
  gutterRows: number;
  gutterGap: number;
  /** Inspected view index. */
  current: number | null;
  /** `''` when `current` is another chart's synced inspection (`ChartSync`): the band's `data-echo`. */
  echoAttr: '' | undefined;
  /** The drawn selection (in-progress drag or committed), view indices. */
  shownRange: { from: number; to: number } | null;
  /** A viewport is set: clip category-positioned marks to the plot's x range. */
  clipped: boolean;
  tokens: { dotRadius: number };
}) {
  const clipId = useId();
  const markerGeometry = layoutMarkers(markers, layout);
  // Markers, selection and the inspection band span every lane (`layout.plot` is the union, dots lanes included).
  const geo = layout.lanes;
  const { y: spanY, height: spanHeight } = layout.plot;
  const selectionGeometry = shownRange
    ? layoutMarkers(
        [
          {
            key: 'selection',
            kind: 'band',
            tone: 'neutral',
            slot: 0,
            placement: 'beside',
            ...shownRange,
          },
        ],
        layout,
      )[0]
    : null;
  const lane = (i: number, children: ReactNode, extra?: Record<string, string | number>) => (
    <g key={geo[i].key} transform={`translate(0 ${geo[i].top})`} {...extra}>
      {children}
    </g>
  );
  const dotRadius = laneDotRadius(tokens.dotRadius, layout.step);
  const clip = clipped ? `url(#${clipId})` : undefined;

  return (
    <svg
      className={chartStyles.svg}
      width={size.width}
      height={size.height}
      aria-hidden="true"
      focusable="false"
    >
      {clip && (
        <clipPath id={clipId}>
          {/* x only: lanes are translated inside the clipped group, so the clip spans the full height. */}
          <rect x={layout.plot.x} y={0} width={layout.plot.width} height={size.height} />
        </clipPath>
      )}
      {/* Bands, the selection and the inspected category under everything, across every lane. */}
      <g className={chartStyles.markers} clipPath={clip}>
        {markerGeometry.map(
          (m) =>
            m.kind === 'band' && (
              <rect
                key={m.key}
                className={chartStyles.markerBand}
                data-tone={m.tone}
                data-slot={m.slot || undefined}
                style={m.slot ? seriesStyle(m.slot) : undefined}
                x={m.x}
                y={spanY}
                width={m.width}
                height={spanHeight}
              />
            ),
        )}
        {selectionGeometry && (
          <rect
            className={chartStyles.selection}
            data-selection=""
            x={selectionGeometry.x}
            y={spanY}
            width={selectionGeometry.width}
            height={spanHeight}
          />
        )}
        {current !== null && (
          <rect
            className={chartStyles.band}
            data-echo={echoAttr}
            x={layout.categoryX[current] - layout.step / 2}
            y={spanY}
            width={layout.step}
            height={spanHeight}
          />
        )}
      </g>
      {/* Per lane: label, grid and y ticks (unclipped). */}
      {geo.map((g, i) =>
        lane(
          i,
          <>
            <text className={styles.laneLabel} x={0} y={g.labelY - X_LABEL_BASELINE}>
              {lanes[i].label}
            </text>
            {g.layout && (
              <>
                <g className={chartStyles.grid}>
                  {g.layout.yTicks.map((tick) => (
                    <line
                      key={tick.value}
                      x1={g.layout!.plot.x}
                      x2={g.layout!.plot.x + g.layout!.plot.width}
                      y1={tick.y}
                      y2={tick.y}
                    />
                  ))}
                </g>
                <g className={chartStyles.axis}>
                  {g.layout.yTicks.map((tick) => (
                    <text
                      key={tick.value}
                      x={g.layout!.plot.x - LABEL_GAP}
                      y={tick.y}
                      dy="0.32em"
                      textAnchor="end"
                    >
                      {tick.label}
                    </text>
                  ))}
                </g>
              </>
            )}
          </>,
          { 'data-lane': lanes[i].key, 'data-top': g.top },
        ),
      )}
      <g className={chartStyles.axis}>
        {layout.xLabels.map((x) => (
          <text key={x.index} x={x.x} y={size.height - X_LABEL_BASELINE} textAnchor="middle">
            {x.label}
          </text>
        ))}
      </g>
      <g clipPath={clip}>
        <g className={chartStyles.markers}>
          {markerGeometry.map(
            (m) =>
              m.kind === 'line' && (
                <line
                  key={m.key}
                  className={chartStyles.markerLine}
                  data-marker-line=""
                  data-tone={m.tone}
                  data-slot={m.slot || undefined}
                  style={m.slot ? seriesStyle(m.slot) : undefined}
                  x1={m.x}
                  x2={m.x}
                  y1={spanY}
                  y2={spanY + spanHeight}
                />
              ),
          )}
        </g>
        {/* Per lane: data marks (clipped to the plot under a viewport). */}
        {geo.map((g, i) => {
          const l = g.layout;
          const slot = laneSlot(lanes[i], i);
          return lane(
            i,
            l ? (
              <>
                {l.marks.filter((m) => m.kind === 'bars').map((m) => renderSeriesMarks(m))}
                {renderReferenceLines(l.referenceLines)}
                {l.marks.filter((m) => m.kind !== 'bars').map((m) => renderSeriesMarks(m))}
                {renderAnnotations(l.annotations)}
                {current !== null &&
                  l.marks.map(
                    (m) =>
                      m.kind !== 'bars' &&
                      m.points[current] && (
                        <g key={m.key} className={chartStyles.series} style={seriesStyle(m.slot)}>
                          <path
                            className={chartStyles.marker}
                            d={markerPath(
                              markerShape(m.slot),
                              m.points[current]!.x,
                              m.points[current]!.y,
                              MARKER_RADIUS,
                            )}
                          />
                        </g>
                      ),
                  )}
              </>
            ) : (
              // Shrunk dots drop the surface ring, which would eat them.
              <g style={seriesStyle(slot)} data-fitted={dotRadius < tokens.dotRadius || undefined}>
                {g.dots.map((d) => (
                  <path
                    key={d.index}
                    className={styles.dot}
                    data-lane-dot=""
                    d={markerPath('circle', d.cx, d.cy, dotRadius)}
                  />
                ))}
              </g>
            ),
            { 'data-lane': lanes[i].key },
          );
        })}
      </g>
      {/* One gutter above the top lane: icons in the first row, labels in the last. */}
      <g className={chartStyles.markerLabels}>
        {markerGeometry.map(
          (m) =>
            m.top && (
              <Fragment key={`top-${m.key}`}>
                {m.top.icon && (
                  <text
                    className={chartStyles.markerIcon}
                    aria-hidden="true"
                    x={m.top.x}
                    y={gutterBaseline(1)}
                    textAnchor="middle"
                  >
                    {m.top.icon}
                  </text>
                )}
                {m.top.label && (
                  <text
                    x={m.top.x}
                    y={gutterBaseline(gutterRows) + gutterGap}
                    textAnchor="middle"
                    {...(m.slot
                      ? {
                          className: chartStyles.markerLabelColored,
                          'data-slot': m.slot,
                          style: seriesStyle(m.slot),
                        }
                      : {})}
                  >
                    {m.top.label}
                  </text>
                )}
              </Fragment>
            ),
        )}
      </g>
    </svg>
  );
}
