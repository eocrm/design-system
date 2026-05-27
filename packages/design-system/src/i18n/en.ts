import type { Messages } from './messages';

/**
 * English message defaults. Populated section-by-section as each component
 * migrates onto the i18n system. Each namespace mirrors the `Messages`
 * interface — adding a key here without adding it to `ru.ts` will fail TS.
 */
export const en: Messages = {
  alert: {
    dismiss: 'Dismiss',
  },
  calendar: {
    today: 'Today',
    agendaEmpty: 'No events',
    allDay: 'All day',
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    previousWeek: 'Previous week',
    nextWeek: 'Next week',
    previousDay: 'Previous day',
    nextDay: 'Next day',
    previousAgenda: 'Previous week',
    nextAgenda: 'Next week',
    moreEvents: ({ count }) => `${count as number} more events`,
    viewMonth: 'Month',
    viewWeek: 'Week',
    viewDay: 'Day',
    viewAgenda: 'Agenda',
  },
  dataTable: {
    selectAll: 'Select all rows on page',
    rowExpansion: 'Row expansion',
    pinnedRows: 'Pinned rows',
    empty: 'No data',
  },
  optionsPicker: {
    filter: 'Filter…',
    apply: 'Apply',
    cancel: 'Cancel',
    noMatches: 'No matches',
  },
  pagination: {
    previous: 'Previous',
    next: 'Next',
    previousAriaLabel: 'Previous page',
    nextAriaLabel: 'Next page',
  },
  select: {
    clear: 'Clear selection',
    search: 'Search…',
    noOptions: 'No options',
  },
  colorPicker: {
    saturationBrightness: 'Saturation and brightness',
    hue: 'Hue',
    hexValue: 'Hex color value',
    presetColors: 'Preset colors',
  },
  drawer: {
    close: 'Close dialog',
  },
  fileUpload: {
    done: 'Done',
  },
  imageCrop: {
    zoom: 'Zoom',
  },
  kanban: {
    board: 'Kanban board',
  },
  modal: {
    close: 'Close dialog',
  },
  toast: {
    dismiss: 'Dismiss',
    notifications: 'Notifications',
  },
};
