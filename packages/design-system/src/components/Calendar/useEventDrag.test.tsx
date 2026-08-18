import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { Calendar } from './Calendar';
import type { CalendarEvent, CalendarEventMove } from './types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import timedEventStyles from './TimedEvent.module.scss';
import hourGridStyles from './HourGrid.module.scss';

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

function block(name: RegExp = /Standup/) {
  return screen.getByRole('button', { name });
}

/**
 * The resize handle carries no `data-testid` — the library ships no test hooks
 * into consumer DOM — so it is addressed the same way a consumer's stylesheet
 * would: by its module class.
 */
function resizeHandle(container: HTMLElement) {
  const el = container.querySelector(`.${timedEventStyles.resizeHandle}`);
  if (!el) throw new Error('no resize handle rendered');
  return el;
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
    const moveOnly = renderDay({ onEventMove: vi.fn() });
    expect(moveOnly.container.querySelector(`.${timedEventStyles.resizeHandle}`)).toBeNull();
    moveOnly.unmount();
    const resizable = renderDay({ onEventResize: vi.fn() });
    expect(resizable.container.querySelector(`.${timedEventStyles.resizeHandle}`)).not.toBeNull();
  });

  it('ships no data-testid into consumer DOM', () => {
    const { container } = renderDay({ onEventMove: vi.fn(), onEventResize: vi.fn() });
    expect(container.querySelector('[data-testid]')).toBeNull();
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
    const { container } = renderDay({ onEventResize });
    drag(resizeHandle(container), { dy: HOUR_ROW_HEIGHT });
    expect(onEventResize).toHaveBeenCalledTimes(1);
    const [, next] = onEventResize.mock.calls[0];
    expect(next.startsAt).toEqual(STANDUP.startsAt);
    expect(next.endsAt).toEqual(new Date(2026, 4, 20, 11, 0));
  });

  it('never shrinks the event past a single snap step', () => {
    const onEventResize = vi.fn();
    const { container } = renderDay({ onEventResize });
    // A huge upward drag would put the end before the start.
    drag(resizeHandle(container), { dy: -10 * HOUR_ROW_HEIGHT });
    expect(onEventResize.mock.calls[0][1].endsAt).toEqual(new Date(2026, 4, 20, 9, 15));
  });

  it('does not fire onEventMove when the gesture started on the handle', () => {
    const onEventMove = vi.fn();
    const onEventResize = vi.fn();
    const { container } = renderDay({ onEventMove, onEventResize });
    drag(resizeHandle(container), { dy: HOUR_ROW_HEIGHT });
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

  it('reports a refused drop distinctly from an accepted one', async () => {
    // Without this the `false` return would be indistinguishable from a no-op:
    // an accepted drop and a refused one both end with the block back at its
    // `events` position, so "it snapped back" alone asserts nothing.
    const refused = renderDay({ onEventMove: () => false });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/cannot be placed there/i),
    );
    refused.unmount();

    renderDay({ onEventMove: () => undefined });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Moved to/i));
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
    expect(screen.getByRole('status')).toHaveTextContent(/cannot be placed there/i);
  });

  it('snaps back when the handler’s promise rejects', async () => {
    const onEventMove = () => Promise.reject(new Error('overlap'));
    renderDay({ onEventMove });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    await waitFor(() => expect(block().style.top).toBe('96px'));
    expect(screen.getByRole('status')).toHaveTextContent(/cannot be placed there/i);
  });

  it('marks the block refused while canDropEvent says no, mid-drag', () => {
    renderDay({ onEventMove: vi.fn(), canDropEvent: () => false });
    fireEvent.pointerDown(block(), { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 100, clientY: 148 });
    expect(block().className).toContain(timedEventStyles.invalidDrop);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 148 });
  });

  it('does not tear down a second drag when a slow first commit settles', async () => {
    let settle: (v: boolean) => void = () => {};
    const onEventMove = vi.fn(() => new Promise<boolean>((res) => (settle = res)));
    renderDay({ onEventMove });
    // First drag: proposes, then hangs awaiting the server.
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    expect(onEventMove).toHaveBeenCalledTimes(1);

    // Second drag starts before the first verdict arrives.
    fireEvent.pointerDown(block(), { pointerId: 2, button: 0, clientX: 100, clientY: 100 });
    settle(true);
    await waitFor(() => expect(block().style.top).toBe('96px'));

    // The settling first commit must not have unsubscribed the live gesture.
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 100, clientY: 100 + HOUR_ROW_HEIGHT });
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 100, clientY: 100 + HOUR_ROW_HEIGHT });
    expect(onEventMove).toHaveBeenCalledTimes(2);
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

