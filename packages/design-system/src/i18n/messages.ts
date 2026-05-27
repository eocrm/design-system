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
  };
  drawer: {
    /** aria-label for the Drawer header's close button. */
    close: string;
  };
  fileUpload: {
    /** aria-label/title on the success Check icon in FileUpload's item list. */
    done: string;
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
