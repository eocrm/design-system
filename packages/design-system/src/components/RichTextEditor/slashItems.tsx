// slashItems.tsx — public slash-menu types, the default items, filtering, and the
// pure "run an item" transform the editor commits as ONE undo step.
import type { ReactNode } from 'react';
import type { MessageKey } from '../../i18n/messages';
import { isVoidBlock } from '../RichText/engine/attachment';
import { isListItem } from '../RichText/engine/listDepths';
import {
  createBlock,
  nextId,
  type Block,
  type BlockType,
  type RichDoc,
} from '../RichText/engine/model';
import { blockLength, findBlockIndex } from '../RichText/engine/position';
import { deleteRange, setBlockType } from '../RichText/engine/transforms';
import {
  AttachFileIcon,
  BulletListIcon,
  ChecklistIcon,
  CodeIcon,
  DividerIcon,
  ImageIcon,
  OrderedListIcon,
  QuoteIcon,
} from './icons';
import styles from './RichTextEditor.module.scss';

/** Slash-menu section an item is listed under, in this order: Text, Lists, Media, Advanced. */
export type SlashGroup = 'text' | 'lists' | 'media' | 'advanced';

/** One entry in the `slashMenu`. */
export interface SlashItem {
  /** Stable, unique id (React key; defaults use `paragraph`, `heading1`…`heading3`, `quote`, `code`, `bullet`, `numbered`, `checklist`, `divider`, `image`, `file`). */
  id: string;
  /** Section the item is listed under. */
  group: SlashGroup;
  /** Visible name; also matched by the filter. Pass a translated string. */
  label: string;
  /** Short muted description under the name. */
  hint?: string;
  /** Decorative icon (hidden from assistive tech). */
  icon?: ReactNode;
  /** Extra filter terms (e.g. `['h2']`). */
  keywords?: string[];
  /** Synchronous action. Everything it does through `api`, plus removing the typed `/query`, is one undo step. */
  run: (api: SlashApi) => void;
}

/** What a `SlashItem.run` can do to the document. */
export interface SlashApi {
  /** Block holding the `/`, already stripped of `/query`. */
  blockId: string;
  /** Convert that block, like the block menu's "Turn into". Void targets (divider, attachment) are refused. */
  turnInto(change: { type: BlockType; level?: 1 | 2 | 3 }): void;
  /** Insert blocks after it; if it is empty, it is replaced. Ids are reassigned via createBlockId. */
  insertBlocks(blocks: Block[]): void;
  /** Open the editor's upload picker (only when `upload` is set). */
  openUpload(kind: 'image' | 'file'): void;
}

/** The object form of the `slashMenu` prop. */
export interface RichTextSlashMenuOption {
  /** Build the item list from the defaults: filter, reorder or append your own (e.g. templates). */
  items?: (defaults: SlashItem[]) => SlashItem[];
}

const GROUP_ORDER: SlashGroup[] = ['text', 'lists', 'media', 'advanced'];

/** Case-insensitive substring match on label + keywords; result sorted (stably) by group. */
export function filterSlashItems(items: SlashItem[], query: string): SlashItem[] {
  const q = query.toLowerCase();
  return items
    .filter((i) => [i.label, ...(i.keywords ?? [])].some((s) => s.toLowerCase().includes(q)))
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
}

type Translate = (key: MessageKey) => string;

const glyph = (text: string) => (
  <span className={styles.slashGlyph} aria-hidden="true">
    {text}
  </span>
);

