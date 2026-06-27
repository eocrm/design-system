// RichTextBlockMenu.tsx — internal block actions menu (DropdownMenu wrapper). The
// `⠿` handle is the trigger; open is controlled by the editor so a keyboard
// Shift+F10 can open the SAME menu anchored to the active block's handle.
import { forwardRef } from 'react';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import { useTranslation } from '../../i18n';
import type { BlockChoice } from './RichTextToolbar';
import type { BlockType } from '../RichText/engine/model';
import { RichTextColorMenu } from './RichTextColorMenu';
import { preventSelectionLoss } from './preventSelectionLoss';
import { GripIcon } from './icons';
import styles from './RichTextEditor.module.scss';

export type BlockAction = 'duplicate' | 'moveUp' | 'moveDown' | 'delete';

export interface RichTextBlockMenuProps {
  /** Controlled open state of the menu. */
  open: boolean;
  /** Fired when the menu wants to open/close. */
  onOpenChange: (open: boolean) => void;
  /** Fired for the flat actions (duplicate / move / delete). */
  onAction: (action: BlockAction) => void;
  /** Fired for a "Turn into" choice. */
  onTurnInto: (choice: BlockChoice) => void;
  /** When set, a Configure item appears at the top of the menu (e.g. attachment
   *  settings). Omit for blocks with nothing to configure. */
  onConfigure?: () => void;
  /** When set, two color submenus (Text color + Highlight) for the whole block are added. */
  onColor?: (type: 'textColor' | 'bgColor', key: string | null) => void;
  /** Type of the block the menu targets. "Turn into" is hidden for `attachment`
   *  (a void block — converting an image to a heading is nonsense). */
  blockType?: BlockType;
}

/**
 * Internal: the `⠿` block-actions handle and its menu. The handle is the
 * DropdownMenu trigger and is `tabIndex={-1}` (not a tab stop — keyboard users
 * open it via Shift+F10 in the editor). "Turn into" reuses the block-type labels
 * and is omitted for void attachment blocks.
 */
export const RichTextBlockMenu = forwardRef<HTMLButtonElement, RichTextBlockMenuProps>(
  function RichTextBlockMenu(
    { open, onOpenChange, onAction, onTurnInto, onConfigure, onColor, blockType },
    ref,
  ) {
    const t = useTranslation();
    return (
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenu.Trigger>
          <Button
            ref={ref}
            size="sm"
            variant="ghost"
            iconOnly
            tabIndex={-1}
            aria-label={t('richTextEditor.blockActions')}
            className={styles.gutterButton}
            onMouseDown={preventSelectionLoss}
          >
            <GripIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content side="bottom" align="start">
          {onConfigure && (
            <DropdownMenu.Item onSelect={onConfigure}>
              {t('richTextEditor.attachmentConfigure')}
            </DropdownMenu.Item>
          )}
          {onColor && (
            <>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>{t('richTextEditor.textColor')}</DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  {/* The block menu doesn't reflect an active color — omit `active`. The
                      badges are plain buttons (pointer-first), not registered menu items. */}
                  <RichTextColorMenu type="textColor" onPick={(key) => onColor('textColor', key)} />
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>{t('richTextEditor.highlight')}</DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <RichTextColorMenu type="bgColor" onPick={(key) => onColor('bgColor', key)} />
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
            </>
          )}
          {blockType !== 'attachment' && (
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>{t('richTextEditor.blockTurnInto')}</DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'paragraph' })}>
                  {t('richTextEditor.paragraph')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'heading', level: 1 })}>
                  {t('richTextEditor.heading1')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'heading', level: 2 })}>
                  {t('richTextEditor.heading2')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'heading', level: 3 })}>
                  {t('richTextEditor.heading3')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'bullet_item' })}>
                  {t('richTextEditor.bulletList')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'ordered_item' })}>
                  {t('richTextEditor.orderedList')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'blockquote' })}>
                  {t('richTextEditor.blockquote')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'code_block' })}>
                  {t('richTextEditor.codeBlock')}
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          )}
          <DropdownMenu.Separator />
          <DropdownMenu.Item shortcut="⌘D" onSelect={() => onAction('duplicate')}>
            {t('richTextEditor.blockDuplicate')}
          </DropdownMenu.Item>
          <DropdownMenu.Item shortcut="⌘⇧↑" onSelect={() => onAction('moveUp')}>
            {t('richTextEditor.blockMoveUp')}
          </DropdownMenu.Item>
          <DropdownMenu.Item shortcut="⌘⇧↓" onSelect={() => onAction('moveDown')}>
            {t('richTextEditor.blockMoveDown')}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item tone="danger" onSelect={() => onAction('delete')}>
            {t('richTextEditor.blockDelete')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    );
  },
);
