import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { Calendar } from './Calendar';
import { resolveEventColor } from './eventColor';
import type { CalendarEvent } from './types';

function wrap(children: ReactNode) {
  return render(<LocaleProvider locale="en-US">{children}</LocaleProvider>);
}

const AT = new Date(2026, 4, 15, 10, 0);

function event(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return { id: 'e1', title: 'Consultation', startsAt: AT, ...over };
}

/** Reads a stylesheet with comments stripped, so prose can't satisfy a match. */
function scssOf(name: string): string {
  return readFileSync(resolve(__dirname, `${name}.module.scss`), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

/**
 * The two axes are the point of this feature, so these pin the RULE rather than
 * only its rendering: `color` takes the surface and a non-neutral `tone` moves
 * to a band, so neither silently overrides the other.
 */
describe('resolveEventColor', () => {
  it('keeps the tone class and adds nothing when the event has no color', () => {
    // The no-color path must stay byte-identical to `main` — this is what makes
    // the feature additive for every existing consumer.
    expect(resolveEventColor(event({ tone: 'danger' }))).toEqual({
      toneClass: 'danger',
      hasStripe: false,
      style: undefined,
    });
  });

  it('defaults a color-less event to the neutral tone', () => {
    expect(resolveEventColor(event()).toneClass).toBe('neutral');
  });

  it('hands the surface to color and drops the tone class', () => {
    const { toneClass, hasStripe, style } = resolveEventColor(event({ color: 'violet' }));
    expect(toneClass).toBeUndefined();
    expect(hasStripe).toBe(false);
    expect(style).toMatchObject({
      '--calendar-event-color-bg': 'var(--color-palette-violet-bg)',
      '--calendar-event-color-fg': 'var(--color-palette-violet-fg)',
    });
  });

  it('shows BOTH axes when color and a non-neutral tone are set', () => {
    // The case the issue was filed for: a category-coloured event that is also
    // in a state which must not be missed. Neither may silently win.
    const { toneClass, hasStripe, style } = resolveEventColor(
      event({ color: 'violet', tone: 'danger' }),
    );
    expect(toneClass).toBeUndefined();
    expect(hasStripe).toBe(true);
    expect(style).toMatchObject({
      '--calendar-event-color-bg': 'var(--color-palette-violet-bg)',
      '--calendar-event-stripe-color': 'var(--calendar-event-stripe-danger)',
    });
  });

  it('draws no band for an explicit neutral tone', () => {
    // `neutral` IS the default — it carries no state worth a band, so a
    // category-coloured event with no real state stays a single clean colour.
    const r = resolveEventColor(event({ color: 'violet', tone: 'neutral' }));
    expect(r.hasStripe).toBe(false);
    expect(r.style).not.toHaveProperty('--calendar-event-stripe-color');
  });

  it('resolves every non-neutral tone from the one shared stripe scale', () => {
    for (const tone of ['accent', 'success', 'warning', 'danger'] as const) {
      expect(resolveEventColor(event({ color: 'teal', tone })).style).toMatchObject({
        '--calendar-event-stripe-color': `var(--calendar-event-stripe-${tone})`,
      });
    }
  });
});

describe('CalendarEvent.color across the views', () => {
  it.each(['month', 'week', 'day', 'agenda'] as const)(
    'paints a colored event and keeps its tone band in %s view',
    (view) => {
      wrap(
        <Calendar value={AT} view={view} events={[event({ color: 'violet', tone: 'danger' })]} />,
      );
      const el = screen.getAllByRole('button', { name: /Consultation/i })[0];
      expect(el.className).toMatch(/colored/);
      expect(el.className).toMatch(/striped/);
      expect(el.getAttribute('style')).toContain('--color-palette-violet-bg');
    },
  );

  it.each(['month', 'week', 'day', 'agenda'] as const)(
    'leaves a color-less event on its tone class in %s view',
    (view) => {
      wrap(<Calendar value={AT} view={view} events={[event({ tone: 'danger' })]} />);
      const el = screen.getAllByRole('button', { name: /Consultation/i })[0];
      expect(el.className).toMatch(/danger/);
      expect(el.className).not.toMatch(/colored/);
      expect(el.className).not.toMatch(/striped/);
      expect(el.getAttribute('style') ?? '').not.toContain('--calendar-event-color-bg');
    },
  );

  it('drops the tone class once color takes the surface', () => {
    wrap(
      <Calendar value={AT} view="month" events={[event({ color: 'violet', tone: 'danger' })]} />,
    );
    const el = screen.getAllByRole('button', { name: /Consultation/i })[0];
    // Load-bearing: `.colored` (0,1,0) would LOSE to `.allDay.<tone>` (0,2,0).
    // It only wins because no tone class is emitted at all once color is set.
    expect(el.className).not.toMatch(/danger/);
  });

  it('colors an all-day chip and keeps its band', () => {
    wrap(
      <Calendar
        value={AT}
        view="month"
        events={[event({ allDay: true, color: 'violet', tone: 'danger' })]}
      />,
    );
    const el = screen.getAllByRole('button', { name: /Consultation/i })[0];
    expect(el.className).toMatch(/allDay/);
    expect(el.className).toMatch(/colored/);
    expect(el.className).toMatch(/striped/);
    expect(el.className).not.toMatch(/danger/);
  });

  it('keeps the band on a multi-day bar that continues from a previous week', () => {
    // The band marks state, not the start, so it repeats on every segment —
    // including continuation edges. Documented on the prop; pinned here.
    wrap(
      <Calendar
        value={new Date(2026, 4, 20)}
        view="month"
        events={[
          event({
            startsAt: new Date(2026, 4, 11),
            endsAt: new Date(2026, 4, 22),
            color: 'violet',
            tone: 'danger',
          }),
        ]}
      />,
    );
    const bars = screen.getAllByRole('button', { name: /Consultation/i });
    expect(bars.length).toBeGreaterThan(1);
    for (const bar of bars) {
      expect(bar.className).toMatch(/colored/);
      expect(bar.className).toMatch(/striped/);
    }
  });
});

/**
 * jsdom computes no cascade, so the stylesheets are the only thing that can be
 * asserted here. Each of these pins a bug review actually found — every one
 * shipped in a first draft and rendered wrong in a real browser.
 */
describe('stripe stylesheet invariants', () => {
  it('paints the band with background-image, not box-shadow', () => {
    // box-shadow is NOT additive, and three rules on these elements already own
    // it: `:focus-visible` (the focus ring), `.dragging` (the lift shadow), and
    // the band. Using it here made the focus ring erase the band — and on the
    // agenda row, which has no border to fall back on, keyboard focus wiped the
    // state signal outright.
    for (const file of ['EventChip', 'TimedEvent', 'AgendaView']) {
      const striped = scssOf(file).match(/\.striped\s*\{[^}]*\}/)?.[0];
      expect(striped, `${file} has a .striped rule`).toBeDefined();
      expect(striped).toMatch(/background-image:\s*linear-gradient/);
      expect(striped, `${file} .striped must not use box-shadow`).not.toMatch(/box-shadow/);
    }
  });

  it('fills with the background-color longhand so the band cannot be reset', () => {
    // The `background` shorthand resets background-image, which would make the
    // band depend on source order between `.colored` and `.striped`.
    for (const file of ['EventChip', 'TimedEvent']) {
      const colored = scssOf(file).match(/\.colored\s*\{[^}]*\}/)?.[0];
      expect(colored).toMatch(/background-color:/);
      expect(colored).not.toMatch(/^\s*background:/m);
    }
  });

  it('uses background-color in the agenda hover so the band survives it', () => {
    // `.rowButton:hover:not(:disabled)` is (0,3,0); the shorthand there reset
    // background-image and erased the band (0,1,0) on hover, with no border on
    // `.rowButton` to leave even a sliver behind.
    const hover = scssOf('AgendaView').match(/&:hover:not\(:disabled\)\s*\{[^}]*\}/)?.[0];
    expect(hover).toBeDefined();
    expect(hover).toMatch(/background-color:/);
    expect(hover).not.toMatch(/^\s*background:/m);
  });

  it('never paints the warning band with --color-warning', () => {
    // #ff991f measures 1.52–2.01:1 against all 30 palette backgrounds in light
    // theme — below the 3:1 WCAG 1.4.11 bar for a graphical object, so a 3px
    // band in it is unreadable on a tint. --color-warning-strong clears 3:1
    // against all 30 (min 4.25).
    const tokens = readFileSync(resolve(__dirname, 'Calendar.tokens.scss'), 'utf8');
    const warning = tokens.match(/--calendar-event-stripe-warning:\s*([^;]+);/)?.[1];
    expect(warning).toBe('var(--color-warning-strong)');
  });
});
