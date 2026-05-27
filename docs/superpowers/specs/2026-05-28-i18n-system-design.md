# Localization (i18n) system for `@eocrm/design-system`

## Goal

Every user-visible string the library renders — visible text, aria-labels, placeholders, default empty/loading copy — is translatable. Consumer provides a locale + optional overrides at the app root; every component picks up the right copy without any per-component prop. Library ships full en + ru defaults.

The current codebase mixes two patterns:

- **Inline hard-coded strings** in JSX (`aria-label="Close dialog"`, `<span>Next</span>`, `placeholder="Filter…"`)
- **Per-component `labels` prop + `DEFAULT_LABELS` const** (Calendar, PasswordStrengthMeter, DatePicker, DateRangePicker, PasswordInput, OptionsPicker, ConfirmationPopover)

Both patterns are leaving. The replacement is a single centralized i18n system. Per-component `labels` props are removed (they have no equivalent — the i18n provider is the new override surface). Consumers who relied on `labels={...}` migrate to provider `overrides`.

## Non-goals

- ICU MessageFormat / full CLDR plural rules — handled per-locale via inline branching in message functions (Russian's 3 plural forms are spelled out explicitly).
- Date / number formatting — left to `Intl.DateTimeFormat` / `Intl.NumberFormat` in each component (no abstraction needed; consumers can override via the same provider's `locale` value if they pass it to `Intl`).
- Right-to-left layouts (RTL) — separate concern, not addressed here.
- A locale-switcher UI — the library only exposes the provider; the consumer builds their own switcher if needed.

## Architecture

### Provider + hook

```tsx
import { I18nProvider, useTranslation } from '@eocrm/design-system';

<I18nProvider locale="ru" overrides={{ badge: { modified: 'Изменено!' } }}>
  <App />
</I18nProvider>

// Inside a component:
function MyComponent() {
  const t = useTranslation();
  return <Badge>{t('badge.modified')}</Badge>;
}
```

- `I18nProvider` is optional. If absent, components use the default `en` messages.
- The provider deep-merges `overrides` over the chosen locale's defaults. Unmerged keys fall back to the locale defaults; missing keys in the chosen locale fall back to `en`.
- `locale` is a discriminated union: `'en' | 'ru'` for v1.

### Message catalog

Single source of truth in `packages/design-system/src/i18n/`:

```
i18n/
  messages.ts        — TS interface `Messages` (nested by component)
  en.ts              — default English messages (typed as Messages)
  ru.ts              — Russian messages (typed as Messages, also fully populated)
  I18nProvider.tsx   — React context + provider
  useTranslation.ts  — hook returning a typed `t()` function
  format.ts          — helpers: deepMerge, lookup, function-vs-string dispatch
  index.ts           — re-exports
```

### Messages shape

Messages are organized nested by component, with leaf values being either:

- A plain string (static): `modified: 'Modified'`
- A function for parameterized strings: `summary: ({ from, to, total }) => \`Showing ${from}–${to} of ${total}\``

```ts
// messages.ts
export interface Messages {
  alert: {
    dismiss: string;
  };
  badge: {
    modified: string;
  };
  calendar: {
    today: string;
    months: [string, string, string, string, string, string, string, string, string, string, string, string];
    weekdaysShort: [string, string, string, string, string, string, string];
    agendaEmpty: string;
    allDay: string;
  };
  colorPicker: {
    saturationBrightness: string;
    hue: string;
    hexValue: string;
    presetColors: string;
  };
  confirmationPopover: {
    cancel: string;
  };
  dataTable: {
    selectAll: string;
    rowExpansion: string;
    pinnedRows: string;
    empty: string;
  };
  datePicker: {
    today: string;
    clear: string;
    openCalendar: string;
    previousMonth: string;
    nextMonth: string;
    rangeStart: string;
    rangeEnd: string;
  };
  drawer: {
    close: string;
  };
  fileUpload: {
    upload: string;
    done: string;
    remove: string;
    browse: string;
    dropHint: string;
  };
  imageCrop: {
    zoom: string;
  };
  kanban: {
    board: string;
  };
  modal: {
    close: string;
  };
  optionsPicker: {
    filter: string;
    apply: string;
    cancel: string;
    noMatches: string;
  };
  pagination: {
    previous: string;
    next: string;
    previousAriaLabel: string;
    nextAriaLabel: string;
  };
  passwordInput: {
    show: string;
    hide: string;
  };
  passwordStrengthMeter: {
    weak: string;
    fair: string;
    strong: string;
    veryStrong: string;
  };
  select: {
    clear: string;
    search: string;
    noOptions: string;
  };
  toast: {
    dismiss: string;
    notifications: string;
  };
}
```

(Final list discovered during implementation; this is the shape, not the final catalog.)

### Type-safe key paths

```ts
type Path<T, P extends string = ''> = T extends string | ((...args: never[]) => unknown)
  ? P
  : { [K in keyof T & string]: Path<T[K], P extends '' ? K : `${P}.${K}`> }[keyof T & string];

export type MessageKey = Path<Messages>;
// Resolves to: 'badge.modified' | 'pagination.next' | 'calendar.months' | ...
```

`useTranslation()` returns a `t: (key: MessageKey, params?: Record<string, unknown>) => string` function. The implementation walks the dotted key, dispatches based on string-vs-function leaf.

For type-safety, parameterized messages are tagged at the leaf — at runtime, the hook checks `typeof leaf === 'function'`. TypeScript users get autocomplete on the key set.

Array values (months/weekdays) are accessed with bracket notation: `t('calendar.months')` returns `string[]`. Slight inconsistency vs single-string keys — components index into the array client-side. Acceptable trade-off vs introducing a parameterized helper for "get nth element".

### Override merging

Deep-merge: nested objects are merged recursively; leaf values from `overrides` win.

```ts
// Consumer provides only the keys they want to change:
<I18nProvider locale="ru" overrides={{
  pagination: { next: 'Дальше' }, // overrides 'Далее' from default ru
  badge: { modified: 'Изменено!' },
}}>
```

Missing keys in `overrides` fall through to the locale default. Missing keys in `ru` (shouldn't happen in v1 — both locales must be 100% populated) fall through to `en`.

### Locale fallback chain

`overrides[key] ?? messages[locale][key] ?? messages.en[key]`

The `?? messages.en[key]` safety net exists for v2-and-beyond when a new component string is added but only `en` is updated — production still renders English instead of `undefined`.

### Plural forms

Russian has 3 plural forms. The library handles this per-locale inside message functions:

```ts
// en.ts
export const en: Messages = {
  ...,
  fileUpload: {
    ...,
    fileSize: ({ size }: { size: number }) => formatBytes(size),
    fileCount: ({ count }: { count: number }) =>
      count === 1 ? '1 file' : `${count} files`,
  },
};

// ru.ts
export const ru: Messages = {
  ...,
  fileUpload: {
    ...,
    fileSize: ({ size }: { size: number }) => formatBytes(size),
    fileCount: ({ count }: { count: number }) => {
      const m10 = count % 10, m100 = count % 100;
      if (m10 === 1 && m100 !== 11) return `${count} файл`;
      if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${count} файла`;
      return `${count} файлов`;
    },
  },
};
```

Small helper exported from `i18n/format.ts` for the Russian rule:

```ts
export function ruPlural(n: number, [one, few, many]: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
```

Used as `ruPlural(count, ['файл', 'файла', 'файлов'])` to keep `ru.ts` readable.

## Removing existing `labels` props

Per the user's direction, the existing per-component `labels?` props go away. Affected components:

- `Calendar` (labels: `today` / months / weekdaysShort / agendaEmpty / allDay)
- `DatePicker` (labels: `today`/`clear`/`openCalendar`/etc.)
- `InlineDatePicker`
- `DateRangePicker`
- `InlineDateRangePicker`
- `PasswordInput` (labels: `show`/`hide`)
- `PasswordStrengthMeter` (labels: `weak`/`fair`/`strong`/`veryStrong`)
- `OptionsPicker` (`searchPlaceholder`/`applyLabel`/`cancelLabel`)
- `ConfirmationPopover` (`cancelLabel`)

Each gets its `labels` prop deleted from props interface + JSDoc. Internal `DEFAULT_LABELS` const deleted. `t('component.key')` calls replace `resolvedLabels.key`.

**This is a breaking change.** Consumers who use these props get a compile error and must move to `<I18nProvider overrides={...}>`. The library hasn't shipped publicly yet outside the EOCRM consumer, so the breakage is internal.

## Aria-labels and accessibility

Aria-labels (e.g., `aria-label="Close dialog"` on Modal close, `aria-label="Dismiss"` on Toast) are user-visible to screen readers — they go through the same i18n system. Components that allow consumer override via prop (e.g., a custom `aria-label` on `<Button>`) keep that prop; the i18n default just changes the fallback string.

## Provider API

```ts
export interface I18nProviderProps {
  /** Locale code. v1 ships 'en' and 'ru'. */
  locale: Locale;
  /** Optional deep-partial overrides applied on top of the locale's defaults. */
  overrides?: DeepPartial<Messages>;
  children: ReactNode;
}

export const I18nProvider: FC<I18nProviderProps>;
export function useTranslation(): (key: MessageKey, params?: Record<string, unknown>) => string;

// Re-exported types so consumers can type their overrides:
export type { Locale, Messages, MessageKey, DeepPartial };
```

## Files

| File | Role |
| --- | --- |
| `packages/design-system/src/i18n/messages.ts` (NEW) | `Messages` interface + `MessageKey` type |
| `packages/design-system/src/i18n/en.ts` (NEW) | Default English messages |
| `packages/design-system/src/i18n/ru.ts` (NEW) | Russian messages |
| `packages/design-system/src/i18n/format.ts` (NEW) | `deepMerge`, `lookupKey`, `ruPlural` helpers |
| `packages/design-system/src/i18n/I18nProvider.tsx` (NEW) | Context + provider |
| `packages/design-system/src/i18n/useTranslation.ts` (NEW) | Hook |
| `packages/design-system/src/i18n/index.ts` (NEW) | Re-exports |
| `packages/design-system/src/index.ts` (MODIFY) | Public re-export of provider + hook + types |
| `packages/design-system/src/components/*/*.tsx` (MODIFY) | Replace hard-coded strings + delete `labels` props |
| `packages/design-system/AGENTS.md` (MODIFY) | Add "Localization" section |
| `packages/design-system/CLAUDE.md` (MODIFY) | Hard rule about i18n for new components |
| `packages/playground/src/App.tsx` (MODIFY) | Wrap with `<I18nProvider locale="en">` (demonstrates the API) |

## Components to migrate

Verified scan against the codebase finds hard-coded user-facing strings or existing `labels` props in:

**Inline aria-labels / strings:**
- `Alert` — Dismiss
- `Toast`, `ToastViewport` — Dismiss, Notifications
- `Modal/Header` — Close dialog
- `Drawer/Header` — Close dialog
- `Pagination` — Previous / Next / Previous page / Next page
- `Select/Trigger`, `Select/Listbox` — Clear selection, Search…
- `OptionsPicker` — Filter…, Apply, Cancel, No matches
- `ColorPicker` — Saturation and brightness, Hue, Hex color value, Preset colors
- `ImageCrop` — Zoom
- `Kanban` — Kanban board
- `FileUpload` — Done (aria-label on the check icon), Upload files default
- `DataTable` — Select all rows on page, Row expansion, Pinned rows, empty-state default

**Existing `labels` props (delete + move to i18n):**
- `Calendar` (today / months[12] / weekdaysShort[7] / agendaEmpty / allDay)
- `DatePicker` (today / clear / openCalendar / previousMonth / nextMonth / etc.)
- `InlineDatePicker`
- `DateRangePicker` (above + rangeStart / rangeEnd)
- `InlineDateRangePicker`
- `PasswordInput` (show / hide)
- `PasswordStrengthMeter` (weak / fair / strong / veryStrong)
- `ConfirmationPopover` (cancelLabel)

Other components verified to have NO user-facing English strings: Badge, Button, ButtonGroup, Card (compound), Checkbox, CircularProgress, Cluster, Code, CursorPagination, DefinitionList, Divider, Drawer (root — only Header has the close label), DropdownMenu (consumer provides all text), EmptyState (consumer provides all text), FilterChip, Grid, Input, Link, Page, PageHeader, PersonDisplay, Popover, Progress, Radio, Skeleton, Slider, Sortable, Stack, Switch, Table, Tabs, Text, Textarea, Title, Tooltip, Avatar.

## Testing

- Unit test on `format.ts`: deepMerge, lookupKey, ruPlural.
- Unit test on `useTranslation`: returns correct strings, applies overrides, falls back to en for missing ru keys.
- Per-component tests: where a `labels` prop test existed, replace with a test rendering inside `<I18nProvider overrides={...}>` and asserting the override applies.

## Out of scope

- New locales beyond en + ru. v2 spec.
- A CLI tool to extract keys from source. Could be added later via `formatjs extract` or a custom AST walker. Manual-sweep for v1.
- RTL CSS adjustments.
- Locale-aware date/number formatting helpers in the library — components keep using `Intl.*` directly.
