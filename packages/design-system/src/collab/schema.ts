// schema.ts — the Y.Doc shape of a RichDoc and the bridge both ways. See the DS-92 spec, "Y schema".
import * as Y from 'yjs';
import type { Block, BlockType, Inline, Mark, RichDoc } from '../components/RichText/engine/model';
import { MARK_ORDER } from '../components/RichText/engine/marks';
import { normalizeInlines } from '../components/RichText/engine/inlines';
import { compareOrder, orderBetween } from './order';

/**
 * Root `Y.Map` name: block id → block `Y.Map` (`id`, `order`, `type`, attrs, `uploadedBy?`, `text`).
 * @internal
 */
export const BLOCKS = 'blocks';

// Block fields stored as plain Y.Map values. `uploadError` is deliberately absent: it stays local
// to the uploader (others show the generic failed state).
const ATTRS = [
  'level',
  'depth',
  'src',
  'name',
  'mime',
  'width',
  'height',
  'alt',
  'align',
  'status',
] as const;
const TYPES: readonly BlockType[] = [
  'paragraph',
  'heading',
  'bullet_item',
  'ordered_item',
  'blockquote',
  'code_block',
  'attachment',
];
// Seeded ids contain '_', so they never match live `${clientID.toString(36)}-${n}` ids.
const seedId = (i: number) => `s_${i}`;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string';

function marksToAttrs(marks: Mark[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const m of marks) {
    if (m.type === 'link') out.link = { href: m.href };
    else if (m.type === 'mention') out.mention = { id: m.id, label: m.label };
    else if (m.type === 'textColor' || m.type === 'bgColor') out[m.type] = m.color;
    else out[m.type] = true;
  }
  return out;
}

// Attributes may come from other clients: anything not shaped like a known mark is dropped.
function attrsToMarks(attrs: Record<string, unknown> = {}): Mark[] {
  const out: Mark[] = [];
  for (const type of MARK_ORDER) {
    const v = attrs[type];
    if (type === 'link') {
      if (isObj(v) && isStr(v.href)) out.push({ type, href: v.href });
    } else if (type === 'mention') {
      if (isObj(v) && isStr(v.id) && isStr(v.label)) out.push({ type, id: v.id, label: v.label });
    } else if (type === 'textColor' || type === 'bgColor') {
      if (isStr(v)) out.push({ type, color: v });
    } else if (v === true) out.push({ type });
  }
  return out;
}

/**
 * Read one block `Y.Map` as a `Block`, with normalised inline runs. Attachments carry no runs.
 * @internal
 */
export function blockToRich(m: Y.Map<unknown>): Block {
  const type = m.get('type') as BlockType;
  const block = {
    id: String(m.get('id')),
    type: TYPES.includes(type) ? type : 'paragraph',
  } as Block;
  for (const k of ATTRS) {
    const v = m.get(k);
    if (v !== undefined) (block as unknown as Record<string, unknown>)[k] = v;
  }
  const text = m.get('text');
  const delta = (text instanceof Y.Text ? text.toDelta() : []) as {
    insert: unknown;
    attributes?: Record<string, unknown>;
  }[];
  const runs: Inline[] = delta
    .filter((d) => isStr(d.insert))
    .map((d) => ({ text: d.insert as string, marks: attrsToMarks(d.attributes) }));
  block.inlines = block.type === 'attachment' ? [] : normalizeInlines(runs);
  return block;
}

/**
 * Write `b`'s id, type and attrs into an integrated block map (absent attrs are deleted; `order`
 * and `uploadedBy` are left alone). `text` is created and filled only when the map has none — a
 * new block; diffing an existing block's text is the caller's job.
 * @internal
 */
export function writeBlock(m: Y.Map<unknown>, b: Block): void {
  m.set('id', b.id);
  m.set('type', b.type);
  for (const k of ATTRS) {
    const v = b[k];
    if (v === undefined) {
      if (m.has(k)) m.delete(k);
    } else if (m.get(k) !== v) m.set(k, v);
  }
  if (m.get('text') instanceof Y.Text) return;
  const text = m.set('text', new Y.Text());
  let pos = 0;
  for (const run of b.inlines) {
    if (!run.text) continue;
    text.insert(pos, run.text, marksToAttrs(run.marks));
    pos += run.text.length;
  }
}

/**
 * Y-only block fields that are not part of `Block`. `uploadedBy` is the uploader's `clientID`.
 * @internal
 */
export function blockMeta(m: Y.Map<unknown>): { uploadedBy?: number } {
  const u = m.get('uploadedBy');
  return typeof u === 'number' ? { uploadedBy: u } : {};
}

/**
 * Snapshot a collaborative `Y.Doc` as a `RichDoc` (for search, versions or `<RichText>`).
 * An empty doc reads as one empty paragraph and is never written to.
 */
export function toRichDoc(doc: Y.Doc): RichDoc {
  const blocks = [...doc.getMap<Y.Map<unknown>>(BLOCKS).entries()]
    .map(([id, m]) => ({ id, order: String(m.get('order') ?? ''), m }))
    .sort(compareOrder)
    .map(({ m }) => blockToRich(m));
  return {
    blocks: blocks.length
      ? blocks
      : [{ id: seedId(0), type: 'paragraph', inlines: [{ text: '', marks: [] }] }],
  };
}

/**
 * Seed a `Y.Doc` (a new one when omitted) from a `RichDoc`; returns the doc. A no-op when the doc
 * already has blocks. Seeding is deterministic — reserved clientID 0, ids and order derived from
 * block positions (the RichDoc's own ids are replaced) — so clients that seed the SAME RichDoc
 * merge without duplicates. Seeding different RichDocs into replicas of one doc corrupts it:
 * persist the Y update log as the source of truth and seed only a brand-new document.
 */
export function fromRichDoc(rich: RichDoc, doc: Y.Doc = new Y.Doc()): Y.Doc {
  if (doc.getMap(BLOCKS).size > 0) return doc;
  const scratch = new Y.Doc();
  scratch.clientID = 0; // before any insert
  const blocks = scratch.getMap<Y.Map<unknown>>(BLOCKS);
  scratch.transact(() => {
    let order: string | null = null;
    rich.blocks.forEach((b, i) => {
      const id = seedId(i);
      const m = blocks.set(id, new Y.Map<unknown>());
      order = orderBetween(order, null);
      m.set('order', order);
      writeBlock(m, { ...b, id });
    });
  });
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(scratch));
  return doc;
}
