import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../../i18n/I18nProvider';
import { createRef } from 'react';
import {
  CircularProgress,
  type CircularProgressSize,
  type CircularProgressTone,
} from './CircularProgress';

describe('CircularProgress', () => {
  it('renders with role="progressbar"', () => {
    const { container } = render(<CircularProgress />);
    expect(container.firstElementChild).toHaveAttribute('role', 'progressbar');
  });

  it('omitting value renders indeterminate — no aria-valuenow, aria-valuetext="Loading…"', () => {
    const { container } = render(<CircularProgress />);
    const el = container.firstElementChild!;
    expect(el).not.toHaveAttribute('aria-valuenow');
    expect(el).toHaveAttribute('aria-valuetext', 'Loading…');
  });

  it('value={45} sets aria-valuenow={45}, default max={100}', () => {
    const { container } = render(<CircularProgress value={45} />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute('aria-valuenow', '45');
    expect(el).toHaveAttribute('aria-valuemax', '100');
  });

  it('value={3} max={10} reports aria-valuemax={10}', () => {
    const { container } = render(<CircularProgress value={3} max={10} />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute('aria-valuenow', '3');
    expect(el).toHaveAttribute('aria-valuemax', '10');
  });

  it.each<[CircularProgressSize, string]>([
    ['sm', 'sizeSm'],
    ['md', 'sizeMd'],
    ['lg', 'sizeLg'],
  ])('size="%s" applies class %s', (size, expectedClass) => {
    const { container } = render(<CircularProgress size={size} />);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
  });

  it.each<[CircularProgressTone, string]>([
    ['default', 'toneDefault'],
    ['success', 'toneSuccess'],
    ['warning', 'toneWarning'],
    ['danger', 'toneDanger'],
  ])('tone="%s" applies class %s', (tone, expectedClass) => {
    const { container } = render(<CircularProgress tone={tone} />);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
  });

  it('renders an <svg> with viewBox="0 0 36 36" and two <circle> elements', () => {
    const { container } = render(<CircularProgress value={50} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 36 36');
    expect(svg!.querySelectorAll('circle')).toHaveLength(2);
  });

  it('determinate state sets strokeDashoffset on the fill circle', () => {
    const { container } = render(<CircularProgress value={50} />);
    // The fill is the second <circle> in the SVG (track first, fill second).
    const fill = container.querySelectorAll('circle')[1];
    // value=50, max=100 → percent=50 → offset = circumference * (1 - 0.5) ≈ 50.265.
    const offsetAttr = fill.getAttribute('stroke-dashoffset');
    expect(offsetAttr).not.toBeNull();
    expect(parseFloat(offsetAttr!)).toBeCloseTo(50.265, 2);
  });

  it('indeterminate state applies the .indeterminate class on the fill circle', () => {
    const { container } = render(<CircularProgress />);
    const fill = container.querySelectorAll('circle')[1];
    expect(fill.getAttribute('class')).toMatch(/indeterminate/);
  });

  it('label={false} (default): no label element rendered', () => {
    const { container } = render(<CircularProgress value={50} />);
    expect(container.querySelector('span')).toBeNull();
  });

  it('label={true} determinate at size="md": renders {percent}% text', () => {
    render(<CircularProgress value={75} label />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('label={true} indeterminate at size="md": NO label (auto-suppressed)', () => {
    const { container } = render(<CircularProgress label />);
    expect(container.querySelector('span')).toBeNull();
  });

  it('label={true} with size="sm": NO label (auto-suppressed regardless of mode)', () => {
    const { container } = render(<CircularProgress size="sm" value={75} label />);
    expect(container.querySelector('span')).toBeNull();
  });

  it('label as ReactNode at size="md" determinate: renders the node', () => {
    render(<CircularProgress value={3} max={10} label="3 / 10" />);
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
  });

  it('label as ReactNode at size="md" indeterminate: still renders the node', () => {
    render(<CircularProgress label="Wait…" />);
    expect(screen.getByText('Wait…')).toBeInTheDocument();
  });

  it('label as ReactNode at size="sm": NO label (size suppression wins)', () => {
    const { container } = render(<CircularProgress size="sm" value={50} label="50%" />);
    expect(container.querySelector('span')).toBeNull();
  });

  it('className merges with the base class (not replace)', () => {
    const { container } = render(<CircularProgress className="custom" />);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/custom/);
    expect(cls).toMatch(/circular_/);
  });

  it('forwards ref to the outermost <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(<CircularProgress ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute('role', 'progressbar');
  });

  it('spreads native HTML attributes (id, data-testid, aria-label)', () => {
    render(<CircularProgress id="cp-1" data-testid="cp" aria-label="Saving" />);
    const el = screen.getByTestId('cp');
    expect(el).toHaveAttribute('id', 'cp-1');
    expect(el).toHaveAttribute('aria-label', 'Saving');
  });

  it('indeterminate uses consumer-passed aria-label as aria-valuetext fallback', () => {
    render(<CircularProgress aria-label="Saving" data-testid="cp" />);
    const el = screen.getByTestId('cp');
    expect(el).toHaveAttribute('aria-valuetext', 'Saving');
  });

  it.each<[string, number | undefined, number]>([
    ['NaN', NaN, 100],
    ['Infinity', Infinity, 100],
    ['-Infinity', -Infinity, 100],
    ['max=0', 50, 0],
    ['max=-1', 50, -1],
  ])('falls back to indeterminate when value=%s (degenerate input)', (_label, value, max) => {
    const { container } = render(<CircularProgress value={value} max={max} />);
    const el = container.firstElementChild!;
    expect(el).not.toHaveAttribute('aria-valuenow');
    expect(el).toHaveAttribute('aria-valuetext', 'Loading…');
    const fill = container.querySelectorAll('circle')[1];
    expect(fill.getAttribute('class')).toMatch(/indeterminate/);
  });
});

describe('indeterminate aria-valuetext goes through the provider (#503)', () => {
  it('uses the ru string under a ru locale', () => {
    // An indeterminate bar has no aria-valuenow, so aria-valuetext is the only
    // thing a screen reader has — and it was hardcoded English in both
    // progress components, so a Russian consumer heard "Loading…".
    render(
      <I18nProvider locale="ru">
        <CircularProgress />
      </I18nProvider>,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Загрузка…');
  });

  it('still prefers a consumer aria-label over the fallback', () => {
    render(
      <I18nProvider locale="ru">
        <CircularProgress aria-label="Импорт" />
      </I18nProvider>,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Импорт');
  });
});
