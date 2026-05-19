import { DropdownMenuRoot } from './Root';
import { Trigger } from './Trigger';
import { Content } from './Content';
import { Item, Separator } from './Item';

export type { DropdownMenuProps } from './Root';
export type { DropdownMenuTriggerProps } from './Trigger';
export type {
  DropdownMenuContentProps,
  DropdownMenuSide,
  DropdownMenuAlign,
} from './Content';
export type {
  DropdownMenuItemProps,
  DropdownMenuItemTone,
  DropdownMenuSeparatorProps,
} from './Item';

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item,
  Separator,
});
