// Public API of the design system. The CRM consumes from here.

export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export { SocialButton } from './components/SocialButton';
export type { SocialButtonProps } from './components/SocialButton';

export { ButtonGroup } from './components/ButtonGroup';
export type {
  ButtonGroupProps,
  ButtonGroupSize,
  ButtonGroupItemProps,
} from './components/ButtonGroup';

export { Input } from './components/Input';
export type { InputProps, InputSize } from './components/Input';

export { Kanban } from './components/Kanban';
export type {
  KanbanProps,
  KanbanColumnProps,
  KanbanCardProps,
  KanbanMoveEvent,
} from './components/Kanban';

export { Kbd } from './components/Kbd';
export type { KbdProps, KbdSize } from './components/Kbd';

export { Card } from './components/Card';
export type { CardProps, CardPadding, CardTone, CardOverflow } from './components/Card';
export type { CardHeaderProps, CardHeaderLevel } from './components/Card';
export type { CardListProps } from './components/Card';
export type { CardListRowProps } from './components/Card';

export { Checkbox } from './components/Checkbox';
export type { CheckboxProps, CheckboxSize } from './components/Checkbox';

export {
  ColorPicker,
  ColorPickerPanel,
  ColorPickerTrigger,
  hexToHsv,
  hsvToHex,
  normalizeHex,
} from './components/ColorPicker';
export type {
  ColorPickerProps,
  ColorPickerPanelProps,
  ColorPickerTriggerProps,
  HSV,
} from './components/ColorPicker';

export { Stack } from './components/Stack';
export type { StackProps, StackGap, StackAlign } from './components/Stack';

export { Switch } from './components/Switch';
export type { SwitchProps, SwitchSize, SwitchTone } from './components/Switch';

export { Cluster } from './components/Cluster';
export type {
  ClusterProps,
  ClusterAs,
  ClusterGap,
  ClusterJustify,
  ClusterAlign,
} from './components/Cluster';

export { Constrain } from './components/Constrain';
export type { ConstrainProps, ConstrainWidth, ConstrainFlex } from './components/Constrain';

export { Indent } from './components/Indent';
export type { IndentProps, IndentGutter } from './components/Indent';

export { AppLayout } from './components/AppLayout';
export type { AppLayoutProps } from './components/AppLayout';

export { Grid } from './components/Grid';
export type {
  GridProps,
  GridGap,
  GridAlignItems,
  GridJustifyItems,
  GridAs,
  GridCollapseBreakpoint,
  CollapseColumnsMap,
  GridItemProps,
  GridItemSpan,
  GridItemAs,
} from './components/Grid';
export { Split } from './components/Split';
export type { SplitProps, SplitSide, SplitGap, SplitAlign } from './components/Split';

export { Sticky } from './components/Sticky';
export type { StickyProps, StickyTop } from './components/Sticky';

export { Masonry } from './components/Masonry';
export type { MasonryProps, MasonryGap } from './components/Masonry';

export { Divider } from './components/Divider';
export type {
  DividerProps,
  DividerOrientation,
  DividerVariant,
  DividerSize,
} from './components/Divider';

export { Alert } from './components/Alert';
export type { AlertProps, AlertTone } from './components/Alert';

export { Avatar, AvatarGroup, avatarColorIndex } from './components/Avatar';
export type { AvatarProps, AvatarSize, AvatarStatus, AvatarGroupProps } from './components/Avatar';

export { Badge } from './components/Badge';
export type { BadgeProps, BadgeTone, BadgeSize, BadgeDot, BadgeVariant } from './components/Badge';

export { Dot } from './components/Dot';
export type { DotProps } from './components/Dot';

export { EntityChip } from './components/EntityChip';
export type {
  EntityChipProps,
  EntityChipAs,
  EntityChipStatus,
  StatusCategory,
} from './components/EntityChip';

export { StatusMenu } from './components/StatusMenu';
export type {
  StatusMenuProps,
  StatusMenuStatus,
  StatusMenuCategory,
} from './components/StatusMenu';

export { Timeline } from './components/Timeline';
export type { TimelineProps, TimelineItemProps } from './components/Timeline';

export { Thread } from './components/Thread';
export type { ThreadProps, ThreadItemProps, ThreadNodeAlign } from './components/Thread';

