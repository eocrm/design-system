/**
 * Layout-independent letter-shortcut match (#654).
 *
 * `event.key` is the character the layout produced, so on a Russian layout the
 * K key yields `'л'` and a `key === 'k'` check silently drops the shortcut.
 * `event.code` is the physical key (`'KeyK'`) on every layout — but on a remapped
 * Latin layout (AZERTY, Dvorak) it names the wrong letter. So: trust `key` when
 * it is a Latin letter, fall back to `code` only when it isn't.
 *
 * `letter` is a single lowercase a–z.
 */
export function isLetterKey(event: { key: string; code: string }, letter: string): boolean {
  const key = event.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return key === letter;
  return event.code === `Key${letter.toUpperCase()}`;
}
