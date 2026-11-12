import { useEffect, useMemo } from 'react';
import { useChartSync, useSyncPublish } from './chartSyncStore';
import { categoryPoint, matchCategory } from './chartSyncMatch';

/**
 * Internal: a category chart's (`Chart`, `LaneChart`) part in its `ChartSync`. Publishes the inspected category
 * and returns another chart's, echoed here (visual only): `echo` is its view index, `null` while this chart
 * inspects itself or when the match is off the zoom window or viewport (the chart does not pan); `echoPoint` is
 * the tooltip anchor. Warns (prefixed `[name]`) about unusable `categoryValues`.
 */
export function useCategorySync({
  enabled,
  name,
  current,
  categories,
  categoryValues,
  zoomFrom,
  layout,
}: {
  enabled: boolean;
  name: string;
  /** Inspected view index. */
  current: number | null;
  /** Every category, unzoomed. */
  categories: string[];
  categoryValues?: (number | Date)[];
  /** Index of the first view category in `categories`. */
  zoomFrom: number;
  layout: { plot: { x: number; y: number; width: number }; categoryX: number[] } | null;
}) {
  const sync = useChartSync(enabled);
  const badValues = categoryValues !== undefined && categoryValues.length !== categories.length;
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !badValues) return;
    console.warn(
      `[${name}] Ignored categoryValues: it must have one value per category. Syncing by category label instead.`,
    );
  }, [badValues, name]);
  const unordered = useMemo(
    () => !!categoryValues?.some((v, i) => i > 0 && Number(v) <= Number(categoryValues[i - 1])),
    [categoryValues],
  );
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !unordered) return;
    console.warn(
      `[${name}] categoryValues must be strictly ascending; synced matching will be wrong.`,
    );
  }, [unordered, name]);

  // Re-sent on a new index, a clear, or new data (categories / categoryValues) under the same index.
  useSyncPublish(
    sync.publish,
    current === null ? null : categoryPoint(zoomFrom + current, categories, categoryValues),
  );

  const matched =
    sync.echo && layout && current === null
      ? matchCategory(sync.echo, categories, categoryValues)
      : null;
  const echoAt = matched === null ? -1 : matched - zoomFrom;
  const echoX = layout?.categoryX[echoAt];
  const echo =
    layout &&
    echoX !== undefined &&
    echoX >= layout.plot.x &&
    echoX <= layout.plot.x + layout.plot.width
      ? echoAt
      : null;
  const echoY = echo === null ? undefined : layout?.plot.y;
  const echoPoint = useMemo(
    () => (echoX === undefined || echoY === undefined ? null : { x: echoX, y: echoY }),
    [echoX, echoY],
  );
  return { echo, echoPoint };
}
