// shortcuts.ts — map a keydown to an inline-mark toggle. Pure: returns the new
// { doc, selection } or null (not a shortcut → caller lets the key through).
import type { RichDoc, Range, Mark } from '../RichText/engine/model';
import { toggleMark } from '../RichText/engine/transforms';

/** The new document + selection after a shortcut, or `null` if the key isn't one. */
export type ShortcutResult = { doc: RichDoc; selection: Range } | null;

/** The minimal keyboard-event shape `applyShortcut` reads (matches `KeyboardEvent`). */
export interface ShortcutKey {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}

/**
 * Map a keyboard event (key + modifiers) to an inline-mark toggle over `range`.
 * Pure: no DOM access, no side effects.
 *
 * Handled shortcuts:
 * - ⌘/Ctrl+B → bold
 * - ⌘/Ctrl+I → italic
 * - ⌘/Ctrl+U → underline
 * - ⌘/Ctrl+⇧X → strike
 *
 * @returns `{ doc, selection }` with the mark toggled over `range`, or `null`
 *   when the key combination doesn't match any shortcut (let the event through).
 *
 * @example
 * const result = applyShortcut(doc, range, e);
 * if (result) { e.preventDefault(); commit(result); }
 */
export function applyShortcut(doc: RichDoc, range: Range, e: ShortcutKey): ShortcutResult {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return null;
  const k = e.key.toLowerCase();
  let mark: Mark | null = null;
  if (k === 'b' && !e.shiftKey) mark = { type: 'bold' };
  else if (k === 'i' && !e.shiftKey) mark = { type: 'italic' };
  else if (k === 'u' && !e.shiftKey) mark = { type: 'underline' };
  else if (k === 'x' && e.shiftKey) mark = { type: 'strike' };
  if (!mark) return null;
  return toggleMark(doc, range, mark);
}
