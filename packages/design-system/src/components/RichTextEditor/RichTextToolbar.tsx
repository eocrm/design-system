import type { ReactElement } from 'react';
import type { BlockType, MarkType } from '../RichText/engine/model';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import { useTranslation } from '../../i18n';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  BulletListIcon,
  OrderedListIcon,
} from './icons';
import styles from './RichTextEditor.module.scss';

/** The block type (+ optional heading level) the toolbar reflects/selects. */
export type BlockChoice = { type: BlockType; level?: 1 | 2 | 3 };

export interface RichTextToolbarProps {
  /** Mark types active across the current selection (drives the pressed state). */
  activeMarks: MarkType[];
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
  block,
  disabled,
  onToggleMark,
  onSetBlock,
  onToggleList,
}: RichTextToolbarProps) {
  const t = useTranslation();

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
            onClick={() => onToggleMark(type)}
          >
            <Icon />
          </Button>
        );
      })}

      <span className={styles.toolbarSep} aria-hidden="true" />

      <Button
        size="sm"
        variant={isList('bullet_item') ? 'secondary' : 'ghost'}
        iconOnly
        aria-label={t('richTextEditor.bulletList')}
        aria-pressed={isList('bullet_item')}
        disabled={disabled}
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
        onClick={() => onToggleList('ordered_item')}
      >
        <OrderedListIcon />
      </Button>
    </div>
  );
}
