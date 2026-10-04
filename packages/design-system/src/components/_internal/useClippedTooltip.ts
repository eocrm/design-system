// useClippedTooltip.ts
import { useRef, useState, type ReactNode, type RefObject } from 'react';

export interface ClippedTooltip<T extends HTMLElement> {
  /** Attach to the element whose text may be clipped by an ellipsis. */
  ref: RefObject<T | null>;
  open: boolean;
  /** Pass to `<Tooltip onOpenChange>`; refuses to open unless the label overflows. */
  onOpenChange: (next: boolean) => void;
  /** Pass to `<Tooltip content>`. */
  content: ReactNode;
}

/**
 * State for a controlled `Tooltip` that shows a label's full text only when the
 * label is actually clipped. A fully visible label gets no tooltip and no
 * `aria-describedby`, so it is not announced twice.
 *
 * `content`: a STRING `label` is used directly, so it is always fresh off the
 * prop, even if it changes while the tooltip is open. Any other `label` (styled
 * node, icon, …) falls back to plain text captured from the element's
 * `textContent` when the tooltip opens, so a styled label's colour and weight
 * don't leak onto the dark tooltip background.
 *
 * The captured text falls back to `label` with `||`, not `??`: Tooltip treats
 * `null`/`undefined`/`''` content as "disabled" (no listeners at all), so an
 * EMPTY capture (a label that renders no text, e.g. an icon) is stored as
 * `null` and must resolve back to the current `label`. Otherwise the tooltip
 * would stay disabled even after `label` becomes a long, clipped string (#592).
 *
 * `enabled`: pass `false` while the caller renders no Tooltip (e.g. a loading
 * state). An open tooltip that unmounts has nothing left to close it, so the
 * state resets during render and cannot remount already open.
 */
export function useClippedTooltip<T extends HTMLElement>(
  label: ReactNode,
  enabled = true,
): ClippedTooltip<T> {
  const ref = useRef<T>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  if (!enabled && open) setOpen(false);
  const onOpenChange = (next: boolean) => {
    const el = ref.current;
    if (next && el != null) setText(el.textContent || null);
    setOpen(next && el != null && el.scrollWidth > el.clientWidth);
  };
  const content = typeof label === 'string' ? label : text || label;
  return { ref, open, onOpenChange, content };
}
