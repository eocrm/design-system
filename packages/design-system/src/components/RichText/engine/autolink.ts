// autolink.ts — pure URL detection for the editor's autolink (type + paste) and
// the RichText importer. No DOM. hrefs pass through safeHref so only safe schemes
// become links.
import type { Inline } from './model';
import { safeHref } from './safeHref';

// http(s)://… or a bare www.… host. Kept deliberately conservative.
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>()[\]]+/gi;
// Strip trailing sentence punctuation that is unlikely to be part of the URL.
const TRAILING = /[.,;:!?'"]+$/;

function normalize(raw: string): { url: string; href: string } | null {
  let url = raw.replace(TRAILING, '');
  // Drop an unmatched closing bracket/paren (e.g. "(https://a.com)").
  if (/[)\]]$/.test(url) && !/[([]/.test(url)) url = url.slice(0, -1);
  if (url === '') return null;
  const candidate = url.startsWith('www.') ? `https://${url}` : url;
  const safe = safeHref(candidate);
  if (!safe || !/^https?:/i.test(safe)) return null;
  return { url, href: safe };
}

/** The URL that ends exactly at the end of `text`, or null. (For the type rule:
 *  the caller passes the text up to the caret.) */
export function findUrl(text: string): { start: number; end: number; href: string } | null {
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  let last: { start: number; end: number; href: string; rawEnd: number } | null = null;
  while ((m = URL_RE.exec(text)) !== null) {
    const norm = normalize(m[0]);
    if (!norm) continue;
    const start = m.index;
    const end = start + norm.url.length;
    // `rawEnd` is where the raw match ended (incl. stripped trailing punctuation /
    // brackets), so a URL at the caret followed only by punctuation still counts.
    const rawEnd = start + m[0].length;
    last = { start, end, href: norm.href, rawEnd };
  }
  // Only return when the matched URL reaches the end of `text` — allowing for
  // trailing punctuation/brackets that `normalize` stripped from `end` and for a
  // closing bracket/paren the regex itself excluded (e.g. `(https://a.com)`).
  if (!last) return null;
  const tail = text.slice(last.rawEnd);
  if (!/^[.,;:!?'")\]]*$/.test(tail)) return null;
  return { start: last.start, end: last.end, href: last.href };
}

/** Split `text` into plain + link runs (for paste / import). */
export function linkifyRuns(text: string): Inline[] {
  const runs: Inline[] = [];
  let i = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    const norm = normalize(m[0]);
    if (!norm) continue;
    const start = m.index;
    if (start > i) runs.push({ text: text.slice(i, start), marks: [] });
    runs.push({ text: norm.url, marks: [{ type: 'link', href: norm.href }] });
    i = start + norm.url.length;
  }
  if (i < text.length) runs.push({ text: text.slice(i), marks: [] });
  return runs.length ? runs : [{ text, marks: [] }];
}