describe('Calendar drag — clamping to the grid (issue #472)', () => {
  it('an upward drag past the top stays on the same day', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    // Ten rows up from 09:00 in a 07:00–19:00 window would be -60 minutes
    // past the top; unclamped that projects into the PREVIOUS calendar day.
    drag(block(), { dy: -10 * HOUR_ROW_HEIGHT });
    const [, next] = onEventMove.mock.calls[0];
    expect(next.startsAt).toEqual(new Date(2026, 4, 20, 7, 0));
    expect(next.endsAt).toEqual(new Date(2026, 4, 20, 8, 0));
  });

  it('a downward drag past the bottom keeps the start inside the window', () => {
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    drag(block(), { dy: 20 * HOUR_ROW_HEIGHT });
    const [, next] = onEventMove.mock.calls[0];
    // Last snap step inside a 07:00–19:00 window is 18:45.
    expect(next.startsAt).toEqual(new Date(2026, 4, 20, 18, 45));
  });

  it('repeated Alt+ArrowUp cannot walk the event off the top of the grid', async () => {
    // The move has to be COMMITTED each time, or every iteration re-proposes
    // the same slot from the same starting position and the bound is never
    // reached — the assertion would hold with the clamp deleted.
    const user = userEvent.setup();
    const seen: Date[] = [];
    function Harness() {
      const [events, setEvents] = useState<CalendarEvent[]>([STANDUP]);
      return (
        <Calendar
          view="day"
          value={CURSOR}
          events={events}
          hourRange={[7, 19]}
          hourRowHeight={HOUR_ROW_HEIGHT}
          onEventMove={(event, next) => {
            seen.push(next.startsAt);
            setEvents([{ ...event, startsAt: next.startsAt, endsAt: next.endsAt }]);
          }}
        />
      );
    }
    render(<Harness />, { wrapper: wrap });
    block().focus();
    for (let i = 0; i < 12; i++) {
      block().focus();
      await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    }
    expect(seen.length).toBeGreaterThan(0);
    for (const start of seen) {
      expect(start.getDate()).toBe(20);
      expect(start.getHours()).toBeGreaterThanOrEqual(7);
    }
    // It walked all the way to the top and stopped there.
    expect(seen[seen.length - 1]).toEqual(new Date(2026, 4, 20, 7, 0));
    // And the block never left the day.
    expect(screen.getByRole('status')).toHaveTextContent(/cannot move any further/i);
  });

  it('a runaway resize is bounded to one day from the start', () => {
    const onEventResize = vi.fn();
    const { container } = renderDay({ onEventResize });
    drag(resizeHandle(container), { dy: 400 * HOUR_ROW_HEIGHT });
    const [, next] = onEventResize.mock.calls[0];
    // A pointer delta that large would otherwise roll through whole dates.
    // The bound is a day's length from the start, not the visible window —
    // an overnight booking has to stay extendable past midnight.
    expect(next.endsAt).toEqual(new Date(2026, 4, 21, 9, 0));
  });

  it('a resize can still extend an event past midnight', () => {
    const onEventResize = vi.fn();
    const { container } = render(
      <Calendar
        view="day"
        value={CURSOR}
        events={[
          {
            id: 'a',
            title: 'Standup',
            startsAt: new Date(2026, 4, 20, 22, 0),
            endsAt: new Date(2026, 4, 20, 23, 0),
          },
        ]}
        hourRange={[7, 23]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        onEventResize={onEventResize}
      />,
      { wrapper: wrap },
    );
    drag(resizeHandle(container), { dy: 2 * HOUR_ROW_HEIGHT });
    expect(onEventResize.mock.calls[0][1].endsAt).toEqual(new Date(2026, 4, 21, 1, 0));
  });
});

