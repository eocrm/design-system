import { cloneElement, isValidElement, type ReactElement, type Ref } from 'react';
import { usePopoverContext } from './context';
import { mergeRefs } from '../_internal/refs';

export interface PopoverAnchorProps {
  /**
   * Exactly one React element that accepts a ref. Unlike `Popover.Trigger`,
   * Anchor injects ONLY the floating-positioning ref — no `onClick`, no keyboard
   * handler, and no `aria-haspopup` / `aria-expanded` / `aria-controls`. Use it
   * when the anchor element already owns its open-toggle and ARIA (e.g. an
   * interactive `FilterChip` whose body `<button>` self-manages
   * `aria-haspopup`/`aria-expanded`), and you drive the popover's open state
   * yourself (controlled `open` + `onOpenChange`). The child must accept a ref
   * (`forwardRef`); raw DOM elements and this library's components qualify, and
   * it should be focusable (a `<button>` or `tabIndex` host) so Escape can
   * return focus to it on close. Wrapping such a chip in `Popover.Trigger`
   * instead would stamp that ARIA onto its `role="group"` root, not the body
   * button.
   */
  children: ReactElement;
}

/**
 * Positions `Popover.Content` against its child, injecting only the floating ref and no interaction or ARIA (`Popover.Anchor`).
 * @see docs/components/Popover.md
 */
export function Anchor({ children }: PopoverAnchorProps) {
  const ctx = usePopoverContext('Anchor');
  if (!isValidElement(children)) {
    throw new Error('<Popover.Anchor> requires exactly one React element child.');
  }
  const childProps = children.props as { ref?: Ref<HTMLElement> };
  // Ref only — NO aria/onClick/onKeyDown. The anchor owns its own toggle + ARIA.
  return cloneElement(children, {
    ref: mergeRefs(ctx.triggerRef, childProps.ref),
  } as object);
}
