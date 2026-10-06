import { createContext } from 'react';

/** Internal: StatGroup's `loading`, read by each StatTile. */
export const StatGroupLoadingContext = createContext(false);
