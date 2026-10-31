/**
 * Whether a scroll container is at (within `threshold` px of) its bottom.
 * Content shorter than the viewport counts as at the bottom.
 */
export function isAtBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  threshold = 24,
): boolean {
  return scrollHeight - clientHeight - scrollTop <= threshold;
}
