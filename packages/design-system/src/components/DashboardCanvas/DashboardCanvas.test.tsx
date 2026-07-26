import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardCanvas } from './DashboardCanvas';
import type { DashboardCanvasValue } from './engine';

function baseValue(): DashboardCanvasValue {
  return {
    items: [
      { id: 'a', x: 0, y: 1, w: 2, h: 1 },
      { id: 'b', x: 0, y: 0, w: 2, h: 1 },
    ],
    sections: [
      {
        id: 's1',
        title: 'Section One',
        collapsed: false,
        items: [{ id: 'c', x: 0, y: 0, w: 1, h: 1 }],
      },
      {
        id: 's2',
        title: 'Section Two',
        collapsed: true,
        items: [{ id: 'd', x: 0, y: 0, w: 1, h: 1 }],
      },
    ],
  };
}

const renderItem = (id: string | number) => <div data-testid={`item-${id}`}>{id}</div>;

describe('DashboardCanvas rendering', () => {
  it('stamps each item with the correct inline grid custom properties', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const a = screen.getByTestId('item-a').parentElement as HTMLElement;
    expect(a.style.getPropertyValue('--dc-col')).toBe('1 / span 2');
    expect(a.style.getPropertyValue('--dc-row')).toBe('2 / span 1');
    expect(a.style.getPropertyValue('--dc-h-span')).toBe('span 1');
  });

  it('renders top-level items DOM-sorted by (y, then x), independent of value order', () => {
    const { container } = render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const ids = Array.from(container.querySelectorAll('[data-dc-item]')).map((el) =>
      el.getAttribute('data-dc-item'),
    );
    // a: y=1, b: y=0 → b renders before a even though it's second in value.items.
    // c/d live inside their sections and come after.
    expect(ids).toEqual(['b', 'a', 'c']); // s2 is collapsed, so 'd' is unmounted.
  });

  it('calls renderItem exactly once per visible item id', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    expect(screen.getByTestId('item-a')).toBeInTheDocument();
    expect(screen.getByTestId('item-b')).toBeInTheDocument();
    expect(screen.getByTestId('item-c')).toBeInTheDocument();
    // 'd' belongs to the collapsed section — its body is unmounted.
    expect(screen.queryByTestId('item-d')).not.toBeInTheDocument();
  });

  it('renders sections in band (array) order with their titles', () => {
    const { container } = render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const sections = Array.from(container.querySelectorAll('[data-dc-section]'));
    expect(sections.map((s) => s.getAttribute('data-dc-section'))).toEqual(['s1', 's2']);
    expect(screen.getByText('Section One')).toBeInTheDocument();
    expect(screen.getByText('Section Two')).toBeInTheDocument();
  });

  it('renders the renderSectionHeader slot per section id', () => {
    render(
      <DashboardCanvas
        value={baseValue()}
        renderItem={renderItem}
        renderSectionHeader={(id) => <button type="button">extra-{id}</button>}
      />,
    );
    expect(screen.getByText('extra-s1')).toBeInTheDocument();
    expect(screen.getByText('extra-s2')).toBeInTheDocument();
  });

  it('exposes the canvas as a labeled group from i18n', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    expect(screen.getByRole('group', { name: 'Dashboard canvas' })).toBeInTheDocument();
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<DashboardCanvas ref={ref} value={baseValue()} renderItem={renderItem} />);
    expect(ref.current).toBe(screen.getByRole('group', { name: 'Dashboard canvas' }));
  });

  it('merges a consumer className with the root class', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} className="custom" />);
    expect(screen.getByRole('group', { name: 'Dashboard canvas' }).className).toContain('custom');
  });
});

describe('DashboardCanvas section collapse', () => {
  it('a collapse click fires onChange with the section toggled, geometry untouched', async () => {
    const user = userEvent.setup();
    const value = baseValue();
    const onChange = vi.fn();
    render(<DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} />);

    await user.click(screen.getByRole('button', { name: 'Collapse Section One section' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as DashboardCanvasValue;
    expect(next.sections.find((s) => s.id === 's1')?.collapsed).toBe(true);
    // Item geometry is preserved even though the body unmounts.
    expect(next.sections.find((s) => s.id === 's1')?.items).toEqual(value.sections[0].items);
    expect(next.items).toEqual(value.items);
  });

  it('an expand click on a collapsed section fires onChange with collapsed: false', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DashboardCanvas value={baseValue()} onChange={onChange} renderItem={renderItem} />);

    await user.click(screen.getByRole('button', { name: 'Expand Section Two section' }));

    const next = onChange.mock.calls[0][0] as DashboardCanvasValue;
    expect(next.sections.find((s) => s.id === 's2')?.collapsed).toBe(false);
  });

  it('collapse toggles fire onChange even in readOnly', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DashboardCanvas value={baseValue()} onChange={onChange} renderItem={renderItem} readOnly />,
    );

    await user.click(screen.getByRole('button', { name: 'Collapse Section One section' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(
      (onChange.mock.calls[0][0] as DashboardCanvasValue).sections.find((s) => s.id === 's1')
        ?.collapsed,
    ).toBe(true);
  });

  it('the collapse button reports aria-expanded matching section state', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    expect(screen.getByRole('button', { name: 'Collapse Section One section' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Expand Section Two section' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
