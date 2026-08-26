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

/**
 * The two axes are the whole point of this feature, so the unit tests pin the
 * rule itself rather than only its rendering: `color` takes the surface and a
 * non-neutral `tone` moves to a stripe, so neither overrides the other.
 */
describe('resolveEventColor', () => {
  const PREFIX = '--calendar-event-chip-fg-';

  it('keeps the tone class and adds nothing when the event has no color', () => {
    // The no-color path must stay byte-identical to pre-0.3.58 behaviour —
    // this is what makes the feature additive for every existing consumer.
    expect(resolveEventColor(event({ tone: 'danger' }), PREFIX)).toEqual({
      toneClass: 'danger',
      hasStripe: false,
      style: undefined,
    });
  });

  it('defaults a color-less event to the neutral tone', () => {
    expect(resolveEventColor(event(), PREFIX).toneClass).toBe('neutral');
  });

  it('hands the surface to color and drops the tone class', () => {
    const { toneClass, hasStripe, style } = resolveEventColor(event({ color: 'violet' }), PREFIX);
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
      PREFIX,
    );
    expect(toneClass).toBeUndefined();
    expect(hasStripe).toBe(true);
    expect(style).toMatchObject({
      '--calendar-event-color-bg': 'var(--color-palette-violet-bg)',
      '--calendar-event-stripe-color': `var(${PREFIX}danger)`,
    });
  });

  it('draws no stripe for an explicit neutral tone', () => {
    // `neutral` IS the default — it carries no state worth a stripe, so a
    // category-coloured event with no real state stays a single clean colour.
    const r = resolveEventColor(event({ color: 'violet', tone: 'neutral' }), PREFIX);
    expect(r.hasStripe).toBe(false);
    expect(r.style).not.toHaveProperty('--calendar-event-stripe-color');
  });

  it('reads the stripe color from the caller’s own tone palette', () => {
    // Each surface has different tone values — the agenda's are not the chip's —
    // so the prefix must be honoured rather than hard-coded.
    const r = resolveEventColor(
      event({ color: 'teal', tone: 'warning' }),
      '--calendar-agenda-tone-',
    );
    expect(r.style).toMatchObject({
      '--calendar-event-stripe-color': 'var(--calendar-agenda-tone-warning)',
    });
  });
});

describe('CalendarEvent.color across the views', () => {
  it.each(['month', 'week', 'day', 'agenda'] as const)(
    'paints a colored event and keeps its tone stripe in %s view',
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
    // Guards the precedence rule at the DOM level: if both the tone class and
    // .colored applied, source order would decide the fill and the rule would
    // be silently different per stylesheet.
    expect(el.className).not.toMatch(/danger/);
  });
});
