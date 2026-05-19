import { PopoverRoot } from './PopoverRoot';

// Sub-component re-exports are wired in later tasks; for now Popover is just
// the Root function. The namespace assembly grows as each sub-component
// lands. The final shape (post-task-7) will be:
//   Popover.Trigger, Popover.Content, Popover.Heading, Popover.Close
export const Popover = PopoverRoot;
