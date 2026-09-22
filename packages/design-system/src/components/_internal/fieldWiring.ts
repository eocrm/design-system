import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

/** The wiring a field-like component hands to its control. Spread onto the control in render-prop form. */
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

export interface FieldWiringOptions {
  /** Explicit control id. Omit to let the wiring own it (auto-generated). */
  id?: string;
  /** Whether the caller renders a label — drives `aria-labelledby` injection. */
  hasLabel: boolean;
  /** Whether the caller renders a description — drives `aria-describedby` when there is no error. */
  hasDescription: boolean;
  /** Truthy when the caller renders an error message. */
  hasError: boolean;
  /** Marks the control required. */
  required?: boolean;
  /** Group mode (radio/checkbox sets): skip id/ARIA injection, inject only `invalid`/`required`. */
  asGroup?: boolean;
}

export interface FieldWiring {
  controlId: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
  /** The id the control's `aria-describedby` should point at — error wins over description. */
  describedBy: string | undefined;
  invalid: boolean;
  /** Auto-wire a single element child, or invoke a render-prop with `field`. */
  wire: (children: ReactNode | ((field: FieldRenderProps) => ReactNode)) => ReactNode;
}

/**
 * Shared control wiring for `<Field>` and `<SettingRow>`: id ownership, the
 * `aria-describedby` error-over-description choice, `aria-invalid`, and the
 * `cloneElement` injection onto a single child.
 *
 * Extracted rather than copied because the `||`-not-`??` rule below is subtle
 * and load-bearing for every named input in the library.
 */
export function useFieldWiring({
  id,
  hasLabel,
  hasDescription,
  hasError,
  required,
  asGroup = false,
}: FieldWiringOptions): FieldWiring {
  const reactId = useId();
  const controlId = id ?? reactId;
  const labelId = `${controlId}-label`;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;

  const invalid = hasError;
  const requiredBool = Boolean(required);
  const describedBy = hasError ? errorId : hasDescription ? descriptionId : undefined;

  const field: FieldRenderProps = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-labelledby': hasLabel ? labelId : undefined,
    'aria-invalid': invalid || undefined,
    invalid,
    required: requiredBool,
    labelId,
  };

  const wire = (children: ReactNode | ((f: FieldRenderProps) => ReactNode)): ReactNode => {
    if (typeof children === 'function') return children(field);
    if (!isValidElement(children)) return children;

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
        // `||`, not `??`, on both ARIA id references: `aria-labelledby={sectionId ?? ''}`
        // is ordinary consumer code, and an empty id list references nothing — it
        // contributes no name and lets the computation fall through, exactly like an
        // empty `aria-label`. Treating it as an explicit override would suppress
        // `labelId` and leave the control anonymous, which matters more here than
        // anywhere else: Field names every input in the library through
        // `aria-labelledby` rather than `<label for>`. `invalid` / `required` keep `??`
        // — those are booleans, where `false` is a meaningful explicit value.
        'aria-describedby': childProps['aria-describedby'] || describedBy,
        invalid: childProps.invalid ?? invalid,
        required: childProps.required ?? requiredBool,
      };
      if (hasLabel) {
        injected['aria-labelledby'] = childProps['aria-labelledby'] || labelId;
      }
    }
    return cloneElement(child, injected);
  };

  return {
    controlId,
    labelId,
    descriptionId,
    errorId,
    describedBy,
    invalid,
    wire,
  };
}