export { BrandIcon } from './components/BrandIcon';
export type { BrandIconProps, BrandName } from './components/BrandIcon';

export { Logo } from './components/Logo';
export type { LogoProps, LogoSize, LogoTextPlacement } from './components/Logo';

export { FilterChip } from './components/FilterChip';
export type {
  FilterChipProps,
  FilterChipLabelProps,
  FilterChipValueProps,
} from './components/FilterChip';

export { FlowCanvas, arrangeNodes } from './components/FlowCanvas';
export type {
  FlowCanvasProps,
  FlowCanvasNode,
  FlowCanvasEdge,
  FlowCanvasSelection,
  FlowCanvasPoint,
} from './components/FlowCanvas';

export { PersonDisplay } from './components/PersonDisplay';
export type {
  PersonDisplayProps,
  PersonDisplayAvatarProps,
  PersonDisplayNameProps,
  PersonDisplayDescriptionProps,
  PersonDisplaySize,
} from './components/PersonDisplay';

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

export { ErrorState } from './components/ErrorState';
export type {
  ErrorStateProps,
  ErrorStateSize,
  ErrorStateAlign,
  ErrorStateTone,
  ErrorStateHeadingLevel,
} from './components/ErrorState';

export { IconTile } from './components/IconTile';
export type { IconTileProps, IconTileSize, IconTileShape } from './components/IconTile';

export { toast, ToastViewport } from './components/Toast';
export type {
  ToastOptions,
  ToastUpdateOptions,
  ToastViewportProps,
  ToastTone,
  ToastPosition,
} from './components/Toast';

export { Tooltip } from './components/Tooltip';
export type { TooltipProps, TooltipSide, TooltipAlign } from './components/Tooltip';

