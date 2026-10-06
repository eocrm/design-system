import { act, configure, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOOLTIP_DEFAULT_DELAY } from '../Tooltip/Tooltip';

// Installs Vitest fake timers for the enclosing describe and restores real ones
// after each test. @testing-library/react's asyncWrapper has a setTimeout(0)
// drain step that only knows how to advance Jest fake timers, so it is
// overridden to also advance Vitest's (else user-event/findBy deadlock).
// Shared test helper — not exported from the package root.
export function useFakeTimersWithUserEvent() {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    configure({
      asyncWrapper: async (cb) => {
        const result = await cb();
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
          vi.advanceTimersByTime(0);
        });
        return result;
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    configure({ asyncWrapper: async (cb) => cb() });
  });
}

export const setupUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

// Elapse the default tooltip delay, then return the open tooltip.
export function findTooltip() {
  act(() => {
    vi.advanceTimersByTime(TOOLTIP_DEFAULT_DELAY);
  });
  return screen.getByRole('tooltip');
}
