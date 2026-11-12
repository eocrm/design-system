import type { CSSProperties } from 'react';
import {
  annotationPath,
  DOT_RADIUS,
  type AnnotationGeometry,
  type ReferenceLineGeometry,
  type SeriesMarks,
} from './chartModel';
import styles from './Chart.module.scss';

/** Internal: SVG renderers of `ChartLayout` marks, shared by `Chart` and `LaneChart`. Pure functions of the layout. */

/** Sets `--chart-series-color` to palette slot `slot` (0 = the neutral total-comparison ink). */
export const seriesStyle = (slot: number) =>
  ({
    '--chart-series-color':
      slot === 0 ? 'var(--chart-total-comparison)' : `var(--chart-series-${slot})`,
  }) as CSSProperties;

/**
 * One series' marks. `part` splits an area's fill from its stroke so reference lines can paint between them;
 * `data-series` stays on the stroke group only.
 */
export const renderSeriesMarks = (
  m: SeriesMarks,
  part: 'all' | 'fill' | 'stroke' = 'all',
  dimmed?: '',
) => (
  <g
    key={m.key}
    className={styles.series}
    style={seriesStyle(m.slot)}
    data-series={part === 'fill' ? undefined : m.key}
    data-comparison={m.comparison || undefined}
    data-overflow={m.overflow || undefined}
    data-dimmed={dimmed}
  >
    {m.area && part !== 'stroke' && <path className={styles.area} d={m.area} />}
    {m.line && part !== 'fill' && <path className={styles.line} d={m.line} />}
    {m.bars?.map((d, i) => d && <path key={i} className={styles.bar} d={d} />)}
    {part !== 'fill' &&
      m.dots.map((p, i) => (
        <circle key={i} className={styles.dot} cx={p.x} cy={p.y} r={DOT_RADIUS} />
      ))}
  </g>
);

export const renderReferenceLines = (lines: readonly ReferenceLineGeometry[]) =>
  lines.map((r) => (
    <line
      key={r.key}
      className={styles.referenceLine}
      data-reference-line=""
      data-dash={r.dash}
      data-emphasis={r.emphasis}
      style={r.slot ? seriesStyle(r.slot) : undefined}
      x1={r.x1}
      x2={r.x2}
      y1={r.y}
      y2={r.y}
    />
  ));

export const renderAnnotations = (annotations: readonly AnnotationGeometry[]) =>
  annotations.map((a) => (
    <g
      key={a.key}
      className={styles.annotation}
      data-annotation=""
      data-glyph={a.glyph}
      data-tone={a.tone}
      aria-hidden="true"
      transform={`translate(${a.x} ${a.y})`}
    >
      <path d={annotationPath(a.glyph)} />
    </g>
  ));
