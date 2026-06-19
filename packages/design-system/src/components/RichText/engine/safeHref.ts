// safeHref.ts — the canonical, render-independent URL allowlist shared by the
// renderer (renderDoc) and the HTML importer (fromHtml). It is the SOLE scheme
// gate for hrefs that enter the model from untrusted input, so it must normalize
// URLs the way browsers do before resolving a scheme. Allows relative URLs + a
// small scheme allowlist; blocks javascript:/data:/protocol-relative.
export function safeHref(href: string): string | undefined {
  // Browsers strip ASCII tab/LF/CR from anywhere in a URL, and drop leading C0
  // controls + spaces, before resolving the scheme — so `java\tscript:` and
  // `\x01javascript:` would both navigate as javascript:. Normalize the same way
  // so the scheme allowlist below can't be smuggled past with embedded or leading
  // control characters.
  const trimmed = href.replace(/[\t\n\r]/g, '').replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, '');
  if (trimmed === '') return undefined;
  // Block protocol-relative URLs (`//host`) — they navigate cross-origin and
  // would otherwise slip through the "relative" branch below.
  if (trimmed.startsWith('//')) return undefined;
  // Has an explicit scheme? Only http(s)/mailto/tel are allowed.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return /^(https?:|mailto:|tel:)/i.test(trimmed) ? trimmed : undefined;
  }
  return trimmed; // relative (/, ./, #, ?, plain path) — safe
}
