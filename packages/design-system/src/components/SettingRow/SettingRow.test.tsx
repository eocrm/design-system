import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';
import { SettingRow } from './SettingRow';

// Auto-wired cases use the DS <Input>, not a raw <input>: the wiring injects
// the DS `invalid` prop, and it is the CONTROL that maps `invalid` →
// `aria-invalid` (Input.tsx:111). A raw <input> would receive a literal
// `invalid` attribute and no `aria-invalid`, so the error test would fail and
// the rest would render a non-DOM attribute. Native elements belong in the
// render-prop form — which is exactly what <Field> documents, and what the
// render-prop case below exercises.

describe('SettingRow', () => {
  it('renders with the minimum props', () => {
    render(
      <SettingRow label="Seats">
        <Input type="number" defaultValue={50} />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton', { name: 'Seats' })).toBeInTheDocument();
  });

  it('associates the label with the control', async () => {
    const user = userEvent.setup();
    render(
      <SettingRow label="Seats">
        <Input type="number" />
      </SettingRow>,
    );
    await user.click(screen.getByText('Seats'));
    expect(screen.getByRole('spinbutton')).toHaveFocus();
  });

  it('keeps labelAdornment out of the control accessible name', () => {
    render(
      <SettingRow label="Seats" labelAdornment={<span>From plan</span>}>
        <Input type="number" />
      </SettingRow>,
    );
    // The badge renders...
    expect(screen.getByText('From plan')).toBeInTheDocument();
    // ...but is NOT part of the name. This is the regression the component exists to prevent.
    expect(screen.getByRole('spinbutton')).toHaveAccessibleName('Seats');
  });

  it('links the description via aria-describedby', () => {
    render(
      <SettingRow label="Seats" description="Member seats included for this tenant">
        <Input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton')).toHaveAccessibleDescription(
      'Member seats included for this tenant',
    );
  });

  it('error takes over aria-describedby and sets aria-invalid', () => {
    render(
      <SettingRow label="Seats" description="Helper text" error="Must be at least 1">
        <Input type="number" />
      </SettingRow>,
    );
    const control = screen.getByRole('spinbutton');
    expect(control).toHaveAccessibleDescription('Must be at least 1');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    // Deliberately UNLIKE <Field>: the description stays visible. It lives in
    // the label column and the error in the control column, so they do not
    // occupy the same slot — hiding the "what is this setting" text because
    // the value is invalid would remove context from a different column.
    // Only the aria-describedby reference is replaced.
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  it('required injects required onto the control', () => {
    render(
      <SettingRow label="Seats" required>
        <Input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton')).toBeRequired();
  });

  it('renders trailing content after the control', () => {
    render(
      <SettingRow label="Seats" trailing={<button type="button">Reset</button>}>
        <Input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('renders footer content', () => {
    render(
      <SettingRow label="Seats" footer={<p>0 of 50 included this month</p>}>
        <Input type="number" />
      </SettingRow>,
    );
    expect(screen.getByText('0 of 50 included this month')).toBeInTheDocument();
  });

  it.each(['xs', 'sm', 'md'] as const)(
    'controlWidth=%s caps the control slot only, leaving trailing on the same line',
    (w) => {
      const { container } = render(
        <SettingRow
          label="Seats"
          controlWidth={w}
          trailing={<span data-testid="trailing">days</span>}
        >
          <Input type="number" />
        </SettingRow>,
      );
      const slot = container.querySelector('[data-control-width]')!;
      expect(slot).toHaveAttribute('data-control-width', w);
      expect(slot.querySelector('input')).toBeInTheDocument();
      // `trailing` must be a SIBLING of the capped slot, not inside it — a
      // regression to capping the shared line (which wraps both the control
      // and trailing) would nest trailing inside the capped element too, and
      // this assertion would fail.
      const trailing = screen.getByTestId('trailing');
      expect(slot).not.toContainElement(trailing);
      expect(slot.parentElement).toContainElement(trailing);
    },
  );

  it('wraps trailing in its own flex item, so a width:100% control (e.g. Select) does not claim the whole line', () => {
    // jsdom has no layout engine, so this can't measure pixels or a shared
    // `y` directly. It asserts the STRUCTURE the CSS fix depends on instead:
    // a Select-shaped (width: 100%) trailing child must land inside a
    // dedicated wrapper (styles.trailing — width: max-content, so a 100%
    // child measures against the adornment group, not .controlLine's full
    // content box), and that wrapper must be a SIBLING of .controlSlot, not
    // nested inside it. Before this fix, `trailing` was a bare child of
    // .controlLine, so a width:100% child spanned the entire control column
    // at every viewport width — reproducing the exact defect (a mode Select
    // wrapping under a number input) this component was built to fix.
    const { container } = render(
      <SettingRow
        label="Seats"
        controlWidth="xs"
        trailing={
          <span data-testid="trailing-select" style={{ width: '100%' }}>
            Metered
          </span>
        }
      >
        <Input type="number" />
      </SettingRow>,
    );
    const slot = container.querySelector('[data-control-width]')!;
    const trailingChild = screen.getByTestId('trailing-select');
    expect(slot).not.toContainElement(trailingChild);
    const trailingWrapper = trailingChild.parentElement!;
    expect(trailingWrapper).not.toBe(slot.parentElement);
    expect(trailingWrapper.className).toMatch(/trailing/i);
  });

  it("renders every trailing child as a plain, unwrapped sibling — sizing ONE of them (e.g. wrapping a Select in Constrain) is entirely the consumer's job", () => {
    // The bug this guards: a bare width:100% control inside `trailing`
    // (e.g. an un-Constrain'd `Select`) fills the ENTIRE .trailing flex box
    // and pushes a second adornment onto its own line inside that box —
    // distinct from the C1 bug above, where trailing pushed onto a line
    // BELOW the control. Real regression proof needs a layout engine:
    // jsdom has none, and I verified this directly — getBoundingClientRect()
    // and offsetTop/offsetHeight return zeroed values for every element
    // regardless of CSS, so a "do these two elements share a y" assertion
    // would pass unconditionally here and prove nothing (same class of
    // problem as the labelWidth-omitted test's CSSOM note above). That
    // means the fix (wrap the offending child in `<Constrain width="xs">`)
    // can only be verified visually — see SettingRowDemo.tsx Example 2 and
    // the browser-based pre-push review.
    //
    // What this DOES guarantee: the two trailing children below stay direct
    // siblings of one shared styles.trailing wrapper, rather than each being
    // wrapped individually — so a consumer's own <Constrain> around ONE
    // child governs only that child.
    //
    // What it does NOT catch: a `Children.map(trailing, c => <div>{c}</div>)`
    // -style regression, when `trailing` is passed as a Fragment — the only
    // pattern documented anywhere in this file, the JSDoc, and AGENTS.md.
    // Verified directly: `Children.map`/`Children.toArray` treat a Fragment
    // as ONE opaque child, so that mutation does not change the DOM shape
    // this test inspects, and this assertion would still pass. Real
    // per-adornment geometry (does trailing visually wrap internally) needs
    // an actual layout engine — a browser, not jsdom.
    render(
      <SettingRow
        label="Seats"
        trailing={
          <>
            <span data-testid="first" style={{ width: '100%' }}>
              Select
            </span>
            <span data-testid="second">Badge</span>
          </>
        }
      >
        <Input type="number" />
      </SettingRow>,
    );
    const first = screen.getByTestId('first');
    const second = screen.getByTestId('second');
    const wrapper = first.parentElement!;
    expect(wrapper.className).toMatch(/trailing/i);
    expect(first.parentElement).toBe(wrapper);
    expect(second.parentElement).toBe(wrapper);
  });

  it('controlWidth does not defeat field wiring — the control still carries its id and accessible name', () => {
    // Guards the invariant the fix depends on: the controlWidth wrapper is
    // created AFTER wire() has already cloned the child and injected id /
    // aria-labelledby onto it, so the wrapper is never the cloneElement
    // target. If a future "simplification" moved the wrapper outside wire(),
    // this would fail — the control would lose its id/aria-* silently.
    render(
      <SettingRow label="Seats" controlWidth="xs">
        <Input type="number" />
      </SettingRow>,
    );
    const control = screen.getByRole('spinbutton', { name: 'Seats' });
    expect(control).toHaveAttribute('id');
  });

  it('supports the render-prop form', () => {
    render(
      <SettingRow label="Seats" description="Helper">
        {(field) => <input type="number" {...field} />}
      </SettingRow>,
    );
    const control = screen.getByRole('spinbutton', { name: 'Seats' });
    expect(control).toHaveAccessibleDescription('Helper');
  });

  it('honours an explicit id', () => {
    render(
      <SettingRow label="Seats" id="seats-control">
        <Input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton')).toHaveAttribute('id', 'seats-control');
  });

  it('forwards ref to the row element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow ref={ref} label="Seats">
        <Input type="number" />
      </SettingRow>,
    );
    expect(ref.current).toHaveAttribute('data-setting-row');
  });

  it('merges className rather than replacing it', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow ref={ref} label="Seats" className="custom">
        <Input type="number" />
      </SettingRow>,
    );
    expect(ref.current).toHaveClass('custom');
    expect(ref.current!.className.split(' ').length).toBeGreaterThan(1);
  });
});

describe('SettingRow.List', () => {
  it('renders its rows', () => {
    render(
      <SettingRow.List>
        <SettingRow label="Seats">
          <Input type="number" />
        </SettingRow>
        <SettingRow label="API calls">
          <Input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(screen.getByRole('spinbutton', { name: 'Seats' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'API calls' })).toBeInTheDocument();
  });

  it('defaults to md spacing and no dividers', () => {
    const { container } = render(
      <SettingRow.List>
        <SettingRow label="Seats">
          <Input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    const list = container.querySelector('[data-setting-row-list]')!;
    expect(list).toHaveAttribute('data-spacing', 'md');
    expect(list).not.toHaveAttribute('data-dividers');
  });

  it('dividers sets the data attribute', () => {
    const { container } = render(
      <SettingRow.List dividers>
        <SettingRow label="Seats">
          <Input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(container.querySelector('[data-setting-row-list]')).toHaveAttribute(
      'data-dividers',
      'true',
    );
  });

  it.each(['sm', 'md', 'lg'] as const)('spacing=%s sets the data attribute', (s) => {
    const { container } = render(
      <SettingRow.List spacing={s}>
        <SettingRow label="Seats">
          <Input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(container.querySelector('[data-setting-row-list]')).toHaveAttribute('data-spacing', s);
  });

  it('labelWidth sets the shared custom property', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow.List ref={ref} labelWidth="18rem">
        <SettingRow label="Seats">
          <Input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(ref.current!.style.getPropertyValue('--setting-row-label-width')).toBe('18rem');
  });

  // CSSOM defines setProperty(name, '') as equivalent to removeProperty, so a
  // getPropertyValue check can't distinguish "never set" from "always set,
  // and this render's value happened to be undefined" — both settle to the
  // empty string. This asserts the observable contract (no explicit value
  // reaches the DOM, so --setting-row-label-width: 16rem in the tokens file
  // wins), not the stronger claim, which isn't reachable in jsdom.
  it('labelWidth unset resolves to an empty custom property, so the token default wins', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow.List ref={ref}>
        <SettingRow label="Seats">
          <Input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(ref.current!.style.getPropertyValue('--setting-row-label-width')).toBe('');
  });

  // jsdom does not evaluate container queries — same as Grid's and Split's
  // collapseBelow tests (#314, #372), the collapse contract is asserted via
  // the emitted classes; the @container rules themselves are verified in the
  // browser.
  it.each(['sm', 'md', 'lg'] as const)('collapseBelow=%s renders the collapse class', (bp) => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow.List ref={ref} collapseBelow={bp}>
        <SettingRow label="Seats">
          <Input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    // CSS Modules hashes class names in the real build but vitest maps them to
    // the raw name; assert on the substring so either form passes.
    expect(ref.current!.className).toMatch(
      new RegExp(`collapse${bp[0]!.toUpperCase()}${bp[1]}`, 'i'),
    );
  });

  it('forwards ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow.List ref={ref} className="custom">
        <SettingRow label="Seats">
          <Input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(ref.current).toHaveClass('custom');
    expect(ref.current).toHaveAttribute('data-setting-row-list');
  });
});
