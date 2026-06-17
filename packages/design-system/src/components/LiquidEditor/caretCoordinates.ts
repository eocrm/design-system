// caretCoordinates.ts — pixel position of a caret index within a <textarea>,
// relative to the textarea's own padding box. Used to anchor the autocomplete
// menu at the caret. Based on the textarea-caret-position mirror technique.

export interface CaretCoordinates {
  /** Offset from the textarea's top padding edge, in px. */
  top: number;
  /** Offset from the textarea's left padding edge, in px. */
  left: number;
  /** Line height at the caret, in px (menu offsets below by this). */
  height: number;
}

// Style properties copied from the textarea onto the mirror so wrapping +
// metrics match.
const MIRRORED_PROPS = [
  'boxSizing',
  'width',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
  'wordWrap',
] as const;

export function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number,
): CaretCoordinates {
  const doc = textarea.ownerDocument;
  const win = doc.defaultView ?? window;
  const style = win.getComputedStyle(textarea);

  const mirror = doc.createElement('div');
  mirror.setAttribute('aria-hidden', 'true');
  const s = mirror.style;
  s.position = 'absolute';
  s.visibility = 'hidden';
  s.whiteSpace = 'pre-wrap';
  s.wordWrap = 'break-word';
  s.top = '0';
  s.left = '-9999px';
  s.overflow = 'hidden';

  for (const prop of MIRRORED_PROPS) {
    const value = style[prop as keyof CSSStyleDeclaration] as string;
    if (value) s.setProperty(toKebab(prop), value);
  }
  // Force wrapping on the same width as the textarea content box.
  s.width = `${textarea.clientWidth}px`;

  mirror.textContent = textarea.value.slice(0, position);
  const marker = doc.createElement('span');
  // A non-empty marker so it has a measurable box even at the very end.
  marker.textContent = textarea.value.slice(position) || '.';
  mirror.appendChild(marker);

  doc.body.appendChild(mirror);

  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) || 0;
  const coords: CaretCoordinates = {
    top: marker.offsetTop - textarea.scrollTop,
    left: marker.offsetLeft - textarea.scrollLeft,
    height: Number.isFinite(lineHeight) ? lineHeight : 0,
  };

  mirror.remove();

  // jsdom may yield NaN offsets — normalize so callers never get NaN.
  if (!Number.isFinite(coords.top)) coords.top = 0;
  if (!Number.isFinite(coords.left)) coords.left = 0;
  return coords;
}

function toKebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
