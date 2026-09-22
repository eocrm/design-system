import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Text } from '../Text';
import { useFieldWiring, type FieldRenderProps } from '../_internal/fieldWiring';
import { type CollapseBreakpoint } from '../_internal/collapse';
import styles from './SettingRow.module.scss';

/** Max width applied to the control only, not its trailing adornments. A subset of `<Constrain>`'s measure scale. */
export type SettingRowControlWidth = 'auto' | 'xs' | 'sm' | 'md';

export interface SettingRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Label text. Renders a `<label htmlFor>` that names the control. Required — a falsy value (e.g. `0`, `''`) renders no `<label>` at all; see the anti-pattern below. */
  label: ReactNode;
  /**
   * Badges / chips on the label line, rendered as a SIBLING of the `<label>`.
   * Deliberately outside it: label content becomes the control's accessible
   * name, so a provenance badge placed inside makes the input announce
   * "Seats From plan".
   */
  labelAdornment?: ReactNode;
  /** Helper text under the label, in the label column. Linked via `aria-describedby`. */
  description?: ReactNode;
  /**
   * Max width of the control only — `trailing` is unaffected and stays on the
   * same line. Default `'auto'` — the control's intrinsic width.
   */
  controlWidth?: SettingRowControlWidth;
  /**
   * Content after the control on the same line — a mode select, a state
   * badge, a reset button. `controlWidth` does NOT apply here — it only caps
   * the main control. A control that sizes itself to `width: 100%` (`Select`,
   * `Input`, `Textarea`) fills the ENTIRE trailing group and pushes any other
   * adornment onto a second line; wrap it in `<Constrain width="xs">` (or
   * another named step) to size it instead.
   */
  trailing?: ReactNode;
  /**
   * Block under the control column — a usage meter, a caveat, a preview.
   * Fills the control column's full width; cap a meter with `<Constrain>` —
   * safe here, `footer` is not the wired child.
   */
  footer?: ReactNode;
  /**
   * Error message. Takes over `aria-describedby` and flips the control to
   * `invalid`. Unlike `<Field>`, the `description` stays VISIBLE alongside it —
   * the two sit in different columns, so an invalid value is no reason to
   * remove the explanation of what the setting is.
   *
   * **Not announced, deliberately** — `aria-describedby` is read on focus, so
   * the form owns the submit-time summary. Same reasoning as `<Field error>`;
   * see #494.
   */
  error?: ReactNode;
  /** Marks the row required: shows `*` and injects `required` onto the control. */
  required?: boolean;
  /** Explicit control id. The row owns the id by default so the label always matches. */
  id?: string;
  /** A single control element (auto-wired) or a render-prop `(field) => ReactNode`. */
  children: ReactNode | ((field: FieldRenderProps) => ReactNode);
}

