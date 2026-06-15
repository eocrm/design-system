import { createRef } from 'react';
import { render } from '@testing-library/react';
import { Dot } from './Dot';

it('renders a span with the dot class', () => {
  const { container } = render(<Dot />);
  const el = container.firstElementChild as HTMLElement;
  expect(el.tagName).toBe('SPAN');
  expect(el.className).toMatch(/dot/);
});

it('is aria-hidden="true" by default', () => {
  const { container } = render(<Dot />);
  expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
});

it('aria-hidden is overridable via prop', () => {
  const { container } = render(<Dot aria-hidden={false} />);
  // React serializes aria-hidden={false} to the string "false".
  expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'false');
});

it('color renders a palette dot with the saturated fg token and no data-tone', () => {
  const { container } = render(<Dot color="violet" />);
  const el = container.firstElementChild as HTMLElement;
  expect(el).toHaveAttribute('data-palette', 'violet');
  expect(el.style.background).toContain('color-palette-violet-fg');
  expect(el).not.toHaveAttribute('data-tone');
});

it('tone renders a semantic dot via data-tone and no data-palette', () => {
  const { container } = render(<Dot tone="success" />);
  const el = container.firstElementChild as HTMLElement;
  expect(el).toHaveAttribute('data-tone', 'success');
  expect(el).not.toHaveAttribute('data-palette');
});

it('color takes precedence over tone (data-palette present, data-tone absent)', () => {
  const { container } = render(<Dot color="amber" tone="danger" />);
  const el = container.firstElementChild as HTMLElement;
  expect(el).toHaveAttribute('data-palette', 'amber');
  expect(el).not.toHaveAttribute('data-tone');
});

it('defaults to the neutral tone when neither color nor tone is set', () => {
  const { container } = render(<Dot />);
  const el = container.firstElementChild as HTMLElement;
  expect(el).toHaveAttribute('data-tone', 'neutral');
  expect(el).not.toHaveAttribute('data-palette');
});

it('merges className with the internal dot class', () => {
  const { container } = render(<Dot className="custom-dot" />);
  const el = container.firstElementChild as HTMLElement;
  expect(el).toHaveClass('custom-dot');
  expect(el.className).toMatch(/dot/);
});

it('forwards ref to the span', () => {
  const ref = createRef<HTMLSpanElement>();
  render(<Dot ref={ref} />);
  expect(ref.current).toBeInstanceOf(HTMLSpanElement);
});

it('spreads native HTML attributes onto the span', () => {
  const { container } = render(<Dot data-testid="my-dot" />);
  expect(container.firstElementChild).toHaveAttribute('data-testid', 'my-dot');
});

it('merges a consumer style with the palette background', () => {
  const { container } = render(<Dot color="teal" style={{ opacity: '0.5' }} />);
  const el = container.firstElementChild as HTMLElement;
  expect(el.style.background).toContain('color-palette-teal-fg');
  expect(el.style.opacity).toBe('0.5');
});
