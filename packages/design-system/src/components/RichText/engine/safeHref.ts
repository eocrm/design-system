// safeHref.ts — URL allowlist shared by the renderer (renderDoc) and the HTML
// importer (fromHtml). Allows relative URLs + a small scheme allowlist; blocks
// javascript:/data:/protocol-relative so a hostile href never reaches output.
export function safeHref(href: string): string | undefined {
  const trimmed = href.trim();
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
