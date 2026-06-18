// model.ts — RichText document model types + constructors. Pure data; no DOM.

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bullet_item'
  | 'ordered_item'
  | 'blockquote'
  | 'code_block';

export type MarkType = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link';

/** A formatting mark. Flags carry no data; `link` carries an href. */
export type Mark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'code' }
  | { type: 'link'; href: string };

/** A run of text sharing exactly one mark set. */
export interface Inline {
  text: string;
  marks: Mark[];
}

/** One line-level block. Lists are flat items addressed by `depth` (no tree). */
export interface Block {
  /** Stable id → React keys + position stability. */
  id: string;
  type: BlockType;
  /** Heading level, only for `type: 'heading'`. */
  level?: 1 | 2 | 3;
  /** List nesting depth (0-based), only for list items. */
  depth?: number;
  /** Inline content. An empty block holds a single empty run. */
  inlines: Inline[];
}

/** A rich-text document: an ordered list of blocks. */
export interface RichDoc {
  blocks: Block[];
}

/** A point in the document: a character offset within a block. */
export interface Point {
  blockId: string;
  /** 0..blockLength */
  offset: number;
}

/** A selection / span. `anchor` may come before or after `focus`. */
export interface Range {
  anchor: Point;
  focus: Point;
}

// Module-local monotonic id source. NOT Math.random/Date.now (unavailable in
// some contexts + non-deterministic). Unique within a session — enough for keys.
let idCounter = 0;
export function nextId(): string {
  idCounter += 1;
  return `rt${idCounter}`;
}

export interface CreateBlockAttrs {
  level?: 1 | 2 | 3;
  depth?: number;
  marks?: Mark[];
  /** Pin the id (tests / deterministic construction). */
  id?: string;
}

/** Build a block. Empty `text` → a single empty run. */
export function createBlock(type: BlockType, text = '', attrs: CreateBlockAttrs = {}): Block {
  const { level, depth, marks = [], id } = attrs;
  const inlines: Inline[] = text === '' ? [{ text: '', marks: [] }] : [{ text, marks }];
  const block: Block = { id: id ?? nextId(), type, inlines };
  if (level !== undefined) block.level = level;
  if (depth !== undefined) block.depth = depth;
  return block;
}

/** A document with one empty paragraph. */
export function emptyDoc(): RichDoc {
  return { blocks: [createBlock('paragraph')] };
}

/** Build a paragraph-per-line document from plain text (a demo/seed helper). */
export function docFromText(text: string): RichDoc {
  return { blocks: text.split('\n').map((line) => createBlock('paragraph', line)) };
}
