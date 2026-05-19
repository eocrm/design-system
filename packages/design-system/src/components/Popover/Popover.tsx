import { PopoverRoot } from './PopoverRoot';
import { Trigger } from './Trigger';
import { Content } from './Content';

type PopoverNamespace = typeof PopoverRoot & {
  Trigger: typeof Trigger;
  Content: typeof Content;
};

const Popover = PopoverRoot as PopoverNamespace;
Popover.Trigger = Trigger;
Popover.Content = Content;

export { Popover };
