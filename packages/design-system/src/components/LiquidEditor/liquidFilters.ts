// liquidFilters.ts — the default filter names offered in autocomplete after `|`.
// Highlighting treats ANY identifier after `|` as a filter; this list only
// powers the autocomplete suggestions. Consumers override via the `filters` prop.

/** Common Liquid output filters, offered in autocomplete after a `|`. */
export const DEFAULT_LIQUID_FILTERS: readonly string[] = [
  'upcase',
  'downcase',
  'capitalize',
  'strip',
  'truncate',
  'truncatewords',
  'default',
  'date',
  'replace',
  'append',
  'prepend',
  'size',
  'first',
  'last',
  'join',
  'escape',
];
