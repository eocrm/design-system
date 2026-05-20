// Tiny re-export module that breaks the circular import that would
// otherwise exist between `Select.tsx` (which imports the SelectContext
// from `./context`) and `context.ts` (which needs `SelectOption` etc.
// declared in `Select.tsx`). Subcomponents and `context.ts` import these
// types from here rather than from `./Select` directly.
export type { SelectOption, SelectGroup, SelectOptions } from './Select';
export type { FlatRow } from './utils';
