import { formatIsoDay, formatIsoRange, parseIsoDay } from '../_internal/isoDay';

export type DateTileInput = Date | string;
export type DateTileShow = 'weekday' | 'time' | 'weekday-time';
export type DateTileRelative = 'today' | 'tomorrow' | 'ongoing' | 'past' | null; // yesterday is 'past' + the 'Yesterday' word
export interface DateTileWords {
  today: string;
  tomorrow: string;
  yesterday: string;
  ongoing: string;
}
export interface DateTileParts {
  month: string; // visible month line, uppercase is CSS's job: 'Nov', 'Nov 2027', 'Nov – Dec'
  day: string; // '12' or '12–14'
  bottom: string | null; // weekday / time / 'Today' / 'Thu–Sat' / 'Today · 14:30'; null when nothing applies
  relative: DateTileRelative; // 'today' and 'ongoing' both get the today look; 'past' gets muted
  label: string; // accessible name, e.g. 'Today, Thursday, 12 November 2026, 14:30'
  dateTime: string; // '2026-11-12' for a day string, Date#toISOString() for an instant; range → start
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const NDASH = '–';

interface Norm {
  iso: string;
  instant: Date | null;
}

function isoDayOf(d: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function normalise(input: DateTileInput, timeZone?: string): Norm {
  if (typeof input === 'string' && DAY.test(input)) {
    if (parseIsoDay(input).toISOString().slice(0, 10) !== input)
      throw new Error(`[DateTile] invalid date: ${input}`);
    return { iso: input, instant: null };
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error(`[DateTile] invalid date: ${String(input)}`);
  return { iso: isoDayOf(d, timeZone), instant: d };
}

function shiftDay(iso: string, days: number): string {
  const d = parseIsoDay(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const strip = (s: string) => s.replace(/\.(?=\s|$)/g, '');

// Month/year line without locale era words (ru adds a literal ' г.' after the year).
function monthLine(
  first: string,
  last: string | null,
  locale: string,
  o: Intl.DateTimeFormatOptions,
): string {
  const f = new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' });
  const a = parseIsoDay(first);
  const parts = last ? f.formatRangeToParts(a, parseIsoDay(last)) : f.formatToParts(a);
  return parts
    .map((p) => (p.type === 'literal' ? p.value.replace(/\p{L}+\./gu, '') : p.value))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function dateTileParts(opts: {
  date: DateTileInput;
  end?: DateTileInput;
  show: DateTileShow;
  relative: boolean;
  now: Date;
  timeZone?: string;
  locale: string;
  words: DateTileWords;
}): DateTileParts {
  const { show, locale, words, timeZone } = opts;
  const start = normalise(opts.date, timeZone);
  const endN = opts.end === undefined ? null : normalise(opts.end, timeZone);
  // An end that is not after the start is a single day.
  const last = endN && endN.iso > start.iso ? endN.iso : null;
  const first = start.iso;

  const today = isoDayOf(opts.now, timeZone);
  const year = (iso: string) => iso.slice(0, 4);
  const withYear = year(first) !== year(today) || (last !== null && year(last) !== year(today));

  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => formatIsoDay(iso, locale, o);
  const join = (o: Intl.DateTimeFormatOptions) =>
    last ? `${strip(fmt(first, o))}${NDASH}${strip(fmt(last, o))}` : strip(fmt(first, o));

  const monthOpts: Intl.DateTimeFormatOptions = withYear
    ? { month: 'short', year: 'numeric' }
    : { month: 'short' };
  const month = strip(monthLine(first, last, locale, monthOpts));
  const day = join({ day: 'numeric' });
  const weekday = join({ weekday: 'short' });

  // Relative state + the word it contributes.
  let relative: DateTileRelative = null;
  let word: string | null = null;
  if (opts.relative) {
    if (last) {
      if (last < today) relative = 'past';
      else if (first > today) {
        if (first === shiftDay(today, 1)) [relative, word] = ['tomorrow', words.tomorrow];
      } else [relative, word] = ['ongoing', words.ongoing];
    } else if (first === today) [relative, word] = ['today', words.today];
    else if (first === shiftDay(today, 1)) [relative, word] = ['tomorrow', words.tomorrow];
    else if (first === shiftDay(today, -1)) [relative, word] = ['past', words.yesterday];
    else if (first < today) relative = 'past';
  }

  // 24h locales get a padded hour ('09:00'); ICU's 'numeric' drops the zero even there.
  const hour12 = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12;
  const time = start.instant
    ? new Intl.DateTimeFormat(locale, {
        hour: hour12 === false ? '2-digit' : 'numeric',
        minute: '2-digit',
        timeZone,
      }).format(start.instant)
    : null;
  const showTime = show !== 'weekday' && time !== null;

  // Single-day relative words replace the weekday; ranges keep 'Fri–Sun'.
  const dayPart = !last && word ? word : weekday;
  const bottom = showTime ? (show === 'time' ? time : `${dayPart} · ${time}`) : dayPart;

  const longDate = last
    ? formatIsoRange(first, last, locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : fmt(first, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const label = [word, longDate, showTime ? time : null].filter(Boolean).join(', ');

  return {
    month,
    day,
    bottom,
    relative,
    label,
    dateTime: start.instant ? start.instant.toISOString() : first,
  };
}
