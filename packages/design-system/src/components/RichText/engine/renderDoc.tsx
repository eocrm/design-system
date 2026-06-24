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
    case 'link': {
      // The `renderLink` substitution is handled in `renderInlines` (which coalesces
      // contiguous same-href runs into one logical link); here we only emit the
      // default <a> for the unsubstituted path.
      const href = mark.type === 'link' ? safeHref(mark.href) : undefined;
      return (
        <a href={href} rel="noopener noreferrer">
          {child}
        </a>
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

function renderInlines(inlines: Inline[], opts: ResolvedOptions): ReactNode {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < inlines.length) {
    const run = inlines[i];
    const lm = run.marks.find((m) => m.type === 'link');
    const linkHref = lm && lm.type === 'link' ? lm.href : null;
    const safe = opts.renderLink && linkHref != null ? safeHref(linkHref) : undefined;
    if (safe) {
      // Coalesce contiguous runs that share this exact link href into ONE logical
      // link, so a link split across runs (e.g. internal formatting, HTML import)
      // resolves to a single chip — not one chip per run.
      let j = i;
      let text = '';
      while (j < inlines.length) {
        const m = inlines[j].marks.find((mm) => mm.type === 'link');
        if (!m || m.type !== 'link' || m.href !== linkHref) break;
        text += inlines[j].text;
        j += 1;
      }
      const fallback = (
        <a href={safe} rel="noopener noreferrer">
          {text}
        </a>
      );
      const custom = opts.renderLink!({ href: safe, text }, fallback);
      if (custom !== fallback) {
        // Substituted: one node for the whole span. In the editor it's an atomic,
        // non-editable widget tagged with the span's MODEL length (`data-len`).
        out.push(
          opts.editable ? (
            <span key={i} data-rich-link data-len={text.length} contentEditable={false}>
              {custom}
            </span>
          ) : (
            <Fragment key={i}>{custom}</Fragment>
          ),
        );
        i = j;
        continue;
      }
      // Consumer declined → fall through to normal per-run rendering (default <a>).
    }
    out.push(renderRun(run, i));
    i += 1;
  }
  return out;
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
