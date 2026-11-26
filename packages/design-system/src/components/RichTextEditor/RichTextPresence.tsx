// RichTextPresence.tsx — other users' carets and selections over the editable (RichTextEditor's
// `presence` prop), measured from DOM ranges. Presence is untrusted app-relayed data: every entry
// is coerced and measured in its own try/catch, and its colour only reaches a CSS custom property.
import { Fragment, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Range, RichDoc } from '../RichText/engine/model';
import { pointToDom } from './selection';
import type { RichTextPresence } from './RichTextEditor';
import styles from './RichTextPresence.module.scss';

type Box = { top: number; left: number; width: number; height: number };
interface Mark {
  id: string;
  name: string;
  color: string;
  /** Changes whenever the selection moves (restarts the flag's idle timer). */
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
 * Carets (a bar in the user's colour with a name flag) and selection tints. Rendered right after
 * the editable; positioned from DOM ranges relative to its own box and re-measured on every doc /
 * presence change, editor resize and scroll. The flag shows for ~2s after the caret last moved,
 * then hides (CSS): the layer is `pointer-events: none`, so there is no hover to reveal it.
 * @internal
 */
export function RichTextPresenceOverlay({
  presence,
  doc,
}: {
  presence: readonly RichTextPresence[];
  /** The doc the editable shows. */
  doc: RichDoc;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [tick, remeasure] = useReducer((n: number) => n + 1, 0);

  const editable = () => ref.current?.previousElementSibling as HTMLElement | null | undefined;

  const active = presence.some((p) => p?.selection);
  useEffect(() => {
    const root = editable();
    if (!active || !root) return;
    // One re-measure per frame, however many events arrive.
    let frame = 0;
    const schedule = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        remeasure();
      });
    };
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    ro?.observe(root);
    // Boxes are relative to this layer, which scrolls with the editor, so page scroll moves
    // nothing; but a consumer can make the editable (or something inside it) a scroller, which
    // moves the text under a fixed layer. Capture catches scroll from any element.
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [active]);

  useLayoutEffect(() => {
    const root = editable();
    if (!ref.current || !root) return;
    const has = (id: unknown) => doc.blocks.some((b) => b.id === id);
    const out: Mark[] = [];
    if (active) {
      const origin = ref.current.getBoundingClientRect();
      for (const p of presence) {
        try {
          const s = p.selection;
          // Idle, or pointing at blocks the doc no longer has (no "nearest point" guess here).
          if (!s || !has(s.anchor?.blockId) || !has(s.focus?.blockId)) continue;
          const m = measure(root, s, origin);
          if (!m || (!m.caret && !m.rects.length)) continue;
          out.push({
            id: String(p.id),
            name: typeof p.name === 'string' ? p.name : '',
            color: typeof p.color === 'string' ? p.color : '',
            moved: JSON.stringify(s),
            ...m,
          });
        } catch {
          // Data the DOM rejects (e.g. an out-of-range offset): skip this entry, never take
          // the editor down.
        }
      }
    }
    // No re-render when nothing moved (incl. empty → empty).
    setMarks((prev) => (JSON.stringify(prev) === JSON.stringify(out) ? prev : out));
  }, [doc, presence, tick, active]);

  return (
    <div ref={ref} className={styles.presence} aria-hidden="true" data-presence="">
      {marks.map((m, i) => {
        // The colour is app data: it only ever reaches *-color properties, so a non-colour
        // value (e.g. `url(…)`) is simply invalid there.
        const style = (b: Box) =>
          ({ ...b, '--rich-text-presence-color': m.color }) as CSSProperties;
        return (
          // Index too: an app may relay duplicate ids.
          <Fragment key={`${m.id}-${i}`}>
            {m.rects.map((r, j) => (
              <span
                key={j}
                className={styles.selection}
                style={style(r)}
                data-presence-selection=""
              />
            ))}
            {m.caret && (
              <span className={styles.caret} style={style(m.caret)} data-presence-caret="">
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