/** The built-in items; `image`/`file` only when the editor has `upload`. */
export function defaultSlashItems({
  t,
  hasUpload,
}: {
  t: Translate;
  hasUpload: boolean;
}): SlashItem[] {
  const turn = (type: BlockType, level?: 1 | 2 | 3) => (api: SlashApi) =>
    api.turnInto({ type, level });
  const items: SlashItem[] = [
    {
      id: 'paragraph',
      group: 'text',
      label: t('richTextEditor.paragraph'),
      hint: t('richTextEditor.slashParagraphHint'),
      icon: glyph('T'),
      keywords: ['text', 'p'],
      run: turn('paragraph'),
    },
    ...([1, 2, 3] as const).map(
      (level): SlashItem => ({
        id: `heading${level}`,
        group: 'text',
        label: t(`richTextEditor.heading${level}`),
        hint: t(`richTextEditor.slashHeading${level}Hint`),
        icon: glyph(`H${level}`),
        keywords: [`h${level}`, 'title'],
        run: turn('heading', level),
      }),
    ),
    {
      id: 'quote',
      group: 'text',
      label: t('richTextEditor.blockquote'),
      hint: t('richTextEditor.slashQuoteHint'),
      icon: <QuoteIcon />,
      keywords: ['blockquote'],
      run: turn('blockquote'),
    },
    {
      id: 'code',
      group: 'advanced',
      label: t('richTextEditor.codeBlock'),
      hint: t('richTextEditor.slashCodeHint'),
      icon: <CodeIcon />,
      keywords: ['pre'],
      run: turn('code_block'),
    },
    {
      id: 'bullet',
      group: 'lists',
      label: t('richTextEditor.bulletList'),
      hint: t('richTextEditor.slashBulletHint'),
      icon: <BulletListIcon />,
      keywords: ['ul', 'unordered'],
      run: turn('bullet_item'),
    },
    {
      id: 'numbered',
      group: 'lists',
      label: t('richTextEditor.orderedList'),
      hint: t('richTextEditor.slashNumberedHint'),
      icon: <OrderedListIcon />,
      keywords: ['ol', 'ordered'],
      run: turn('ordered_item'),
    },
    {
      id: 'checklist',
      group: 'lists',
      label: t('richTextEditor.checklist'),
      hint: t('richTextEditor.slashChecklistHint'),
      icon: <ChecklistIcon />,
      keywords: ['todo', 'task'],
      run: turn('checklist_item'),
    },
    {
      id: 'divider',
      group: 'advanced',
      label: t('richTextEditor.divider'),
      hint: t('richTextEditor.slashDividerHint'),
      icon: <DividerIcon />,
      keywords: ['hr', 'rule', 'separator'],
      run: (api) => api.insertBlocks([createBlock('divider')]),
    },
  ];
  if (hasUpload) {
    items.push(
      {
        id: 'image',
        group: 'media',
        label: t('richTextEditor.slashImage'),
        hint: t('richTextEditor.slashImageHint'),
        icon: <ImageIcon />,
        keywords: ['picture', 'photo'],
        run: (api) => api.openUpload('image'),
      },
      {
        id: 'file',
        group: 'media',
        label: t('richTextEditor.slashFile'),
        hint: t('richTextEditor.slashFileHint'),
        icon: <AttachFileIcon />,
        keywords: ['attachment', 'upload'],
        run: (api) => api.openUpload('file'),
      },
    );
  }
  return items;
}

/**
 * Strip `/query` (`from`..`to` in `blockId`) and run `item` against the result.
 * Returns the edit to commit (one undo step) and any upload kind `run` asked for —
 * the caller opens the picker after committing.
 */
export function applySlashItem(
  doc: RichDoc,
  ctx: { blockId: string; from: number; to: number },
  item: SlashItem,
): {
  result: {
    doc: RichDoc;
    selection: {
      anchor: { blockId: string; offset: number };
      focus: { blockId: string; offset: number };
    };
  };
  upload: 'image' | 'file' | null;
} {
  const { blockId } = ctx;
  let state = deleteRange(doc, {
    anchor: { blockId, offset: ctx.from },
    focus: { blockId, offset: ctx.to },
  });
  let upload: 'image' | 'file' | null = null;
  // insertBlocks chains: later calls insert after the previous call's last block.
  let after = blockId;
  const at = (id: string, offset: number) => {
    const p = { blockId: id, offset };
    return { anchor: p, focus: p };
  };
  item.run({
    blockId,
    turnInto({ type, level }) {
      if (isVoidBlock({ type } as Block)) return;
      const patch = isListItem({ type }) ? { type, depth: 0 } : level ? { type, level } : { type };
      state = { doc: setBlockType(state.doc, blockId, patch).doc, selection: state.selection };
    },
    insertBlocks(blocks) {
      const list = state.doc.blocks;
      const idx = findBlockIndex(state.doc, after);
      if (idx === -1 || !blocks.length) return;
      const fresh = blocks.map((b) => ({ ...b, id: nextId() }));
      // A void last block leaves the caret nowhere: follow it with a paragraph.
      if (isVoidBlock(fresh[fresh.length - 1])) fresh.push(createBlock('paragraph'));
      const replace = after === blockId && !isVoidBlock(list[idx]) && blockLength(list[idx]) === 0;
      const last = fresh[fresh.length - 1];
      state = {
        doc: {
          blocks: [...list.slice(0, replace ? idx : idx + 1), ...fresh, ...list.slice(idx + 1)],
        },
        selection: at(last.id, blockLength(last)),
      };
      after = last.id;
    },
    openUpload(kind) {
      upload = kind;
    },
  });
  return { result: state, upload };
}
