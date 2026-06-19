// mentionContext.ts — pure detection of an open mention context at a caret.

/** A detected, open mention context. */
export interface MentionContext {
  /** Text typed after the trigger, up to the caret (may be ''). */
  query: string;
  /** Offset of the trigger char within the block text. */
  triggerOffset: number;
}

/**
 * Detect an open mention context at a collapsed caret within `blockText`.
 * Returns a context only when the nearest `trigger` before `caretOffset` is at
 * block start or preceded by whitespace, and no whitespace sits between it and
 * the caret. Otherwise returns null.
 *
 * @example
 * getMentionContext('hi @al', 6, '@'); // { query: 'al', triggerOffset: 3 }
 */
export function getMentionContext(
  blockText: string,
  caretOffset: number,
  trigger: string,
): MentionContext | null {
  if (!trigger) return null;
  // Scan backward from the caret to the nearest trigger; bail on whitespace.
  for (let i = caretOffset - 1; i >= 0; i -= 1) {
    const ch = blockText[i];
    if (/\s/.test(ch)) return null; // whitespace between trigger and caret → closed
    if (ch === trigger) {
      const before = i === 0 ? '' : blockText[i - 1];
      if (i !== 0 && !/\s/.test(before)) return null; // mid-word trigger
      return { query: blockText.slice(i + trigger.length, caretOffset), triggerOffset: i };
    }
  }
  return null;
}
