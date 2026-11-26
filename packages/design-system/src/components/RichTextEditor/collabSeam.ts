// collabSeam.ts — the internal seam `CollaborativeRichTextEditor` (`/collab`) drives `RichTextEditor`
// through. Not exported from the main entry. Without a provider the editor behaves exactly as before.
import { createContext, type MutableRefObject, type ReactNode } from 'react';
import type { Range } from '../RichText/engine/model';
import type { EditKind } from './history';

/**
 * What the editor exposes to the seam's owner (filled into `CollabSeam.handle` while mounted).
 * @internal
 */
export interface CollabEditorHandle {
  /** The model selection now in the DOM, or `null` when it is outside the editor. */
  readSelection(): Range | null;
  /** The selection the next render will place (a commit's caret), or `null`. */
  pendingSelection(): Range | null;
  /** Replace the selection the next render places (an outside value then keeps the caret). */
  setPendingSelection(range: Range | null): void;
  /** True while an IME composition is in progress (outside values must wait for its end). */
  isComposing(): boolean;
}

/**
 * Collaborative mode for `RichTextEditor`: an outside `value` is a remote change (history is the
 * owner's) and undo/redo go to the owner. Block ids are the owner's job (it renames new blocks).
 * Keep the object stable: the editor's handlers depend on it.
 * @internal
 */
export interface CollabSeam {
  /** Filled by the editor with its handle while mounted. */
  handle: MutableRefObject<CollabEditorHandle | null>;
  /** Replace the editor's own undo/redo (keyboard, `beforeinput`, toolbar). */
  undo: () => void;
  redo: () => void;
  /** Read while rendering (the owner re-renders the editor when they change). */
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** Fires before each local edit reaches `onChange`, with its kind (undo steps follow kinds). */
  editKind: (kind: EditKind) => void;
  /** Fires after the editor handled `compositionend` (and committed the composed text). */
  compositionEnd: () => void;
  /** Fires before a history-less commit (an upload settle or removal) reaches `onChange`. */
  untracked: () => void;
  /** The id a block the editor created now has (the owner renames new blocks). */
  resolveId: (id: string) => string;
  /**
   * Fires on every `selectionchange` with the editor's model selection, and on `focusout`;
   * `null` while the editable is not focused or the selection is outside it.
   */
  onSelectionChange?: (sel: Range | null) => void;
  /** Rendered right after the editable element, its previous sibling (presence carets). */
  overlay?: ReactNode;
  /** Rendered at the end of the toolbar row when `toolbar` is `true`, else after the editable. */
  status?: ReactNode;
}

/** @internal */
export const CollabSeamContext = createContext<CollabSeam | null>(null);
