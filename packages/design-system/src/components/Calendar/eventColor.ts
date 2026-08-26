import type { CSSProperties } from 'react';
import { paletteTokens } from '../../palette';
import type { CalendarEvent, CalendarEventTone } from './types';

/**
 * Internal: resolves a `CalendarEvent`'s two colour axes into the CSS custom
 * properties the chip / block / agenda-row stylesheets read.
 *
 * The axes are deliberately NOT in competition, so there is no precedence rule
 * to remember:
 * - `color` (category identity) wins the surface. This helper only hands out
 *   the palette's `bg`/`fg` pair; each stylesheet decides how to spend them,
 *   and they do NOT spend them alike — the chip and the timed block take a
 *   tinted background with the saturated colour for text and border, while the
 *   agenda row is never filled and spends `fg` on its leading dot alone.
 * - `tone` (semantic state) moves to a band on the left edge, drawn only when
 *   it is something other than the `'neutral'` default. A state therefore
 *   survives being given a category colour instead of being overridden by it.
 *
 * With no `color` the event keeps its original behaviour exactly: the tone
 * class paints the whole surface and no stripe is drawn. That is what makes
 * this additive for every existing consumer.
 *
 * Lives in one place because three surfaces render events (`EventChip`,
 * `TimedEvent`, `AgendaView`) and a rule duplicated three ways drifts.
 */
export interface ResolvedEventColor {
  /** Tone class to apply, or `undefined` when `color` has taken the surface. */
  toneClass: CalendarEventTone | undefined;
  /** True when a leading-edge stripe should be drawn for the semantic tone. */
  hasStripe: boolean;
  /** Inline custom properties, or `undefined` when the event has no `color`. */
  style: CSSProperties | undefined;
}

/** @param event - the event being rendered. */
export function resolveEventColor(event: CalendarEvent): ResolvedEventColor {
  const tone: CalendarEventTone = event.tone ?? 'neutral';

  if (!event.color) {
    return { toneClass: tone, hasStripe: false, style: undefined };
  }

  const { bg, fg } = paletteTokens(event.color);
  // A neutral tone carries no state worth a stripe — it IS the default — so a
  // category-coloured event with no explicit state stays a clean single colour.
  const hasStripe = tone !== 'neutral';

  return {
    toneClass: undefined,
    hasStripe,
    style: {
      '--calendar-event-color-bg': bg,
      '--calendar-event-color-fg': fg,
      ...(hasStripe
        ? { '--calendar-event-stripe-color': `var(--calendar-event-stripe-${tone})` }
        : null),
    } as CSSProperties,
  };
}
