import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Text, type TextSize } from '../Text';
import { useTranslation } from '../../i18n/useTranslation';
import { hasContent, useFieldWiring, type FieldRenderProps } from '../_internal/fieldWiring';
import styles from './Field.module.scss';

export type { FieldRenderProps };

/** Label placement relative to the control. */
export type FieldOrientation = 'vertical' | 'horizontal';

/** Label/message type scale; pairs with the control's own `size`. */
export type FieldSize = 'sm' | 'md' | 'lg';

type FieldChild = ReactNode | ((field: FieldRenderProps) => ReactNode);

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Label text. Renders a `<label htmlFor>` (or, in `asGroup`, a `role="group"` caption). */
  label?: ReactNode;
  /** Helper text below the control. Hidden while `error` is present. */
  description?: ReactNode;
  /**
   * Error message. Replaces `description`, flips the control to `invalid`, and
   * links it with `aria-describedby`.
   *
   * **Not announced, deliberately.** `aria-describedby` is read on FOCUS, so an
   * error that appears after a submit reaches nobody unless focus moves into
   * the field. Hard rule 10 permits chosen silence provided it is written down;
   * this is that note.
   *
   * The alternative — a live region per Field — is worse in the common case: a
   * validate-on-change form would announce on every keystroke, and a submit
   * failing N fields would fire N announcements over each other. The right
   * owner of that announcement is the FORM, which knows how many fields failed
   * and when the user asked for the answer.
   *
   * So: announce a summary yourself on submit, and leave the per-field message
   * to `aria-describedby` for when focus arrives.
   *
   * ```tsx
   * <div role="status" aria-live="polite">
   *   {submitted && errorCount > 0 ? `${errorCount} fields need attention` : ''}
   * </div>
   * ```
   *
   * See #494 for the full reasoning.
   */
  error?: ReactNode;
  /** Marks the field required: shows `*` and injects `required` onto the control. */
  required?: boolean;
  /** Marks the field optional: shows `(optional)`. Mutually exclusive with `required`. */
  optional?: boolean;
  /** Label placement. Default `'vertical'`. `'horizontal'` puts the label beside the control. */
  orientation?: FieldOrientation;
  /** Label/message type scale. Default `'md'`. Size primarily scales the label; the help/error message uses a compact fixed scale (`md` and `lg` both render the message at `sm`). */
  size?: FieldSize;
  /** Explicit control id. Field owns the id by default (auto-generated) so the label always matches. */
  id?: string;
  /** Group mode for radio/checkbox sets: label becomes a `role="group"` caption (no `htmlFor`). */
  asGroup?: boolean;
  /** A single control element (auto-wired) or a render-prop `(field) => ReactNode`. */
  children: FieldChild;
}

const MSG_SIZE: Record<FieldSize, TextSize> = { sm: 'xs', md: 'sm', lg: 'sm' };

/**
 * Labeled-control unit — the editable sibling of `<DefinitionList>`. Wraps a
 * single control with its label, helper/error message, required marker, and the
 * `id` / `aria-labelledby` / `aria-describedby` / `aria-invalid` association by
 * construction. When a label is present, Field also injects `aria-labelledby`
 * onto the cloned child, so composite controls that forward unknown ARIA props
 * (Select, Slider, ColorPicker, IconPicker, FileUpload, TimeField) get an accessible name
 * automatically. For wrapped/nested DOM that doesn't forward props, use the
 * render-prop and spread `field` (it carries `aria-labelledby`).
 *
 * The common case auto-wires a single child via `cloneElement`. For wrapped,
 * nested, or native controls, pass a render-prop and spread the `field` object.
 *
 * Field owns NO validation/state — pass `error` from your form layer.
 *
 * @example
 * // Auto-wired (DS control):
 * <Field label="Work email" error={errors.email} required>
 *   <Input type="email" />
 * </Field>
 *
 * @example
 * // Render-prop escape hatch (wrapped / native control):
 * <Field label="Email" error={errors.email}>
 *   {(field) => <input type="email" {...field} />}
 * </Field>
 *
 * @example
 * // Radio/checkbox group — label becomes a role="group" caption:
 * <Field asGroup label="Notify me" error={errors.notify}>
 *   <RadioGroup name="notify">
 *     <Radio value="all" label="All activity" />
 *     <Radio value="mentions" label="Only mentions" />
 *   </RadioGroup>
 * </Field>
 *
 * @remarks When NOT to use
 * - A single `<Checkbox>` / `<Switch>` — they carry their own inline `label`; wrapping
 *   them in a top-labeled Field double-labels. Use the control's `label` prop instead.
 * - Read-only key/value display — use `<DefinitionList>`, not a Field.
 * - Arranging multiple fields — that's `<FormRow>` / `<FormSection>` / `<Stack>`, not Field.
 *
 * @remarks Anti-patterns
 * - ❌ Setting the control's `id` directly to "override" Field — Field owns the id so the
 *   label always matches. Pass `<Field id>` instead.
 * - ❌ Auto-wiring a raw native `<input>` and expecting `aria-invalid` — auto-clone injects
 *   the DS `invalid` prop (controls map it to `aria-invalid`). For a native element use the
 *   render-prop and spread `field` (it includes `aria-invalid`).
 * - ❌ Passing both `required` and `optional`.
 * - ⚠️ `label` / `description` / `error` treat `0`, `NaN`, `false`, `''`, an
 *   empty array, and an empty fragment (`<></>`) as ABSENT — not just the
 *   falsy cases. `error={errors.map(...)}` with no errors, `label={<></>}`,
 *   `description={[]}` all render nothing at all: no `<label>`, no
 *   description `<Text>`, no error `<Text>` (and no `invalid` flip for
 *   `error`) — the control falls back to its own `aria-label` if it has
 *   one, or ends up unnamed otherwise. This can't see a REAL but
 *   visually-empty node (`label={<span />}`, `label="   "`) — those still
 *   count as present. Pass `undefined` explicitly for "none" rather than a
 *   container that might be empty.
 * - ⚠️ An absent `label` also removes the `required`/`optional` marker —
 *   both live inside the `<label>` element, which isn't rendered at all
 *   when the label has no content. `<Field label={0} required>` shows no
 *   `*`; `<Field label={0} optional>` shows no `(optional)` either.
 */
