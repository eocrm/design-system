import {
  cloneElement,
  Fragment,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';

/**
 * `Boolean(n)`, plus: an empty array and an empty fragment (`<></>`) count as
 * ABSENT rather than present. `Boolean(label)` alone treats `label={<></>}` /
 * `label={[]}` as truthy, so `Field`/`SettingRow` used to render a real, empty
 * `<label>` and point `aria-labelledby` at it — and a real-but-empty referent
 * is authoritative in the accname algorithm, so it silently named the control
 * `""` instead of falling through to anything else. Use this everywhere a
 * `hasX` predicate feeds BOTH a render gate (should something visible exist)
 * and an ARIA reference (does that visible thing actually name/describe the
 * control) — `hasLabel`, `hasDescription`, `hasError`.
 *
 * Known, deliberate limit: this cannot see a REAL element with empty visual
 * content (`label={<span />}`) or a whitespace-only string (`label="   "`) —
 * both are still truthy content as far as this function is concerned, same
 * as `Boolean(x)` was. Detecting those needs rendering the element and
 * inspecting its content, which this predicate does not attempt.
 */
export function hasContent(n: ReactNode): boolean {
  if (Array.isArray(n)) return n.some(hasContent);
  if (isValidElement(n) && n.type === Fragment) {
    return hasContent((n.props as { children?: ReactNode }).children);
  }
  return Boolean(n);
}

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
  // Single source for the labelledby value, same shape as describedBy above —
  // computed once and reused by both the render-prop field object and the
  // cloneElement branch below, so they cannot recompute `hasLabel` two
  // different ways and drift (that drift is exactly what shipped: the
  // render-prop path and the cloneElement path used to each derive this
  // independently).
  const labelledBy = hasLabel ? labelId : undefined;

  const field: FieldRenderProps = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-labelledby': labelledBy,
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
      // ROUND 7 — round 6 shipped `if (hasLabel && !childProps['aria-label'])`:
      // skip injecting aria-labelledby whenever the child already carries its
      // own aria-label, reasoning it as the same "child's explicit value wins"
      // rule as the `||` two lines up. Both round-7 reviewers measured that
      // this is the wrong fix, at the wrong altitude: `aria-describedby` is
      // SUPPLEMENTARY (a consumer overriding it loses helper text — nothing
      // breaks), but the accessible NAME is the control's identity, and WCAG
      // 2.5.3 (Level A) requires a control's VISIBLE label text to be
      // contained in that name. `<Field label="Work email"><Input
      // aria-label="Email address" /></Field>` — a completely ordinary,
      // defensive pattern an agent writes reflexively — computed name
      // "Work email" before round 6 and "Email address" after: the visible
      // text silently dropped out of the name on the library's single most
      // common path. Reverted.
      //
      // The REAL fix is hasLabel itself: it now reads hasContent(label), not
      // Boolean(label) — see that function's doc. An empty label
      // (`label={<></>}`, `label={[]}`) no longer renders a `<label>` at all,
      // hasLabel is correctly false, and `labelledBy` above is `undefined` —
      // on BOTH this cloneElement path AND the render-prop `field` object,
      // which reads the same hoisted `hasLabel` (round 6's fix could not
      // reach the render-prop path at all, since that object is built before
      // the child is known and has no childProps to inspect — this fix has
      // no such asymmetry).
      //
      // No `if (hasLabel)` guard here, on purpose, verified by mutation: one
      // was restored in an earlier round-7 draft and stayed green with the
      // condition hardcoded `true`, and again with the `if` deleted outright
      // — because `labelledBy` is already `hasLabel ? labelId : undefined`,
      // so when `!hasLabel` this line reduces to `childProps['aria-labelledby']
      // || undefined`, and `cloneElement` receiving an explicit `undefined`
      // for a key the child never set is indistinguishable from omitting the
      // key — the same argument that killed round 5's and round 6's guards
      // here. Unlike those, this isn't a wrong claim shipped with a live
      // gate; there's no gate left to be wrong about.
      injected['aria-labelledby'] = childProps['aria-labelledby'] || labelledBy;
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
