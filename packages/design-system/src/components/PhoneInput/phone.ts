// phone.ts — pure wrappers around libphonenumber-js (compact `min` metadata) +
// Intl.DisplayNames for localized country names. The ONLY place the library
// imports libphonenumber-js, so the dependency stays isolated + testable.
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';

export type { CountryCode };

/** One selectable country: ISO code, localized name, and calling code (no `+`). */
export interface CountryOption {
  iso: CountryCode;
  name: string;
  callingCode: string;
}

function displayNames(locale: string): Intl.DisplayNames {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  }
}

/**
 * Every supported country (or the `only` subset) as `{ iso, name, callingCode }`,
 * names localized to `locale` via `Intl.DisplayNames`, sorted by name.
 */
export function getCountryOptions(locale: string, only?: string[]): CountryOption[] {
  const display = displayNames(locale);
  const all = getCountries();
  const isos: CountryCode[] =
    only && only.length
      ? (only.filter((c) => all.includes(c as CountryCode)) as CountryCode[])
      : all;
  return isos
    .map((iso) => ({
      iso,
      name: display.of(iso) ?? iso,
      callingCode: getCountryCallingCode(iso),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Parse an E.164 string into its country + national display, or null if unparseable. */
export function parseE164(value: string): { country: CountryCode | undefined; national: string } | null {
  const parsed = parsePhoneNumberFromString(value);
  if (!parsed) return null;
  return { country: parsed.country, national: parsed.formatNational() };
}

/** Format a raw national input for `country` as the user types (idempotent on a formatted string). */
export function formatNational(input: string, country: CountryCode): string {
  return new AsYouType(country).input(input);
}

/** Best-effort canonical E.164 from a raw national input + country, or null if not yet a number. */
export function toE164(input: string, country: CountryCode): string | null {
  const ayt = new AsYouType(country);
  ayt.input(input);
  const num = ayt.getNumber();
  return num ? num.number : null;
}

/** True iff `e164` is a valid phone number. Exported so a host can drive Field `invalid` chrome. */
export function isValidPhone(e164: string | null | undefined): boolean {
  if (!e164) return false;
  try {
    return isValidPhoneNumber(e164);
  } catch {
    return false;
  }
}
