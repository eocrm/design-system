import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../../i18n';
import { Sparkline } from './Sparkline';

const wrap = (ui: React.ReactElement) => render(<I18nProvider locale="en">{ui}</I18nProvider>);

// jsdom has no layout: give the measured root a width so the SVG draws.
function stubWidth(width: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 40,
    top: 0,
    left: 0,
    right: width,
    bottom: 40,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('is an img named by label plus a formatted summary', () => {
  wrap(
    <Sparkline label="Contacts per day" values={[3, null, 12, 5]} formatValue={(n) => `#${n}`} />,
  );
  expect(
    screen.getByRole('img', { name: 'Contacts per day: from #3 to #5, low #3, high #12' }),
  ).toBeInTheDocument();
});

it('defaults number formatting to the locale', () => {
  wrap(<Sparkline label="Deals" values={[1000, 2500]} />);
  expect(
    screen.getByRole('img', { name: 'Deals: from 1,000 to 2,500, low 1,000, high 2,500' }),
  ).toBeInTheDocument();
});

it('names an empty series "no data" and draws nothing', () => {
  stubWidth(120);
  const { container } = wrap(<Sparkline label="Tasks" values={[null, null]} />);
  expect(screen.getByRole('img', { name: 'Tasks: no data' })).toBeInTheDocument();
  expect(container.querySelector('path, rect, circle')).toBeNull();
});

it('endDot={false} drops the end dot but keeps the line (#646)', () => {
  stubWidth(120);
  const { container } = wrap(<Sparkline label="L" values={[1, 3, 2]} type="area" endDot={false} />);
  expect(container.querySelectorAll('path')).toHaveLength(2);
  expect(container.querySelector('circle')).toBeNull();
});

it('draws a stroke path and end dot for line, a fill too for area, rects for bar', () => {
  stubWidth(120);
  const { container, rerender } = wrap(<Sparkline label="L" values={[1, 3, 2]} />);
  expect(container.querySelectorAll('path')).toHaveLength(1);
  expect(container.querySelector('circle')).not.toBeNull();
  rerender(
    <I18nProvider locale="en">
      <Sparkline label="L" values={[1, 3, 2]} type="area" />
    </I18nProvider>,
  );
  expect(container.querySelectorAll('path')).toHaveLength(2);
  rerender(
    <I18nProvider locale="en">
      <Sparkline label="L" values={[1, 3, 2]} type="bar" />
    </I18nProvider>,
  );
  expect(container.querySelectorAll('rect')).toHaveLength(3);
  expect(container.querySelector('circle')).toBeNull();
});

it('hides the svg from assistive tech', () => {
  stubWidth(120);
  const { container } = wrap(<Sparkline label="L" values={[1, 2]} />);
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

it('ignores aria-labelledby so the summary stays the name, keeps aria-describedby', () => {
  wrap(
    <>
      <span id="other">Other</span>
      <span id="desc">Desc</span>
      <Sparkline
        label="L"
        values={[1, 2]}
        aria-labelledby="other"
        aria-describedby="desc"
        data-testid="spark"
      />
    </>,
  );
  const root = screen.getByTestId('spark');
  expect(root).not.toHaveAttribute('aria-labelledby');
  expect(root).toHaveAccessibleName('L: from 1 to 2, low 1, high 2');
  expect(root).toHaveAttribute('aria-describedby', 'desc');
});

it('forwards ref, merges className, and keeps its img contract over consumer props', () => {
  const ref = { current: null as HTMLDivElement | null };
  wrap(
    <Sparkline
      ref={ref}
      label="L"
      values={[1, 2]}
      className="mine"
      role="presentation"
      aria-label="override"
      data-testid="spark"
    />,
  );
  const root = screen.getByTestId('spark');
  expect(ref.current).toBe(root);
  expect(root).toHaveClass('mine');
  expect(root).toHaveAttribute('role', 'img');
  expect(root).toHaveAccessibleName('L: from 1 to 2, low 1, high 2');
});
