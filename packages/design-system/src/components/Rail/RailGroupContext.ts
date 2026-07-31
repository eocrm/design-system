import { createContext } from 'react';

// React context follows component ancestry through the collapsed flyout portal,
// so Rail.Item can distinguish group subitems without relying on DOM ancestry.
export const RailGroupContext = createContext(false);
