// Empty interface to start — components add their keys as they migrate.
// Each leaf is either a string (static), a function (parameterized), or a
// readonly string array (months / weekdays).
//
// As components migrate, they extend this interface with their own namespace,
// e.g. `alert: { dismiss: string }`. Both en.ts and ru.ts must then populate
// the new keys.
export interface Messages {
  alert: {
    /** aria-label on the Alert's dismiss (×) button. */
    dismiss: string;
  };
  confirmationPopover: {
    /** Label on the secondary "Cancel" button inside the confirmation popover. */
    cancel: string;
    /** Label on the primary "Confirm" button inside the confirmation popover. */
    confirm: string;
  };
  passwordInput: {
    /** aria-label on the show-password toggle when the password is hidden. */
    show: string;
    /** aria-label on the hide-password toggle when the password is visible. */
    hide: string;
    /** Live-region copy announced when caps-lock is detected. */
    capsLockOn: string;
    /** Live-region copy announced when a non-ASCII keystroke is detected. */
    wrongLayoutOn: string;
  };
  passwordStrengthMeter: {
    /** Label rendered when the strength score is "weak". */
    weak: string;
    /** Label rendered when the strength score is "fair". */
    fair: string;
    /** Label rendered when the strength score is "strong". */
    strong: string;
    /** Label rendered when the strength score is "very strong". */
    veryStrong: string;
  };
  calendar: {
    /** Label on the "Today" jump button in the header. */
    today: string;
    /** Empty-state copy for agenda view when the visible window has no events. */
    agendaEmpty: string;
    /** Time-gutter copy for all-day / multi-day events in agenda view. */
    allDay: string;
    /** 12 long month names, January–December (indexed by `Date#getMonth()`). */
    months: readonly [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    /**
     * 7 short weekday names in Mon–Sun order (indexed 0=Mon ... 6=Sun for the
     * library's internal helpers; consumers typically don't read this directly).
     */
    weekdaysShort: readonly [string, string, string, string, string, string, string];
    /** aria-label on the prev chevron when month view is active. */
    previousMonth: string;
    /** aria-label on the next chevron when month view is active. */
    nextMonth: string;
    /** aria-label on the prev chevron when week view is active. */
    previousWeek: string;
    /** aria-label on the next chevron when week view is active. */
    nextWeek: string;
    /** aria-label on the prev chevron when day view is active. */
    previousDay: string;
    /** aria-label on the next chevron when day view is active. */
    nextDay: string;
    /** aria-label on the prev chevron when agenda view is active. */
    previousAgenda: string;
    /** aria-label on the next chevron when agenda view is active. */
    nextAgenda: string;
    /** Function leaf — `aria-label` template for the "+N more events" overflow chip. */
    moreEvents: (params: { count: number }) => string;
    /** Segmented-control label for the month view. */
    viewMonth: string;
    /** Segmented-control label for the week view. */
    viewWeek: string;
    /** Segmented-control label for the day view. */
    viewDay: string;
    /** Segmented-control label for the agenda view. */
    viewAgenda: string;
  };
  datePicker: {
    /** Visible label / aria-label for the "Today" jump button. */
    today: string;
    /** aria-label for the ✕ clear button shown when a value is set. */
    clear: string;
    /** aria-label for the calendar-toggle button on the right of the input. */
    openCalendar: string;
    /** aria-label for the previous-month chevron in the popover header. */
    previousMonth: string;
    /** aria-label for the next-month chevron in the popover header. */
    nextMonth: string;
    /** aria-label for the range-start input (DateRangePicker dual-input). */
    rangeStart: string;
    /** aria-label for the range-end input (DateRangePicker dual-input). */
    rangeEnd: string;
  };
  dataTable: {
    /** aria-label for the select-all checkbox in the header. */
    selectAll: string;
    /** Accessible label for the row-expansion toggle column header. */
    rowExpansion: string;
    /** Accessible label for the pinned-rows section / tbody. */
    pinnedRows: string;
    /** Default empty-state copy when no rows are rendered. */
    empty: string;
  };
  optionsPicker: {
    /** Placeholder and aria-label for the filter (search) input. */
    filter: string;
    /** Label for the apply button. */
    apply: string;
    /** Label for the cancel button. */
    cancel: string;
    /** Copy shown when the filter query has no matches. */
    noMatches: string;
  };
  pagination: {
    /** Visible label on the previous-page button. */
    previous: string;
    /** Visible label on the next-page button. */
    next: string;
    /** aria-label on the previous-page button. */
    previousAriaLabel: string;
    /** aria-label on the next-page button. */
    nextAriaLabel: string;
    /** aria-label on the wrapping `<nav>` element. */
    ariaLabel: string;
    /** Function leaf — aria-label template for a non-current page button. */
    pageAriaLabel: (params: { page: number }) => string;
    /** Function leaf — aria-label template for the current-page button. */
    currentPageAriaLabel: (params: { page: number }) => string;
  };
  select: {
    /** aria-label on the clear-selection (×) button inside Select. */
    clear: string;
    /** Placeholder for the search input in searchable Selects. */
    search: string;
    /** Copy shown when the Select listbox has no options matching the filter. */
    noOptions: string;
  };
  colorPicker: {
    /** aria-label for the SV (saturation × brightness) square. */
    saturationBrightness: string;
    /** aria-label for the hue slider. */
    hue: string;
    /** aria-label for the hex value input. */
    hexValue: string;
    /** aria-label for the preset color swatch row. */
    presetColors: string;
    /** aria-label fallback for the default ColorPicker trigger button. */
    triggerLabel: string;
  };
  drawer: {
    /** aria-label for the Drawer header's close button. */
    close: string;
  };
  fileUpload: {
    /** aria-label/title on the success Check icon in FileUpload's item list. */
    done: string;
    /** Fallback aria-label on the dropzone when `dropzoneLabel` is a ReactNode. */
    upload: string;
    /** Visible drag-hint copy inside the dropzone. */
    dragHint: string;
    /** Function leaf — aria-label template for the per-row uploading `<Progress>`. */
    uploadingAriaLabel: (params: { name: string }) => string;
    /** Function leaf — aria-label template for the per-row remove (×) button. */
    removeAriaLabel: (params: { name: string }) => string;
  };
  imageCrop: {
    /** aria-label for the zoom slider. */
    zoom: string;
  };
  kanban: {
    /** aria-label for the Kanban scroll container (the board itself). */
    board: string;
  };
  modal: {
    /** aria-label for the Modal header's close button. */
    close: string;
  };
  toast: {
    /** aria-label for an individual toast's dismiss button. */
    dismiss: string;
    /** aria-label for the toast region (ToastViewport). */
    notifications: string;
  };
  breadcrumb: {
    /** aria-label fallback for the `<nav>` wrapping a Breadcrumb. */
    ariaLabel: string;
  };
  filterChip: {
    /** aria-label fallback for the per-chip dismiss (×) button. */
    dismiss: string;
  };
  pageHeader: {
    /** aria-label fallback for `<PageHeader.BackButton>`. */
    back: string;
  };
}

/** Supported locale codes. v1 ships English and Russian. */
export type Locale = 'en' | 'ru';

/**
 * Recursive deep-partial. Preserves function leaves untouched (a partial
 * override of a function leaf would be meaningless) and treats arrays as
 * atomic (the consumer either replaces the whole array or leaves the default).
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends readonly unknown[]
      ? T[K]
      : T[K] extends object
        ? DeepPartial<T[K]>
        : T[K];
};

type Leaf = string | ((...args: never[]) => string) | readonly string[];

/**
 * All valid dotted message keys derived from the `Messages` interface.
 *
 * While `Messages` is empty this resolves to `never` — `t()` accepts no keys
 * until components start populating the interface. Each new namespace
 * automatically widens the `MessageKey` union with no extra plumbing.
 */
export type MessageKey<T = Messages> = T extends Leaf
  ? ''
  : {
      [K in keyof T & string]: T[K] extends Leaf
        ? K
        : `${K}.${MessageKey<T[K]>}`;
    }[keyof T & string];
