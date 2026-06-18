// renderDoc.tsx — pure model → React. Read-only; used by <RichText>. The model
// is flat; this reconstructs list nesting from `depth` at render time.
import { Fragment, type ReactNode } from 'react';
import type { RichDoc, Block, Inline, Mark, MarkType } from './model';

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
      return <a href={mark.type === 'link' ? mark.href : undefined}>{child}</a>;
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

function renderBlock(block: Block): ReactNode {
  const content = renderInlines(block.inlines);
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level ?? 1}` as 'h1' | 'h2' | 'h3';
      return <Tag key={block.id}>{content}</Tag>;
    }
    case 'blockquote':
      return <blockquote key={block.id}>{content}</blockquote>;
    case 'code_block':
      return (
        <pre key={block.id}>
          <code>{content}</code>
        </pre>
      );
    case 'paragraph':
    default:
      return <p key={block.id}>{content}</p>;
  }
}

interface ListItemNode {
  key: string;
  content: ReactNode;
  child: ReactNode | null;
}

function isListItem(block: Block): boolean {
  return block.type === 'bullet_item' || block.type === 'ordered_item';
}

// Collect a list starting at `start`, at its base depth; deeper runs become
// child lists attached to the preceding item. Returns the items + next index.
function collectList(
  blocks: Block[],
  start: number,
): { tag: 'ul' | 'ol'; items: ListItemNode[]; next: number } {
  const baseDepth = blocks[start].depth ?? 0;
  const tag = blocks[start].type === 'ordered_item' ? 'ol' : 'ul';
  const items: ListItemNode[] = [];
  let i = start;
  while (i < blocks.length && isListItem(blocks[i])) {
    const d = blocks[i].depth ?? 0;
    if (d < baseDepth) break;
    if (d > baseDepth) {
      const sub = collectList(blocks, i);
      if (items.length > 0) items[items.length - 1].child = renderListTree(sub.tag, sub.items);
      i = sub.next;
      continue;
    }
    items.push({ key: blocks[i].id, content: renderInlines(blocks[i].inlines), child: null });
    i += 1;
  }
  return { tag, items, next: i };
}

function renderListTree(tag: 'ul' | 'ol', items: ListItemNode[]): ReactNode {
  const ListTag = tag;
  return (
    <ListTag>
      {items.map((it) => (
        <li key={it.key}>
          {it.content}
          {it.child}
        </li>
      ))}
    </ListTag>
  );
}

/** Render a document to React. Read-only. */
export function renderDoc(doc: RichDoc): ReactNode {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < doc.blocks.length) {
    if (isListItem(doc.blocks[i])) {
      const startId = doc.blocks[i].id;
      const { tag, items, next } = collectList(doc.blocks, i);
      out.push(<Fragment key={`list-${startId}`}>{renderListTree(tag, items)}</Fragment>);
      i = next;
    } else {
      out.push(renderBlock(doc.blocks[i]));
      i += 1;
    }
  }
  return out;
}
