/**
 * Picks the heading the scroll-spy should highlight.
 * `top` is viewport-relative (`getBoundingClientRect().top`); `line` is the
 * viewport y that counts as "reached". Headings are in document order.
 */
export function pickActiveSection(
  headings: readonly { id: string; top: number }[],
  line: number,
  atBottom: boolean,
): string | undefined {
  if (headings.length === 0) return undefined;
  if (atBottom) return headings[headings.length - 1].id;
  let active = headings[0].id;
  for (const heading of headings) {
    if (heading.top <= line) active = heading.id;
  }
  return active;
}
