import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Text } from '../Text';
import { useFieldWiring, type FieldRenderProps } from '../_internal/fieldWiring';
import styles from './SettingRow.module.scss';

/** Max width applied to the control cell. Mirrors `<Constrain>`'s measure scale. */
export type SettingRowControlWidth = 'auto' | 'xs' | 'sm' | 'md' | 'full';

export interface SettingRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Label text. Renders a `<label htmlFor>` that names the control. Required. */
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
  /** Max width of the control cell. Default `'auto'` — the control's intrinsic width. */
  controlWidth?: SettingRowControlWidth;
  /** Content after the control on the same line — a mode select, a state badge, a reset button. */
  trailing?: ReactNode;
  /** Block under the control column — a usage meter, a caveat, a preview. */
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
 * @example
 * // A metered limit with provenance, a mode adornment and a usage meter:
 * <SettingRow.List dividers labelWidth="18rem">
 *   <SettingRow
 *     label="Seats"
 *     labelAdornment={<Badge tone="neutral" size="sm">From plan</Badge>}
 *     description="Member seats included for this tenant"
 *     controlWidth="xs"
 *     trailing={<Select size="sm" options={modes} value={mode} onChange={setMode} />}
 *     footer={<Progress value={0} max={50} aria-label="Seats usage" />}
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
 */
export const SettingRow = forwardRef<HTMLDivElement, SettingRowProps>(function SettingRow(
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
  const { controlId, labelId, descriptionId, errorId, wire } = useFieldWiring({
    id,
    hasLabel: true,
    hasDescription: description != null,
    hasError: error != null,
    required,
  });

  return (
    <div ref={ref} data-setting-row="" className={clsx(styles.row, className)} {...rest}>
      <div className={styles.term}>
        <div className={styles.labelLine}>
          <label htmlFor={controlId} id={labelId} className={styles.label}>
            {label}
            {required && (
              <span aria-hidden="true" className={styles.required}>
                {' '}
                *
              </span>
            )}
          </label>
          {labelAdornment}
        </div>
        {description != null && (
          <Text as="div" id={descriptionId} size="sm" tone="muted">
            {description}
          </Text>
        )}
      </div>
      <div className={styles.control}>
        <div className={styles.controlLine} data-control-width={controlWidth}>
          {wire(children)}
          {trailing}
        </div>
        {footer}
        {error != null && (
          <Text as="div" id={errorId} size="sm" tone="danger">
            {error}
          </Text>
        )}
      </div>
    </div>
  );
});
