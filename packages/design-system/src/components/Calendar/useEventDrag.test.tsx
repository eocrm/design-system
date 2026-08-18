import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { Calendar } from './Calendar';
import type { CalendarEvent, CalendarEventMove } from './types';

function wrap({ children }: { children: ReactNode }) {
  return <LocaleProvider locale="en-US">{children}</LocaleProvider>;
}

const CURSOR = new Date(2026, 4, 20); // Wed 20 May 2026
const HOUR_ROW_HEIGHT = 48;

/** One 09:00–10:00 booking on the cursor day. */
const STANDUP: CalendarEvent = {
  id: 'a',
  title: 'Standup',
  startsAt: new Date(2026, 4, 20, 9, 0),
  endsAt: new Date(2026, 4, 20, 10, 0),
};

function block() {
  return screen.getByRole('button', { name: /Standup/ });
}

/**
 * Drive a full pointer gesture. `dy` is in pixels; with `hourRowHeight={48}`
 * one hour is 48px, so `dy: 48` is a one-hour drag.
 */
function drag(target: Element, { dx = 0, dy = 0 }: { dx?: number; dy?: number }) {
  fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
}

function renderDay(props: Partial<Parameters<typeof Calendar>[0]> = {}) {
  return render(
    <Calendar
      view="day"
      value={CURSOR}
      events={[STANDUP]}
      hourRange={[7, 19]}
      hourRowHeight={HOUR_ROW_HEIGHT}
      {...props}
    />,
    { wrapper: wrap },
  );
}

describe('Calendar drag — opt-in (issue #472)', () => {
  it('renders no resize handle and no drag description without the handlers', () => {
    renderDay();
    expect(screen.queryByTestId('resize-handle-a')).toBeNull();
    expect(block()).not.toHaveAttribute('aria-describedby');
  });

  it('describes the keyboard equivalent once a drag handler is wired', () => {
    renderDay({ onEventMove: vi.fn() });
    const id = block().getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveTextContent(/Alt/);
  });

  it('renders the resize handle only when onEventResize is wired', () => {
    const { unmount } = renderDay({ onEventMove: vi.fn() });
    expect(screen.queryByTestId('resize-handle-a')).toBeNull();
    unmount();
    renderDay({ onEventResize: vi.fn() });
    expect(screen.getByTestId('resize-handle-a')).toBeInTheDocument();
  });

  it('ignores a pointer gesture entirely when no handler is wired', () => {
    const onEventClick = vi.fn();
    renderDay({ onEventClick });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    // No preview, no proposal — and the block is still where it started.
    expect(block().style.top).toBe('96px'); // 09:00 is 2h past the 07:00 start
  });
});

describe('Calendar drag — move (issue #472)', () => {
  it('proposes a one-hour-later slot for a one-hour-tall drag', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    expect(onEventMove).toHaveBeenCalledTimes(1);
    const [event, next] = onEventMove.mock.calls[0];
    expect(event.id).toBe('a');
    expect(next.startsAt).toEqual(new Date(2026, 4, 20, 10, 0));
    expect(next.endsAt).toEqual(new Date(2026, 4, 20, 11, 0));
  });

  it('preserves the event duration', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    drag(block(), { dy: 3 * HOUR_ROW_HEIGHT });
    const [, next] = onEventMove.mock.calls[0];
    expect(next.endsAt.getTime() - next.startsAt.getTime()).toBe(60 * 60 * 1000);
  });

  it('snaps to the default 15-minute grid', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    // 20px ÷ 48px-per-hour = 25 minutes → snaps to 30.
    drag(block(), { dy: 20 });
    expect(onEventMove.mock.calls[0][1].startsAt).toEqual(new Date(2026, 4, 20, 9, 30));
  });

  it('honours a custom dragSnapMinutes', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove, dragSnapMinutes: 60 });
    // 40px = 50 minutes past 09:00 → 09:50 → snaps to the hour: 10:00.
    drag(block(), { dy: 40 });
    expect(onEventMove.mock.calls[0][1].startsAt).toEqual(new Date(2026, 4, 20, 10, 0));
  });

  it('moves earlier for an upward drag', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    drag(block(), { dy: -HOUR_ROW_HEIGHT });
    expect(onEventMove.mock.calls[0][1].startsAt).toEqual(new Date(2026, 4, 20, 8, 0));
  });

  it('previews the proposed slot before the drop', () => {
    renderDay({ onEventMove: vi.fn() });
    const el = block();
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 100, clientY: 100 + HOUR_ROW_HEIGHT });
    // 10:00 is 3h past the 07:00 grid start.
    expect(block().style.top).toBe('144px');
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100 + HOUR_ROW_HEIGHT });
  });

  it('does not propose anything for a press that never crosses the drag threshold', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    fireEvent.pointerDown(block(), { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 101, clientY: 101 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 101, clientY: 101 });
    expect(onEventMove).not.toHaveBeenCalled();
  });

  it('ignores a non-primary button', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    fireEvent.pointerDown(block(), { pointerId: 1, button: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 100, clientY: 148 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 148 });
    expect(onEventMove).not.toHaveBeenCalled();
  });

  it('discards the drag on pointercancel without proposing anything', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    fireEvent.pointerDown(block(), { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 100, clientY: 148 });
    fireEvent.pointerCancel(window, { pointerId: 1 });
    expect(onEventMove).not.toHaveBeenCalled();
    expect(block().style.top).toBe('96px');
  });
});

