import {
  forwardRef,
  createContext,
  useContext,
  Children,
  isValidElement,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './Thread.module.scss';

const DEFAULT_MAX_DEPTH = 4;

interface ThreadContextValue {
  /** Current nesting depth — 0 at the root, +1 per indented reply level. */
  depth: number;
  /** Max depth before replies stop indenting and render flat. */
  maxDepth: number;
}

const ThreadContext = createContext<ThreadContextValue | null>(null);

/** Where the leading `node` sits relative to the comment body. See `ThreadProps#nodeAlign`. */
export type ThreadNodeAlign = 'header' | 'top';

/**
 * Reads the surrounding thread depth/cap. Falls back to a depth-0 default so a
 * `<Thread.Item>` can render standalone (e.g. in a test) without a provider.
 */
const useThread = (): ThreadContextValue =>
  useContext(ThreadContext) ?? { depth: 0, maxDepth: DEFAULT_MAX_DEPTH };

export interface ThreadProps extends HTMLAttributes<HTMLUListElement> {
  /**
   * Max visual nesting depth before replies render flat (no further indent). Once the
   * cap is reached, deeper replies keep the same indent level so the thread stops
   * marching right. Default `4`.
   */
  maxDepth?: number;
  /**
   * Tighter gaps for dense surfaces (sidebars, panels). The remapped tokens cascade to
   * every nested item via CSS custom properties. Default `false`.
   */
  compact?: boolean;
  /**
   * Where the leading `node` sits relative to the comment body.
   * - `header` (default) — vertically centered on the **first body line** (the author /
   *   timestamp header), Jira/GitHub style, so a node taller than one line (e.g. a 24px
   *   `<Avatar>`) reads as centered against the name rather than top-aligned. Assumes the
   *   header line-box matches `--thread-header-line-height` (defaults to `<Text size="sm">`);
   *   override that token if your header line differs.
   * - `top` — top-aligned with the body (the node's top meets the body's top). Use when the
   *   node is about one line tall, or when you deliberately want top alignment.
   */
  nodeAlign?: ThreadNodeAlign;
  /** The `<Thread.Item>`s. */
  children: ReactNode;
}

export interface ThreadItemProps extends HTMLAttributes<HTMLLIElement> {
  /**
   * The leading marker the rail connects to — an `<Avatar>`, icon, or `<Dot>`. Centered
   * in its node box so the rail/elbow connectors meet it cleanly regardless of node
   * content; by default the box centers on the first body line so a taller node aligns to
   * the header (see `Thread`'s `nodeAlign`). It's a slot: there is no built-in avatar.
   * Size the node to `--thread-node-size` (default `sm` / 24px) — e.g. `<Avatar size="sm">`;
   * for a larger node, override `--thread-node-size` to match.
   */
  node: ReactNode;
  /**
   * The comment body/actions, plus optional nested `<Thread.Item>` replies. Plain children
   * render as the comment body; any direct `<Thread.Item>` child renders as a reply under
   * the rail.
   */
  children: ReactNode;
}

// Named `ThreadItemImpl` (not `ThreadItem`) so the inner named-function-expression
// scope does NOT shadow the outer `const ThreadItem` — the recursive child sort below
// compares `child.type === ThreadItem` (the forwardRef object), and a same-named inner
// function would shadow it with the bare render function, breaking reply detection.
const ThreadItem = forwardRef<HTMLLIElement, ThreadItemProps>(function ThreadItemImpl(
  { node, className, children, ...rest },
  ref,
) {
  const { depth, maxDepth } = useThread();

  // Sort children: nested <Thread.Item>s are replies; everything else is the
  // comment body. Consumers write them in natural source order — the split is
  // internal (mirrors PersonDisplay's child sorting).
  const replies: ReactNode[] = [];
  const body: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === ThreadItem) {
      replies.push(child);
    } else {
      body.push(child);
    }
  });

  const hasReplies = replies.length > 0;
  // Indent while under the cap; at/over it, replies render flat so the gutter
  // stops compounding right.
  const indented = depth < maxDepth;

  return (
    <li className={clsx(styles.item, className)} {...rest} ref={ref}>
      <div className={styles.nodeBox}>{node}</div>
      {hasReplies && indented ? (
        // Indented: replies live inside content; the parent rail (anchored to the body
        // box) bridges down to the first reply, and the per-reply trunk segments carry
        // it the rest of the way, ending at the last elbow. Depth +1.
        <div className={styles.content}>
          <div className={styles.body}>
            {body}
            {/* Parent rail trunk above the replies — anchored to the body box. */}
            <div className={styles.rail} aria-hidden="true" />
          </div>
          <ThreadContext.Provider value={{ depth: depth + 1, maxDepth }}>
            <ul className={styles.replies}>{replies}</ul>
          </ThreadContext.Provider>
        </div>
      ) : (
        // Flat: either no replies, or at/over the cap. Replies (if any) become a
        // direct grid child spanning both columns and keep the SAME depth so they
        // also render flat — the indent stops compounding.
        <>
          <div className={styles.content}>
            <div className={styles.body}>{body}</div>
          </div>
          {hasReplies && (
            <ThreadContext.Provider value={{ depth, maxDepth }}>
              <ul className={styles.repliesFlat}>{replies}</ul>
            </ThreadContext.Provider>
          )}
        </>
      )}
    </li>
  );
});
ThreadItem.displayName = 'Thread.Item';

