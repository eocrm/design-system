import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Field } from './Field';

// A stub control mimicking the DS control contract: reads `invalid` and
// reflects it to aria-invalid; forwards id / aria-describedby / required.
function StubControl(props: {
  id?: string;
  invalid?: boolean;
  required?: boolean;
  'aria-describedby'?: string;
}) {
  return (
    <input
      data-testid="control"
      id={props.id}
      required={props.required}
      aria-invalid={props.invalid || undefined}
      aria-describedby={props['aria-describedby']}
    />
  );
}

describe('Field', () => {
  it('associates the label with the control via htmlFor/id', () => {
    const { container } = render(
      <Field label="Work email">
        <StubControl />
      </Field>,
    );
    const input = screen.getByTestId('control');
    expect(input.id).toBeTruthy();
    const label = container.querySelector(`label[for="${input.id}"]`);
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Work email');
  });

  it('renders description and links aria-describedby to it (no error)', () => {
    render(
      <Field label="Email" description="We only use this for sign-in.">
        <StubControl />
      </Field>,
    );
    const input = screen.getByTestId('control');
    const desc = screen.getByText('We only use this for sign-in.');
    expect(desc.id).toBeTruthy();
    expect(input).toHaveAttribute('aria-describedby', desc.id);
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('error replaces description, flips invalid, links aria-describedby', () => {
    render(
      <Field label="Email" description="hint" error="Enter a valid email.">
        <StubControl />
      </Field>,
    );
    const input = screen.getByTestId('control');
    const err = screen.getByText('Enter a valid email.');
    expect(input).toHaveAttribute('aria-describedby', err.id);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('hint')).not.toBeInTheDocument();
  });

  it('required shows a marker and injects required on the control', () => {
    render(
      <Field label="Email" required>
        <StubControl />
      </Field>,
    );
    expect(screen.getByTestId('control')).toBeRequired();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('optional shows an "(optional)" marker', () => {
    render(
      <Field label="Phone" optional>
        <StubControl />
      </Field>,
    );
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  it('render-prop receives the full field object incl. aria-invalid', () => {
    let received: Record<string, unknown> = {};
    render(
      <Field label="Email" error="bad">
        {(field) => {
          received = field as unknown as Record<string, unknown>;
          return <input data-testid="control" {...field} />;
        }}
      </Field>,
    );
    expect(received.id).toBeTruthy();
    expect(received.invalid).toBe(true);
    expect(received['aria-invalid']).toBe(true);
    expect(received['aria-describedby']).toBeTruthy();
  });

  it("the child's explicit prop wins over Field's injected value", () => {
    render(
      <Field label="Email" error="bad">
        <StubControl aria-describedby="custom-id" />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAttribute('aria-describedby', 'custom-id');
  });

  it('group mode: role=group, aria-labelledby caption, child gets invalid, no <label>', () => {
    const { container } = render(
      <Field asGroup label="Notify me" error="Pick one">
        <StubControl />
      </Field>,
    );
    const group = container.querySelector('[role="group"]') as HTMLElement;
    expect(group).toBeInTheDocument();
    const caption = screen.getByText('Notify me');
    expect(caption.tagName).not.toBe('LABEL');
    expect(group).toHaveAttribute('aria-labelledby', caption.id);
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('control')).toHaveAttribute('aria-invalid', 'true');
  });

  it('horizontal orientation applies the modifier class', () => {
    const { container } = render(
      <Field label="Timezone" orientation="horizontal">
        <StubControl />
      </Field>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/horizontal/);
  });

  it('forwards ref, merges className, spreads rest', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Field ref={ref} className="my-cls" data-foo="bar" label="X">
        <StubControl />
      </Field>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/my-cls/);
    expect(root).toHaveAttribute('data-foo', 'bar');
  });

  it("owns the control id — a child's own id is overridden", () => {
    const { container } = render(
      <Field label="Email">
        <StubControl id="ignored" />
      </Field>,
    );
    const input = screen.getByTestId('control');
    expect(input.id).not.toBe('ignored');
    expect(input.id).toBeTruthy();
    expect(container.querySelector(`label[for="${input.id}"]`)).toBeInTheDocument();
  });

  it('auto-clone injects `invalid` but not `aria-invalid` (control maps it)', () => {
    function RawControl(props: { invalid?: boolean; 'aria-invalid'?: boolean }) {
      return (
        <input
          data-testid="raw"
          data-invalid={String(Boolean(props.invalid))}
          aria-invalid={props['aria-invalid']}
        />
      );
    }

    render(
      <Field label="Email" error="bad">
        <RawControl />
      </Field>,
    );
    const raw = screen.getByTestId('raw');
    expect(raw).toHaveAttribute('data-invalid', 'true');
    expect(raw).not.toHaveAttribute('aria-invalid');
  });

  it('auto-clone injects aria-labelledby=labelId when a label is present', () => {
    function LabelledStub(props: { id?: string; 'aria-labelledby'?: string }) {
      return (
        <input data-testid="control" id={props.id} aria-labelledby={props['aria-labelledby']} />
      );
    }
    const { container } = render(
      <Field label="Work email">
        <LabelledStub />
      </Field>,
    );
    const input = screen.getByTestId('control');
    const label = container.querySelector(`label[for="${input.id}"]`) as HTMLElement;
    expect(label.id).toBeTruthy();
    expect(input).toHaveAttribute('aria-labelledby', label.id);
  });

  it('auto-clone does NOT inject aria-labelledby when there is no label', () => {
    function LabelledStub(props: { 'aria-labelledby'?: string }) {
      return <input data-testid="control" aria-labelledby={props['aria-labelledby']} />;
    }
    render(
      <Field>
        <LabelledStub />
      </Field>,
    );
    expect(screen.getByTestId('control')).not.toHaveAttribute('aria-labelledby');
  });

  it("the child's explicit aria-labelledby wins over Field's", () => {
    function LabelledStub(props: { 'aria-labelledby'?: string }) {
      return <input data-testid="control" aria-labelledby={props['aria-labelledby']} />;
    }
    render(
      <Field label="Email">
        <LabelledStub aria-labelledby="custom-label" />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAttribute('aria-labelledby', 'custom-label');
  });

  it('render-prop field object carries aria-labelledby (= labelId when labelled)', () => {
    let received: Record<string, unknown> = {};
    render(
      <Field label="Email">
        {(field) => {
          received = field as unknown as Record<string, unknown>;
          return <input data-testid="control" {...field} />;
        }}
      </Field>,
    );
    expect(received['aria-labelledby']).toBe(received.labelId);
    expect(screen.getByTestId('control')).toHaveAttribute(
      'aria-labelledby',
      received.labelId as string,
    );
  });

  it('asGroup does NOT inject aria-labelledby onto the child (it lives on the role=group wrapper)', () => {
    function LabelledStub(props: { 'aria-labelledby'?: string }) {
      return <input data-testid="control" aria-labelledby={props['aria-labelledby']} />;
    }
    render(
      <Field asGroup label="Notify me">
        <LabelledStub />
      </Field>,
    );
    expect(screen.getByTestId('control')).not.toHaveAttribute('aria-labelledby');
  });
});

describe('Field — falsy-but-present `error` (the `error={cond && msg}` idiom)', () => {
  // `error?: ReactNode` accepts `false` and `''` as legal values — both are
  // what `error={touched && errors.email}` or `error={errors.email ?? ''}`
  // produce for "no error yet". A regression that treats them as "an error is
  // present" (e.g. `hasError: error != null`) flips the control invalid with
  // an empty message and hides the description — this guards against it.
  it.each([
    ['false', false],
    ['an empty string', ''],
    ['an empty fragment', <></>],
    ['an empty array', []],
  ])(
    'error=%s does not flip the control invalid, and the description stays visible',
    (_label, errorValue) => {
      render(
        <Field label="Email" description="We only use this for sign-in." error={errorValue}>
          <StubControl />
        </Field>,
      );
      const input = screen.getByTestId('control');
      expect(input).not.toHaveAttribute('aria-invalid');
      const desc = screen.getByText('We only use this for sign-in.');
      expect(input).toHaveAttribute('aria-describedby', desc.id);
    },
  );

  it('error=undefined behaves the same as omitting error entirely', () => {
    render(
      <Field label="Email" description="We only use this for sign-in." error={undefined}>
        <StubControl />
      </Field>,
    );
    const input = screen.getByTestId('control');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('We only use this for sign-in.')).toBeInTheDocument();
  });
});

describe('Field — falsy-but-present `description`', () => {
  // Same hole as the `error` block above, on the other predicate: the wiring
  // (hasDescription) and the render gate (messageNode's description branch)
  // compute Boolean(description) independently. Every existing
  // aria-describedby assertion in this file runs with a truthy description,
  // so nothing catches the wiring alone drifting back to `!= null` — that
  // would still set aria-describedby to a descriptionId whose <Text> never
  // renders, a dangling reference `toHaveAccessibleDescription` can't tell
  // apart from "no description".
  it.each([
    ['false', false],
    ['an empty string', ''],
    ['an empty fragment', <></>],
    ['an empty array', []],
  ])(
    'description=%s renders no description node and no aria-describedby',
    (_label, descriptionValue) => {
      const { container } = render(
        <Field label="Email" description={descriptionValue}>
          <StubControl />
        </Field>,
      );
      const input = screen.getByTestId('control');
      expect(input).not.toHaveAttribute('aria-describedby');
      // Catches the RENDER gate (messageNode's description branch)
      // independent of the wiring (hasDescription) check above: if only the
      // render gate reverted, hasDescription stays correctly false, so
      // aria-describedby stays unset (the check above alone would miss
      // it) — but an orphan <Text id="…-description"> would still render.
      expect(container.querySelector('[id$="-description"]')).not.toBeInTheDocument();
    },
  );
});

describe('Field — falsy-but-present `label`', () => {
  // hasLabel (wiring) and the labelNode render gate compute Boolean(label)
  // independently, same shape as the error/description gaps above.
  // `label={cond && 'Name'}` producing `false`/`''` must render no <label>
  // AND inject no aria-labelledby: if only the wiring broke (`!= null`),
  // aria-labelledby would still point at a labelId whose <label> never
  // rendered — a dangling reference, i.e. an anonymous control. If only the
  // render gate broke, an empty <label> would exist with nothing pointing
  // at it.
  //
  // StubControl (used throughout this file) does NOT forward
  // aria-labelledby, so it can't see the wiring gate at all — using it here
  // was tried first and silently passed against BOTH the fixed and the
  // mutated wiring. This stub mirrors the `LabelledStub` pattern used
  // elsewhere in this file, which does forward it.
  function LabelledStub(props: { id?: string; 'aria-labelledby'?: string }) {
    return <input data-testid="control" id={props.id} aria-labelledby={props['aria-labelledby']} />;
  }

  it.each([
    ['false', false],
    ['an empty string', ''],
  ])('label=%s renders no <label> and injects no aria-labelledby', (_label, labelValue) => {
    const { container } = render(
      <Field label={labelValue}>
        <LabelledStub />
      </Field>,
    );
    expect(container.querySelector('label')).not.toBeInTheDocument();
    expect(screen.getByTestId('control')).not.toHaveAttribute('aria-labelledby');
  });

  // The Critical this round: groupAria's aria-labelledby used to recompute
  // Boolean(label) independently of the wiring call (`hasLabel`) rather than
  // reading the same hoisted value. Reverting only that recomputation left
  // the whole suite green — this describe block had no asGroup case at all,
  // so nothing exercised it. `role="group"` is the element that carries
  // aria-labelledby in asGroup mode (not the child — see the existing
  // "asGroup does NOT inject aria-labelledby onto the child" test above),
  // so that's what this checks, plus no caption <span> either.
  it.each([
    ['false', false],
    ['an empty string', ''],
  ])(
    'asGroup + label=%s renders no caption and injects no aria-labelledby on the group',
    (_label, labelValue) => {
      const { container } = render(
        <Field asGroup label={labelValue}>
          <StubControl />
        </Field>,
      );
      const group = container.querySelector('[role="group"]');
      expect(group).not.toHaveAttribute('aria-labelledby');
      expect(container.querySelector('span[id$="-label"]')).not.toBeInTheDocument();
    },
  );
});

describe('Field — a truthy-but-empty `label` (label={<></>} / label={[]}) — hasContent, not Boolean', () => {
  // hasLabel is hasContent(label), not Boolean(label) — see fieldWiring.ts's
  // doc on hasContent. Boolean(label) treats a truthy-but-empty container as
  // present, which is the round 5/6 bug: it rendered a real, empty <label>,
  // and aria-labelledby pointing at a real-but-empty element is
  // authoritative in the accname algorithm — it does NOT fall through to
  // aria-label the way a fully dangling reference does. hasContent correctly
  // treats it as absent, so NO <label> renders at all — same shape as the
  // plain falsy case above, just reached via a fragment/array instead of
  // `false`/`''`.
  //
  // Round 6 shipped a DIFFERENT fix for this — skip injecting
  // aria-labelledby whenever the child has its own aria-label — and it was
  // reverted: it created a WCAG 2.5.3 (Label in Name, Level A) failure on
  // the ordinary path, where a control's OWN aria-label would beat a
  // MEANINGFUL row label, not just an empty one. See the last test below.
  function NamedStub(props: { id?: string; 'aria-label'?: string; 'aria-labelledby'?: string }) {
    return (
      <input
        data-testid="control"
        id={props.id}
        aria-label={props['aria-label']}
        aria-labelledby={props['aria-labelledby']}
      />
    );
  }

  it('label={<></>} renders no <label> at all — a control with its own aria-label keeps its name', () => {
    render(
      <Field label={<></>}>
        <NamedStub aria-label="Seats" />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAccessibleName('Seats');
    expect(document.querySelector('label')).not.toBeInTheDocument();
  });

  it('label={[]} behaves the same as label={<></>}', () => {
    render(
      <Field label={[]}>
        <NamedStub aria-label="Seats" />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAccessibleName('Seats');
  });

  it('a NON-empty array of only falsy elements (label={[false, false]}) is also absent — hasContent checks each element, not just array length', () => {
    render(
      <Field label={[false, false]}>
        <NamedStub aria-label="Seats" />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAccessibleName('Seats');
    expect(document.querySelector('label')).not.toBeInTheDocument();
  });

  it('label={<></>} with no fallback on the control injects no aria-labelledby (structural check — toHaveAccessibleName cannot see this gate)', () => {
    // toHaveAccessibleName('') can't distinguish "no aria-labelledby at
    // all" from "aria-labelledby pointing at a real-but-empty element" —
    // both resolve to ''. That made the equivalent assertion here inert in
    // round 6 (green on both the buggy code and the fix) — round 7 review
    // caught it. Assert the actual DOM state instead.
    render(
      <Field label={<></>}>
        <NamedStub />
      </Field>,
    );
    expect(document.querySelector('label')).not.toBeInTheDocument();
    expect(screen.getByTestId('control')).not.toHaveAttribute('aria-labelledby');
  });

  it("a MEANINGFUL label wins over a control's own aria-label — WCAG 2.5.3 Label in Name: visible text must be in the accessible name", () => {
    render(
      <Field label="Work email">
        <NamedStub aria-label="Email address" />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAccessibleName('Work email');
  });

  it('the render-prop path gets the same fix — the field object reads the same hoisted hasLabel, unlike round 6 which could not reach this path at all', () => {
    render(
      <Field label={<></>}>
        {(field) => <input data-testid="control" {...field} aria-label="Seats" />}
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAccessibleName('Seats');
    expect(screen.getByTestId('control')).not.toHaveAttribute('aria-labelledby');
  });

  it('an empty non-array iterable (label={new Set()}) is also absent — hasContent is not array-only', () => {
    // round 7 shipped `Array.isArray(n)`, which is false for any OTHER
    // `ReactNode`-legal iterable (Set, Map.values(), a generator) — all
    // type-check with no cast, and all fell through to `Boolean(n)`,
    // reproducing the exact empty-container bug this predicate exists to
    // close. Round 8: broadened to any iterable.
    render(
      <Field label={new Set()}>
        <NamedStub aria-label="Seats" />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAccessibleName('Seats');
    expect(document.querySelector('label')).not.toBeInTheDocument();
  });

  it('a fragment with real content is PRESENT — the Fragment conjunct is not just "any element recurses"', () => {
    // Pins the `n.type === Fragment` conjunct: dropping it (so ANY element
    // recurses into its children) is green on the whole suite without this
    // test — round 8 review, found independently by both reviewers.
    render(
      <Field
        label={
          <>
            Work <b>email</b>
          </>
        }
      >
        <NamedStub />
      </Field>,
    );
    expect(document.querySelector('label')).toBeInTheDocument();
    expect(screen.getByTestId('control')).toHaveAccessibleName('Work email');
  });

  it('a CHILDLESS real element (label={<span />}) is still PRESENT — hasContent only recurses into fragments, not every element', () => {
    // Pins the same conjunct from the other side: stubbing the recursion to
    // `return false` is also green on the whole suite without this test.
    // This is the documented `<span />` limit from this function's own doc —
    // previously asserted in prose only, never in a test. The control's own
    // aria-label is present but NOT what wins: a real-but-empty aria-labelledby
    // referent is authoritative in the accname algorithm (established in round
    // 6/7), so the name goes empty rather than falling through to "Seats".
    render(
      <Field label={<span />}>
        <NamedStub aria-label="Seats" />
      </Field>,
    );
    expect(document.querySelector('label')).toBeInTheDocument();
    expect(screen.getByTestId('control')).toHaveAttribute('aria-labelledby');
    expect(screen.getByTestId('control')).toHaveAccessibleName('');
  });
});

describe("Field — the ??-not-|| rule on invalid/required (the file's own comment calls it load-bearing)", () => {
  // fieldWiring.ts:107-108's comment: "`invalid` / `required` keep `??` —
  // those are booleans, where `false` is a meaningful explicit value." That
  // rule was untested on both the non-group AND asGroup branches — mutating
  // `??` to `||` on either is green on the whole suite, per round 6 review.
  // A `??`→`||` regression would make `<Input invalid={false}>` inside a
  // Field with an active `error` silently ignore the consumer's explicit
  // opt-out.
  function ExplicitOverrideStub(props: { invalid?: boolean; required?: boolean }) {
    return (
      <input
        data-testid="control"
        data-invalid={String(props.invalid)}
        data-required={String(props.required)}
      />
    );
  }

  it("child's explicit invalid={false} wins over Field's error-driven invalid", () => {
    render(
      <Field label="Email" error="bad">
        <ExplicitOverrideStub invalid={false} />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAttribute('data-invalid', 'false');
  });

  it("child's explicit required={false} wins over Field's required prop", () => {
    render(
      <Field label="Email" required>
        <ExplicitOverrideStub required={false} />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAttribute('data-required', 'false');
  });

  it("asGroup: child's explicit invalid={false} wins over Field's error-driven invalid", () => {
    render(
      <Field asGroup label="Pick one" error="bad">
        <ExplicitOverrideStub invalid={false} />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAttribute('data-invalid', 'false');
  });

  it("asGroup: child's explicit required={false} wins over Field's required prop", () => {
    render(
      <Field asGroup label="Pick one" required>
        <ExplicitOverrideStub required={false} />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAttribute('data-required', 'false');
  });
});

describe('Field — render-prop aria-invalid emits no attribute when valid, not aria-invalid="false"', () => {
  // fieldWiring.ts:80's `'aria-invalid': invalid || undefined` — mutating to
  // bare `invalid` is green on the whole suite. React does NOT drop a
  // `false`-valued aria-* attribute the way it drops `hidden`/`disabled`, so
  // every render-prop control would emit a literal aria-invalid="false" on
  // every valid render — a visible DOM change, not a behavior-neutral one.
  it('a valid render-prop control has no aria-invalid attribute at all', () => {
    render(<Field label="Email">{(field) => <input data-testid="control" {...field} />}</Field>);
    expect(screen.getByTestId('control')).not.toHaveAttribute('aria-invalid');
  });
});

describe('Field — render-prop form with no label', () => {
  // fieldWiring.ts's field object computes `'aria-labelledby': labelledBy`
  // (hasLabel ? labelId : undefined) as a SEPARATE piece of code from the
  // cloneElement branch's `if (hasLabel) { ... }` gate a few lines down —
  // two independent expressions deriving the same value. Every other
  // render-prop test in this file passes a `label`, so nothing exercised
  // the unlabeled case on this specific code path.
  it('omits aria-labelledby from the field object and the rendered control when there is no label', () => {
    let received: Record<string, unknown> = {};
    render(
      <Field>
        {(field) => {
          received = field as unknown as Record<string, unknown>;
          return <input data-testid="control" {...field} />;
        }}
      </Field>,
    );
    expect(received['aria-labelledby']).toBeUndefined();
    expect(screen.getByTestId('control')).not.toHaveAttribute('aria-labelledby');
  });
});

// A NON-labelable control — a div with a role. This is the case Field's
// `aria-labelledby` injection exists for: `<label for>` names only labelable
// elements, so for these the id reference is the only naming path there is.
function StubDivControl(props: {
  id?: string;
  invalid?: boolean;
  required?: boolean;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}) {
  return (
    <div
      data-testid="div-control"
      role="textbox"
      tabIndex={0}
      id={props.id}
      aria-labelledby={props['aria-labelledby']}
      aria-describedby={props['aria-describedby']}
    />
  );
}

describe('Field — empty ARIA id references', () => {
  // `aria-labelledby={sectionId ?? ''}` is ordinary consumer code. An empty id
  // list references nothing, so it names the control no better than omitting
  // the attribute — it must not suppress the Field's own label. `||` is what
  // stops that; `??` would not.
  it("an empty child aria-labelledby falls back to the Field's label", () => {
    render(
      <Field label="Email">
        <StubDivControl aria-labelledby="" />
      </Field>,
    );
    expect(screen.getByRole('textbox')).toHaveAccessibleName('Email');
  });

  it("an empty child aria-describedby falls back to the Field's description", () => {
    render(
      <Field label="Email" description="We never share it.">
        <StubDivControl aria-describedby="" />
      </Field>,
    );
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('We never share it.');
  });

  it('a non-empty child aria-labelledby still wins over the Field label', () => {
    render(
      <>
        <span id="own-label">Work email</span>
        <Field label="Email">
          <StubDivControl aria-labelledby="own-label" />
        </Field>
      </>,
    );
    expect(screen.getByRole('textbox')).toHaveAccessibleName('Work email');
  });
});