describe('Calendar drag — resize (issue #472)', () => {
  it('extends only the end time', () => {
    const onEventResize = vi.fn();
    renderDay({ onEventResize });
    drag(screen.getByTestId('resize-handle-a'), { dy: HOUR_ROW_HEIGHT });
    expect(onEventResize).toHaveBeenCalledTimes(1);
    const [, next] = onEventResize.mock.calls[0];
    expect(next.startsAt).toEqual(STANDUP.startsAt);
    expect(next.endsAt).toEqual(new Date(2026, 4, 20, 11, 0));
  });

  it('never shrinks the event past a single snap step', () => {
    const onEventResize = vi.fn();
    renderDay({ onEventResize });
    // A huge upward drag would put the end before the start.
    drag(screen.getByTestId('resize-handle-a'), { dy: -10 * HOUR_ROW_HEIGHT });
    expect(onEventResize.mock.calls[0][1].endsAt).toEqual(new Date(2026, 4, 20, 9, 15));
  });

  it('does not fire onEventMove when the gesture started on the handle', () => {
    const onEventMove = vi.fn();
    const onEventResize = vi.fn();
    renderDay({ onEventMove, onEventResize });
    drag(screen.getByTestId('resize-handle-a'), { dy: HOUR_ROW_HEIGHT });
    expect(onEventResize).toHaveBeenCalledTimes(1);
    expect(onEventMove).not.toHaveBeenCalled();
  });
});

describe('Calendar drag — rejection (issue #472)', () => {
  it('never proposes a placement canDropEvent refused', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove, canDropEvent: () => false });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    expect(onEventMove).not.toHaveBeenCalled();
  });

  it('passes canDropEvent the same proposal the handler would receive', () => {
    const canDropEvent = vi.fn((_event: CalendarEvent, _next: CalendarEventMove) => true);
    renderDay({ onEventMove: vi.fn(), canDropEvent });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    const lastCall = canDropEvent.mock.calls.at(-1)!;
    expect(lastCall[0].id).toBe('a');
    expect(lastCall[1].startsAt).toEqual(new Date(2026, 4, 20, 10, 0));
  });

  it('snaps back when the handler returns false', async () => {
    renderDay({ onEventMove: () => false });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    await waitFor(() => expect(block().style.top).toBe('96px'));
  });

  it('holds the preview until an async verdict lands, then snaps back on rejection', async () => {
    let settle: (v: boolean) => void = () => {};
    const onEventMove = () => new Promise<boolean>((res) => (settle = res));
    renderDay({ onEventMove });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    // Still previewing at the proposed slot while the request is in flight.
    expect(block().style.top).toBe('144px');
    settle(false);
    await waitFor(() => expect(block().style.top).toBe('96px'));
  });

  it('snaps back when the handler’s promise rejects', async () => {
    const onEventMove = () => Promise.reject(new Error('overlap'));
    renderDay({ onEventMove });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    await waitFor(() => expect(block().style.top).toBe('96px'));
  });
});

describe('Calendar drag — click interaction (issue #472)', () => {
  it('swallows the click that terminates a drag', () => {
    const onEventClick = vi.fn();
    renderDay({ onEventMove: vi.fn(), onEventClick });
    const el = block();
    drag(el, { dy: HOUR_ROW_HEIGHT });
    fireEvent.click(el);
    expect(onEventClick).not.toHaveBeenCalled();
  });

  it('still opens the event on a plain click', async () => {
    const user = userEvent.setup();
    const onEventClick = vi.fn();
    renderDay({ onEventMove: vi.fn(), onEventClick });
    await user.click(block());
    expect(onEventClick).toHaveBeenCalledTimes(1);
  });
});

describe('Calendar drag — keyboard (issue #472)', () => {
  it('moves one snap step later on Alt+ArrowDown', async () => {
    const user = userEvent.setup();
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    block().focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(onEventMove.mock.calls[0][1].startsAt).toEqual(new Date(2026, 4, 20, 9, 15));
  });

  it('moves one snap step earlier on Alt+ArrowUp', async () => {
    const user = userEvent.setup();
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    block().focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(onEventMove.mock.calls[0][1].startsAt).toEqual(new Date(2026, 4, 20, 8, 45));
  });

  it('resizes on Alt+Shift+ArrowDown', async () => {
    const user = userEvent.setup();
    const onEventResize = vi.fn();
    renderDay({ onEventResize });
    block().focus();
    await user.keyboard('{Alt>}{Shift>}{ArrowDown}{/Shift}{/Alt}');
    const [, next] = onEventResize.mock.calls[0];
    expect(next.startsAt).toEqual(STANDUP.startsAt);
    expect(next.endsAt).toEqual(new Date(2026, 4, 20, 10, 15));
  });

  it('does nothing without the Alt modifier', async () => {
    const user = userEvent.setup();
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    block().focus();
    await user.keyboard('{ArrowDown}');
    expect(onEventMove).not.toHaveBeenCalled();
  });

  it('moves to the next day column on Alt+ArrowRight in week view', async () => {
    const user = userEvent.setup();
    const onEventMove = vi.fn();
    render(
      <Calendar
        view="week"
        value={CURSOR}
        events={[STANDUP]}
        hourRange={[7, 19]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        onEventMove={onEventMove}
      />,
      { wrapper: wrap },
    );
    block().focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    const [, next] = onEventMove.mock.calls[0];
    expect(next.startsAt).toEqual(new Date(2026, 4, 21, 9, 0));
  });

  it('does not propose a no-op at the first column', async () => {
    const user = userEvent.setup();
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    block().focus();
    // A plain day view has exactly one column, so there is nowhere to go.
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    expect(onEventMove).not.toHaveBeenCalled();
  });
});
