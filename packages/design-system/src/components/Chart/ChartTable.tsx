import { VisuallyHidden } from '../VisuallyHidden';

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
}: {
  caption: string;
  categoryHeader: string;
  noData: string;
  categories: readonly string[];
  columns: ChartTableColumn[];
  formatValue: (n: number) => string;
}) {
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
            </tr>
          ))}
        </tbody>
      </table>
    </VisuallyHidden>
  );
}
