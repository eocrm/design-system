import { createElement, useId, useLayoutEffect, type HTMLAttributes } from 'react';
import { usePopoverContext } from './context';
import { sanitizeId } from '../_internal/refs';

export interface PopoverHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading level. Defaults to `'h3'`. */
  as?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function Heading({ as = 'h3', id: idProp, children, ...rest }: PopoverHeadingProps) {
  const ctx = usePopoverContext('Heading');
  const reactId = useId();
  const id = idProp ?? `popover-heading-${sanitizeId(reactId)}`;

  useLayoutEffect(() => {
    ctx.setHeadingId(id);
    return () => ctx.setHeadingId(null);
    // ctx.setHeadingId is stable per Popover instance; id changes only if
    // consumer provides one — re-fire is correct in that case.
  }, [ctx.setHeadingId, id]);

  // `createElement` keeps the dynamic tag type-safe across h2–h6 without
  // tripping JSX.IntrinsicElements' SVG-tag variance issue.
  return createElement(as, { id, ...rest }, children);
}
