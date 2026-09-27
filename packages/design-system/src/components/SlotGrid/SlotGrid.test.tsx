import { Field } from '../Field';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { SlotGrid, type SlotGridGroup, type SlotGridProps } from './SlotGrid';

const GROUPS: SlotGridGroup[] = [
  {
    label: 'Morning',
    slots: [
      { key: '09:00', label: '9:00' },
      { key: '09:30', label: '9:30' },
    ],
  },
  { label: 'Afternoon', slots: [{ key: '14:00', label: '2:00' }] },
  { label: 'Evening', slots: [] },
];

function setup(props: Partial<SlotGridProps> = {}) {
  const onChange = vi.fn();
  const all: SlotGridProps = { groups: GROUPS, value: null, onChange, ...props };
  return { ...render(<SlotGrid {...all} />), onChange, props: all };
}

describe('<SlotGrid>', () => {
  it('renders a fieldset per non-empty group, named by its legend heading', () => {
    setup();
    const morning = screen.getByRole('group', { name: 'Morning' });
    expect(morning.tagName).toBe('FIELDSET');
    expect(screen.getByRole('group', { name: 'Afternoon' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Evening' })).toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'Morning' })).toBeInTheDocument();
  });

  it('titleOrder sets the group heading level', () => {
    setup({ titleOrder: 4 });
    expect(screen.getByRole('heading', { level: 4, name: 'Morning' })).toBeInTheDocument();
  });

  it('one radio per slot, named by its label, all sharing one name', () => {
    setup({ name: 'slot' });
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    for (const r of radios) expect(r).toHaveAttribute('name', 'slot');
    expect(screen.getByRole('radio', { name: '9:30' })).toHaveAttribute('value', '09:30');
  });

  it('controlled: value checks; clicking calls onChange with the key', async () => {
    const { onChange } = setup({ value: '09:00' });
    expect(screen.getByRole('radio', { name: '9:00' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: '2:00' }));
    expect(onChange).toHaveBeenCalledWith('14:00');
    expect(screen.getByRole('radio', { name: '9:00' })).toBeChecked();
  });

  it('value not among the slots checks nothing', () => {
    setup({ value: '18:00' });
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked();
  });

  it('duplicate group labels each render their own fieldset with no React duplicate-key warning', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    setup({
      groups: [
        { label: 'Morning', slots: [{ key: '09:00', label: '9:00' }] },
        { label: 'Morning', slots: [{ key: '09:30', label: '9:30' }] },
      ],
    });
    expect(screen.getAllByRole('group', { name: 'Morning' })).toHaveLength(2);
    for (const call of consoleError.mock.calls) {
      expect(call.join(' ')).not.toMatch(/same key/);
    }
    consoleError.mockRestore();
  });

  it('renders the default empty state when no group has slots', () => {
    setup({ groups: [] });
    expect(screen.getByText('No available times')).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('all groups empty also shows the empty state', () => {
    setup({ groups: [{ label: 'Morning', slots: [] }] });
    expect(screen.getByText('No available times')).toBeInTheDocument();
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('custom empty content', () => {
    setup({ groups: [], empty: <p>Try another day</p> });
    expect(screen.getByText('Try another day')).toBeInTheDocument();
    expect(screen.queryByText('No available times')).toBeNull();
  });

  it('localizes the default empty state (ru)', () => {
    render(
      <I18nProvider locale="ru">
        <SlotGrid groups={[]} value={null} onChange={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByText('Нет свободного времени')).toBeInTheDocument();
  });

  it('forwards ref to the root div, merges className, spreads props', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SlotGrid
        ref={ref}
        groups={GROUPS}
        value={null}
        onChange={vi.fn()}
        className="extra"
        data-testid="sg"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId('sg'));
    expect(ref.current?.className).toMatch(/extra/);
    expect(ref.current?.className).toMatch(/root/);
  });
});

function expectNoWiringLeak(container: HTMLElement, errSpy: { mock: { calls: unknown[][] } }) {
  // Field injects id / invalid / required into its child (#568); a non-input
  // element must never carry them as attributes, and React must not warn.
  expect(container.querySelectorAll('div[required], fieldset[required], [invalid]')).toHaveLength(
    0,
  );
  expect(errSpy.mock.calls.flat().join(' ')).not.toMatch(
    /non-boolean attribute|React does not recognize/,
  );
}

describe('SlotGrid in Field (#568)', () => {
  it.each([true, false])(
    'consumes invalid/required (error=%s): native required + aria-invalid on the radios',
    (hasError) => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { container } = render(
        <Field label="Time" error={hasError ? 'Pick a time' : undefined} required>
          <SlotGrid groups={GROUPS} value={null} onChange={vi.fn()} />
        </Field>,
      );
      expectNoWiringLeak(container, errSpy);
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).toBeRequired();
        if (hasError) expect(radio).toHaveAttribute('aria-invalid', 'true');
        else expect(radio).not.toHaveAttribute('aria-invalid');
      }
      errSpy.mockRestore();
    },
  );
});
