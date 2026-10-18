/**
 * Layout-independent letter-shortcut match (#654).
 *
 * `event.key` is the character the layout produced, so on a Russian layout the
 * K key yields `'л'` and a `key === 'k'` check silently drops the shortcut.
 * `event.code` is the physical key (`'KeyK'`) on every layout — but on a remapped
 * Latin layout (AZERTY, Dvorak) it names the wrong letter. So: trust `key` when
 * it is a Latin letter, fall back to `code` only when it is a non-ASCII
 * character (Cyrillic, Greek, …). ASCII punctuation on a letter position is a
 * real key (Dvorak's `;` sits on KeyZ), so it never falls back.
 *
 * No fallback while Alt is held: Windows reports AltGr as Ctrl+Alt, so AltGr+Z
 * on a Polish layout (`'ż'`, `KeyZ`, ctrlKey) is typing, not ⌘Z; the same goes
 * for macOS Option+letter.
 *
 * `letter` is a single lowercase a–z.
 */
export function isLetterKey(
  event: { key: string; code: string; altKey?: boolean },
  letter: string,
): boolean {
  const key = event.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return key === letter;
  const nonAscii = key.length === 1 && key > '\x7f';
  return nonAscii && !event.altKey && event.code === `Key${letter.toUpperCase()}`;
}
