// escape.ts — HTML text/attribute escapers shared by the Markdown converter
// (mdToHtml) and the HTML serializer (toHtml).
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
/** Escape text content: `&`, `<`, `>`. */
export const escapeHtml = (s: string): string => s.replace(/[&<>]/g, (c) => ESC[c]);

// Attribute context also needs the quotes escaped (a `"` in a URL would break out
// of the href). Scheme safety is handled separately by safeHref.
const ATTR_ESC: Record<string, string> = { ...ESC, '"': '&quot;', "'": '&#39;' };
/** Escape an attribute value: text escapes plus quotes. */
export const escapeAttr = (s: string): string => s.replace(/["'&<>]/g, (c) => ATTR_ESC[c]);
