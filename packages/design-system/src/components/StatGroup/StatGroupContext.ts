import { createContext } from 'react';

/** StatGroup surface for every tile. See `StatGroupProps.variant`. */
export type StatGroupVariant = 'filled' | 'card';

/** Internal: StatGroup's `loading` + `variant`, read by each StatTile. */
export const StatGroupContext = createContext<{ loading: boolean; variant: StatGroupVariant }>({
  loading: false,
  variant: 'filled',
});