/**
 * One row of a settings screen: label (+ provenance adornment) and description
 * in a shared left column, the control (+ adornments that act on it) and an
 * optional footer block in the right column.
 *
 * Rows align because the label column is a length, shared via
 * `--setting-row-label-width` — set it once on `<SettingRow.List>`.
 *
 * Wiring (`id`, `aria-labelledby`, `aria-describedby`, `invalid`) works exactly
 * as `<Field>`'s, and the render-prop receives the same `field` object.
 *
 * Responsive collapse (stacking the label above the control at a narrow
 * width) is provided by `<SettingRow.List>`'s container query — a standalone
 * row does not collapse on its own.
 *
 * @example
 * // A metered limit with provenance, a mode adornment and a usage meter:
 * <SettingRow.List dividers labelWidth="18rem">
 *   <SettingRow
 *     label="Seats"
 *     labelAdornment={<Badge tone="neutral" size="sm">From plan</Badge>}
 *     description="Member seats included for this tenant"
 *     controlWidth="xs"
 *     trailing={
 *       <Constrain width="xs">
 *         <Select options={modes} value={mode} onChange={setMode} />
 *       </Constrain>
 *     }
 *     footer={
 *       <Constrain maxWidth="sm">
 *         <Progress value={0} max={50} aria-label="Seats usage" />
 *       </Constrain>
 *     }
 *   >
 *     <Input type="number" />
 *   </SettingRow>
 * </SettingRow.List>
 *
 * @example
 * // A plain setting — no adornments:
 * <SettingRow label="Default currency" description="Currency preselected for new records">
 *   <Select options={currencies} value={currency} onChange={setCurrency} />
 * </SettingRow>
 *
 * @example
 * // Render-prop for a wrapped or native control:
 * <SettingRow label="Webhook URL" error={errors.url}>
 *   {(field) => <input type="url" {...field} />}
 * </SettingRow>
 *
 * @remarks When NOT to use
 * - Read-only key/value display — use `<DefinitionList>`.
 * - A form field in a normal form — use `<Field>`; a settings row's shared
 *   label column is wrong for a two-up `<FormRow>`.
 * - A single `<Checkbox>` / `<Switch>` that already self-labels — put it in a
 *   `<Cluster>`, or pass it as the row's control with the row's `label` as the
 *   only label (don't double-label).
 *
 * @remarks Anti-patterns
 * - ❌ Putting a badge inside `label` instead of `labelAdornment` — it joins
 *   the control's accessible name.
 * - ❌ Wrapping the control in `<Constrain>` to size it — that makes
 *   `Constrain` the element the row wires, so the control silently loses its
 *   `id` and `aria-*`. Use `controlWidth`.
 * - ❌ A bare `<Cluster justify="between">` or a packed-left `<Cluster>` for a
 *   settings row — the first flings the control to the far edge of a wide
 *   card, the second leaves every row's control at a different x.
 * - ❌ `margin` on a row to separate rows — that is `<SettingRow.List>`'s job.
 * - ❌ Mixing control sizes within one row — a `size="sm"` adornment beside a
 *   default-`md` control renders two different heights on the same line.
 * - ⚠️ `label` / `error` / `description` / `trailing` / `footer` /
 *   `labelAdornment` treat `0` and `NaN` as ABSENT — same as `{0 && …}`
 *   anywhere else in JSX — so `description={remaining}` with
 *   `remaining === 0` renders nothing. They treat an empty array or
 *   fragment (`error={errors.map(...)}` with no errors, `error={<></>}`) as
 *   PRESENT: `error`/`description`/`trailing` each have a wrapper element,
 *   so they render an EMPTY node — for `error` specifically that also
 *   flips the control invalid; `footer`/`labelAdornment` have no wrapper,
 *   so they render NO node at all; a falsy `label` renders no `<label>`
 *   element, and the control falls back to its own `aria-label` if it has
 *   one, or ends up unnamed otherwise. Pass `undefined` explicitly for
 *   "none" rather than a container that might be empty.
 */
const SettingRowRoot = forwardRef<HTMLDivElement, SettingRowProps>(function SettingRow(
  {
    label,
    labelAdornment,
    description,
    controlWidth = 'auto',
    trailing,
    footer,
    error,
    required,
    id,
    className,
    children,
    ...rest
  },
  ref,
) {
  // Single source of truth for "is there a label", same reasoning as
  // Field.tsx: the old `hasLabel: true` literal here diverged from the
  // control's own aria-label when label was falsy — see the anti-pattern
  // note below.
  const hasLabel = Boolean(label);
  const { controlId, labelId, descriptionId, errorId, wire } = useFieldWiring({
    id,
    hasLabel,
    hasDescription: Boolean(description),
    hasError: Boolean(error),
    required,
  });

  return (
    <div ref={ref} data-setting-row="" className={clsx(styles.row, className)} {...rest}>
      <div className={styles.term}>
        <div className={styles.labelLine}>
          {hasLabel && (
            <label htmlFor={controlId} id={labelId} className={styles.label}>
              {label}
              {required && (
                <span aria-hidden="true" className={styles.required}>
                  {' '}
                  *
                </span>
              )}
            </label>
          )}
          {Boolean(labelAdornment) && labelAdornment}
        </div>
        {Boolean(description) && (
          <Text as="div" id={descriptionId} size="sm" tone="muted">
            {description}
          </Text>
        )}
      </div>
      <div className={styles.control}>
        <div className={styles.controlLine}>
          <div className={styles.controlSlot} data-control-width={controlWidth}>
            {wire(children)}
          </div>
          {Boolean(trailing) && <div className={styles.trailing}>{trailing}</div>}
        </div>
        {Boolean(footer) && footer}
        {Boolean(error) && (
          <Text as="div" id={errorId} size="sm" tone="danger">
            {error}
          </Text>
        )}
      </div>
    </div>
  );
});
SettingRowRoot.displayName = 'SettingRow';

