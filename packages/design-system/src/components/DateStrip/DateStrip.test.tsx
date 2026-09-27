import { StrictMode } from 'react';
import { createRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { DateStrip, type DateStripDay, type DateStripProps } from './DateStrip';

const WEEK: DateStripDay[] = [
  { date: '2026-10-05', free: 3 },
  { date: '2026-10-06', free: 1 },
  { date: '2026-10-07', free: 9 },
  { date: '2026-10-08', free: 0 },
  { date: '2026-10-09', free: 2 },
  { date: '2026-10-10', free: 0 },
  { date: '2026-10-11', free: 4 },
];
const NEXT_WEEK: DateStripDay[] = WEEK.map((d, i) => ({
  ...d,
  date: `2026-10-${String(12 + i).padStart(2, '0')}`,
}));

// LiveRegion clears then rewrites its text after a real setTimeout
// (ANNOUNCE_DELAY_MS = 50 in LiveRegion.tsx, not exported). A synchronous
// "the region is empty" assertion passes trivially before that timer ever
// fires, regardless of whether the component actually stayed silent. Wait
// past the delay first so an empty assertion only passes because nothing
// was scheduled to be written, not because nothing has had time to write yet.
const PAST_ANNOUNCE_DELAY_MS = 100;
async function waitPastAnnounceDelay() {
  await act(() => new Promise((r) => setTimeout(r, PAST_ANNOUNCE_DELAY_MS)));
}

function setup(props: Partial<DateStripProps> = {}) {
  const handlers = { onChange: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() };
  const all: DateStripProps = { days: WEEK, value: null, ...handlers, ...props };
  const utils = render(
    <LocaleProvider locale="en-US">
      <DateStrip {...all} />
    </LocaleProvider>,
  );
  return { ...utils, ...handlers, props: all };
}

describe('<DateStrip>', () => {
  it('is a group named by the month heading', () => {
    setup();
    const group = screen.getByRole('group', { name: 'October 2026' });
    expect(screen.getByRole('heading', { level: 2, name: 'October 2026' })).toBeInTheDocument();
    expect(group.tagName).toBe('FIELDSET');
  });

  it('titleOrder sets the heading level', () => {
    setup({ titleOrder: 3 });
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('October 2026');
  });

  it('names across a month boundary', () => {
    setup({
      days: [
        { date: '2026-09-28', free: 1 },
        { date: '2026-10-04', free: 1 },
      ],
    });
    expect(
      screen.getByRole('group', { name: /^September\s*–\s*October 2026$/ }),
    ).toBeInTheDocument();
  });

  it('renders one radio per day with a full accessible name', () => {
    setup();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(7);
    expect(screen.getByRole('radio', { name: 'Wednesday, October 7, 9 free' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Thursday, October 8, No times' })).toBeDisabled();
  });

  it('visual body shows short weekday, number and count, hidden from AT', () => {
    setup();
    const radio = screen.getByRole('radio', { name: /October 7/ });
    const tile = radio.closest('label')!;
    const body = tile.querySelector('[aria-hidden="true"]')!;
    expect(body).toHaveTextContent('Wed');
    expect(body).toHaveTextContent('7');
    expect(body).toHaveTextContent('9 free');
  });

  it('all radios share one name (one Tab stop, exclusive choice)', () => {
    setup({ name: 'day' });
    for (const r of screen.getAllByRole('radio')) expect(r).toHaveAttribute('name', 'day');
  });

  it('controlled: value checks the tile; clicking calls onChange with the ISO date', async () => {
    const { onChange } = setup({ value: '2026-10-05' });
    expect(screen.getByRole('radio', { name: /October 5/ })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /October 7/ }));
    expect(onChange).toHaveBeenCalledWith('2026-10-07');
    // Controlled: still the old value until the parent updates.
    expect(screen.getByRole('radio', { name: /October 5/ })).toBeChecked();
  });

  it('a disabled day cannot be chosen', async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole('radio', { name: /October 8/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a negative free count reads "No times" and is disabled, agreeing with the text', () => {
    setup({
      days: [
        { date: '2026-10-05', free: -1 },
        { date: '2026-10-06', free: 1 },
      ],
    });
    const radio = screen.getByRole('radio', { name: /No times$/ });
    expect(radio).toBeDisabled();
  });

  it('value outside the week checks nothing', () => {
    setup({ value: '2026-11-01' });
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked();
  });

  it('prev/next buttons call handlers and respect canPrevious / canNext', async () => {
    const { onPrevious, onNext, rerender, props } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    rerender(
      <LocaleProvider locale="en-US">
        <DateStrip {...props} canPrevious={false} canNext={false} />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
  });

  it('all days full: every radio disabled, navigation still works', async () => {
    const { onNext } = setup({ days: WEEK.map((d) => ({ ...d, free: 0 })) });
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('empty days: no label text, no tiles, no crash', async () => {
    setup({ days: [] });
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    await waitPastAnnounceDelay();
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  describe('week-change announcement (Rule 10)', () => {
    it('is silent on mount', async () => {
      setup();
      await waitPastAnnounceDelay();
      expect(screen.getByRole('status')).toHaveTextContent('');
    });

    it('announces the new range after the week changes', async () => {
      const { rerender, props } = setup();
      rerender(
        <LocaleProvider locale="en-US">
          <DateStrip {...props} days={NEXT_WEEK} />
        </LocaleProvider>,
      );
      // LiveRegion clears then rewrites after a short delay (Hard rule 10) —
      // wait for the delayed write, matching FileUpload's test convention.
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(/^October 12\s*–\s*18$/),
      );
    });

    it('does not announce when the same week re-renders with new objects', async () => {
      const { rerender, props } = setup();
      rerender(
        <LocaleProvider locale="en-US">
          <DateStrip {...props} days={WEEK.map((d) => ({ ...d }))} />
        </LocaleProvider>,
      );
      await waitPastAnnounceDelay();
      expect(screen.getByRole('status')).toHaveTextContent('');
    });

    it('StrictMode mount stays silent', async () => {
      render(
        <StrictMode>
          <LocaleProvider locale="en-US">
            <DateStrip
              days={WEEK}
              value={null}
              onChange={vi.fn()}
              onPrevious={vi.fn()}
              onNext={vi.fn()}
            />
          </LocaleProvider>
        </StrictMode>,
      );
      await waitPastAnnounceDelay();
      expect(screen.getByRole('status')).toHaveTextContent('');
    });
  });

  it('localizes (ru): month, names and plural counts', () => {
    render(
      <I18nProvider locale="ru">
        <LocaleProvider locale="ru-RU">
          <DateStrip
            days={WEEK}
            value={null}
            onChange={vi.fn()}
            onPrevious={vi.fn()}
            onNext={vi.fn()}
          />
        </LocaleProvider>
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: 'Следующая неделя' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /1 свободное$/ })).toBeInTheDocument(); // Oct 6
    expect(screen.getByRole('radio', { name: /3 свободных$/ })).toBeInTheDocument(); // Oct 5
    // Two days in WEEK have free: 0 (Oct 8 and Oct 10) so this regex matches
    // both — assert every "no times" radio is disabled, not just one.
    const noTimesRadios = screen.getAllByRole('radio', { name: /Нет времени$/ });
    expect(noTimesRadios).toHaveLength(2);
    for (const r of noTimesRadios) expect(r).toBeDisabled();
  });

  it('forwards ref to the fieldset, merges className, spreads props', () => {
    const ref = createRef<HTMLFieldSetElement>();
    setup({ ref, className: 'extra', 'data-testid': 'ds' } as Partial<DateStripProps>);
    expect(ref.current?.tagName).toBe('FIELDSET');
    expect(screen.getByTestId('ds').className).toMatch(/extra/);
    expect(screen.getByTestId('ds').className).toMatch(/root/);
  });

  it('a consumer aria-label cannot replace the month name (Pattern B)', () => {
    setup({ 'aria-label': 'Pick a day' } as Partial<DateStripProps>);
    expect(screen.getByRole('group', { name: 'October 2026' })).toBeInTheDocument();
  });
});
