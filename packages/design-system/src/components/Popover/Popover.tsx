import { PopoverRoot } from './PopoverRoot';
import { Trigger } from './Trigger';
import { Anchor } from './Anchor';
import { Content } from './Content';
import { Heading } from './Heading';
import { Close } from './Close';

type PopoverNamespace = typeof PopoverRoot & {
  Trigger: typeof Trigger;
  Anchor: typeof Anchor;
  Content: typeof Content;
  Heading: typeof Heading;
  Close: typeof Close;
};

const Popover = PopoverRoot as PopoverNamespace;
Popover.Trigger = Trigger;
Popover.Anchor = Anchor;
Popover.Content = Content;
Popover.Heading = Heading;
Popover.Close = Close;

export { Popover };
