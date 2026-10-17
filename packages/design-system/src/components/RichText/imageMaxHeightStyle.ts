import type { CSSProperties } from 'react';

/** Inline style carrying `imageMaxHeight` to the image rule; consumer style wins on conflict. */
export function imageMaxHeightStyle(
  imageMaxHeight: number | undefined,
  style: CSSProperties | undefined,
): CSSProperties | undefined {
  if (imageMaxHeight === undefined) return style;
  return { '--rich-text-image-max-height': `${imageMaxHeight}px`, ...style } as CSSProperties;
}
