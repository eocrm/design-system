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
 * owner's), undo/redo go to the owner, new block ids come from `newId`.
 * @internal
 */
export interface CollabSeam {
  /** Filled by the editor with its handle while mounted. */
  handle: MutableRefObject<CollabEditorHandle | null>;
  /** Block-id source while this editor is the active one (mount / focus). */
  newId: () => string;
  /** Replace the editor's own undo/redo (keyboard, `beforeinput`, toolbar). */
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Fires before each local edit reaches `onChange`, with its kind (undo steps follow kinds). */
  editKind: (kind: EditKind) => void;
  /** Fires after the editor handled `compositionend` (and committed the composed text). */
  compositionEnd: () => void;
  /** Fires on every `selectionchange` with the editor's model selection (`null` outside). */
  onSelectionChange?: (sel: Range | null) => void;
  /** Rendered beside the editable (presence carets). */
  overlay?: ReactNode;
}

/** @internal */
export const CollabSeamContext = createContext<CollabSeam | null>(null);
