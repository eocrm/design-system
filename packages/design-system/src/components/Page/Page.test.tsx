import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Page } from './Page';

it('renders children in source order', () => {
  render(
    <Page>
      <div data-testid="first">first</div>
      <div data-testid="second">second</div>
    </Page>,
  );
  const first = screen.getByTestId('first');
  const second = screen.getByTestId('second');
  expect(first).toBeInTheDocument();
  expect(second).toBeInTheDocument();
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('defaults gap to "lg"', () => {
  const { container } = render(
    <Page>
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gapLg/);
});

it('applies gap="xs" class', () => {
  const { container } = render(
    <Page gap="xs">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gapXs/);
});

it('applies gap="sm" class', () => {
  const { container } = render(
    <Page gap="sm">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gapSm/);
});

it('applies gap="md" class', () => {
  const { container } = render(
    <Page gap="md">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gapMd/);
});

it('applies gap="xl" class', () => {
  const { container } = render(
    <Page gap="xl">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gapXl/);
});

it('applies gap="2xl" class', () => {
  const { container } = render(
    <Page gap="2xl">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild?.className).toMatch(/gap2xl/);
});

it('merges custom className with internal classes', () => {
  const { container } = render(
    <Page className="custom-page">
      <span>child</span>
    </Page>,
  );
  expect(container.firstElementChild).toHaveClass('custom-page');
  expect(container.firstElementChild?.className).toMatch(/root/);
});

it('forwards ref to the underlying div', () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <Page ref={ref}>
      <span>child</span>
    </Page>,
  );
  expect(ref.current).toBeInstanceOf(HTMLDivElement);
});

it('spreads arbitrary HTML attributes onto the root', () => {
  const { container } = render(
    <Page data-testid="page-root" aria-label="contacts page">
      <span>child</span>
    </Page>,
  );
  const root = container.firstElementChild;
  expect(root).toHaveAttribute('data-testid', 'page-root');
  expect(root).toHaveAttribute('aria-label', 'contacts page');
});
