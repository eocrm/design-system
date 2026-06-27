// preventSelectionLoss.ts — shared mousedown guard for toolbar/menu controls that
// act on the editor's current selection (kept in one place to avoid drift).
import type { MouseEvent } from 'react';

/**
 * mousedown handler that preserves the editor's DOM selection: focus leaving the
 * contentEditable would collapse the selection before a toolbar/menu action runs.
 *
 * Wire it as `onMouseDown={preventSelectionLoss}` on any toolbar/menu control that
 * acts on the current editor selection (mark toggles, color swatches, block
 * actions) so the caret/range is still live when the control's onClick fires.
 */
export function preventSelectionLoss(e: MouseEvent): void {
  e.preventDefault();
}
