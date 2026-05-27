import type { Messages } from './messages';

/**
 * English message defaults. Populated section-by-section as each component
 * migrates onto the i18n system. The `{} as Messages` cast is sound while the
 * `Messages` interface is empty — once components add their namespaces, this
 * object must populate every required key or TS will fail.
 */
export const en: Messages = {} as Messages;
