import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChip } from './FilterChip';

it('renders Label + Value text', () => {
  render(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByText('Event')).toBeInTheDocument();
  expect(screen.getByText('auth.*')).toBeInTheDocument();
});

it('renders dismiss button only when onDismiss is provided', () => {
  const { rerender } = render(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.queryByRole('button', { name: 'Remove filter' })).not.toBeInTheDocument();

  rerender(
    <FilterChip onDismiss={() => {}}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByRole('button', { name: 'Remove filter' })).toBeInTheDocument();
});

it('clicking the dismiss button fires onDismiss', async () => {
  const user = userEvent.setup();
  const onDismiss = vi.fn();
  render(
    <FilterChip onDismiss={onDismiss}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  await user.click(screen.getByRole('button', { name: 'Remove filter' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it('dismiss button is keyboard-actionable (Enter, Space)', async () => {
  const user = userEvent.setup();
  const onDismiss = vi.fn();
  render(
    <FilterChip onDismiss={onDismiss}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  const dismissBtn = screen.getByRole('button', { name: 'Remove filter' });
  dismissBtn.focus();
  await user.keyboard('{Enter}');
  expect(onDismiss).toHaveBeenCalledTimes(1);
  await user.keyboard(' ');
  expect(onDismiss).toHaveBeenCalledTimes(2);
});

it('dismissLabel overrides the default aria-label', () => {
  render(
    <FilterChip onDismiss={() => {}} dismissLabel="Remove Event: auth.* filter">
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByRole('button', { name: 'Remove Event: auth.* filter' })).toBeInTheDocument();
});

it('Value renders a tone dot when tone is set', () => {
  const { container, rerender } = render(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(container.querySelector('[data-tone]')).toBeNull();

  rerender(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value tone="info">auth.*</FilterChip.Value>
    </FilterChip>,
  );
  const dot = container.querySelector('[data-tone="info"]');
  expect(dot).not.toBeNull();
});

it('Value renders a palette-color dot when color is set', () => {
  const { container } = render(
    <FilterChip>
      <FilterChip.Label>Team</FilterChip.Label>
      <FilterChip.Value color="violet">Design</FilterChip.Value>
    </FilterChip>,
  );
  const dot = container.querySelector('[data-palette="violet"]');
  expect(dot).not.toBeNull();
  // color wins over tone — no data-tone on a palette-colored dot.
  expect(dot).not.toHaveAttribute('data-tone');
});

it('root has role="group"', () => {
  render(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByRole('group')).toBeInTheDocument();
});

it('Root forwards ref to the wrapping div', () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <FilterChip ref={ref}>
      <FilterChip.Value>x</FilterChip.Value>
    </FilterChip>,
  );
  expect(ref.current).toBeInstanceOf(HTMLDivElement);
});

it('Label forwards ref to its span', () => {
  const ref = createRef<HTMLSpanElement>();
  render(
    <FilterChip>
      <FilterChip.Label ref={ref}>Event</FilterChip.Label>
      <FilterChip.Value>x</FilterChip.Value>
    </FilterChip>,
  );
  expect(ref.current).toBeInstanceOf(HTMLSpanElement);
});

it('Value forwards ref to its span', () => {
  const ref = createRef<HTMLSpanElement>();
  render(
    <FilterChip>
      <FilterChip.Value ref={ref}>x</FilterChip.Value>
    </FilterChip>,
  );
  expect(ref.current).toBeInstanceOf(HTMLSpanElement);
});

it('dismiss button has type="button" to prevent accidental form submission', () => {
  render(
    <FilterChip onDismiss={() => {}}>
      <FilterChip.Value>x</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByRole('button', { name: 'Remove filter' })).toHaveAttribute('type', 'button');
});

it('spreads arbitrary HTML attributes onto the root div', () => {
  const { container } = render(
    <FilterChip data-testid="my-chip">
      <FilterChip.Value>x</FilterChip.Value>
    </FilterChip>,
  );
  expect(container.firstElementChild).toHaveAttribute('data-testid', 'my-chip');
});

it('className on root, Label, and Value merges with internal styles', () => {
  const { container } = render(
    <FilterChip className="custom-chip">
      <FilterChip.Label className="custom-label">Event</FilterChip.Label>
      <FilterChip.Value className="custom-value">auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(container.firstElementChild).toHaveClass('custom-chip');
  expect(container.querySelector('.custom-label')).toBeInTheDocument();
  expect(container.querySelector('.custom-value')).toBeInTheDocument();
});

it('value-only chip (no label) renders cleanly', () => {
  render(
    <FilterChip onDismiss={() => {}}>
      <FilterChip.Value tone="warning">Platform only</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByText('Platform only')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove filter' })).toBeInTheDocument();
});

// ----------------------------------------------------------------------------
// Interactive (editable) body — onActivate
// ----------------------------------------------------------------------------

it('with onActivate, the body is a button that fires onActivate on click', async () => {
  const user = userEvent.setup();
  const onActivate = vi.fn();
  render(
    <FilterChip onActivate={onActivate}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  const body = screen.getByRole('button', { name: /Event/ });
  await user.click(body);
  expect(onActivate).toHaveBeenCalledTimes(1);
});

it('clicking the dismiss ✕ fires onDismiss but NOT onActivate', async () => {
  const user = userEvent.setup();
  const onActivate = vi.fn();
  const onDismiss = vi.fn();
  render(
    <FilterChip onActivate={onActivate} onDismiss={onDismiss}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  await user.click(screen.getByRole('button', { name: 'Remove filter' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(onActivate).not.toHaveBeenCalled();
});

it('dismiss ✕ click stops propagation to an ancestor click handler', async () => {
  const user = userEvent.setup();
  const ancestorSpy = vi.fn();
  const onActivate = vi.fn();
  render(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div onClick={ancestorSpy}>
      <FilterChip onActivate={onActivate} onDismiss={() => {}}>
        <FilterChip.Label>Event</FilterChip.Label>
        <FilterChip.Value>auth.*</FilterChip.Value>
      </FilterChip>
    </div>,
  );
  await user.click(screen.getByRole('button', { name: 'Remove filter' }));
  expect(ancestorSpy).not.toHaveBeenCalled();

  // The body button still reaches its handler (and bubbles to the ancestor).
  await user.click(screen.getByRole('button', { name: /Event/ }));
  expect(onActivate).toHaveBeenCalledTimes(1);
  expect(ancestorSpy).toHaveBeenCalledTimes(1);
});

it('body button is keyboard-actionable (Enter, Space)', async () => {
  const user = userEvent.setup();
  const onActivate = vi.fn();
  render(
    <FilterChip onActivate={onActivate}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  const body = screen.getByRole('button', { name: /Event/ });
  body.focus();
  await user.keyboard('{Enter}');
  expect(onActivate).toHaveBeenCalledTimes(1);
  await user.keyboard(' ');
  expect(onActivate).toHaveBeenCalledTimes(2);
});

it('body button has aria-haspopup="dialog" and reflects expanded via aria-expanded', () => {
  const { rerender } = render(
    <FilterChip onActivate={() => {}} expanded>
      <FilterChip.Label>Range</FilterChip.Label>
      <FilterChip.Value>Jun 1 – Jul 31</FilterChip.Value>
    </FilterChip>,
  );
  const body = screen.getByRole('button', { name: /Range/ });
  expect(body).toHaveAttribute('aria-haspopup', 'dialog');
  expect(body).toHaveAttribute('aria-expanded', 'true');

  rerender(
    <FilterChip onActivate={() => {}} expanded={false}>
      <FilterChip.Label>Range</FilterChip.Label>
      <FilterChip.Value>Jun 1 – Jul 31</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByRole('button', { name: /Range/ })).toHaveAttribute('aria-expanded', 'false');

  // expanded omitted → React drops the attribute entirely.
  rerender(
    <FilterChip onActivate={() => {}}>
      <FilterChip.Label>Range</FilterChip.Label>
      <FilterChip.Value>Jun 1 – Jul 31</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByRole('button', { name: /Range/ })).not.toHaveAttribute('aria-expanded');
});

it('without onActivate there is NO body button (backward compat)', () => {
  const { rerender } = render(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  // Read-only, no dismiss → zero buttons.
  expect(screen.queryAllByRole('button')).toHaveLength(0);

  rerender(
    <FilterChip onDismiss={() => {}}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  // Dismiss only → exactly one button (the ✕), no body button.
  const buttons = screen.getAllByRole('button');
  expect(buttons).toHaveLength(1);
  expect(buttons[0]).toHaveAttribute('aria-label', 'Remove filter');
});
