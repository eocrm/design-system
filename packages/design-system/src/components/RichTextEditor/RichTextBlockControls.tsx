// RichTextBlockControls.tsx — the per-block gutter overlay. Absolutely positioned
// inside the editor shell (position: relative), aligned to the active block's box.
// Lives OUTSIDE the contentEditable so it is never editable content.
import { useLayoutEffect, useState, type RefObject } from 'react';
import { Button } from '../Button';
import { useTranslation } from '../../i18n';
import { RichTextBlockMenu, type BlockAction } from './RichTextBlockMenu';
import type { BlockChoice } from './RichTextToolbar';
import { PlusIcon } from './icons';
import styles from './RichTextEditor.module.scss';

export interface RichTextBlockControlsProps {
  /** The editor root (contentEditable) element ref — used to locate block boxes. */
  rootRef: RefObject<HTMLElement | null>;
  /** Block currently hovered or holding the caret; null hides the gutter. */
  activeBlockId: string | null;
  /** Controlled open state of the block menu. */
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onInsertBelow: (blockId: string) => void;
  onAction: (blockId: string, action: BlockAction) => void;
  onTurnInto: (blockId: string, choice: BlockChoice) => void;
}

const GUTTER_ROW_HEIGHT = 24;

/**
 * Internal: the gutter overlay for the active block. Measures the block element's
 * vertical offset within the shell and renders the `＋` insert button + the block
 * menu there. Renders nothing when there is no active block.
 */
export function RichTextBlockControls({
  rootRef,
  activeBlockId,
  menuOpen,
  onMenuOpenChange,
  onInsertBelow,
  onAction,
  onTurnInto,
}: RichTextBlockControlsProps) {
  const t = useTranslation();
  const [top, setTop] = useState<number | null>(null);
  // Bumped to re-run measurement when the root ref / block element is not yet
  // attached on the first layout-effect pass (the parent's element ref can attach
  // after this child's effect runs on mount).
  const [retry, setRetry] = useState(0);

  useLayoutEffect(() => {
    if (!activeBlockId) {
      setTop(null);
      setRetry(0); // fresh retry budget for the next activation
      return;
    }
    const root = rootRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(activeBlockId)}"]`);
    if (!root || !el) {
      setTop(null);
      // The root or block element isn't measurable yet; retry once it mounts.
      if (retry < 2) setRetry((n) => n + 1);
      return;
    }
    const rootBox = root.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setTop(box.top - rootBox.top + (box.height - GUTTER_ROW_HEIGHT) / 2);
  }, [rootRef, activeBlockId, menuOpen, retry]);

  if (!activeBlockId || top == null) return null;

  return (
    <div className={styles.gutter} style={{ top }} contentEditable={false}>
      <Button
        size="sm"
        variant="ghost"
        iconOnly
        tabIndex={-1}
        aria-label={t('richTextEditor.blockInsert')}
        className={styles.gutterButton}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onInsertBelow(activeBlockId)}
      >
        <PlusIcon />
      </Button>
      <RichTextBlockMenu
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onAction={(a) => onAction(activeBlockId, a)}
        onTurnInto={(c) => onTurnInto(activeBlockId, c)}
      />
    </div>
  );
}
