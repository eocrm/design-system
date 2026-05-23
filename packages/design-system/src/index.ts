// Public API of the design system. The CRM consumes from here.
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export { Input } from './components/Input';
export type { InputProps, InputSize } from './components/Input';

export { Card } from './components/Card';
export type { CardProps, CardPadding } from './components/Card';

export { Checkbox } from './components/Checkbox';
export type { CheckboxProps, CheckboxSize } from './components/Checkbox';

export { Stack } from './components/Stack';
export type { StackProps, StackGap, StackAlign } from './components/Stack';

export { Cluster } from './components/Cluster';
export type { ClusterProps, ClusterGap, ClusterJustify, ClusterAlign } from './components/Cluster';

export { Avatar, AvatarGroup, avatarColorIndex } from './components/Avatar';
export type { AvatarProps, AvatarSize, AvatarStatus, AvatarGroupProps } from './components/Avatar';

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

export { EmptyState } from './components/EmptyState';
export type {
  EmptyStateProps,
  EmptyStateSize,
  EmptyStateAlign,
  EmptyStateHeadingLevel,
} from './components/EmptyState';

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

export { Modal } from './components/Modal';
export type {
  ModalProps,
  ModalSize,
  ModalOverlayVariant,
  ModalStackMode,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  ModalCloseProps,
} from './components/Modal';

export { Radio, RadioGroup } from './components/Radio';
export type {
  RadioProps,
  RadioSize,
  RadioGroupProps,
  RadioGroupOrientation,
} from './components/Radio';

export { PasswordInput } from './components/PasswordInput';
export type {
  PasswordInputProps,
  PasswordInputSize,
  PasswordInputLabels,
} from './components/PasswordInput';

export { PasswordStrengthMeter } from './components/PasswordStrengthMeter';
export type {
  PasswordStrengthMeterProps,
  PasswordStrengthScore,
  PasswordStrengthLabels,
} from './components/PasswordStrengthMeter';

export { Select } from './components/Select';
export type {
  SelectProps,
  SelectOption,
  SelectGroup,
  SelectOptions,
  SelectSize,
  SelectTriggerDisplay,
} from './components/Select';

export { Skeleton } from './components/Skeleton';
export type { SkeletonProps, SkeletonVariant, SkeletonAnimation } from './components/Skeleton';

export { Table } from './components/Table';
export type {
  TableProps,
  TableCaptionProps,
  TableSectionProps,
  TableRowProps,
  TableHeaderCellProps,
  TableCellProps,
  TableDensity,
  TableCellAlign,
  TableSortDirection,
} from './components/Table';

export { Pagination, paginationRange } from './components/Pagination';
export type { PaginationProps, PaginationSize, PaginationItem } from './components/Pagination';

export { CursorPagination } from './components/CursorPagination';
export type { CursorPaginationProps } from './components/CursorPagination';

export { DataTable, useDataTable, ColumnVisibilityTrigger } from './components/DataTable';
export type {
  DataTableProps,
  ColumnVisibilityTriggerProps,
  DataTableInstance,
  UseDataTableOptions,
  ColumnDef,
  ColumnAlign,
  ColumnOrderState,
  ColumnSizingState,
  ColumnVisibilityState,
  ColumnPinningState,
  RowSelectionState,
  ExpandedRowsState,
  SortState,
  Updater,
  HeaderContext,
  CellContext,
} from './components/DataTable';

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
export type { DatePickerProps, DatePickerLabels, DatePickerSize } from './components/DatePicker';

export { DateRangePicker } from './components/DateRangePicker';
export type {
  DateRangePickerProps,
  DateRangePickerLabels,
  DateRangePickerSize,
  DateRange,
} from './components/DateRangePicker';

export { InlineDatePicker } from './components/DatePicker';
export type { InlineDatePickerProps, InlineDatePickerLabels } from './components/DatePicker';

export { InlineDateRangePicker } from './components/DateRangePicker';
export type {
  InlineDateRangePickerProps,
  InlineDateRangePickerLabels,
} from './components/DateRangePicker';
