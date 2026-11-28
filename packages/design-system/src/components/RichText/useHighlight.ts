// useHighlight.ts — lazy syntax highlighting for RichText code blocks (DS-104).
// Prism (CodeBlock/highlight) is reached ONLY through the dynamic import below,
// so it lands in its own chunk; lazyHighlight.test.ts guards against a static import.
import { useEffect, useMemo, useState } from 'react';
import type { CodeToken } from '../CodeBlock/highlight';
import { CODE_LANGUAGE_LABELS } from '../CodeBlock/languages';

type HighlightModule = typeof import('../CodeBlock/highlight');

// Module-level: one import per session. A rejected chunk resolves to null and stays
// null (no retry, no throw) — code then renders plain, which is always correct.
let loading: Promise<HighlightModule | null> | undefined;
let loaded: HighlightModule | null | undefined;

function load(): Promise<HighlightModule | null> {
  loading ??= import('../CodeBlock/highlight').then(
    (m) => (loaded = m),
    () => (loaded = null),
  );
  return loading;
}

/**
 * Token lines for `code`, or `null` while the highlighter loads, when `language`
 * is absent/unknown, or when the import failed. Joined with `'\n'`, the token
 * text always equals `code` exactly (else `null`), so caret mapping is unaffected.
 *
 * Not announced (Hard rule 10): the plain → highlighted swap changes colour only,
 * never text, so there is nothing for assistive tech to hear.
 */
export function useHighlight(code: string, language: string | undefined): CodeToken[][] | null {
  const known = !!language && Object.hasOwn(CODE_LANGUAGE_LABELS, language);
  const [mod, setMod] = useState(loaded);

  useEffect(() => {
    if (!known || mod !== undefined) return;
    let live = true;
    void load().then((m) => {
      if (live) setMod(m);
    });
    return () => {
      live = false;
    };
  }, [known, mod]);

  return useMemo(() => {
    if (!known || !mod) return null;
    const lines = mod.tokenizeLines(code, language);
    // tokenizeLines drops one trailing newline; restore it as an empty last line.
    if (code.endsWith('\n')) lines.push([]);
    const text = lines.map((l) => l.map((t) => t.content).join('')).join('\n');
    return text === code ? lines : null;
  }, [known, mod, code, language]);
}
