// Public API of the design system. The CRM consumes from here.
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Card } from './components/Card';
export type { CardProps, CardPadding } from './components/Card';

export { Stack } from './components/Stack';
export type { StackProps, StackGap, StackAlign } from './components/Stack';

export { Cluster } from './components/Cluster';
export type { ClusterProps, ClusterGap, ClusterJustify, ClusterAlign } from './components/Cluster';

export { Avatar } from './components/Avatar';
export type { AvatarProps, AvatarSize } from './components/Avatar';

export { Badge } from './components/Badge';
export type { BadgeProps, BadgeTone, BadgeSize, BadgeDot } from './components/Badge';

export { Tabs } from './components/Tabs';
export type { TabsProps, TabItem, TabsActivationMode, TabsOrientation } from './components/Tabs';

export { DropdownMenu } from './components/DropdownMenu';
export type {
  DropdownMenuProps,
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuSeparatorProps,
  DropdownMenuSide,
  DropdownMenuAlign,
  DropdownMenuItemTone,
  DropdownMenuGroupProps,
  DropdownMenuLabelProps,
  DropdownMenuItemIndicatorProps,
  DropdownMenuCheckboxItemProps,
  DropdownMenuRadioGroupProps,
  DropdownMenuRadioItemProps,
  DropdownMenuSubProps,
  DropdownMenuSubTriggerProps,
  DropdownMenuSubContentProps,
} from './components/DropdownMenu';

export { Tooltip } from './components/Tooltip';
export type { TooltipProps, TooltipSide, TooltipAlign } from './components/Tooltip';

export { Popover } from './components/Popover';
export type {
  PopoverProps,
  PopoverTriggerProps,
  PopoverContentProps,
  PopoverHeadingProps,
  PopoverCloseProps,
  PopoverSide,
  PopoverAlign,
} from './components/Popover';

export { ConfirmationPopover } from './components/ConfirmationPopover';
export type {
  ConfirmationPopoverProps,
  ConfirmationVariant,
} from './components/ConfirmationPopover';

export { Select } from './components/Select';
export type {
  SelectProps,
  SelectOption,
  SelectGroup,
  SelectOptions,
  SelectSize,
  SelectTriggerDisplay,
} from './components/Select';

// i18n
export { LocaleProvider, useLocale } from './i18n';
export type { LocaleProviderProps } from './i18n';

// Calendar primitives (hooks + date math + Intl formatters + locale week info).
// The Calendar UI components below and a future DatePicker compose against
// these — use them directly when you need date math without the UI.
export {
  useMonth,
  useWeek,
  useDay,
  useAgenda,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  addDays,
  addMonths,
  addWeeks,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  daysBetween,
  toDateKey,
  fromDateKey,
  formatMonth,
  formatWeekdayShort,
  formatWeekdayNarrow,
  formatDayShort,
  formatDayLong,
  formatRange,
  formatHour,
  formatTime,
  getFirstDayOfWeek,
  getWeekendDays,
} from './calendar';
export type {
  Day,
  Week,
  MonthGrid,
  UseMonthOptions,
  UseWeekOptions,
  UseDayOptions,
  UseAgendaOptions,
  WeekResult,
  DayResult,
  AgendaResult,
} from './calendar';

export { Calendar } from './components/Calendar';
export type {
  CalendarProps,
  CalendarLabels,
  CalendarEvent,
  CalendarEventTone,
  CalendarView,
  EventBar,
  MonthLayout,
  RenderEvent,
  RenderEventContext,
} from './components/Calendar';

export { DatePicker } from './components/DatePicker';
export type { DatePickerProps, DatePickerLabels } from './components/DatePicker';
