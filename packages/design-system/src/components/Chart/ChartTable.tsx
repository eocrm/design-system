import { VisuallyHidden } from '../VisuallyHidden';
import {
  annotationLabelsAt,
  markerLabelsAt,
  type ResolvedAnnotation,
  type ResolvedMarker,
} from './chartModel';

export interface ChartTableColumn {
  key: string;
  header: string;
  values: (number | null)[];
}

/** Internal: the screen-reader view of the chart. Always the same numbers as the plot. */
export function ChartTable({
  caption,
  categoryHeader,
  noData,
  categories,
  columns,
  formatValue,
  markersHeader,
  markers,
  annotations = [],
  detailsHeader,
  detailsAt,
  references = [],
}: {
  caption: string;
  categoryHeader: string;
  noData: string;
  categories: readonly string[];
  columns: ChartTableColumn[];
  formatValue: (n: number) => string;
  markersHeader: string;
  markers: readonly ResolvedMarker[];
  /** Annotations; their labels share the notes column with marker labels. */
  annotations?: readonly ResolvedAnnotation[];
  /** Set only when the chart has `details`; omitted means no details column. */
  detailsHeader?: string;
  detailsAt: (categoryIndex: number) => string[];
  /** Reference lines, one footer row each: the label as row header, the formatted value spanning the rest. */
  references?: { key: string; label: string; text: string }[];
}) {
  // Only labelled markers carry meaning; decorative bands add no column. Annotations always have a label.
  const hasNotes = markers.some((m) => m.label) || annotations.length > 0;
  return (
    <VisuallyHidden as="div">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{categoryHeader}</th>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.header}
              </th>
            ))}
            {hasNotes && <th scope="col">{markersHeader}</th>}
            {detailsHeader && <th scope="col">{detailsHeader}</th>}
          </tr>
        </thead>
        <tbody>
          {categories.map((category, i) => (
            <tr key={i}>
              <th scope="row">{category}</th>
              {columns.map((c) => {
                const v = c.values[i];
                return <td key={c.key}>{v === null ? noData : formatValue(v)}</td>;
              })}
              {hasNotes && (
                <td>
                  {[...markerLabelsAt(markers, i), ...annotationLabelsAt(annotations, i)].join(
                    ', ',
                  )}
                </td>
              )}
              {detailsHeader && <td>{detailsAt(i).join('; ')}</td>}
            </tr>
          ))}
        </tbody>
        {references.length > 0 && (
          <tfoot>
            {references.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                <td colSpan={columns.length + (hasNotes ? 1 : 0) + (detailsHeader ? 1 : 0)}>
                  {r.text}
                </td>
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </VisuallyHidden>
  );
}
