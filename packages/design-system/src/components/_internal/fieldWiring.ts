import {
  cloneElement,
  Fragment,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';

/**
 * `Boolean(n)`, plus: an empty RE-ITERABLE container (array, `Set`, or `Map`
 * used directly — NOT `Map.values()`/`.entries()`, see below) and an empty
 * fragment (`<></>`) count as ABSENT rather than present. `Boolean(label)`
 * alone treats both as truthy when empty, so `Field`/`SettingRow` used to render
 * a real, empty `<label>` and point `aria-labelledby` at it — and a
 * real-but-empty referent is authoritative in the accname algorithm, so it
 * silently named the control `""` instead of falling through to anything else.
 * Use this everywhere a `hasX` predicate feeds BOTH a render gate (should
 * something visible exist) and an ARIA reference (does that visible thing
 * actually name/describe the control) — `hasLabel`, `hasDescription`, `hasError`.
 *
 * Known, deliberate limits:
 * - This cannot see a REAL element with empty visual content
 *   (`label={<span />}`) or a whitespace-only string (`label="   "`) — both are
 *   still truthy content as far as this function is concerned, same as
 *   `Boolean(x)` was. Detecting those needs rendering the element and
 *   inspecting its content, which this predicate does not attempt.
 * - A one-shot iterator — `Map.prototype.values()`, a generator — always
 *   counts as PRESENT, empty or not. Round 8 tried inspecting it (spreading
 *   the iterator to check), which reads correctly here but then hands React
 *   the same, now-exhausted iterator to render — React gets nothing, so a
 *   non-empty generator silently produced an empty `<label>` and suppressed
 *   the control's own `aria-label`: this predicate's own bug, reintroduced by
 *   the fix for it. You cannot ask a one-shot iterator whether it is empty
 *   without spending it, so this only inspects containers that survive being
 *   read twice (arrays, `Set`, a `Map` itself — iterating any of them fresh
 *   each time, unlike the iterator `.values()`/`.entries()` RETURN) and
 *   otherwise falls back to `Boolean(n)`, which is `true` for any non-null
 *   object — same as an untouched iterator reaching React does. Nobody
 *   passes `label={someGenerator()}` on purpose; React itself dev-warns on
 *   both iterator and `Map` children regardless ("Using Maps as children is
 *   not supported").
 */
export function hasContent(n: ReactNode): boolean {
  // Only RE-ITERABLE containers are inspected — reading them (`[...n]`) to
  // check for content doesn't consume what React later reads to render them.
  // A one-shot iterator (generator, `Map.values()`/`.entries()`) is
  // deliberately NOT matched here — see the "Known, deliberate limits" doc
  // above. `n instanceof Map` catches a Map passed DIRECTLY (its default
  // iteration yields `[k, v]` tuples — themselves arrays of ReactNode-legal
  // values, so this recurses into them correctly), which is a real,
  // type-legal, re-iterable input distinct from its one-shot `.values()`.
  if (Array.isArray(n) || n instanceof Set || n instanceof Map) {
    return [...(n as Iterable<ReactNode>)].some(hasContent);
  }
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
  /** The id the control's `aria-labelledby` should point at — set only when a label is rendered. */
  labelledBy: string | undefined;
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
  // computed once and reused by the render-prop field object, the
  // cloneElement branch below, AND returned to the caller (Field's `asGroup`
  // wrapper reads this instead of re-deriving `hasLabel ? labelId : undefined`
  // a third time), so none of them can recompute `hasLabel` a different way
  // and drift (that drift is exactly what shipped: the render-prop path and
  // the cloneElement path used to each derive this independently).
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
    labelledBy,
    invalid,
    wire,
  };
}
