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
  expect(
    screen.getByRole('button', { name: 'Remove Event: auth.* filter' }),
  ).toBeInTheDocument();
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

it('root has role="group"', () => {
  render(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByRole('group')).toBeInTheDocument();
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
