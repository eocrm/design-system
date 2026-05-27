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
