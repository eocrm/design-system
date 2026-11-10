// ponytail: callers read once per plot element; a theme that changes these tokens at runtime needs a remount.
/**
 * Reads a length custom property of `el` in px. `px` and `rem` are understood; anything else
 * (calc(), em, unset, negative) gives `fallback`. Shared by the charts' token-driven geometry (DS-60).
 */
export function readPx(el: Element | null, name: string, fallback: number): number {
  if (!el) return fallback;
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const unit = raw.endsWith('rem')
    ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    : raw.endsWith('px')
      ? 1
      : NaN;
  const v = parseFloat(raw) * unit;
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}
