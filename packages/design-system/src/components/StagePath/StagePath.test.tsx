import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { act, configure, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOOLTIP_DEFAULT_DELAY } from '../Tooltip/Tooltip';
import { StagePath, type StagePathStage } from './StagePath';

// Tooltip opens after a fixed delay: run it on fake timers (same recipe as
// Tooltip.test.tsx) instead of sleeping. RTL's asyncWrapper only drains Jest
// fake timers, so override it to also advance Vitest's.
function useFakeTooltipTimers() {
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

const setupUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

// Elapse the tooltip delay, then return the open tooltip.
function findTooltip() {
  act(() => {
    vi.advanceTimersByTime(TOOLTIP_DEFAULT_DELAY);
  });
  return screen.getByRole('tooltip');
}

const STAGES: StagePathStage[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
];

function fakeClip(el: HTMLElement, clipped: boolean) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: 100 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: clipped ? 300 : 100 });
}

describe('<StagePath>', () => {
  useFakeTooltipTimers();
  it('renders an ordered list with one item per stage', () => {
    render(<StagePath aria-label="Deal stage" stages={STAGES} value="proposal" />);
    const list = screen.getByRole('list', { name: 'Deal stage' });
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  });

  it('derives done / current / upcoming from value', () => {
    render(<StagePath stages={STAGES} value="proposal" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-state', 'done');
    expect(items[1]).toHaveAttribute('data-state', 'done');
    expect(items[2]).toHaveAttribute('data-state', 'current');
    expect(items[3]).toHaveAttribute('data-state', 'upcoming');
    const current = document.querySelectorAll('[aria-current]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('aria-current', 'step');
    expect(items[2].firstElementChild).toBe(current[0]);
  });

  it('aria-current sits on the element focus returns to after a keyboard move', () => {
    render(<StagePath stages={STAGES} value="proposal" onValueChange={() => {}} />);
    const target = screen.getAllByRole('listitem')[2].querySelector('span[tabindex="-1"]');
    expect(target).toHaveAttribute('aria-current', 'step');
  });

  it('the current stage gets its own focus ring (a fg band between two fill bands)', () => {
    // jsdom computes no clip-path or ::before / ::after, so pin the structure
    // the CSS keys on and the rule itself: the current stage's fill IS the ring
    // colour, so its focus band must be the fg, not --sp-ring.
    render(<StagePath stages={STAGES} value="proposal" onValueChange={() => {}} />);
    const item = screen.getAllByRole('listitem')[2];
    expect(item.className).toMatch(/current/);
    expect(item.querySelector('[tabindex="-1"]')?.className).toMatch(/target/);
    const scss = readFileSync(resolve(__dirname, 'StagePath.module.scss'), 'utf8');
    const rule = (sel: string) =>
      new RegExp(`(?<!,)\\n${sel.replace(/[.:()]/g, '\\$&')} \\{([^}]*)\\}`).exec(scss)?.[1] ?? '';
    expect(rule('.current .target:focus-visible')).toMatch(/background: var\(--sp-bg\)/);
    expect(rule('.current .target:focus-visible::before')).toMatch(/background: var\(--sp-fg\)/);
    expect(rule('.current .target:focus-visible::after')).toMatch(/clip-path: var\(--sp-inner-2\)/);
  });

  it('mirrors every chevron shape for RTL via [dir] attributes, not :dir()', () => {
    // jsdom computes no clip-path; pin that each shape has its RTL rule, keyed
    // on the dir attribute (production minifiers rewrite :dir() into :lang()).
    const scss = readFileSync(resolve(__dirname, 'StagePath.module.scss'), 'utf8');
    const esc = (x: string) => x.replace(/[.:()$#{}[\]]/g, '\\$&');
    const shapes = {
      '.target': 'middle',
      '.stage:first-child .target': 'first',
      '.stage:last-child .target': 'last',
    };
    for (const [sel, shape] of Object.entries(shapes)) {
      expect(scss).toMatch(
        new RegExp(`${esc(`#{$rtl} ${sel}`)} \\{\\s*@include shape\\(${shape}, true\\);`),
      );
      expect(scss).toMatch(
        new RegExp(`${esc(`#{$ltr-in-rtl} ${sel}`)} \\{\\s*@include shape\\(${shape}\\);`),
      );
    }
    expect(scss).toContain(`$rtl: ':is([dir="rtl"] .path, .path[dir="rtl"])';`);
    expect(scss).toContain(
      `$ltr-in-rtl: ':is([dir="rtl"] [dir="ltr"] .path, [dir="rtl"] .path[dir="ltr"])';`,
    );
  });

  it('speaks done and upcoming state as hidden text, not colour alone', () => {
    render(<StagePath stages={STAGES} value="proposal" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Lead, completed');
    expect(items[2]).toHaveTextContent(/^Proposal$/);
    expect(items[3]).toHaveTextContent('Negotiation, upcoming');
  });

  it.each(['default', 'success', 'danger'] as const)('tone="%s" sets data-tone', (tone) => {
    render(<StagePath stages={STAGES} value="lead" tone={tone} />);
    expect(screen.getByRole('list')).toHaveAttribute('data-tone', tone);
  });

  it('defaults tone to "default"', () => {
    render(<StagePath stages={STAGES} value="lead" />);
    expect(screen.getByRole('list')).toHaveAttribute('data-tone', 'default');
  });

  it('is read-only without onValueChange: no buttons', () => {
    render(<StagePath stages={STAGES} value="proposal" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('with onValueChange, every non-current stage is a button that reports its id', async () => {
    const user = setupUser();
    const onValueChange = vi.fn();
    render(<StagePath stages={STAGES} value="proposal" onValueChange={onValueChange} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Proposal/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Lead, completed' }));
    expect(onValueChange).toHaveBeenLastCalledWith('lead');
    screen.getByRole('button', { name: 'Negotiation, upcoming' }).focus();
    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('negotiation');
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });

  it('keeps keyboard focus in the list when the activated stage becomes current', async () => {
    const user = setupUser();
    const { rerender } = render(
      <StagePath stages={STAGES} value="proposal" onValueChange={() => {}} />,
    );
    screen.getByRole('button', { name: 'Negotiation, upcoming' }).focus();
    await user.keyboard('{Enter}');
    rerender(<StagePath stages={STAGES} value="negotiation" onValueChange={() => {}} />);
    const current = screen.getAllByRole('listitem')[3].querySelector('span[tabindex="-1"]');
    expect(current).not.toBeNull();
    expect(document.activeElement).toBe(current);
  });

  it('does not steal focus from outside the list when value changes', async () => {
    const { rerender } = render(
      <>
        <button type="button">Won</button>
        <StagePath stages={STAGES} value="proposal" onValueChange={() => {}} />
      </>,
    );
    const won = screen.getByRole('button', { name: 'Won' });
    won.focus();
    rerender(
      <>
        <button type="button">Won</button>
        <StagePath stages={STAGES} value="negotiation" onValueChange={() => {}} />
      </>,
    );
    expect(document.activeElement).toBe(won);
  });

  it('the current stage is a tabIndex=-1 span, not a button (never a Tab stop)', () => {
    render(<StagePath stages={STAGES} value="proposal" onValueChange={() => {}} />);
    const items = screen.getAllByRole('listitem');
    expect(within(items[2]).queryByRole('button')).toBeNull();
    const span = items[2].querySelector('span[tabindex]');
    expect(span?.tagName).toBe('SPAN');
    expect(span).toHaveAttribute('tabindex', '-1');
  });

  it('stage buttons are type="button" (never submit an enclosing form)', () => {
    render(<StagePath stages={STAGES} value="lead" onValueChange={() => {}} />);
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAttribute('type', 'button');
  });

  it('unknown value: every stage upcoming, warns once per value, does not throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(<StagePath stages={STAGES} value="lead" />);
    expect(warn).not.toHaveBeenCalled();
    rerender(<StagePath stages={STAGES} value="ghost" />);
    rerender(<StagePath stages={STAGES} value="ghost" />);
    for (const li of screen.getAllByRole('listitem'))
      expect(li).toHaveAttribute('data-state', 'upcoming');
    expect(document.querySelector('[aria-current]')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('ghost');
    warn.mockRestore();
  });

  it('forwards ref to the <ol> and merges className', () => {
    const ref = createRef<HTMLOListElement>();
    render(<StagePath ref={ref} className="mine" stages={STAGES} value="lead" />);
    expect(ref.current?.tagName).toBe('OL');
    expect(ref.current).toHaveClass('mine');
    expect(ref.current?.className.split(' ').length).toBeGreaterThan(1);
  });

  it('shows the full label in a tooltip when it is clipped, and not otherwise', async () => {
    const user = setupUser();
    render(<StagePath stages={STAGES} value="lead" />);
    const label = screen.getByText('Negotiation');
    fakeClip(label, false);
    await user.hover(label);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await user.unhover(label);
    fakeClip(label, true);
    await user.hover(label);
    expect(findTooltip()).toHaveTextContent('Negotiation');
  });

  it('clipped ReactNode label tooltips as plain text', async () => {
    const user = setupUser();
    render(<StagePath stages={[{ id: 'a', label: <b>Bold stage</b> }]} value="a" />);
    const label = screen.getByText('Bold stage').parentElement!;
    fakeClip(label, true);
    await user.hover(label);
    const tip = findTooltip();
    expect(tip).toHaveTextContent('Bold stage');
    expect(tip.querySelector('b')).toBeNull();
  });

  describe('keyboard focus', () => {
    // Mirrors EntityChip / Tooltip tests: jsdom's :focus-visible heuristic is
    // unreliable after earlier tests, so stub it.
    let originalMatches: typeof Element.prototype.matches;
    beforeEach(() => {
      originalMatches = Element.prototype.matches;
      Element.prototype.matches = function (this: Element, selector: string) {
        if (selector === ':focus-visible') return true;
        return originalMatches.call(this, selector);
      } as typeof Element.prototype.matches;
    });
    afterEach(() => {
      Element.prototype.matches = originalMatches;
    });

    it('tabbing onto a clipped stage button opens its tooltip', async () => {
      const user = setupUser();
      render(<StagePath stages={STAGES} value="proposal" onValueChange={() => {}} />);
      fakeClip(screen.getByText('Lead'), true);
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Lead, completed' }));
      expect(findTooltip()).toHaveTextContent('Lead');
    });
  });
});