/** Vertical padding per row: `sm` = `--space-2`, `md` = `--space-3`, `lg` = `--space-4`. */
export type SettingRowListSpacing = 'sm' | 'md' | 'lg';

export interface SettingRowListProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * CSS length for the label column, shared by every row in the list
   * (e.g. `'18rem'`, `'240px'`). Default `'16rem'` via the
   * `--setting-row-label-width` token.
   *
   * A LENGTH, not `max-content` — rows align because they each resolve the
   * same value, with no subgrid.
   */
  labelWidth?: string;
  /** 1px border between rows. Default `false`, matching `<DefinitionList>`. */
  dividers?: boolean;
  /** Vertical padding per row. Default `'md'`. */
  spacing?: SettingRowListSpacing;
  /**
   * Container width at or below which each row stacks its label column above
   * its control column. `'sm'` 480px / `'md'` 640px / `'lg'` 768px, measured
   * against the LIST's own box (a container query, like `<Grid>` and
   * `<Split>`). Default `'sm'`.
   *
   * Pass `false` to opt out of containment entirely — e.g. inside a
   * shrink-to-fit parent (a `width: max-content` flex item, an inline-block,
   * a table cell), where `container-type: inline-size` would otherwise zero
   * the List's intrinsic-width contribution. See the anti-pattern below.
   */
  collapseBelow?: CollapseBreakpoint | false;
  /** The rows. */
  children: ReactNode;
}

// Same shape as Grid's `collapseClass` (Grid.tsx:143) — no non-null
// assertions: types/scss-modules.d.ts types a CSS-module member as `string`.
const COLLAPSE_CLASS: Record<CollapseBreakpoint, string> = {
  sm: styles.collapseSm,
  md: styles.collapseMd,
  lg: styles.collapseLg,
};

/**
 * A list of `<SettingRow>`s. Owns the shared label column, the vertical
 * rhythm, the optional dividers, and the narrow-container collapse — all of
 * which are the parent's job, not the row's.
 *
 * @example
 * <SettingRow.List dividers labelWidth="18rem">
 *   <SettingRow label="Seats" description="Member seats for this tenant">
 *     <Input type="number" />
 *   </SettingRow>
 *   <SettingRow label="API calls" description="Requests included per month">
 *     <Input type="number" />
 *   </SettingRow>
 * </SettingRow.List>
 *
 * @remarks When NOT to use
 * - Grouping rows under a heading — that is `<FormSection>`, which can wrap a
 *   `<SettingRow.List>`.
 *
 * @remarks Anti-patterns
 * - ❌ A `<Stack>` of rows with ad-hoc `gap` instead of this — the rows then
 *   have no shared label-column owner and no divider rhythm.
 * - ❌ Setting `--setting-row-label-width` on individual rows — the point is
 *   one value for the whole list.
 * - ❌ A `SettingRow.List` inside a shrink-to-fit parent (a
 *   `width: max-content` flex item, an inline-block, a table cell) with the
 *   default `collapseBelow` — the List is a size container by default, so
 *   its intrinsic-width contribution is zero and it collapses. Pass
 *   `collapseBelow={false}` there to opt out of containment.
 */
const SettingRowList = forwardRef<HTMLDivElement, SettingRowListProps>(function SettingRowList(
  {
    labelWidth,
    dividers = false,
    spacing = 'md',
    collapseBelow = 'sm',
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-setting-row-list=""
      data-spacing={spacing}
      data-dividers={dividers ? 'true' : undefined}
      className={clsx(
        styles.list,
        collapseBelow !== false && styles.collapsible,
        collapseBelow !== false && COLLAPSE_CLASS[collapseBelow],
        className,
      )}
      // Custom-property-in-style idiom copied from Grid.tsx:204.
      style={
        labelWidth != null
          ? { ...(style as CSSProperties), ['--setting-row-label-width' as string]: labelWidth }
          : style
      }
      {...rest}
    >
      {children}
    </div>
  );
});
SettingRowList.displayName = 'SettingRowList';

export const SettingRow = Object.assign(SettingRowRoot, {
  List: SettingRowList,
});
