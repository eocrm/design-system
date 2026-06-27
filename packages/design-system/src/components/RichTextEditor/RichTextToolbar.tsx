import { useRef, type ReactElement } from 'react';
import type { BlockType, MarkType } from '../RichText/engine/model';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import { EmojiPickerPopover } from '../EmojiPicker';
import { Popover } from '../Popover';
import { useTranslation } from '../../i18n';
import { RichTextColorMenu } from './RichTextColorMenu';
import type { ActiveColors } from './commands';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  BulletListIcon,
  OrderedListIcon,
  LinkIcon,
  UndoIcon,
  RedoIcon,
  AttachFileIcon,
  SmileIcon,
  TextColorIcon,
  HighlightIcon,
} from './icons';
import styles from './RichTextEditor.module.scss';

/** The block type (+ optional heading level) the toolbar reflects/selects. */
export type BlockChoice = { type: BlockType; level?: 1 | 2 | 3 };

export interface RichTextToolbarProps {
  /** Mark types active across the current selection (drives the pressed state). */
  activeMarks: MarkType[];
  /** Active color key per type, to ring the current swatch in the color menu. */
  colors: ActiveColors;
  /** Set a text/highlight color (palette key) — or clear (`null`) — for the selection. */
  onSetColor: (type: 'textColor' | 'bgColor', key: string | null) => void;
  /** The block type spanning the selection, or `null` when it's mixed. */
  block: BlockChoice | null;
  /** Disable every control (e.g. when the editor is read-only). */
  disabled?: boolean;
  /** Toggle a mark over the current selection. */
  onToggleMark: (type: MarkType) => void;
  /** Set the block type of every block in the selection. */
  onSetBlock: (choice: BlockChoice) => void;
  /** Toggle the selected blocks into/out of a bullet or numbered list. */
  onToggleList: (listType: 'bullet_item' | 'ordered_item') => void;
  /** Whether the current selection sits inside a link (drives the Link button's pressed state). */
  linkActive?: boolean;
  /** Open the link editor for the current selection. */
  onOpenLink: () => void;
  /** Whether an undo step is available (drives the Undo button's enabled state). */
  canUndo?: boolean;
  /** Whether a redo step is available. */
  canRedo?: boolean;
  /** Undo the last change. */
  onUndo: () => void;
  /** Redo the last undone change. */
  onRedo: () => void;
  /** When set, renders an upload button that opens a file picker. */
  onUpload?: (files: File[]) => void;
  /** Native file-picker `accept` filter. */
  uploadAccept?: string;
  /** Insert an emoji at the caret. */
  onInsertEmoji: (emoji: string) => void;
}

const MARKS: {
  type: MarkType;
  Icon: () => ReactElement;
  key: 'bold' | 'italic' | 'underline' | 'strike';
}[] = [
  { type: 'bold', Icon: BoldIcon, key: 'bold' },
  { type: 'italic', Icon: ItalicIcon, key: 'italic' },
  { type: 'underline', Icon: UnderlineIcon, key: 'underline' },
  { type: 'strike', Icon: StrikeIcon, key: 'strike' },
];

/**
 * Internal presentational toolbar for `<RichTextEditor toolbar>`. It owns no
 * state: the editor derives the active marks + current block from its selection
 * and passes them down, and routes the dispatch callbacks back through the same
 * commit path the keyboard uses. Renders a block-type dropdown, mark toggle
 * buttons, and list toggles inside a `role="toolbar"` container.
 *
 * @example
 * <RichTextToolbar
 *   activeMarks={['bold']}
 *   block={{ type: 'heading', level: 2 }}
 *   onToggleMark={(type) => …}
 *   onSetBlock={(choice) => …}
 *   onToggleList={(listType) => …}
 * />
 */
