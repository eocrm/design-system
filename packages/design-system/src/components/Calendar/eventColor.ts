import type { CSSProperties } from 'react';
import { paletteTokens } from '../../palette';
import type { CalendarEvent, CalendarEventTone } from './types';

/**
 * Internal: resolves a `CalendarEvent`'s two colour axes into the CSS custom
 * properties the chip / block / agenda-row stylesheets read.
 *
 * The axes are deliberately NOT in competition, so there is no precedence rule
 * to remember:
 * - `color` (category identity) paints the surface — the palette's tinted `bg`
 *   with its saturated `fg` for text and border.
 * - `tone` (semantic state) moves to a stripe on the leading edge, and is only
 *   drawn when it is something other than the `'neutral'` default. A state that
 *   must not be missed therefore survives being given a category colour.
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

/**
 * @param event - the event being rendered.
 * @param toneVar - the surface's own per-tone custom-property prefix, to which
 * the resolved tone name is appended (e.g. `'--calendar-event-chip-fg-'` +
 * `'danger'`). Each surface has its own tone palette — the agenda's tone
 * colours are not the chip's — so the stripe has to read the caller's.
 */
export function resolveEventColor(
  event: CalendarEvent,
  toneVar: `--calendar-${string}-`,
): ResolvedEventColor {
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
      ...(hasStripe ? { '--calendar-event-stripe-color': `var(${toneVar}${tone})` } : null),
    } as CSSProperties,
  };
}
