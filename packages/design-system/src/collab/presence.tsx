// presence.tsx — remote carets and selections over the editable, measured from DOM ranges.
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type * as Y from 'yjs';
import type { Range, RichDoc } from '../components/RichText/engine/model';
import { pointToDom } from '../components/RichTextEditor/selection';
import { decodeSelection } from './bridge';
import type { CollabPresence } from './CollaborativeRichTextEditor';
import styles from './CollaborativeRichTextEditor.module.scss';

/** What the overlay draws from (provided by `CollaborativeRichTextEditor`). @internal */
export interface PresenceData {
  doc: Y.Doc;
  /** The editor's current doc (what the DOM shows). */
  view: RichDoc;
  presence: readonly CollabPresence[];
}

/** @internal */
export const PresenceDataContext = createContext<PresenceData | null>(null);

type Box = { top: number; left: number; width: number; height: number };
interface Mark {
  clientId: number;
  name: string;
  color: string;
  /** Changes whenever the remote selection moves (restarts the flag's idle timer). */
  moved: string;
  caret: Box | null;
  rects: Box[];
}

const boxOf = (r: DOMRect | Box, origin: DOMRect): Box => ({
  top: r.top - origin.top,
  left: r.left - origin.left,
  width: r.width,
  height: r.height,
});

function rects(r: globalThis.Range): DOMRect[] {
  try {
    return [...r.getClientRects()];
  } catch {
    return []; // jsdom has no layout
  }
}

// Caret box (zero width) and selection boxes of `range` in `root`, relative to `origin`.
function measure(root: HTMLElement, range: Range, origin: DOMRect) {
  const a = pointToDom(root, range.anchor);
  const f = pointToDom(root, range.focus);
  if (!a || !f) return null;
  const sel = root.ownerDocument.createRange();
  sel.setStart(a.node, a.offset);
  // Collapsed at the anchor: extend towards the focus, whichever side it is on.
  if (sel.comparePoint(f.node, f.offset) < 0) sel.setStart(f.node, f.offset);
  else sel.setEnd(f.node, f.offset);
  const at = root.ownerDocument.createRange();
  at.setStart(f.node, f.offset);
  let c: DOMRect | Box | undefined = rects(at)[0];
  if (!c?.height) {
    // A collapsed range in an empty block has no box: use the block's line.
    const el = f.node.nodeType === Node.ELEMENT_NODE ? (f.node as Element) : f.node.parentElement;
    const block = el?.closest('[data-block-id]');
    const b = block?.getBoundingClientRect();
    c = b?.height ? { top: b.top, left: b.left, width: 0, height: b.height } : undefined;
  }
  return {
    caret: c ? { ...boxOf(c, origin), width: 0 } : null,
    rects: sel.collapsed
      ? []
      : rects(sel)
          .filter((r) => r.width > 0)
          .map((r) => boxOf(r, origin)),
  };
}

/**
 * Remote carets (a bar in the user's colour with a name flag) and selection tints. Positioned from
 * DOM ranges relative to its own box; re-measured on every doc / presence change, editor resize
 * and scroll. The flag shows for ~2s after the caret last moved, then hides (CSS): the layer is
 * `pointer-events: none`, so there is no hover to reveal it.
 * @internal
 */
export function PresenceOverlay() {
  const data = useContext(PresenceDataContext);
  const ref = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [tick, remeasure] = useReducer((n: number) => n + 1, 0);

  // Rendered right after the editable (see CollabSeam.overlay).
  const editable = () => ref.current?.previousElementSibling as HTMLElement | null | undefined;

  useEffect(() => {
    const root = editable();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(remeasure);
    if (root) ro?.observe(root);
    window.addEventListener('scroll', remeasure, true);
    window.addEventListener('resize', remeasure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', remeasure, true);
      window.removeEventListener('resize', remeasure);
    };
  }, []);

  useLayoutEffect(() => {
    const root = editable();
    if (!data || !ref.current || !root) return;
    const { doc, view, presence } = data;
    const origin = ref.current.getBoundingClientRect();
    const has = (id: string) => view.blocks.some((b) => b.id === id);
    const out: Mark[] = [];
    for (const p of presence) {
      const s = p.selection;
      // Ours, idle, or pointing at blocks the doc no longer has (no "nearest point" guess here).
      if (p.clientId === doc.clientID || !s || !has(s.anchor?.blockId) || !has(s.focus?.blockId))
        continue;
      const range = decodeSelection(doc, s, view);
      const m = range && measure(root, range, origin);
      if (!m || (!m.caret && !m.rects.length)) continue;
      out.push({
        clientId: p.clientId,
        name: p.name,
        color: p.color,
        moved: JSON.stringify(s),
        ...m,
      });
    }
    setMarks(out);
  }, [data, tick]);

  return (
    <div ref={ref} className={styles.presence} aria-hidden="true" data-collab-presence="">
      {marks.map((m) => {
        // The colour is app data: it only ever reaches *-color properties, so a non-colour
        // value (e.g. `url(…)`) is simply invalid there.
        const style = (b: Box) => ({ ...b, '--collab-user-color': m.color }) as CSSProperties;
        return (
          <Fragment key={m.clientId}>
            {m.rects.map((r, i) => (
              <span
                key={i}
                className={styles.selection}
                style={style(r)}
                data-collab-selection=""
              />
            ))}
            {m.caret && (
              <span className={styles.caret} style={style(m.caret)} data-collab-caret="">
                <span key={m.moved} className={styles.flag}>
                  {m.name}
                </span>
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