export { Popover } from './components/Popover';
export type {
  PopoverProps,
  PopoverTriggerProps,
  PopoverAnchorProps,
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

export { Lightbox } from './components/Lightbox';
export type { LightboxProps, LightboxItem } from './components/Lightbox';

export { Page } from './components/Page';
export type { PageProps, PageGap } from './components/Page';

export { Screen } from './components/Screen';
export type { ScreenProps, ScreenFill, ScreenBackdrop, ScreenAlign } from './components/Screen';

export { PageHeader } from './components/PageHeader';
export type {
  PageHeaderProps,
  PageHeaderBreadcrumbProps,
  PageHeaderBackButtonProps,
  PageHeaderAsideProps,
  PageHeaderTitleProps,
  PageHeaderSubtitleProps,
  PageHeaderMetaProps,
  PageHeaderActionsProps,
} from './components/PageHeader';

export { Drawer } from './components/Drawer';
export type {
  DrawerProps,
  DrawerSide,
  DrawerSize,
  DrawerOverlayVariant,
  DrawerStackMode,
  DrawerHeaderProps,
  DrawerBodyProps,
  DrawerFooterProps,
  DrawerCloseProps,
} from './components/Drawer';

export { Radio, RadioGroup } from './components/Radio';
export type {
  RadioProps,
  RadioSize,
  RadioGroupProps,
  RadioGroupOrientation,
} from './components/Radio';

export { PasswordInput } from './components/PasswordInput';
export type { PasswordInputProps, PasswordInputSize } from './components/PasswordInput';

export { PasswordStrengthMeter } from './components/PasswordStrengthMeter';
export type {
  PasswordStrengthMeterProps,
  PasswordStrengthScore,
} from './components/PasswordStrengthMeter';

export { PhoneInput, isValidPhone } from './components/PhoneInput';
export type {
  PhoneInputProps,
  PhoneInputSize,
  CountryOption,
  CountryCode,
  CountryDisplay,
} from './components/PhoneInput';

export { Select } from './components/Select';
export type {
  SelectProps,
  SelectOption,
  SelectGroup,
  SelectOptions,
  SelectSize,
  SelectTriggerDisplay,
} from './components/Select';

export { OptionsPicker } from './components/OptionsPicker';
export type {
  OptionsPickerProps,
  OptionsPickerContentProps,
  OptionsPickerTriggerProps,
  OptionsPickerMode,
  OptionsPickerOption,
  OptionsPickerGroup,
} from './components/OptionsPicker';

export { EmojiPicker, EmojiPickerPopover } from './components/EmojiPicker';
export type {
  EmojiPickerProps,
  EmojiPickerPopoverProps,
  EmojiEntry,
  EmojiCategory,
  EmojiCategoryId,
} from './components/EmojiPicker';

export { Progress } from './components/Progress';
export type {
  ProgressProps,
  ProgressSize,
  ProgressTone,
  ProgressLabel,
} from './components/Progress';

export { CircularProgress } from './components/CircularProgress';
export type {
  CircularProgressProps,
  CircularProgressSize,
  CircularProgressTone,
  CircularProgressLabel,
} from './components/CircularProgress';

export { Skeleton } from './components/Skeleton';
export type { SkeletonProps, SkeletonVariant, SkeletonAnimation } from './components/Skeleton';

export { Slider } from './components/Slider';
export type {
  SliderProps,
  SliderValue,
  SliderSize,
  SliderTone,
  SliderOrientation,
  SliderMark,
} from './components/Slider';

export { Sortable } from './components/Sortable';
export type {
  SortableProps,
  SortableItemProps,
  SortableHandleProps,
  SortableReorderEvent,
  SortableArrangement,
  CollapseBreakpoint,
} from './components/Sortable';

export { SortableGroup, moveSortableItem } from './components/SortableGroup';
export type {
  SortableGroupProps,
  SortableGroupContainerProps,
  SortableMoveEvent,
} from './components/SortableGroup';

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

export { Textarea } from './components/Textarea';
export type { TextareaProps, TextareaSize, TextareaResize } from './components/Textarea';

export { LiquidEditor } from './components/LiquidEditor';
export type {
  LiquidEditorProps,
  LiquidVariable,
  LiquidPreviewStatus,
  LiquidPreviewPlacement,
} from './components/LiquidEditor';

export { RichTextEditor } from './components/RichTextEditor';
export type { RichTextEditorProps } from './components/RichTextEditor';
export type { MentionItem, MentionsConfig } from './components/RichTextEditor';
export type { UploadConfig, UploadResult } from './components/RichTextEditor';

export { FileUpload } from './components/FileUpload';
export type {
  FileUploadProps,
  FileEntry,
  FileUploadStatus,
  FileRejectReason,
} from './components/FileUpload';

export { Image } from './components/Image';
export type { ImageProps, ImageObjectFit, ImageRadius, ImageSize } from './components/Image';

export { MediaTile } from './components/MediaTile';
export type { MediaTileProps, MediaTileReveal, MediaTileRadius } from './components/MediaTile';

export { ImageCrop, extractCropBlob, useCropPreview } from './components/ImageCrop';
export type {
  ImageCropProps,
  CropArea,
  ExtractCropOptions,
  UseCropPreviewOptions,
  UseCropPreviewResult,
} from './components/ImageCrop';

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

export { DefinitionList } from './components/DefinitionList';
export type {
  DefinitionListProps,
  DefinitionListLayout,
  DefinitionListSpacing,
  DefinitionListItemProps,
  DefinitionListTermProps,
  DefinitionListDescriptionProps,
} from './components/DefinitionList';

export { Link } from './components/Link';
export type { LinkProps, LinkVariant } from './components/Link';

export { LinkCard } from './components/LinkCard';
export type { LinkCardProps } from './components/LinkCard';

export { Accordion } from './components/Accordion';
export type {
  AccordionProps,
  AccordionItemProps,
  AccordionTriggerProps,
  AccordionContentProps,
  AccordionMode,
  AccordionHeaderLevel,
  AccordionVariant,
  AccordionSize,
  AccordionGap,
  AccordionIndicatorSide,
  AccordionActionsWhenClosed,
} from './components/Accordion';

export { Breadcrumb } from './components/Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItemProps } from './components/Breadcrumb';

export { Rail, useRail, RailContext } from './components/Rail';
export type {
  RailProps,
  RailContextValue,
  RailHeaderProps,
  RailFooterProps,
  RailSpacerProps,
  RailCollapseToggleProps,
  RailSectionProps,
  RailItemProps,
  RailGroupProps,
} from './components/Rail';

export { TopBar } from './components/TopBar';
export type {
  TopBarProps,
  TopBarElement,
  TopBarStartProps,
  TopBarEndProps,
  TopBarSearchProps,
  TopBarIconButtonProps,
  TopBarIndicatorTone,
} from './components/TopBar';

export { Code } from './components/Code';
export type { CodeProps, CodeTone } from './components/Code';

export { RichText } from './components/RichText';
export type {
  RichTextProps,
  RichDoc,
  RichBlock,
  RichBlockType,
  RichInline,
  RichMark,
  RichMarkType,
  RichPoint,
  RichRange,
} from './components/RichText';
export type { RichTextLink, RenderLink } from './components/RichText/engine/renderLink';
export type { RichTextMention, RenderMention } from './components/RichText/engine/renderMention';
export {
  emptyDoc,
  createBlock,
  docFromText,
  insertText,
  deleteRange,
  splitBlock,
  mergeBlockBackward,
  applyMark,
  removeMark,
  toggleMark,
  setBlockType,
  fromHtml,
  fromMarkdown,
  toHtml,
  toMarkdown,
} from './components/RichText';

export { Text } from './components/Text';
export type {
  TextProps,
  TextAs,
  TextSize,
  TextTone,
  TextWeight,
  TextAlign,
} from './components/Text';

export { Title } from './components/Title';
export type { TitleProps, TitleOrder, TitleSize, TitleTone, TitleWeight } from './components/Title';

// i18n — BCP-47 locale tagging (Intl-facing).
export { LocaleProvider, useLocale } from './i18n';
export type { LocaleProviderProps } from './i18n';

// i18n — translated UI strings.
export { I18nProvider, useTranslation, useTranslationArray, ruPlural } from './i18n';
export type { I18nProviderProps, Locale, Messages, MessageKey, DeepPartial } from './i18n';

// App root — bundles the locale + i18n + toast contexts for a consuming app.
export { AppProvider } from './app';
export type { AppProviderProps, TokenMap } from './app';

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
  CalendarEvent,
  CalendarEventTone,
  CalendarView,
  EventBar,
  MonthLayout,
  RenderEvent,
  RenderEventContext,
} from './components/Calendar';

