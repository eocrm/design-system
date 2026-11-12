import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useControllableState } from '../_internal/useControllableState';
import { resolveRange, type ChartRange } from './chartRange';
import { clampViewport, type ChartViewport } from './chartViewport';

/** Dev-only, once per distinct value: an invalid range is ignored rather than thrown. */
export function useRangeWarning(
  prop: string,
  range: ChartRange | null | undefined,
  invalid: boolean,
  component = 'Chart',
) {
  const key = invalid && range ? `${range.from}|${range.to}` : '';
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !key) return;
    console.warn(
      `[${component}] Ignored ${prop} (${key.replace('|', ' to ')}): from/to must be one of categories.`,
    );
  }, [prop, key, component]);
}

export interface ChartDomainOptions {
  /** Every category (the full domain, before `zoomRange`). */
  categories: string[];
  zoomRange?: ChartRange | null;
  defaultZoomRange?: ChartRange | null;
  onZoomRangeChange?: (range: ChartRange | null) => void;
  viewport?: ChartViewport | null;
  defaultViewport?: ChartViewport | null;
  onViewportChange?: (next: ChartViewport | null, info: { end: boolean }) => void;
  /** Component name in dev warnings. Default `'Chart'`. */
  name?: string;
}

/** What `useChartDomain` returns; pass it whole to `useChartInteraction` as `domain`. */
export interface ChartDomain {
  /** Component name in dev warnings. */
  name: string;
  /** Every category, as passed. */
  allCategories: string[];
  /** `false` while there are no categories yet (loading): range warnings stay quiet. */
  loaded: boolean;
  /** Sets the zoomed range (controllable; calls `onZoomRangeChange`). */
  setZoom: (next: ChartRange | null) => void;
  /** `zoom` as indices into `allCategories`; `null` when unzoomed or invalid. */
  zoomIdx: { from: number; to: number } | null;
  /** The zoomed slice of `allCategories` (the view the plot lays out); `allCategories` itself when unzoomed. */
  categories: string[];
  /** `categories.length`. */
  n: number;
  /** Sets the window and calls `onViewportChange(next, { end })`. */
  changeViewport: (next: ChartViewport | null, end: boolean) => void;
  /** The window clamped to the view (`null` = everything): what `computeLayout` gets as `viewport`. */
  vp: ChartViewport | null;
}

/**
 * Chart's zoom domain: the controllable `zoomRange` and `viewport`. Runs before layout, since the layout needs
 * the zoomed categories and the clamped window; `useChartInteraction` takes its result after layout.
 */
export function useChartDomain(options: ChartDomainOptions): ChartDomain {
  const {
    categories: allCategories,
    zoomRange,
    defaultZoomRange,
    onZoomRangeChange,
    viewport,
    defaultViewport,
    onViewportChange,
    name = 'Chart',
  } = options;
  const [zoom, setZoom] = useControllableState<ChartRange | null>({
    value: zoomRange,
    defaultValue: defaultZoomRange ?? null,
    onChange: onZoomRangeChange,
  });
  const zoomIdx = resolveRange(zoom, allCategories);
  // No categories yet (loading): every range would "miss"; don't cry wolf.
  const loaded = allCategories.length > 0;
  useRangeWarning('zoomRange', zoom, loaded && zoomIdx === null, name);
  const zoomFrom = zoomIdx?.from;
  const zoomTo = zoomIdx?.to;
  const categories = useMemo(
    () =>
      zoomFrom === undefined || zoomTo === undefined
        ? allCategories
        : allCategories.slice(zoomFrom, zoomTo + 1),
    [allCategories, zoomFrom, zoomTo],
  );
  // Render window over the view; no `onChange` here: `changeViewport` adds the `{ end }` info itself.
  const [rawViewport, setViewportState] = useControllableState<ChartViewport | null>({
    value: viewport,
    defaultValue: defaultViewport ?? null,
  });
  const changeViewport = (next: ChartViewport | null, end: boolean) => {
    setViewportState(next);
    onViewportChange?.(next, { end });
  };
  const vFrom = rawViewport?.from;
  const vTo = rawViewport?.to;
  const n = categories.length;
  const vp = useMemo(
    () =>
      vFrom === undefined || vTo === undefined ? null : clampViewport({ from: vFrom, to: vTo }, n),
    [vFrom, vTo, n],
  );
  // New data (categories with other content) drops an uncontrolled window silently: notifying would make an app
  // that refetches on change undo the finer data it just swapped in. A controlled window is the app's to set.
  const categoriesKey = allCategories.join('\u0000');
  const [viewportDataKey, setViewportDataKey] = useState(categoriesKey);
  if (viewportDataKey !== categoriesKey) {
    setViewportDataKey(categoriesKey);
    // The first data after loading (no categories yet) is not new data: it keeps `defaultViewport`.
    if (viewport === undefined && viewportDataKey !== '') setViewportState(null);
  }
  // A zoomRange change re-bases the domain, so the window inside it no longer applies. Before paint, so the old
  // window never shows on the new domain; not during render, as it calls the consumer.
  const zoomKey = `${zoomFrom}|${zoomTo}`;
  const viewportZoomKey = useRef(zoomKey);
  useLayoutEffect(() => {
    if (viewportZoomKey.current === zoomKey) return;
    viewportZoomKey.current = zoomKey;
    if (rawViewport === null) return;
    setViewportState(null);
    onViewportChange?.(null, { end: true });
  }, [zoomKey, rawViewport, setViewportState, onViewportChange]);
  return {
    name,
    allCategories,
    loaded,
    setZoom,
    zoomIdx,
    categories,
    n,
    changeViewport,
    vp,
  };
}
