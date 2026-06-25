// attachment.ts — attachment (void) block helpers + transforms. Pure + immutable.
import type { RichDoc, Block, Point, Range } from './model';
import { createBlock, nextId } from './model';
import { findBlockIndex, blockLength } from './position';
import { sliceInlines, normalizeInlines } from './inlines';

/**
 * Fields for creating/patching an attachment block. All optional; only the
 * provided keys are written (so a block stays canonical — no `undefined` keys).
 * Mirrors the attachment fields on {@link Block}.
 */
export interface AttachmentAttrs {
  /** Display name / chip label (usually the File's name). */
  name?: string;
  /** MIME type — `image/*` renders an inline preview, else a file chip. */
  mime?: string;
  /** The uploaded URL. Absent while `status: 'uploading'`. */
  src?: string;
  /** Natural image dimensions (layout hints). */
  width?: number;
  height?: number;
  /** Image alt text. */
  alt?: string;
  /** Upload state. Defaults to `'ready'` when omitted. */
  status?: 'uploading' | 'ready' | 'error';
}

/** True for void blocks (no editable text; caret sits adjacent, never inside). */
export function isVoidBlock(block: Block): boolean {
  return block.type === 'attachment';
}

/**
 * Whether an attachment should render/serialize as an inline image (vs a file
 * chip). Decided by `mime` (`image/*`), falling back to the URL extension. Shared
 * by the renderer and the HTML/Markdown serializers so the rule never drifts.
 */
export function attachmentIsImage(block: Pick<Block, 'mime' | 'src'>): boolean {
  if (block.mime) return block.mime.startsWith('image/');
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(block.src ?? '');
}

function collapsed(blockId: string, offset = 0): Range {
  return { anchor: { blockId, offset }, focus: { blockId, offset } };
}

function attachmentBlock(attrs: AttachmentAttrs): Block {
  return {
    id: nextId(),
    type: 'attachment',
    inlines: [],
    status: attrs.status ?? 'ready',
    ...(attrs.name !== undefined ? { name: attrs.name } : {}),
    ...(attrs.mime !== undefined ? { mime: attrs.mime } : {}),
    ...(attrs.src !== undefined ? { src: attrs.src } : {}),
    ...(attrs.width !== undefined ? { width: attrs.width } : {}),
    ...(attrs.height !== undefined ? { height: attrs.height } : {}),
    ...(attrs.alt !== undefined ? { alt: attrs.alt } : {}),
  };
}

/**
 * Split the block at `point` and insert an attachment block between the halves.
 * Always leaves an editable paragraph AFTER the attachment (the caret's home);
 * the caret lands at offset 0 of that trailing block. If `point` is inside a void
 * block, inserts after it instead of splitting.
 */
export function insertAttachmentBlock(
  doc: RichDoc,
  point: Point,
  attrs: AttachmentAttrs,
): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1) return { doc, selection: collapsed(point.blockId, point.offset) };
  const block = doc.blocks[idx];
  const att = attachmentBlock(attrs);

  if (isVoidBlock(block)) {
    const after = createBlock('paragraph');
    const blocks = [...doc.blocks.slice(0, idx + 1), att, after, ...doc.blocks.slice(idx + 1)];
    return { doc: { blocks }, selection: collapsed(after.id) };
  }

  const left: Block = {
    ...block,
    inlines: normalizeInlines(sliceInlines(block.inlines, 0, point.offset)),
  };
  const rightInlines = normalizeInlines(
    sliceInlines(block.inlines, point.offset, blockLength(block)),
  );
  const right: Block = {
    ...createBlock(block.type, '', { level: block.level, depth: block.depth }),
    inlines: rightInlines,
  };
  const blocks = [...doc.blocks.slice(0, idx), left, att, right, ...doc.blocks.slice(idx + 1)];
  return { doc: { blocks }, selection: collapsed(right.id) };
}

/** Patch an attachment block's fields by id. Same-ref no-op if absent/not attachment. */
export function updateAttachmentBlock(doc: RichDoc, id: string, patch: AttachmentAttrs): RichDoc {
  const idx = findBlockIndex(doc, id);
  if (idx === -1 || doc.blocks[idx].type !== 'attachment') return doc;
  const blocks = doc.blocks.slice();
  blocks[idx] = { ...blocks[idx], ...patch };
  return { blocks };
}
