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
  /**
   * Lets the container shrink below its content's intrinsic width
   * (`min-width: 0`), so a `<Text truncate>` inside can ellipsize instead of
   * being hard-cut by a clipping ancestor.
   *
   * Only bites when the Stack is itself an item of a **row** flex container (or
   * a grid item) that clips — what decides is the PARENT's main axis, not the
   * Stack's own direction. That is the two-line label beside a fixed badge, or
   * a detail column in a squeezed toolbar. Without it the flex default
   * (`min-width: auto`) floors the Stack at its widest line and the ellipsis
   * never appears. That floor applies because a Stack sets no `overflow`, so it is
   * not a scroll container — per CSS Sizing §5.2.1 a flex item keeps its
   * automatic minimum size unless it is one. `overflow: hidden`/`auto`/`scroll`
   * remove it; `visible` and `clip` do not.
   *
   * It is a **no-op** when the Stack sits in another `Stack` (the automatic
   * minimum size applies only on the flex MAIN axis, so there is no horizontal
   * floor), or in a plain block or table cell (that minimum applies to flex and
   * grid ITEMS only, so `min-width: auto` is just `0` there). A table cell is
   * a no-op for a different reason than it looks: auto table layout floors the
   * cell at its content's min-content width regardless, so what makes text
   * truncate there is `table-layout: fixed` or a `max-width` on the cell — not
   * this prop.
   *
   * Opt-in rather than the default on purpose: a container that CAN shrink
   * also VOLUNTEERS for shrink, so turning it on where the content is NOT
   * truncatable (buttons, badges, icons) lets that content be clipped
   * instead. Set it on the container whose text should give way, not on one
   * holding controls.
   *
   * Related: `<Constrain flex="grow">` applies the same `min-width: 0` but
   * also forces `flex: 1 1 0`, and renders a `<div>` — reach for this prop
   * when you want only the shrink permission, or when you are inside a
   * `<button>`/`<a>`/`<label>` where a `<div>` is invalid HTML.
   *
   * @default false
   */
  minWidth0?: boolean;
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
 * @example
 * // minWidth0 — lets a Stack shrink when it is itself an item of a squeezing
 * // flex row, so its truncating children can ellipsize:
 * <Cluster wrap={false} gap="sm">
 *   <Stack gap="xs" minWidth0>
 *     <Text weight="medium" truncate>{deal.name}</Text>
 *     <Text size="xs" tone="muted" truncate>{deal.accountPath}</Text>
 *   </Stack>
 *   <Badge tone="success">{deal.stage}</Badge>
 * </Cluster>
 *
 * @remarks When NOT to use
 * - For tabular data — use a real `<table>` or `<Grid>`.
 * - For a list of clickable items — semantics matter. Use `<ul><li>` with
 *   appropriate styling.
 *
 * @remarks Anti-patterns
 * - ❌ `minWidth0` on a Stack holding buttons or badges. It lets the container
 *   shrink, so non-truncatable content gets clipped instead. Use it on the
 *   container whose TEXT should give way.
 * - ❌ Nested Stacks with different gaps just to bend spacing locally.
 *   Sometimes legitimate (page sections at `xl` containing field stacks at
 *   `md`), but pause and consider — usually it signals unclear hierarchy.
 * - ❌ A Stack with one or two children. `<Stack><Button /></Stack>` is noise.
 *   Inline the child.
 */
export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  { gap = 'md', align = 'stretch', minWidth0 = false, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(
        styles.stack,
        gapClass[gap],
        alignClass[align],
        minWidth0 && styles.minWidth0,
        className,
      )}
      {...props}
    />
  );
});
