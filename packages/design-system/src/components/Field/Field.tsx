import {
  forwardRef,
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Text, type TextSize } from '../Text';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './Field.module.scss';

/** Label placement relative to the control. */
export type FieldOrientation = 'vertical' | 'horizontal';

/** Label/message type scale; pairs with the control's own `size`. */
export type FieldSize = 'sm' | 'md' | 'lg';

/** The wiring Field hands to its control. Spread onto the control in render-prop form. */
export interface FieldRenderProps {
  id: string;
  'aria-describedby': string | undefined;
  /** Id of the label element to name the control — set only when a label is rendered. */
  'aria-labelledby': string | undefined;
  'aria-invalid': boolean | undefined;
  invalid: boolean;
  required: boolean;
  /** Id of the label/caption element — for manual `aria-labelledby` wiring. */
  labelId: string;
}

type FieldChild = ReactNode | ((field: FieldRenderProps) => ReactNode);

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Label text. Renders a `<label htmlFor>` (or, in `asGroup`, a `role="group"` caption). */
  label?: ReactNode;
  /** Helper text below the control. Hidden while `error` is present. */
  description?: ReactNode;
  /** Error message. Replaces `description`, flips the control to `invalid`, links `aria-describedby`.
   *
   * NOT announced. The message is linked with `aria-describedby`, which screen
   * readers read on FOCUS — so an error appearing after a submit reaches nobody
   * unless focus moves into the field. That is deliberate under Hard rule 10's
   * visual-only clause (per-field regions would announce on every keystroke of
   * a validate-on-change form), but it means a form-level summary region is the
   * consumer's job. Tracked in #494.
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
  const reactId = useId();
  const controlId = id ?? reactId;
  const labelId = `${controlId}-label`;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;

  const invalid = Boolean(error);
  const requiredBool = Boolean(required);
  const describedBy = error ? errorId : description != null ? descriptionId : undefined;

  const field: FieldRenderProps = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-labelledby': label != null ? labelId : undefined,
    'aria-invalid': invalid || undefined,
    invalid,
    required: requiredBool,
    labelId,
  };

  let control: ReactNode;
  if (typeof children === 'function') {
    control = children(field);
  } else if (isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    const childProps = child.props;
    let injected: Record<string, unknown>;
    if (asGroup) {
      injected = {
        invalid: childProps.invalid ?? invalid,
        required: childProps.required ?? requiredBool,
      };
    } else {
      injected = {
        id: controlId,
        'aria-describedby': childProps['aria-describedby'] ?? describedBy,
        invalid: childProps.invalid ?? invalid,
        required: childProps.required ?? requiredBool,
      };
      if (label != null) {
        injected['aria-labelledby'] = childProps['aria-labelledby'] ?? labelId;
      }
    }
    control = cloneElement(child, injected);
  } else {
    control = children;
  }

  const labelClassName = clsx(
    styles.label,
    size === 'sm' && styles.sizeSm,
    size === 'lg' && styles.sizeLg,
  );

  const markers = (
    <>
      {required && (
        <span aria-hidden="true" className={styles.required}>
          {' '}
          *
        </span>
      )}
      {optional && <span className={styles.optional}> {t('field.optional')}</span>}
    </>
  );

  let labelNode: ReactNode = null;
  if (label != null) {
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
  if (error != null) {
    messageNode = (
      <Text as="div" id={errorId} size={MSG_SIZE[size]} tone="danger">
        {error}
      </Text>
    );
  } else if (description != null) {
    messageNode = (
      <Text as="div" id={descriptionId} size={MSG_SIZE[size]} tone="muted">
        {description}
      </Text>
    );
  }

  const groupAria = asGroup
    ? {
        role: 'group' as const,
        'aria-labelledby': label != null ? labelId : undefined,
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
