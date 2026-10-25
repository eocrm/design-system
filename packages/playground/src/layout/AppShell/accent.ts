import { createContext, useContext } from 'react';

export const ACCENT_KEY = 'eocrm-playground-accent';

export type Accent = 'blue' | 'tealpine';

/** Current accent, provided by AppShell (every mockup renders inside it). */
export const AccentContext = createContext<Accent>('blue');

export const useAccent = () => useContext(AccentContext);
