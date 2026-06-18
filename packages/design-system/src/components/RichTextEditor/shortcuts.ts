// shortcuts.ts — map a keydown to the inline mark it toggles. `shortcutMark` is
// pure (key + modifiers → Mark | null); the editor reads it for both the
// selection toggle and the collapsed-caret pending-mark path.
import type { Mark } from '../RichText/engine/model';

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
 * truth for the key→mark mapping — the editor reads it for both the selection
 * toggle and the collapsed-caret pending-mark path. Pure: no DOM, no side
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
