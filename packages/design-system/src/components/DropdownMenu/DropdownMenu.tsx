import { DropdownMenuRoot } from './Root';
import { Trigger } from './Trigger';
import { Content } from './Content';
import { Item, Separator } from './Item';
import { Group, Label } from './Group';
import { ItemIndicator } from './ItemIndicator';
import { CheckboxItem } from './CheckboxItem';
import { RadioGroup, RadioItem } from './Radio';

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
export type { DropdownMenuGroupProps, DropdownMenuLabelProps } from './Group';
export type { DropdownMenuItemIndicatorProps } from './ItemIndicator';
export type { DropdownMenuCheckboxItemProps } from './CheckboxItem';
export type {
  DropdownMenuRadioGroupProps,
  DropdownMenuRadioItemProps,
} from './Radio';

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item,
  Separator,
  Group,
  Label,
  ItemIndicator,
  CheckboxItem,
  RadioGroup,
  RadioItem,
});
