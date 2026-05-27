import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { PersonDisplay } from './PersonDisplay';

it('renders Avatar + Name + Description together', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Sarah Chen" />
      <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
      <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
    </PersonDisplay>,
  );
  expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
  expect(screen.getByText('sarah@acme.com')).toBeInTheDocument();
});

it('defaults size to md and exposes it via data-size on the root', () => {
  const { container } = render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Avery Liu" />
      <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveAttribute('data-size', 'md');
});

it('size="sm" propagates to the root data-size', () => {
  const { container } = render(
    <PersonDisplay size="sm">
      <PersonDisplay.Avatar name="Avery Liu" />
      <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveAttribute('data-size', 'sm');
});

it('size="lg" propagates to the root data-size', () => {
  const { container } = render(
    <PersonDisplay size="lg">
      <PersonDisplay.Avatar name="Priya Mehta" />
      <PersonDisplay.Name>Priya Mehta</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveAttribute('data-size', 'lg');
});

it('Name with no href renders as plain text (no anchor)', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Marcus Vega" />
      <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByText('Marcus Vega')).toBeInTheDocument();
});

it('Name with href renders as an anchor with the right URL', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Sarah Chen" />
      <PersonDisplay.Name href="/contacts/sarah-chen">Sarah Chen</PersonDisplay.Name>
    </PersonDisplay>,
  );
  const link = screen.getByRole('link', { name: 'Sarah Chen' });
  expect(link).toHaveAttribute('href', '/contacts/sarah-chen');
});

it('renders multiple Description lines, each visible', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Marcus Vega" />
      <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
      <PersonDisplay.Description>marcus@acme.com</PersonDisplay.Description>
      <PersonDisplay.Description>Account Executive</PersonDisplay.Description>
    </PersonDisplay>,
  );
  expect(screen.getByText('marcus@acme.com')).toBeInTheDocument();
  expect(screen.getByText('Account Executive')).toBeInTheDocument();
});

it('Description accepts arbitrary children (renders nested content)', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Admin" />
      <PersonDisplay.Name>System Admin</PersonDisplay.Name>
      <PersonDisplay.Description>
        admin@acme.com <span data-testid="inline-marker">impersonating</span>
      </PersonDisplay.Description>
    </PersonDisplay>,
  );
  expect(screen.getByTestId('inline-marker')).toHaveTextContent('impersonating');
});

it('Avatar status prop passes through (presence dot rendered)', () => {
  const { container } = render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Priya Mehta" status="online" />
      <PersonDisplay.Name>Priya Mehta</PersonDisplay.Name>
    </PersonDisplay>,
  );
  // Avatar renders the presence dot with data-status attribute.
  expect(container.querySelector('[data-status="online"]')).not.toBeNull();
});

it('className on root, Name, Description merges with internal styles', () => {
  const { container } = render(
    <PersonDisplay className="custom-root">
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name className="custom-name">Sarah Chen</PersonDisplay.Name>
      <PersonDisplay.Description className="custom-desc">sarah@x.com</PersonDisplay.Description>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveClass('custom-root');
  expect(container.querySelector('.custom-name')).toBeInTheDocument();
  expect(container.querySelector('.custom-desc')).toBeInTheDocument();
});

it('Root forwards ref to the wrapping div', () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <PersonDisplay ref={ref}>
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(ref.current).toBeInstanceOf(HTMLDivElement);
});

it('Description forwards ref to its span', () => {
  const ref = createRef<HTMLSpanElement>();
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
      <PersonDisplay.Description ref={ref}>sarah@x.com</PersonDisplay.Description>
    </PersonDisplay>,
  );
  expect(ref.current).toBeInstanceOf(HTMLSpanElement);
});

it('Avatar forwards ref to its span', () => {
  const ref = createRef<HTMLSpanElement>();
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar ref={ref} name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(ref.current).toBeInstanceOf(HTMLSpanElement);
});

it('Name (no href) forwards ref to its span', () => {
  const ref = createRef<HTMLSpanElement>();
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name ref={ref}>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(ref.current).toBeInstanceOf(HTMLSpanElement);
});

it('spreads arbitrary HTML attributes onto the root div', () => {
  const { container } = render(
    <PersonDisplay data-testid="person-row">
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveAttribute('data-testid', 'person-row');
});

it('renders without crashing when only Avatar + Name are passed (no Description)', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Avery Liu" />
      <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(screen.getByText('Avery Liu')).toBeInTheDocument();
});
