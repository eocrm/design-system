import { type ComponentPropsWithoutRef, type CSSProperties } from 'react';
import clsx from 'clsx';
import styles from './ResizablePreview.module.scss';

export interface ResizablePreviewProps extends ComponentPropsWithoutRef<'div'> {
  /** Initial CSS width for the playground-only resize surface. */
  initialWidth?: number | string;
}

type ResizablePreviewStyle = CSSProperties & {
  '--resizable-preview-initial-width'?: string;
};

export function ResizablePreview({
  children,
  className,
  initialWidth,
  style,
  ...props
}: ResizablePreviewProps) {
  const resolvedWidth = typeof initialWidth === 'number' ? `${initialWidth}px` : initialWidth;
  const previewStyle: ResizablePreviewStyle = {
    ...style,
    '--resizable-preview-initial-width': resolvedWidth,
  };

  return (
    <div {...props} className={clsx(styles.root, className)} style={previewStyle}>
      {children}
    </div>
  );
}
