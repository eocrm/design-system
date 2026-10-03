import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Text } from '../Text';
import { hasContent, useFieldWiring, type FieldRenderProps } from '../_internal/fieldWiring';
import { type CollapseBreakpoint } from '../_internal/collapse';
import styles from './SettingRow.module.scss';

/** Width of the control only (not its trailing adornments), capped at the column. A subset of `<Constrain>`'s measure scale. */
export type SettingRowControlWidth = 'auto' | 'xs' | 'sm' | 'md';

export interface SettingRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Label text. Renders a `<label htmlFor>` that names the control. Required — an empty or falsy value (e.g. `0`, `''`, `[]`, `<></>`) renders no `<label>` at all; see the anti-pattern below. */
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
   * Width of the control only — `trailing` is not sized by it. Default
   * `'auto'` — the control's intrinsic width. Every row using the same step
   * gets the same control width (capped at the column, so a narrow container
   * still shrinks it), which is what keeps controls aligned down a
   * `<SettingRow.List>`. Intended for controls that stretch to `width: 100%`
   * (`Input`, `Select`); a fixed-size control (`Switch`) does not grow — the
   * slot just reserves the width.
   *
   * `trailing` stays on the control's line only while both fit: in a narrow
   * column a wide step (`'md'`) plus `trailing` can wrap `trailing` onto a
   * second line. Use a smaller step if that matters.
   */
  controlWidth?: SettingRowControlWidth;
  /**
   * Content after the control on the same line — a mode select, a state
   * badge, a reset button. `controlWidth` does NOT apply here — it only sizes
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
   * the form owns the submit-time summary. Same reasoning as `<Field error>`.
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
 * One row of a settings screen: label and description in a shared left column, control and footer on the right.
 * @see docs/components/SettingRow.md
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
  // Single source of truth for each "is there an X" predicate — round 5
  // hoisted only `hasLabel` (it had two consumers and had already diverged);
  // round 6 did the same for `hasDescription`/`hasError`/`hasRequired`,
  // still each computed twice (once for the wiring call, once for the
  // matching render gate). Round 7: `hasLabel`/`hasDescription`/`hasError`
  // now use `hasContent`, not `Boolean` — see that function's doc in
  // fieldWiring.ts. `hasRequired` stays `Boolean` since `required` is a
  // plain boolean, not ReactNode content that can be an empty-but-truthy
  // container.
  const hasLabel = hasContent(label);
  const hasDescription = hasContent(description);
  const hasError = hasContent(error);
  const hasRequired = Boolean(required);
  const { controlId, labelId, descriptionId, errorId, wire } = useFieldWiring({
    id,
    hasLabel,
    hasDescription,
    hasError,
    required: hasRequired,
  });

  return (
    <div ref={ref} data-setting-row="" className={clsx(styles.row, className)} {...rest}>
      <div className={styles.term}>
        <div className={styles.labelLine}>
          {hasLabel && (
            <label htmlFor={controlId} id={labelId} className={styles.label}>
              {label}
              {hasRequired && (
                <span aria-hidden="true" className={styles.required}>
                  {' '}
                  *
                </span>
              )}
            </label>
          )}
          {Boolean(labelAdornment) && labelAdornment}
        </div>
        {hasDescription && (
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
        {hasError && (
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
 * A list of `<SettingRow>`s that owns the shared label column, vertical rhythm, dividers and narrow-container collapse.
 * @see docs/components/SettingRow.md
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