export { DatePicker } from './components/DatePicker';
export type { DatePickerProps, DatePickerSize } from './components/DatePicker';

export { DateRangePicker } from './components/DateRangePicker';
export type {
  DateRangePickerProps,
  DateRangePickerSize,
  DateRange,
} from './components/DateRangePicker';

export { InlineDatePicker } from './components/DatePicker';
export type { InlineDatePickerProps } from './components/DatePicker';

export { InlineDateRangePicker } from './components/DateRangePicker';
export type { InlineDateRangePickerProps } from './components/DateRangePicker';

// TimeField — standalone time-of-day input, also embedded by the four
// DatePicker variants. Public so consumers needing a time input without a
// date can use the same primitive the pickers use internally.
export { TimeField } from './components/TimeField';
export type { TimeFieldProps } from './components/TimeField';

// DatePicker family — date+time granularity helpers. Exposed so consumers can
// (a) integrate the hidden form mirror's ISO local datetime with form layers
// without re-implementing the format, (b) parse user-typed datetime input
// outside the picker (e.g., URL params, hydrated state), and (c) resolve
// hourCycle / round-to-step in their own time UI built on top of TimeField.
export type { DateTimeGranularity, TimeValue, HourCycle } from './components/DatePicker/utils';
export {
  formatDateTime,
  parseDateTime,
  toIsoDateTime,
  combineDateAndTime,
  toTimeInputValue,
  resolveHourCycle,
  getLocaleHourCycle,
  roundTimeToStep,
} from './components/DatePicker/utils';
export {
  formatDateTimeRange,
  parseDateTimeRange,
  clampRangeEndAfterStart,
} from './components/DateRangePicker/utils';

// ─── Palette (categorical color set) ──────────────────────────────────────
export type { PaletteColor } from './palette';
export { PALETTE_COLORS, paletteTokens } from './palette';

// ─── Form field primitives (label/control wrapper + form layout) ──────────
export { Field } from './components/Field';
export type { FieldProps, FieldOrientation, FieldSize, FieldRenderProps } from './components/Field';

export { FormSection } from './components/FormSection';
export type { FormSectionProps } from './components/FormSection';

export { FormRow } from './components/FormRow';
export type { FormRowProps } from './components/FormRow';
