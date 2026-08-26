import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Stack.module.scss';

/** Vertical gap between children. Values in pixels: 4 / 8 / 12 / 16 / 24 / 32. */
export type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Cross-axis (horizontal) alignment of children inside the stack. */
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Gap between children, in pixels:
   * `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32).
   */
  gap?: StackGap;
  /**
   * Cross-axis alignment.
   * - `stretch` (default) — children fill the stack's horizontal width.
   * - `start` / `center` / `end` — left, center, right alignment.
   */
  align?: StackAlign;
}

const gapClass: Record<StackGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};

const alignClass: Record<StackAlign, string> = {
  start: styles.alignStart,
  center: styles.alignCenter,
  end: styles.alignEnd,
  stretch: styles.alignStretch,
};

/**
 * Vertical layout primitive. Replaces ad-hoc `display: flex; flex-direction: column`
 * divs. Use this whenever children should stack with consistent spacing.
 *
 * Pairs with `<Cluster>` (horizontal). Together they cover ~80% of CRM layout.
 *
 * @example
 * // Canonical form pattern:
 * <Stack gap="md">
 *   <Input placeholder="Name" />
 *   <Input placeholder="Email" />
 *   <Cluster justify="end" gap="sm">
 *     <Button variant="secondary">Cancel</Button>
 *     <Button type="submit">Save</Button>
 *   </Cluster>
 * </Stack>
 *
 * @example
 * // Page sections with larger gap:
 * <Stack gap="xl">
 *   <header>...</header>
 *   <section>...</section>
 *   <section>...</section>
 * </Stack>
 *
 * @remarks Truncation
 * Sets `min-width: 0`, so it can participate in a truncating flex chain: a
 * `<Text truncate>` nested inside still ellipsizes when a clipping ancestor
 * squeezes it, rather than being hard-cut. Without this, the default
 * `min-width: auto` on a flex item pins the container to its content's
 * min-content width and the ellipsis never gets a chance to appear.
 *
 * Trade-off: because it can shrink, it also *volunteers* for shrink when it is
 * one of several items in a non-wrapping flex row. If its content cannot
 * truncate (buttons, badges, icons) and a sibling can (a title), pin it from
 * the parent's stylesheet with `flex-shrink: 0` so the text gives way instead
 * of the controls being clipped.
 *
 * @remarks When NOT to use
 * - For tabular data — use a real `<table>` or `<Grid>`.
 * - For a list of clickable items — semantics matter. Use `<ul><li>` with
 *   appropriate styling.
 *
 * @remarks Anti-patterns
 * - ❌ Nested Stacks with different gaps just to bend spacing locally.
 *   Sometimes legitimate (page sections at `xl` containing field stacks at
 *   `md`), but pause and consider — usually it signals unclear hierarchy.
 * - ❌ A Stack with one or two children. `<Stack><Button /></Stack>` is noise.
 *   Inline the child.
 */
export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  { gap = 'md', align = 'stretch', className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(styles.stack, gapClass[gap], alignClass[align], className)}
      {...props}
    />
  );
});
