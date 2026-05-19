import { createContext, type ReactNode } from 'react';

interface DropdownMenuContextValue {
  open: boolean;
}

// Internal — not exported. Subcomponents subscribe via useContext.
const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

export interface DropdownMenuProps {
  children: ReactNode;
}

function DropdownMenuRoot({ children }: DropdownMenuProps) {
  return <DropdownMenuContext.Provider value={{ open: false }}>{children}</DropdownMenuContext.Provider>;
}

// Compound surface. Real implementations land in later tasks.
export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger: function Trigger() {
    return null;
  },
  Content: function Content() {
    return null;
  },
  Item: function Item() {
    return null;
  },
  Separator: function Separator() {
    return null;
  },
});