describe('Calendar drag — the controller reads the event, never the block', () => {
  it("never reads a block's clipped end coordinate", () => {
    // Structural guard, not a behavioural one. `TimedEventBlock` carries
    // RENDER coordinates: the layout clips `endMinutes` to the bottom of the
    // column for anything ending on a later day. Every drag bug this
    // component has had came from reading one of those for a semantic
    // decision — a truncated overnight booking, a reversed gesture, a no-op
    // guard that could never match. The controller derives a `DragFrame` from
    // the CalendarEvent instead; this keeps it that way.
    const source = readFileSync(resolve(__dirname, './useEventDrag.ts'), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/\bblock\.endMinutes\b/);
    expect(code).not.toMatch(/\bblock\.startMinutes\b/);
  });

  it('does not call the handler for a drag the bounds refused entirely', () => {
    // A fully-clamped gesture proposes exactly where the event already is.
    // The documented consumer shape is an API write, so firing it for a drag
    // that moved nothing would be a spurious server round-trip.
    const onEventMove = vi.fn();
    render(
      <Calendar
        view="day"
        value={CURSOR}
        events={[
          {
            id: 'a',
            title: 'Standup',
            // Already at the top of a 07:00-19:00 window: an upward drag can
            // change nothing.
            startsAt: new Date(2026, 4, 20, 7, 0),
            endsAt: new Date(2026, 4, 20, 8, 0),
          },
        ]}
        hourRange={[7, 19]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        onEventMove={onEventMove}
      />,
      { wrapper: wrap },
    );
    drag(block(), { dy: -40 * HOUR_ROW_HEIGHT });
    expect(onEventMove).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/cannot move any further/i);
  });

  it('refuses rather than reverses a shrink on a zero-duration event', () => {
    // The clamp floor sits at the event's own end, so asking to shrink a
    // zero-length event cannot answer by LENGTHENING it — the exact inversion
    // the move branch was fixed for.
    const onEventResize = vi.fn();
    const { container } = render(
      <Calendar
        view="day"
        value={CURSOR}
        events={[{ id: 'z', title: 'Ping', startsAt: new Date(2026, 4, 20, 9, 0) }]}
        hourRange={[7, 19]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        onEventResize={onEventResize}
      />,
      { wrapper: wrap },
    );
    drag(resizeHandle(container), { dy: -4 * HOUR_ROW_HEIGHT });
    expect(onEventResize).not.toHaveBeenCalled();
  });

  it('still lengthens a zero-duration event downward', () => {
    const onEventResize = vi.fn();
    const { container } = render(
      <Calendar
        view="day"
        value={CURSOR}
        events={[{ id: 'z', title: 'Ping', startsAt: new Date(2026, 4, 20, 9, 0) }]}
        hourRange={[7, 19]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        onEventResize={onEventResize}
      />,
      { wrapper: wrap },
    );
    drag(resizeHandle(container), { dy: HOUR_ROW_HEIGHT });
    expect(onEventResize.mock.calls[0][1].endsAt).toEqual(new Date(2026, 4, 20, 10, 0));
  });

  it('does not drag an event that starts before the window INTO the window', () => {
    // Its block renders clipped at the top with a negative offset; a gesture
    // asking to move it earlier must not answer by moving it later.
    const onEventMove = vi.fn();
    render(
      <Calendar
        view="day"
        value={CURSOR}
        events={[
          {
            id: 'e',
            title: 'Early',
            startsAt: new Date(2026, 4, 20, 6, 0),
            endsAt: new Date(2026, 4, 20, 7, 0),
          },
        ]}
        hourRange={[8, 20]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        onEventMove={onEventMove}
      />,
      { wrapper: wrap },
    );
    drag(block(/Early/), { dy: -HOUR_ROW_HEIGHT });
    expect(onEventMove).not.toHaveBeenCalled();
    drag(block(/Early/), { dy: HOUR_ROW_HEIGHT });
    expect(onEventMove.mock.calls[0][1].startsAt).toEqual(new Date(2026, 4, 20, 7, 0));
  });
});

describe('Calendar drag — overnight events (issue #472)', () => {
  // The layout clips a block that ends on a later day to the bottom of the
  // column, so its rendered height is NOT its duration. Deriving the proposal
  // from the block would silently shorten every overnight booking.
  const NIGHT: CalendarEvent = {
    id: 'n',
    title: 'Night shift',
    startsAt: new Date(2026, 4, 20, 20, 0),
    endsAt: new Date(2026, 4, 21, 2, 0),
  };

  function renderNight(props: Record<string, unknown>) {
    return render(
      <Calendar
        view="day"
        value={CURSOR}
        events={[NIGHT]}
        hourRange={[7, 23]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        {...props}
      />,
      { wrapper: wrap },
    );
  }

  it('preserves the full six-hour duration across a move', () => {
    const onEventMove = vi.fn();
    renderNight({ onEventMove });
    drag(block(/Night shift/), { dy: HOUR_ROW_HEIGHT });
    const [, next] = onEventMove.mock.calls[0];
    expect(next.startsAt).toEqual(new Date(2026, 4, 20, 21, 0));
    expect(next.endsAt).toEqual(new Date(2026, 4, 21, 3, 0));
  });

  it('preserves the duration for a keyboard move too', async () => {
    const user = userEvent.setup();
    const onEventMove = vi.fn();
    renderNight({ onEventMove });
    block(/Night shift/).focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    const [, next] = onEventMove.mock.calls[0];
    expect(next.endsAt.getTime() - next.startsAt.getTime()).toBe(6 * 60 * 60 * 1000);
  });
});

describe('Calendar drag — overnight resize and edge nudges', () => {
  /** 20:00 → 02:00 next day. Its block is CLIPPED at the bottom of the grid. */
  const NIGHT: CalendarEvent = {
    id: 'n',
    title: 'Night shift',
    startsAt: new Date(2026, 4, 20, 20, 0),
    endsAt: new Date(2026, 4, 21, 2, 0),
  };

  function renderNight(props: Record<string, unknown>) {
    return render(
      <Calendar
        view="day"
        value={CURSOR}
        events={[NIGHT]}
        hourRange={[7, 23]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        {...props}
      />,
      { wrapper: wrap },
    );
  }

  it('lengthens a clipped overnight event instead of truncating it', () => {
    // The block's rendered end is pinned to the grid bottom (23:00), two hours
    // short of the real 02:00. Resizing from the rendered end would propose
    // 00:00 — a silent two-hour deletion in the direction that should lengthen.
    const onEventResize = vi.fn();
    const { container } = renderNight({ onEventResize });
    drag(resizeHandle(container), { dy: HOUR_ROW_HEIGHT });
    expect(onEventResize.mock.calls[0][1].endsAt).toEqual(new Date(2026, 4, 21, 3, 0));
  });

  it('lengthens a clipped overnight event by keyboard too', async () => {
    const user = userEvent.setup();
    const onEventResize = vi.fn();
    renderNight({ onEventResize });
    block(/Night shift/).focus();
    await user.keyboard('{Alt>}{Shift>}{ArrowDown}{/Shift}{/Alt}');
    expect(onEventResize.mock.calls[0][1].endsAt).toEqual(new Date(2026, 4, 21, 2, 15));
  });

  it('stops proposing once a clipped block has been nudged to the edge', async () => {
    // Guards the no-op check being semantic: compared in grid coordinates, a
    // clipped block's end never matches and every keypress fires a proposal,
    // including the ones that changed nothing.
    const user = userEvent.setup();
    const proposals: Date[] = [];
    function Harness() {
      const [events, setEvents] = useState<CalendarEvent[]>([NIGHT]);
      return (
        <Calendar
          view="day"
          value={CURSOR}
          events={events}
          hourRange={[7, 23]}
          hourRowHeight={HOUR_ROW_HEIGHT}
          onEventMove={(event, next) => {
            proposals.push(next.startsAt);
            setEvents([{ ...event, startsAt: next.startsAt, endsAt: next.endsAt }]);
          }}
        />
      );
    }
    render(<Harness />, { wrapper: wrap });
    for (let i = 0; i < 20; i++) {
      block(/Night shift/).focus();
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    }
    // It walked to the last slot the window allows and then stopped, rather
    // than emitting twenty proposals.
    expect(proposals.length).toBeLessThan(20);
    expect(proposals.length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent(/cannot move any further/i);
  });
});

describe('Calendar drag — resource columns (issues #471 + #472)', () => {
  const RESOURCES = [
    { id: 'ana', label: 'Ana' },
    { id: 'ben', label: 'Ben' },
  ];
  const BOOKING: CalendarEvent = {
    id: 'a',
    title: 'Standup',
    startsAt: new Date(2026, 4, 20, 9, 0),
    endsAt: new Date(2026, 4, 20, 10, 0),
    resourceId: 'ana',
  };

  function renderResources(props: Record<string, unknown>) {
    return render(
      <Calendar
        view="day"
        value={CURSOR}
        events={[BOOKING]}
        resources={RESOURCES}
        hourRange={[7, 19]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        {...props}
      />,
      { wrapper: wrap },
    );
  }

  it('reports the origin resource when the column does not change', () => {
    const onEventMove = vi.fn();
    renderResources({ onEventMove });
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    expect(onEventMove.mock.calls[0][1].resourceId).toBe('ana');
  });

  it('reassigns the resource on a keyboard move to the next lane', async () => {
    const user = userEvent.setup();
    const onEventMove = vi.fn();
    renderResources({ onEventMove });
    block().focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    const [, next] = onEventMove.mock.calls[0];
    expect(next.resourceId).toBe('ben');
    // A pure lane change must not also shift the time.
    expect(next.startsAt).toEqual(BOOKING.startsAt);
  });

  it('reassigns the resource on a pointer drag into another lane', () => {
    const onEventMove = vi.fn();
    const { container } = renderResources({ onEventMove });
    // jsdom lays nothing out, so give the columns real geometry to hit-test.
    const columns = Array.from(
      container.querySelectorAll<HTMLElement>(`.${hourGridStyles.dayColumn}`),
    );
    expect(columns).toHaveLength(2);
    columns.forEach((col, i) => {
      col.getBoundingClientRect = () =>
        ({
          left: i * 200,
          right: (i + 1) * 200,
          width: 200,
          top: 0,
          bottom: 600,
          height: 600,
        }) as DOMRect;
    });

    fireEvent.pointerDown(block(), { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 300, clientY: 100 });
    expect(onEventMove.mock.calls[0][1].resourceId).toBe('ben');
  });

  it('reports undefined for a drop into the unassigned lane', async () => {
    const user = userEvent.setup();
    const onEventMove = vi.fn();
    render(
      <Calendar
        view="day"
        value={CURSOR}
        // The second booking has no resourceId, so the unassigned lane exists.
        events={[
          { ...BOOKING, resourceId: 'ben' },
          { ...STANDUP, id: 'b', title: 'Walk-in' },
        ]}
        resources={RESOURCES}
        hourRange={[7, 19]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        onEventMove={onEventMove}
      />,
      { wrapper: wrap },
    );
    block().focus(); // "Standup", in Ben's lane (index 1)
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(onEventMove.mock.calls[0][1].resourceId).toBeUndefined();
  });
});

describe('Calendar drag — week view columns (issue #472)', () => {
  it('reassigns the day on a pointer drag into another weekday', () => {
    const onEventMove = vi.fn();
    const { container } = render(
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
    const columns = Array.from(
      container.querySelectorAll<HTMLElement>(`.${hourGridStyles.dayColumn}`),
    );
    expect(columns).toHaveLength(7);
    columns.forEach((col, i) => {
      col.getBoundingClientRect = () =>
        ({
          left: i * 100,
          right: (i + 1) * 100,
          width: 100,
          top: 0,
          bottom: 600,
          height: 600,
        }) as DOMRect;
    });

    // Wed 20 May 2026 is column index 3 in a Sunday-first week (17th = Sun).
    fireEvent.pointerDown(block(), { pointerId: 1, button: 0, clientX: 350, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 450, clientY: 100 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 450, clientY: 100 });
    const [, next] = onEventMove.mock.calls[0];
    expect(next.startsAt).toEqual(new Date(2026, 4, 21, 9, 0));
  });
});

describe('Calendar drag — preview feedback (issue #472)', () => {
  it('shows the PROPOSED time on the block while dragging, not the stored one', () => {
    renderDay({ onEventMove: vi.fn() });
    const el = block();
    expect(el).toHaveTextContent(/9:00\s*AM/);
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 100, clientY: 100 + HOUR_ROW_HEIGHT });
    // The label is the feedback at the moment the user decides to release —
    // a block that has visibly moved to 10:00 must not still read 9:00.
    expect(block()).toHaveTextContent(/10:00\s*AM/);
    expect(block()).not.toHaveTextContent(/9:00\s*AM/);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100 + HOUR_ROW_HEIGHT });
  });

  it('shows the proposed END while resizing, keeping the start', () => {
    const { container } = renderDay({ onEventResize: vi.fn() });
    fireEvent.pointerDown(resizeHandle(container), {
      pointerId: 1,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 100, clientY: 100 + HOUR_ROW_HEIGHT });
    expect(block()).toHaveTextContent(/9:00\s*AM/);
    expect(block()).toHaveTextContent(/11:00\s*AM/);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100 + HOUR_ROW_HEIGHT });
  });

  it('names the event in every announcement', async () => {
    const user = userEvent.setup();
    renderDay({ onEventMove: vi.fn() });
    block().focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    // A bare time says nothing about WHICH of a week's blocks moved.
    expect(screen.getByRole('status')).toHaveTextContent(/Standup/);
  });

  it('does not start a keyboard nudge while a pointer drag owns the grid', async () => {
    const user = userEvent.setup();
    const onEventMove = vi.fn();
    renderDay({ onEventMove });
    const el = block();
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 100, clientY: 148 });
    el.focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    // The nudge must not orphan the live gesture — otherwise the pointerup
    // below would no-op and leave the grid stuck in its dragging state.
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 148 });
    expect(onEventMove).toHaveBeenCalledTimes(1);
    // The single commit must carry the POINTER's drop, not the swallowed
    // nudge's — otherwise the real gesture was silently discarded.
    expect(onEventMove.mock.calls[0][1].startsAt).toEqual(new Date(2026, 4, 20, 10, 0));
    // And a fresh gesture still works afterwards.
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    expect(onEventMove).toHaveBeenCalledTimes(2);
  });
});

