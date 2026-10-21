import { onTestFinished } from 'vitest';
import { TOUR_CURRENT_TARGET } from './tourHold';

/** A stand-in Tour layer (`[data-tour-portal-root]`) holding one button; removed after the test. */
export function addTourLayer(): HTMLButtonElement {
  const root = document.createElement('div');
  root.setAttribute('data-tour-portal-root', '');
  const button = document.createElement('button');
  button.type = 'button';
  root.appendChild(button);
  document.body.appendChild(root);
  onTestFinished(() => root.remove());
  return button;
}

/** Moves the tour's current-target marker to `el` (what Tour does on a step change). */
export function markTourTarget(el: Element): void {
  document
    .querySelectorAll(`[${TOUR_CURRENT_TARGET}]`)
    .forEach((n) => n.removeAttribute(TOUR_CURRENT_TARGET));
  el.setAttribute(TOUR_CURRENT_TARGET, '');
}