/**
 * Nested-reply threading primitive — a continuous left vertical rail per nesting level
 * connecting a parent comment to its replies, with the leading `node` (avatar / icon) as
 * the connection point. Replies are written as nested `<Thread.Item>`s; the recursive
 * compound detects them and indents under the rail. Depth-capped (`maxDepth`, default 4)
 * so deep threads stop marching right — past the cap, replies render flat at the same
 * indent. Use `<Thread compact>` for dense sidebars.
 *
 * @example
 * // Basic nested thread. Size the Avatar to match `--thread-node-size` (default sm).
 * <Thread>
 *   <Thread.Item node={<Avatar name="Ada" src={ada.url} size="sm" />}>
 *     <Text size="sm"><strong>Ada</strong> · 2h ago</Text>
 *     <Text size="sm">Looks good to me.</Text>
 *     <Thread.Item node={<Avatar name="Linus" src={linus.url} size="sm" />}>
 *       <Text size="sm">Agreed — shipping it.</Text>
 *     </Thread.Item>
 *   </Thread.Item>
 * </Thread>
 *
 * @example
 * // Depth-capped: replies deeper than 2 levels render flat instead of indenting further.
 * <Thread maxDepth={2}>{comments.map(renderComment)}</Thread>
 *
 * @example
 * // Compact (tighter gaps), for a sidebar activity panel:
 * <Thread compact>
 *   <Thread.Item node={<Avatar name="Grace" size="sm" />}>
 *     <Text size="sm">Renewed the contract.</Text>
 *   </Thread.Item>
 * </Thread>
 *
 * @example
 * // Node alignment: by default the avatar centers on the first body line (the header).
 * // Pass nodeAlign="top" to top-align it with the body instead.
 * <Thread nodeAlign="top">…</Thread>
 *
 * @remarks When NOT to use
 * - A flat activity feed with no parent/child nesting → `<Timeline>`.
 * - Plain indentation with no connecting line → `<Indent>`.
 * - A non-threaded vertical list → `<Stack>`.
 * - An avatar + name/meta row → `<PersonDisplay>` (use it as an item's `node` / body, not
 *   instead of Thread).
 *
 * @remarks Anti-patterns
 * - ❌ Wrapping a reply `<Thread.Item>` in a Fragment or custom wrapper component — it
 *   won't be detected as a reply (the sort matches `Thread.Item` by identity). Render it
 *   as a direct child.
 * - ❌ Expecting a built-in avatar — `node` is a slot; pass an `<Avatar>` / icon / `<Dot>`.
 * - ❌ Putting layout margins on items — spacing comes from `compact` / the row-gap token.
 */
const ThreadRoot = forwardRef<HTMLUListElement, ThreadProps>(function Thread(
  {
    maxDepth = DEFAULT_MAX_DEPTH,
    compact = false,
    nodeAlign = 'header',
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <ul
      ref={ref}
      className={clsx(
        styles.root,
        compact && styles.compact,
        nodeAlign === 'top' && styles.alignTop,
        className,
      )}
      {...rest}
    >
      <ThreadContext.Provider value={{ depth: 0, maxDepth }}>{children}</ThreadContext.Provider>
    </ul>
  );
});

export const Thread = Object.assign(ThreadRoot, { Item: ThreadItem });
