// Empty interface to start — components add their keys as they migrate.
// Each leaf is either a string (static), a function (parameterized), or a
// readonly string array (months / weekdays).
//
// As components migrate, they extend this interface with their own namespace,
// e.g. `alert: { dismiss: string }`. Both en.ts and ru.ts must then populate
// the new keys.
export interface Messages {
  // Will be populated cluster by cluster. See spec §"Messages shape".
}

/** Supported locale codes. v1 ships English and Russian. */
export type Locale = 'en' | 'ru';

/**
 * Recursive deep-partial. Preserves function leaves untouched (a partial
 * override of a function leaf would be meaningless) and treats arrays as
 * atomic (the consumer either replaces the whole array or leaves the default).
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends readonly unknown[]
      ? T[K]
      : T[K] extends object
        ? DeepPartial<T[K]>
        : T[K];
};

type Leaf = string | ((...args: never[]) => string) | readonly string[];

/**
 * All valid dotted message keys derived from the `Messages` interface.
 *
 * While `Messages` is empty this resolves to `never` — `t()` accepts no keys
 * until components start populating the interface. Each new namespace
 * automatically widens the `MessageKey` union with no extra plumbing.
 */
export type MessageKey<T = Messages> = T extends Leaf
  ? ''
  : {
      [K in keyof T & string]: T[K] extends Leaf
        ? K
        : `${K}.${MessageKey<T[K]>}`;
    }[keyof T & string];
