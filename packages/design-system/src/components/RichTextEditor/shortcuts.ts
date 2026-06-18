// shortcuts.ts — map a keydown to an inline-mark toggle. Pure: returns the new
// { doc, selection } or null (not a shortcut → caller lets the key through).
import type { RichDoc, Range, Mark } from '../RichText/engine/model';
import { toggleMark } from '../RichText/engine/transforms';

/** The new document + selection after a shortcut, or `null` if the key isn't one. */
export type ShortcutResult = { doc: RichDoc; selection: Range } | null;

/** The minimal keyboard-event shape the shortcut helpers read (matches `KeyboardEvent`). */
export interface ShortcutKey {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}

/**
 * Map a keyboard event (key + modifiers) to the inline mark it toggles, or
 * `null` when the combination isn't a formatting shortcut. The single source of
 * truth for the key→mark mapping — both `applyShortcut` (selection path) and the
 * editor's collapsed-caret pending-mark path read it. Pure: no DOM, no side
 * effects.
 *
 * Handled shortcuts:
 * - ⌘/Ctrl+B → bold
 * - ⌘/Ctrl+I → italic
 * - ⌘/Ctrl+U → underline
 * - ⌘/Ctrl+⇧X → strike
 *
 * @example
 * const mark = shortcutMark(e);
 * if (mark) { e.preventDefault(); commit(toggleMark(doc, range, mark)); }
 */
export function shortcutMark(e: ShortcutKey): Mark | null {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return null;
  const k = e.key.toLowerCase();
  if (k === 'b' && !e.shiftKey) return { type: 'bold' };
  if (k === 'i' && !e.shiftKey) return { type: 'italic' };
  if (k === 'u' && !e.shiftKey) return { type: 'underline' };
  if (k === 'x' && e.shiftKey) return { type: 'strike' };
  return null;
}

/**
 * Map a keyboard event (key + modifiers) to an inline-mark toggle over `range`.
 * Pure: no DOM access, no side effects. Built on {@link shortcutMark}.
 *
 * @returns `{ doc, selection }` with the mark toggled over `range`, or `null`
 *   when the key combination doesn't match any shortcut (let the event through).
 *
 * @example
 * const result = applyShortcut(doc, range, e);
 * if (result) { e.preventDefault(); commit(result); }
 */
export function applyShortcut(doc: RichDoc, range: Range, e: ShortcutKey): ShortcutResult {
  const mark = shortcutMark(e);
  return mark ? toggleMark(doc, range, mark) : null;
}
