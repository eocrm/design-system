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
 * Lays form fields side by side. Thin wrapper over `<Grid>`: by default the row
 * auto-fits and reflows to stacked as the container narrows (container-based, no
 * breakpoints); pass `columns` for a fixed, non-reflowing count.
 *
 * @example
 * // Responsive (default) — two fields drop to stacked when narrow:
 * <FormRow>
 *   <Field label="First name" required><Input /></Field>
 *   <Field label="Last name" required><Input /></Field>
 * </FormRow>
 *
 * @example
 * // Fixed 3 columns at any width:
 * <FormRow columns={3}>
 *   <Field label="City"><Input /></Field>
 *   <Field label="State"><Input /></Field>
 *   <Field label="ZIP"><Input /></Field>
 * </FormRow>
 *
 * @remarks When NOT to use
 * - A single field — just render the `<Field>`.
 * - Vertical stacking of fields — that's the default flow of `<FormSection>` / `<Stack>`.
 * - A general tile/card grid — use `<Grid>` directly.
 *
 * @remarks Anti-patterns
 * - ❌ Forcing `columns` for two fields that should reflow on mobile — prefer the
 *   responsive default; reserve `columns` for rows that must stay side by side.
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
