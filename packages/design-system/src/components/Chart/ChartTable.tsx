import { VisuallyHidden } from '../VisuallyHidden';
import { markerLabelsAt, type ResolvedMarker } from './chartModel';

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
}: {
  caption: string;
  categoryHeader: string;
  noData: string;
  categories: readonly string[];
  columns: ChartTableColumn[];
  formatValue: (n: number) => string;
  markersHeader: string;
  markers: readonly ResolvedMarker[];
}) {
  // Only labelled markers carry meaning; decorative bands add no column.
  const hasNotes = markers.some((m) => m.label);
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
              {hasNotes && <td>{markerLabelsAt(markers, i).join(', ')}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </VisuallyHidden>
  );
}
