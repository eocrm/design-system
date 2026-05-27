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
  dataTable: {
    selectAll: 'Выбрать все строки на странице',
    rowExpansion: 'Развёртывание строки',
    pinnedRows: 'Закреплённые строки',
    empty: 'Нет данных',
  },
  optionsPicker: {
    filter: 'Фильтр…',
    apply: 'Применить',
    cancel: 'Отмена',
    noMatches: 'Совпадений не найдено',
  },
  pagination: {
    previous: 'Назад',
    next: 'Далее',
    previousAriaLabel: 'Предыдущая страница',
    nextAriaLabel: 'Следующая страница',
  },
  select: {
    clear: 'Очистить выбор',
    search: 'Поиск…',
    noOptions: 'Нет вариантов',
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
