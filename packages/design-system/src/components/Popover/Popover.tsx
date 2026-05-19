import { PopoverRoot } from './PopoverRoot';
import { Trigger } from './Trigger';

type PopoverNamespace = typeof PopoverRoot & {
  Trigger: typeof Trigger;
};

const Popover = PopoverRoot as PopoverNamespace;
Popover.Trigger = Trigger;

export { Popover };
