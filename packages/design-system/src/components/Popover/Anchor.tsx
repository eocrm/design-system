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
   * return focus to it on close.
   */
  children: ReactElement;
}

/**
 * Positions `Popover.Content` against its child WITHOUT injecting any interaction
 * or ARIA — only the floating-positioning ref. The counterpart to
 * `Popover.Trigger` (which also wires the click-toggle + `aria-haspopup` /
 * `aria-expanded` / `aria-controls`).
 *
 * Use it for a CONTROLLED popover whose anchor already owns its toggle + ARIA,
 * so that ARIA isn't duplicated onto a wrapper. Canonical case: an interactive
 * `FilterChip` (body `<button>` carries `aria-haspopup`/`aria-expanded` via
 * `onActivate`/`expanded`) hosting a controlled range-picker popover — wrapping
 * it in `Popover.Trigger` would redundantly stamp ARIA onto the chip's
 * `role="group"` root; `Popover.Anchor` injects nothing but the ref.
 *
 * @example
 * const [open, setOpen] = useState(false);
 * <Popover open={open} onOpenChange={setOpen}>
 *   <Popover.Anchor>
 *     <FilterChip onActivate={() => setOpen((o) => !o)} expanded={open} onDismiss={remove}>
 *       <FilterChip.Label>Range</FilterChip.Label>
 *       <FilterChip.Value>Jun 1 – Jul 31</FilterChip.Value>
 *     </FilterChip>
 *   </Popover.Anchor>
 *   <Popover.Content maxWidth={520}>
 *     <RangePicker />
 *   </Popover.Content>
 * </Popover>
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
