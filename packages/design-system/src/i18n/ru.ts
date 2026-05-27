import type { Messages } from './messages';

/**
 * Russian message defaults. Populated section-by-section as each component
 * migrates onto the i18n system. Every key present in `en.ts` must also exist
 * here (and vice-versa) — TS enforces shape parity through `Messages`.
 */
export const ru: Messages = {
  alert: {
    dismiss: 'Закрыть',
  },
  colorPicker: {
    saturationBrightness: 'Насыщенность и яркость',
    hue: 'Оттенок',
    hexValue: 'Hex-значение цвета',
    presetColors: 'Предустановленные цвета',
  },
  drawer: {
    close: 'Закрыть диалог',
  },
  fileUpload: {
    done: 'Готово',
  },
  imageCrop: {
    zoom: 'Масштаб',
  },
  kanban: {
    board: 'Канбан-доска',
  },
  modal: {
    close: 'Закрыть диалог',
  },
  toast: {
    dismiss: 'Закрыть',
    notifications: 'Уведомления',
  },
};
