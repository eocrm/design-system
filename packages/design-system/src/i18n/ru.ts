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
  calendar: {
    today: 'Сегодня',
    agendaEmpty: 'Нет событий',
    allDay: 'Весь день',
    months: [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ],
    weekdaysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    previousWeek: 'Предыдущая неделя',
    nextWeek: 'Следующая неделя',
    previousDay: 'Предыдущий день',
    nextDay: 'Следующий день',
    previousAgenda: 'Предыдущая неделя',
    nextAgenda: 'Следующая неделя',
    moreEvents: ({ count }) => `ещё ${count as number}`,
    viewMonth: 'Месяц',
    viewWeek: 'Неделя',
    viewDay: 'День',
    viewAgenda: 'Повестка',
  },
  datePicker: {
    today: 'Сегодня',
    clear: 'Очистить',
    openCalendar: 'Открыть календарь',
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    rangeStart: 'Дата начала',
    rangeEnd: 'Дата окончания',
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