export function RichTextToolbar({
  activeMarks,
  colors,
  onSetColor,
  block,
  disabled,
  onToggleMark,
  onSetBlock,
  onToggleList,
  linkActive = false,
  onOpenLink,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onUpload,
  uploadAccept,
  onInsertEmoji,
}: RichTextToolbarProps) {
  const t = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blockLabel = (() => {
    if (!block) return t('richTextEditor.mixed');
    switch (block.type) {
      case 'heading':
        return t(`richTextEditor.heading${block.level ?? 1}` as 'richTextEditor.heading1');
      case 'blockquote':
        return t('richTextEditor.blockquote');
      case 'code_block':
        return t('richTextEditor.codeBlock');
      case 'bullet_item':
      case 'ordered_item':
      case 'paragraph':
      default:
        return t('richTextEditor.paragraph');
    }
  })();

  const isList = (lt: 'bullet_item' | 'ordered_item') => block?.type === lt;

  return (
    <div className={styles.toolbar} role="toolbar" aria-label={t('richTextEditor.toolbar')}>
      <Button
        size="sm"
        variant="ghost"
        iconOnly
        aria-label={t('richTextEditor.undo')}
        disabled={disabled || !canUndo}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onUndo}
      >
        <UndoIcon />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        iconOnly
        aria-label={t('richTextEditor.redo')}
        disabled={disabled || !canRedo}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRedo}
      >
        <RedoIcon />
      </Button>
      <span className={styles.toolbarSep} aria-hidden="true" />
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            aria-label={t('richTextEditor.blockType')}
          >
            {blockLabel}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'paragraph' })}>
            {t('richTextEditor.paragraph')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'heading', level: 1 })}>
            {t('richTextEditor.heading1')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'heading', level: 2 })}>
            {t('richTextEditor.heading2')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'heading', level: 3 })}>
            {t('richTextEditor.heading3')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'blockquote' })}>
            {t('richTextEditor.blockquote')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'code_block' })}>
            {t('richTextEditor.codeBlock')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>

      <span className={styles.toolbarSep} aria-hidden="true" />

      {MARKS.map(({ type, Icon, key }) => {
        const active = activeMarks.includes(type);
        return (
          <Button
            key={type}
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            iconOnly
            aria-label={t(`richTextEditor.${key}`)}
            aria-pressed={active}
            disabled={disabled}
            // Keep the editor focused + its DOM selection live: a mousedown that
            // moves focus out of the contentEditable would collapse the selection
            // before the command runs.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onToggleMark(type)}
          >
            <Icon />
          </Button>
        );
      })}

      <Button
        size="sm"
        variant={linkActive ? 'secondary' : 'ghost'}
        iconOnly
        aria-label={t('richTextEditor.link')}
        aria-pressed={linkActive}
        disabled={disabled}
        // Preserve the editor's DOM selection (a mousedown that moves focus out
        // of the contentEditable would collapse it before the bubble opens).
        onMouseDown={(e) => e.preventDefault()}
        onClick={onOpenLink}
      >
        <LinkIcon />
      </Button>

      <EmojiPickerPopover
        trigger={
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            aria-label={t('richTextEditor.emoji')}
            disabled={disabled}
            // Preserve the editor's DOM selection so the caret is still live
            // when the emoji is chosen and onInsertEmoji reads it.
            onMouseDown={(e) => e.preventDefault()}
          >
            <SmileIcon />
          </Button>
        }
        onSelect={onInsertEmoji}
      />

      <Popover>
        <Popover.Trigger>
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            aria-label={t('richTextEditor.textColor')}
            disabled={disabled}
            // Preserve the editor's DOM selection so it's still live when a badge
            // is picked and onSetColor reads it (mirrors the emoji/link buttons).
            onMouseDown={(e) => e.preventDefault()}
          >
            <TextColorIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content>
          <RichTextColorMenu
            type="textColor"
            active={colors.textColor}
            onPick={(key) => onSetColor('textColor', key)}
          />
        </Popover.Content>
      </Popover>

      <Popover>
        <Popover.Trigger>
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            aria-label={t('richTextEditor.highlight')}
            disabled={disabled}
            // Same selection-preservation as the Text-color button above.
            onMouseDown={(e) => e.preventDefault()}
          >
            <HighlightIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content>
          <RichTextColorMenu
            type="bgColor"
            active={colors.bgColor}
            onPick={(key) => onSetColor('bgColor', key)}
          />
        </Popover.Content>
      </Popover>

      <span className={styles.toolbarSep} aria-hidden="true" />

      <Button
        size="sm"
        variant={isList('bullet_item') ? 'secondary' : 'ghost'}
        iconOnly
        aria-label={t('richTextEditor.bulletList')}
        aria-pressed={isList('bullet_item')}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onToggleList('bullet_item')}
      >
        <BulletListIcon />
      </Button>
      <Button
        size="sm"
        variant={isList('ordered_item') ? 'secondary' : 'ghost'}
        iconOnly
        aria-label={t('richTextEditor.orderedList')}
        aria-pressed={isList('ordered_item')}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onToggleList('ordered_item')}
      >
        <OrderedListIcon />
      </Button>

      {onUpload && (
        <>
          <span className={styles.toolbarSep} aria-hidden="true" />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={uploadAccept}
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) onUpload(files);
              e.target.value = ''; // allow re-picking the same file
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            aria-label={t('richTextEditor.upload')}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <AttachFileIcon />
          </Button>
        </>
      )}
    </div>
  );
}
