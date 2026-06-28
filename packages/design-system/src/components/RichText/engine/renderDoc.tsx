// renderDoc.tsx — pure model → React. Read-only; used by <RichText>. The model
// is flat; this reconstructs list nesting from `depth` at render time.
import { Fragment, type ReactElement, type ReactNode } from 'react';
import type { RichDoc, Block, Inline, Mark, MarkType } from './model';
import { runsText, runsLength } from './inlines';
import { safeHref } from './safeHref';
import { textColorVar, bgColorVar } from './colorMarks';
import { isListItem, effectiveDepths } from './listDepths';
import { MARK_ORDER, marksSignature } from './marks';
import type { RenderLink } from './renderLink';
import type { RenderMention } from './renderMention';
import { RichTextAttachment } from '../../RichTextEditor/RichTextAttachment';

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
  /**
   * Replace how a `mention` mark renders (e.g. an interactive member chip /
   * popover trigger). In the read-only viewer the returned node substitutes the
   * default mention span directly; on an editable surface a substituted node is
   * wrapped in an atomic, non-editable `[data-rich-mention]` widget so the caret
   * steps over it as a single unit. Return the supplied default node to keep the
   * standard non-interactive mention span. Composes with `renderLink`.
   */
  renderMention?: RenderMention;
}

// Resolved options threaded through the render call chain (never module state).
interface ResolvedOptions {
  editable: boolean;
  renderLink?: RenderLink;
  renderMention?: RenderMention;
}

// Per-block element cache for CONTEXT-INDEPENDENT blocks only (paragraph, heading,
// blockquote, code_block, attachment). The model is immutable: a block keeps its
// reference across edits unless it changed, so an element built purely from
// (block + options) can be cached by block reference — reusing the same element
// lets React bail out of reconciling unchanged blocks (referential equality).
//
// Keyed in a WeakMap on the immutable Block object, so entries are GC'd with their
// block — no leak, no manual invalidation. The render options are part of the
// stored entry: a change to `editable`/`renderLink`/`renderMention` correctly
// misses the cache and rebuilds.
//
// LIST items (bullet_item/ordered_item) are NEVER cached here: their nested
// <ul>/<ol>/<li> shape depends on NEIGHBORS (grouping + relative depth), so a
// sibling change can alter a list item's output while its own reference is
// unchanged. They render fresh every time via collectList/renderListTree.
type BlockCacheEntry = {
  editable: boolean;
  renderLink?: RenderLink;
  renderMention?: RenderMention;
  el: ReactElement;
};
const blockCache = new WeakMap<Block, BlockCacheEntry>();

function cachedBlockEl(
  block: Block,
  editable: boolean,
  renderLink: RenderLink | undefined,
  renderMention: RenderMention | undefined,
  build: () => ReactElement,
): ReactElement {
  const hit = blockCache.get(block);
  if (
    hit &&
    hit.editable === editable &&
    hit.renderLink === renderLink &&
    hit.renderMention === renderMention
  ) {
    return hit.el;
  }
  const el = build();
  blockCache.set(block, { editable, renderLink, renderMention, el });
  return el;
}

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
    case 'textColor': {
      // Resolve the palette key to a token-backed var. An unknown key yields no
      // wrapper (never emit an empty `style`).
      const value = mark.type === 'textColor' ? textColorVar(mark.color) : undefined;
      return value ? <span style={{ color: value }}>{child}</span> : child;
    }
    case 'bgColor': {
      const value = mark.type === 'bgColor' ? bgColorVar(mark.color) : undefined;
      return value ? <span style={{ backgroundColor: value }}>{child}</span> : child;
    }
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

function renderRun(run: Inline, key: string): ReactNode {
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
    const mm = run.marks.find((m) => m.type === 'mention');
    const mention = mm && mm.type === 'mention' ? { id: mm.id, label: mm.label } : null;
    if (opts.renderMention && mention) {
      // Coalesce contiguous runs that share this exact mention (same id AND label)
      // into ONE logical mention, so a mention split across runs (e.g. internal
      // formatting, HTML import) resolves to a single chip — not one per run.
      let j = i;
      let text = '';
      while (j < inlines.length) {
        const m = inlines[j].marks.find((mk) => mk.type === 'mention');
        if (!m || m.type !== 'mention' || m.id !== mention.id || m.label !== mention.label) break;
        text += inlines[j].text;
        j += 1;
      }
      const fallback = (
        <span data-mention data-mention-id={mention.id} data-mention-label={mention.label}>
          {text}
        </span>
      );
      const custom = opts.renderMention(mention, fallback);
      if (custom !== fallback) {
        // Substituted: one node for the whole span. In the editor it's an atomic,
        // non-editable widget tagged with the span's MODEL length (`data-len`).
        const mkey = `m${i}:${mention.id}:${mention.label}`;
        out.push(
          opts.editable ? (
            <span key={mkey} data-rich-mention data-len={text.length} contentEditable={false}>
              {custom}
            </span>
          ) : (
            <Fragment key={mkey}>{custom}</Fragment>
          ),
        );
        i = j;
        continue;
      }
      // Consumer declined → fall through to the link/default handling below.
    }
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
        const lkey = `l${i}:${linkHref}`;
        out.push(
          opts.editable ? (
            <span key={lkey} data-rich-link data-len={text.length} contentEditable={false}>
              {custom}
            </span>
          ) : (
            <Fragment key={lkey}>{custom}</Fragment>
          ),
        );
        i = j;
        continue;
      }
      // Consumer declined → fall through to normal per-run rendering (default <a>).
    }
    // Key folds in the run's mark signature (not just its index): when a run's
    // formatting changes, React replaces its subtree cleanly instead of re-wrapping
    // a live contentEditable text node in place (which orphaned text / reset colors).
    out.push(renderRun(run, `${i}:${marksSignature(run.marks)}`));
    i += 1;
  }
  return out;
}

function blockContent(block: Block, opts: ResolvedOptions): ReactNode {
  if (opts.editable && runsLength(block.inlines) === 0) return <br />;
  return renderInlines(block.inlines, opts);
}

// Build the element for a single NON-LIST block. Pure in (block, opts): no
// position/index/depth/neighbor input (the effective depths computed in renderDoc
// are consumed only by the list path). Every branch returns a single top-level
// element carrying `key={block.id}` — so caching + reusing the reference preserves
// the key and lets React skip reconciling the block.
function buildBlock(block: Block, opts: ResolvedOptions): ReactElement {
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
    case 'attachment':
      return (
        <figure
          key={block.id}
          {...anchor}
          contentEditable={false}
          data-attachment=""
          data-align={block.align || undefined}
        >
          <RichTextAttachment block={block} />
        </figure>
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

// Cache wrapper for a non-list block: returns the cached element when the block
// reference AND the relevant options are unchanged, otherwise builds + stores it.
function renderBlock(block: Block, opts: ResolvedOptions): ReactElement {
  return cachedBlockEl(block, opts.editable, opts.renderLink, opts.renderMention, () =>
    buildBlock(block, opts),
  );
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
    renderMention: options.renderMention,
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