export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    label,
    description,
    error,
    required,
    optional,
    orientation = 'vertical',
    size = 'md',
    id,
    asGroup = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  // Single source of truth for each "is there an X" predicate — round 5
  // hoisted only `hasLabel` (it had THREE consumers and had already
  // diverged); round 6 did the same for `hasDescription`/`hasError`/
  // `hasRequired`, which were still each computed twice (once for the
  // wiring call, once for the matching render gate). Round 7: `hasLabel`/
  // `hasDescription`/`hasError` now use `hasContent`, not `Boolean` — see
  // that function's doc in fieldWiring.ts. `hasRequired`/`hasOptional` stay
  // `Boolean` since `required`/`optional` are plain booleans, not ReactNode
  // content that can be an empty-but-truthy container.
  const hasLabel = hasContent(label);
  const hasDescription = hasContent(description);
  const hasError = hasContent(error);
  const hasRequired = Boolean(required);
  const hasOptional = Boolean(optional);
  const { controlId, labelId, descriptionId, errorId, describedBy, labelledBy, invalid, wire } =
    useFieldWiring({
      id,
      hasLabel,
      hasDescription,
      hasError,
      required: hasRequired,
      asGroup,
    });

  const control = wire(children);

  const labelClassName = clsx(
    styles.label,
    size === 'sm' && styles.sizeSm,
    size === 'lg' && styles.sizeLg,
  );

  const markers = (
    <>
      {hasRequired && (
        <span aria-hidden="true" className={styles.required}>
          {' '}
          *
        </span>
      )}
      {hasOptional && <span className={styles.optional}> {t('field.optional')}</span>}
    </>
  );

  let labelNode: ReactNode = null;
  if (hasLabel) {
    labelNode = asGroup ? (
      <span id={labelId} className={labelClassName}>
        {label}
        {markers}
      </span>
    ) : (
      <label htmlFor={controlId} id={labelId} className={labelClassName}>
        {label}
        {markers}
      </label>
    );
  }

  let messageNode: ReactNode = null;
  if (hasError) {
    messageNode = (
      <Text as="div" id={errorId} size={MSG_SIZE[size]} tone="danger">
        {error}
      </Text>
    );
  } else if (hasDescription) {
    messageNode = (
      <Text as="div" id={descriptionId} size={MSG_SIZE[size]} tone="muted">
        {description}
      </Text>
    );
  }

  const groupAria = asGroup
    ? {
        role: 'group' as const,
        'aria-labelledby': labelledBy,
        'aria-describedby': describedBy,
        'aria-invalid': invalid || undefined,
      }
    : {};

  return (
    <div
      ref={ref}
      className={clsx(styles.field, orientation === 'horizontal' && styles.horizontal, className)}
      {...groupAria}
      {...rest}
    >
      {labelNode}
      <div className={styles.body}>
        {control}
        {messageNode}
      </div>
    </div>
  );
});
