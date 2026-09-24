/** Focus is "lost" when nothing live holds it: `<body>`, nothing, or a detached node. */
export function isFocusLost(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || !active.isConnected;
}

/**
 * Focus `el` on overlay close, retrying once in a microtask if the first
 * `focus()` did not take. A lower overlay in `stackMode="replace"` is still
 * `display: none` when the upper one closes — its `isTop` update renders just
 * after that commit — so focusing an element inside it no-ops (#551). The
 * retry only runs if focus is still lost by then, so it never steals focus
 * from wherever something else put it.
 */
export function restoreFocusTo(el: HTMLElement): void {
  el.focus({ preventScroll: true });
  if (document.activeElement === el) return;
  queueMicrotask(() => {
    if (el.isConnected && isFocusLost()) el.focus({ preventScroll: true });
  });
}
