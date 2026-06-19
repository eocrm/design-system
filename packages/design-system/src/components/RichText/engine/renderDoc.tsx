// renderDoc.tsx — pure model → React. Read-only; used by <RichText>. The model
// is flat; this reconstructs list nesting from `depth` at render time.
import { Fragment, type ReactNode } from 'react';
import type { RichDoc, Block, Inline, Mark, MarkType } from './model';
import { runsText, runsLength } from './inlines';
import { safeHref } from './safeHref';
import { isListItem, effectiveDepths } from './listDepths';

export interface RenderDocOptions {
  /** Editable surface: add `data-block-id` anchors + render empty blocks with a `<br>`. */
  editable?: boolean;
}

// Outer → inner nesting order so output is stable + diff-friendly.
const MARK_ORDER: MarkType[] = ['link', 'bold', 'italic', 'underline', 'strike', 'code'];

function wrapMark(type: MarkType, mark: Mark, child: ReactNode): ReactNode {
  switch (type) {
    case 'bold':
      return <strong>{child}</strong>;
    case 'italic':
      return <em>{child}</em>;
    case 'underline':
      return <u>{child}</u>;
    case 'strike':
      return <s>{child}</s>;
    case 'code':
      return <code>{child}</code>;
    case 'link':
      return (
        <a href={mark.type === 'link' ? safeHref(mark.href) : undefined} rel="noopener noreferrer">
          {child}
        </a>
      );
    default:
      return child;
  }
}

function renderRun(run: Inline, key: number): ReactNode {
  const present = MARK_ORDER.filter((t) => run.marks.some((m) => m.type === t));
  let node: ReactNode = run.text;
  // Wrap innermost-first so present[0] (link) ends up outermost.
  for (let i = present.length - 1; i >= 0; i -= 1) {
    const type = present[i];
    const mark = run.marks.find((m) => m.type === type)!;
    node = wrapMark(type, mark, node);
  }
  return <Fragment key={key}>{node}</Fragment>;
}

function renderInlines(inlines: Inline[]): ReactNode {
  return inlines.map((run, i) => renderRun(run, i));
}

function blockContent(block: Block, editable: boolean): ReactNode {
  if (editable && runsLength(block.inlines) === 0) return <br />;
  return renderInlines(block.inlines);
}

function renderBlock(block: Block, editable: boolean): ReactNode {
  const anchor = editable ? { 'data-block-id': block.id } : undefined;
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level ?? 1}` as 'h1' | 'h2' | 'h3';
      return (
        <Tag key={block.id} {...anchor}>
          {blockContent(block, editable)}
        </Tag>
      );
    }
    case 'blockquote':
      return (
        <blockquote key={block.id} {...anchor}>
          {blockContent(block, editable)}
        </blockquote>
      );
    case 'code_block':
      return (
        <pre key={block.id} {...anchor}>
          <code>
            {editable && runsLength(block.inlines) === 0 ? <br /> : runsText(block.inlines)}
          </code>
        </pre>
      );
    case 'paragraph':
    default:
      return (
        <p key={block.id} {...anchor}>
          {blockContent(block, editable)}
        </p>
      );
  }
}

interface ListItemNode {
  key: string;
  blockId: string;
  content: ReactNode;
  child: ReactNode | null;
}

// Collect a list starting at `start`, at its base (effective) depth; items one
// level deeper recurse into a child list attached to the preceding item. Because
// `eff` is gap-free, a deeper run is always exactly base+1, so every item lands
// in exactly one list — no item is overwritten. Returns the items + next index.
function collectList(
  blocks: Block[],
  start: number,
  eff: number[],
  editable: boolean,
): { tag: 'ul' | 'ol'; items: ListItemNode[]; next: number } {
  const baseDepth = eff[start];
  const tag = blocks[start].type === 'ordered_item' ? 'ol' : 'ul';
  const items: ListItemNode[] = [];
  let i = start;
  while (i < blocks.length && isListItem(blocks[i])) {
    const d = eff[i];
    if (d < baseDepth) break;
    if (d > baseDepth) {
      const sub = collectList(blocks, i, eff, editable);
      if (items.length > 0)
        items[items.length - 1].child = renderListTree(sub.tag, sub.items, editable);
      i = sub.next;
      continue;
    }
    items.push({
      key: blocks[i].id,
      blockId: blocks[i].id,
      content: blockContent(blocks[i], editable),
      child: null,
    });
    i += 1;
  }
  return { tag, items, next: i };
}

function renderListTree(tag: 'ul' | 'ol', items: ListItemNode[], editable: boolean): ReactNode {
  const ListTag = tag;
  return (
    <ListTag>
      {items.map((it) => (
        <li key={it.key} {...(editable ? { 'data-block-id': it.blockId } : {})}>
          {it.content}
          {it.child}
        </li>
      ))}
    </ListTag>
  );
}

/**
 * Render a `RichDoc` to React nodes.
 *
 * Blocks map to semantic elements (`<p>`, `<h1|h2|h3>`, `<blockquote>`,
 * `<pre><code>`). Consecutive list-item blocks are grouped back into `<ul>`/`<ol>`
 * trees, with nesting reconstructed from each item's `depth` (the flat model is
 * lossy-free: depths are normalized gap-free first, so malformed depth jumps
 * never drop items). Inline runs render as nested mark tags in a deterministic
 * order (`link` outermost … `code` innermost). Block `id` is the React key. An
 * empty document renders nothing. `code_block` content is treated as plain text.
 *
 * Pass `{ editable: true }` to add `data-block-id` anchors on every block element
 * and render empty blocks with a `<br>` (required for contentEditable caret placement).
 * Read-only output (default) is byte-identical to the pre-options behaviour.
 */
export function renderDoc(doc: RichDoc, options: RenderDocOptions = {}): ReactNode {
  const editable = options.editable ?? false;
  const eff = effectiveDepths(doc.blocks);
  const out: ReactNode[] = [];
  let i = 0;
  while (i < doc.blocks.length) {
    if (isListItem(doc.blocks[i])) {
      const startId = doc.blocks[i].id;
      const { tag, items, next } = collectList(doc.blocks, i, eff, editable);
      out.push(<Fragment key={`list-${startId}`}>{renderListTree(tag, items, editable)}</Fragment>);
      i = next;
    } else {
      out.push(renderBlock(doc.blocks[i], editable));
      i += 1;
    }
  }
  return out;
}
