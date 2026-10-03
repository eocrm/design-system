import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { Grid, type GridGap } from '../Grid';

// Extends HTMLAttributes<HTMLElement> (not HTMLDivElement) to match Grid's prop
// surface, so {...rest} spreads cleanly onto Grid.
export interface FormRowProps extends HTMLAttributes<HTMLElement> {
  /** Fixed equal-width column count. Omit for responsive auto-fit (the default). */
  columns?: 2 | 3;
  /** Min field width before the row reflows to stacked (auto-fit mode). Default `'16rem'`. */
  minColumnWidth?: string;
  /** Gap between fields. Default `'lg'`. */
  gap?: GridGap;
  /** The fields (usually `<Field>`). */
  children: ReactNode;
}

/**
 * Lays form fields side by side; auto-fits and reflows to stacked as the container narrows.
 * @see docs/components/FormRow.md
 */
export const FormRow = forwardRef<HTMLDivElement, FormRowProps>(function FormRow(
  { columns, minColumnWidth, gap = 'lg', children, ...rest },
  ref,
) {
  if (columns !== undefined) {
    return (
      <Grid ref={ref} columns={columns} gap={gap} {...rest}>
        {children}
      </Grid>
    );
  }
  return (
    <Grid ref={ref} minColumnWidth={minColumnWidth ?? '16rem'} gap={gap} {...rest}>
      {children}
    </Grid>
  );
});
