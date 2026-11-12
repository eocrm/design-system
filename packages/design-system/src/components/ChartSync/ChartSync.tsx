import { useState, type ReactElement, type ReactNode } from 'react';
import { ChartSyncContext, createChartSyncStore } from './chartSyncStore';

export type { ChartSyncPoint } from './chartSyncMatch';

export interface ChartSyncProps {
  /** The charts to sync (at any depth), plus anything else on the dashboard. */
  children?: ReactNode;
}

/**
 * Syncs hover across the x-axis charts inside it: inspecting a moment in one shows a crosshair, highlighted marks
 * and a tooltip at the matching x in the others. Renders no DOM of its own (a context provider), so it takes no
 * `ref` and no HTML attributes (a documented exception to Hard rule 6). Nested: the nearest one wins.
 * @see docs/components/ChartSync.md
 */
export function ChartSync({ children }: ChartSyncProps): ReactElement {
  const [store] = useState(createChartSyncStore);
  return <ChartSyncContext.Provider value={store}>{children}</ChartSyncContext.Provider>;
}
