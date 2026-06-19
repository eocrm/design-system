// mdToHtml.ts — minimal Markdown → HTML-subset converter (INTERNAL). Emits only
// the tags fromHtml understands (h1-6, p, pre>code, blockquote, ul/ol/li, and
// inline strong/em/del/code/a), so fromMarkdown = fromHtml(mdToHtml(md)) reuses
// one mapping. CommonMark + GFM strikethrough subset. Never throws.

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const escapeHtml = (s: string): string => s.replace(/[&<>]/g, (c) => ESC[c]);

// Attribute context also needs the quotes escaped, or a `"` in a link URL would
// break out of the href and inject attributes. Scheme safety is NOT enforced
// here — fromHtml runs every href through safeHref (the single sanitizer).
const ATTR_ESC: Record<string, string> = { ...ESC, '"': '&quot;', "'": '&#39;' };
const escapeAttr = (s: string): string => s.replace(/["'&<>]/g, (c) => ATTR_ESC[c]);

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

/** Convert inline Markdown to HTML. Unbalanced markers degrade to literal text. */
function inline(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\' && i + 1 < src.length) {
      out += escapeHtml(src[i + 1]);
      i += 2;
      continue;
    }
    if (c === '`') {
      const end = src.indexOf('`', i + 1);
      if (end !== -1) {
        out += '<code>' + escapeHtml(src.slice(i + 1, end)) + '</code>';
        i = end + 1;
        continue;
      }
    }
    if (c === '!' && src[i + 1] === '[') {
      const m = /^!\[([^\]]*)\]\(([^)]*)\)/.exec(src.slice(i));
      if (m) {
        out += inline(m[1]); // image → its alt text (not a link, not an <img>)
        i += m[0].length;
        continue;
      }
    }
    if (c === '[') {
      const m = /^\[([^\]]*)\]\(([^)]*)\)/.exec(src.slice(i));
      if (m) {
        out += '<a href="' + escapeAttr(m[2].trim()) + '">' + inline(m[1]) + '</a>';
        i += m[0].length;
        continue;
      }
    }
    if ((c === '*' || c === '_') && src[i + 1] === c) {
      const marker = c + c;
      const end = src.indexOf(marker, i + 2);
      if (end !== -1) {
        out += '<strong>' + inline(src.slice(i + 2, end)) + '</strong>';
        i = end + 2;
        continue;
      }
    }
    if (c === '~' && src[i + 1] === '~') {
      const end = src.indexOf('~~', i + 2);
      if (end !== -1) {
        out += '<del>' + inline(src.slice(i + 2, end)) + '</del>';
        i = end + 2;
        continue;
      }
    }
    if (c === '*' || c === '_') {
      const end = src.indexOf(c, i + 1);
      if (end > i + 1) {
        out += '<em>' + inline(src.slice(i + 1, end)) + '</em>';
        i = end + 1;
        continue;
      }
    }
    out += escapeHtml(c);
    i += 1;
  }
  return out;
}

/** Parse one list starting at `lines[start]` whose marker indent is `indent`. */
function parseList(lines: string[], start: number, indent: number): [string, number] {
  const ordered = /\d/.test(LIST_RE.exec(lines[start])![2]);
  const tag = ordered ? 'ol' : 'ul';
  let i = start;
  let html = `<${tag}>`;
  while (i < lines.length) {
    const m = LIST_RE.exec(lines[i]);
    if (!m || m[1].length < indent) break;
    if (m[1].length > indent) break; // deeper line handled as nested below
    let item = '<li>' + inline(m[3].trim());
    i += 1;
    while (i < lines.length) {
      const deeper = LIST_RE.exec(lines[i]);
      if (deeper && deeper[1].length > indent) {
        const [nested, consumed] = parseList(lines, i, deeper[1].length);
        item += nested;
        i = consumed;
      } else break;
    }
    item += '</li>';
    html += item;
  }
  return [html + `</${tag}>`, i];
}

/** Convert a Markdown string to the HTML subset fromHtml understands. */
export function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    const fence = /^(```|~~~)/.exec(line);
    if (fence) {
      i += 1;
      const code: string[] = [];
      while (i < lines.length && !lines[i].startsWith(fence[1])) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // skip closing fence
      out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>` + inline(h[2].trim()) + `</h${level}>`);
      i += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push('<blockquote>' + mdToHtml(quote.join('\n')) + '</blockquote>');
      continue;
    }
    if (LIST_RE.test(line)) {
      const [html, consumed] = parseList(lines, i, LIST_RE.exec(line)![1].length);
      out.push(html);
      i = consumed;
      continue;
    }
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(```|~~~)/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !LIST_RE.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i += 1;
    }
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return out.join('');
}
