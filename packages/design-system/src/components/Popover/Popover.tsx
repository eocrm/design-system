import { PopoverRoot } from './PopoverRoot';
import { Trigger } from './Trigger';
import { Content } from './Content';
import { Heading } from './Heading';
import { Close } from './Close';

type PopoverNamespace = typeof PopoverRoot & {
  Trigger: typeof Trigger;
  Content: typeof Content;
  Heading: typeof Heading;
  Close: typeof Close;
};

const Popover = PopoverRoot as PopoverNamespace;
Popover.Trigger = Trigger;
Popover.Content = Content;
Popover.Heading = Heading;
Popover.Close = Close;

export { Popover };
