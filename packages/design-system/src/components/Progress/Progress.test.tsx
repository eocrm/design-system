import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Progress, type ProgressSize, type ProgressTone } from './Progress';

describe('Progress', () => {
  it('renders with role="progressbar"', () => {
    const { container } = render(<Progress />);
    expect(container.firstElementChild).toHaveAttribute('role', 'progressbar');
  });

  it('omitting value renders indeterminate — no aria-valuenow, aria-valuetext="Loading…"', () => {
    const { container } = render(<Progress />);
    const el = container.firstElementChild!;
    expect(el).not.toHaveAttribute('aria-valuenow');
    expect(el).toHaveAttribute('aria-valuetext', 'Loading…');
  });

  it('value={45} sets aria-valuenow={45}, aria-valuemin={0}, aria-valuemax={100}', () => {
    const { container } = render(<Progress value={45} />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute('aria-valuenow', '45');
    expect(el).toHaveAttribute('aria-valuemin', '0');
    expect(el).toHaveAttribute('aria-valuemax', '100');
  });

  it('value={3} max={10} sets aria-valuemax={10}', () => {
    const { container } = render(<Progress value={3} max={10} />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute('aria-valuenow', '3');
    expect(el).toHaveAttribute('aria-valuemax', '10');
  });

  it.each<[ProgressSize, string]>([
    ['sm', 'sizeSm'],
    ['md', 'sizeMd'],
    ['lg', 'sizeLg'],
  ])('size="%s" applies class %s', (size, expectedClass) => {
    const { container } = render(<Progress size={size} />);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
  });

  it.each<[ProgressTone, string]>([
    ['default', 'toneDefault'],
    ['success', 'toneSuccess'],
    ['warning', 'toneWarning'],
    ['danger', 'toneDanger'],
  ])('tone="%s" applies class %s', (tone, expectedClass) => {
    const { container } = render(<Progress tone={tone} />);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
  });

  it('label={false} (default): no label element rendered', () => {
    const { container } = render(<Progress value={45} />);
    // The label span is the only direct-child <span> of .progress.
    expect(container.querySelector('span')).toBeNull();
  });

  it('label={true} determinate: renders {percent}% text', () => {
    render(<Progress value={67} label />);
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('label={true} indeterminate: NO label rendered (auto-suppressed)', () => {
    const { container } = render(<Progress label />);
    expect(container.querySelector('span')).toBeNull();
  });

  it('label as ReactNode determinate: renders the node', () => {
    render(<Progress value={3} max={10} label="3 of 10" />);
    expect(screen.getByText('3 of 10')).toBeInTheDocument();
  });

  it('label as ReactNode indeterminate: STILL renders the node', () => {
    render(<Progress label="Loading…" />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('indeterminate state applies the .indeterminate class on the fill child', () => {
    const { container } = render(<Progress />);
    // The .indeterminate class lives on the inner .fill element (grandchild).
    const fill = container.querySelector('[class*="fill"]');
    expect(fill?.className).toMatch(/indeterminate/);
  });

  it('determinate state sets inline style.width on the fill', () => {
    const { container } = render(<Progress value={42} />);
    const fill = container.querySelector('[class*="fill"]') as HTMLElement;
    expect(fill.style.width).toBe('42%');
  });

  it('value > max clamps fill visually but aria-valuenow reports the raw value', () => {
    const { container } = render(<Progress value={150} max={100} />);
    const el = container.firstElementChild!;
    // ARIA reports the raw 150 (caller bug detection).
    expect(el).toHaveAttribute('aria-valuenow', '150');
    // Visual fill is clamped to 100%.
    const fill = container.querySelector('[class*="fill"]') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it.each<[string, number | undefined, number]>([
    ['NaN', NaN, 100],
    ['Infinity', Infinity, 100],
    ['-Infinity', -Infinity, 100],
    ['max=0', 50, 0],
    ['max=-1', 50, -1],
  ])('falls back to indeterminate when value=%s (degenerate input)', (_label, value, max) => {
    const { container } = render(<Progress value={value} max={max} />);
    const el = container.firstElementChild!;
    // Degenerate inputs fall back to the indeterminate path: no aria-valuenow,
    // aria-valuetext set to "Loading…" (or consumer aria-label).
    expect(el).not.toHaveAttribute('aria-valuenow');
    expect(el).toHaveAttribute('aria-valuetext', 'Loading…');
    // The .indeterminate class is applied to the fill child.
    const fill = container.querySelector('[class*="fill"]');
    expect(fill?.className).toMatch(/indeterminate/);
  });

  it('className merges with the base class (not replace)', () => {
    const { container } = render(<Progress className="custom" />);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/custom/);
    expect(cls).toMatch(/progress_/);
  });

  it('forwards ref to the outermost <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute('role', 'progressbar');
  });

  it('spreads native HTML attributes (id, data-testid, aria-label)', () => {
    render(<Progress id="up-1" data-testid="p" aria-label="Uploading" />);
    const el = screen.getByTestId('p');
    expect(el).toHaveAttribute('id', 'up-1');
    expect(el).toHaveAttribute('aria-label', 'Uploading');
  });

  it('indeterminate uses consumer-passed aria-label as aria-valuetext fallback', () => {
    render(<Progress aria-label="Saving" data-testid="p" />);
    const el = screen.getByTestId('p');
    expect(el).toHaveAttribute('aria-valuetext', 'Saving');
  });
});
