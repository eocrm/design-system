// BCP-47 locale tagging (used by Calendar formatters and other Intl callers).
export { LocaleProvider, LocaleContext } from './LocaleProvider';
export type { LocaleProviderProps } from './LocaleProvider';
export { useLocale } from './useLocale';

// Translated UI strings: provider + hook + en/ru defaults + override merge.
export { I18nProvider, I18nContext } from './I18nProvider';
export type { I18nProviderProps } from './I18nProvider';
export { useTranslation, useTranslationArray } from './useTranslation';
export { deepMerge, lookupKey, ruPlural } from './format';
export type { Locale, Messages, MessageKey, DeepPartial } from './messages';
export { en } from './en';
export { ru } from './ru';
