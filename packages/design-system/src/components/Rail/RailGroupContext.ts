import { createContext } from 'react';

// React context follows component ancestry through the collapsed flyout portal,
// so Rail.Item can distinguish group subitems without relying on DOM ancestry.
export const RailGroupContext = createContext(false);

// The collapsed flyout repeats the group's items for presentation. Descendants
// use this signal to suppress state that must have only one exposed owner.
export const RailGroupDuplicateContext = createContext(false);
