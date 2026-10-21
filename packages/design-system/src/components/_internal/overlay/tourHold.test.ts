// @vitest-environment jsdom
import { TOUR_CURRENT_TARGET, isTourHeld } from './tourHold';

function el(parent: Element = document.body, attrs: Record<string, string> = {}) {
  const node = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent.appendChild(node);
  return node;
}

describe('isTourHeld', () => {
  let tourButton: HTMLElement;
  let panel: HTMLElement;
  let trigger: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '';
    tourButton = el(el(document.body, { 'data-tour-portal-root': '' }));
    panel = el();
    trigger = el();
  });

  it('is true when the node is in the tour layer and the marked target is inside the panel', () => {
    el(panel, { [TOUR_CURRENT_TARGET]: '' });
    expect(isTourHeld(tourButton, panel, trigger)).toBe(true);
  });

  it('is true when the marked target is, or is inside, the trigger', () => {
    trigger.setAttribute(TOUR_CURRENT_TARGET, '');
    expect(isTourHeld(tourButton, panel, trigger)).toBe(true);
    trigger.removeAttribute(TOUR_CURRENT_TARGET);
    el(trigger, { [TOUR_CURRENT_TARGET]: '' });
    expect(isTourHeld(tourButton, panel, trigger)).toBe(true);
  });

  it('is false when the node is outside the tour layer', () => {
    el(panel, { [TOUR_CURRENT_TARGET]: '' });
    expect(isTourHeld(el(), panel, trigger)).toBe(false);
    expect(isTourHeld(null, panel, trigger)).toBe(false);
  });

  it('is false when no target is marked', () => {
    expect(isTourHeld(tourButton, panel, trigger)).toBe(false);
  });

  it('is false when the marked target is elsewhere', () => {
    el(document.body, { [TOUR_CURRENT_TARGET]: '' });
    expect(isTourHeld(tourButton, panel, trigger)).toBe(false);
  });
});
