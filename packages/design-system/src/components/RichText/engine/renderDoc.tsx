// renderDoc.tsx — pure model → React. Read-only; used by <RichText>. The model
// is flat; this reconstructs list nesting from `depth` at render time.
import { Fragment, type ReactNode } from 'react';
import type { RichDoc, Block, Inline, Mark, MarkType } from './model';
import { runsText, runsLength } from './inlines';
import { safeHref } from './safeHref';
import { isListItem, effectiveDepths } from './listDepths';
import type { RenderLink } from './renderLink';

export interface RenderDocOptions {
  /** Editable surface: add `data-block-id` anchors + render empty blocks with a `<br>`. */
  editable?: boolean;
  /**
   * Replace how a link renders (e.g. a task/member chip). In the read-only viewer
   * the returned node substitutes the `<a>` directly; on an editable surface a
   * substituted node is wrapped in an atomic, non-editable `[data-rich-link]`
   * widget so the caret steps over it as a single unit. Return the supplied
   * default node to keep the standard `<a>`.
   */
  renderLink?: RenderLink;
}

// Resolved options threaded through the render call chain (never module state).
interface ResolvedOptions {
  editable: boolean;
  renderLink?: RenderLink;
}

// Outer → inner nesting order so output is stable + diff-friendly.
const MARK_ORDER: MarkType[] = ['mention', 'link', 'bold', 'italic', 'underline', 'strike', 'code'];

function wrapMark(
  type: MarkType,
  mark: Mark,
  child: ReactNode,
  runText: string,
  opts: ResolvedOptions,
): ReactNode {
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
    case 'link': {
      const href = mark.type === 'link' ? safeHref(mark.href) : undefined;
      const fallback = (
        <a href={href} rel="noopener noreferrer">
          {child}
        </a>
      );
      if (!opts.renderLink || !href) return fallback;
      const custom = opts.renderLink({ href, text: runText }, fallback);
      if (custom === fallback) return fallback; // consumer declined → plain editable link
      if (!opts.editable) return custom;
      return (
        <span data-rich-link data-len={runText.length} contentEditable={false}>
          {custom}
        </span>
      );
    }
    case 'mention':
      return (
        <span
          data-mention
          data-mention-id={mark.type === 'mention' ? mark.id : undefined}
          data-mention-label={mark.type === 'mention' ? mark.label : undefined}
        >
          {child}
        </span>
      );
    default:
      return child;
  }
}

function renderRun(run: Inline, key: number, opts: ResolvedOptions): ReactNode {
  const present = MARK_ORDER.filter((t) => run.marks.some((m) => m.type === t));
  let node: ReactNode = run.text;
  // Wrap innermost-first so present[0] (link) ends up outermost.
  for (let i = present.length - 1; i >= 0; i -= 1) {
    const type = present[i];
    const mark = run.marks.find((m) => m.type === type)!;
    node = wrapMark(type, mark, node, run.text, opts);
  }
  return <Fragment key={key}>{node}</Fragment>;
}

function renderInlines(inlines: Inline[], opts: ResolvedOptions): ReactNode {
  return inlines.map((run, i) => renderRun(run, i, opts));
}

function blockContent(block: Block, opts: ResolvedOptions): ReactNode {
  if (opts.editable && runsLength(block.inlines) === 0) return <br />;
  return renderInlines(block.inlines, opts);
}

function renderBlock(block: Block, opts: ResolvedOptions): ReactNode {
  const anchor = opts.editable ? { 'data-block-id': block.id } : undefined;
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level ?? 1}` as 'h1' | 'h2' | 'h3';
      return (
        <Tag key={block.id} {...anchor}>
          {blockContent(block, opts)}
        </Tag>
      );
    }
    case 'blockquote':
      return (
        <blockquote key={block.id} {...anchor}>
          {blockContent(block, opts)}
        </blockquote>
      );
    case 'code_block':
      return (
        <pre key={block.id} {...anchor}>
          <code>
            {opts.editable && runsLength(block.inlines) === 0 ? <br /> : runsText(block.inlines)}
          </code>
        </pre>
      );
    case 'paragraph':
    default:
      return (
        <p key={block.id} {...anchor}>
          {blockContent(block, opts)}
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
  opts: ResolvedOptions,
): { tag: 'ul' | 'ol'; items: ListItemNode[]; next: number } {
  const baseDepth = eff[start];
  const tag = blocks[start].type === 'ordered_item' ? 'ol' : 'ul';
  const items: ListItemNode[] = [];
  let i = start;
  while (i < blocks.length && isListItem(blocks[i])) {
    const d = eff[i];
    if (d < baseDepth) break;
    if (d > baseDepth) {
      const sub = collectList(blocks, i, eff, opts);
      if (items.length > 0)
        items[items.length - 1].child = renderListTree(sub.tag, sub.items, opts);
      i = sub.next;
      continue;
    }
    items.push({
      key: blocks[i].id,
      blockId: blocks[i].id,
      content: blockContent(blocks[i], opts),
      child: null,
    });
    i += 1;
  }
  return { tag, items, next: i };
}

function renderListTree(tag: 'ul' | 'ol', items: ListItemNode[], opts: ResolvedOptions): ReactNode {
  const ListTag = tag;
  return (
    <ListTag>
      {items.map((it) => (
        <li key={it.key} {...(opts.editable ? { 'data-block-id': it.blockId } : {})}>
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
  const opts: ResolvedOptions = {
    editable: options.editable ?? false,
    renderLink: options.renderLink,
  };
  const eff = effectiveDepths(doc.blocks);
  const out: ReactNode[] = [];
  let i = 0;
  while (i < doc.blocks.length) {
    if (isListItem(doc.blocks[i])) {
      const startId = doc.blocks[i].id;
      const { tag, items, next } = collectList(doc.blocks, i, eff, opts);
      out.push(<Fragment key={`list-${startId}`}>{renderListTree(tag, items, opts)}</Fragment>);
      i = next;
    } else {
      out.push(renderBlock(doc.blocks[i], opts));
      i += 1;
    }
  }
  return out;
}