describe('Calendar drag — day-click interaction (issue #472)', () => {
  function columnOf(container: HTMLElement) {
    const cols = container.querySelectorAll<HTMLElement>(`.${hourGridStyles.dayColumn}`);
    return cols[cols.length - 1];
  }

  it('does not fire onDayClick when a drag ends over the column background', () => {
    const onDayClick = vi.fn();
    const { container } = renderDay({ onEventMove: vi.fn(), onDayClick });
    // The block drifts off the pointer, so the terminating click lands on the
    // column rather than on the block — which would otherwise read as "create
    // a booking in this slot" immediately after a reschedule.
    drag(block(), { dy: HOUR_ROW_HEIGHT });
    fireEvent.click(columnOf(container));
    expect(onDayClick).not.toHaveBeenCalled();
  });

  it('still fires onDayClick on a plain click of empty grid space', () => {
    const onDayClick = vi.fn();
    const { container } = renderDay({ onEventMove: vi.fn(), onDayClick });
    fireEvent.click(columnOf(container));
    expect(onDayClick).toHaveBeenCalledTimes(1);
  });

  it('a drag released outside the grid does not swallow the NEXT click', () => {
    const onDayClick = vi.fn();
    const { container } = renderDay({ onEventResize: vi.fn(), onDayClick });
    // Resize-only grid: pointerdown on the block starts no gesture, so the
    // stale-suppression flag has to be cleared by the press itself.
    drag(resizeHandle(container), { dy: HOUR_ROW_HEIGHT });
    fireEvent.pointerDown(columnOf(container), { pointerId: 9, button: 0, clientX: 1, clientY: 1 });
    fireEvent.click(columnOf(container));
    expect(onDayClick).toHaveBeenCalledTimes(1);
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
