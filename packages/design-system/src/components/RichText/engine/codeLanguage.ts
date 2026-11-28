// codeLanguage.ts — canonical code-block language names + alias normalisation.
import type { CodeBlockLanguage } from '../../CodeBlock/languages';

export const CODE_LANGUAGES: readonly CodeBlockLanguage[] = [
  'javascript',
  'typescript',
  'json',
  'php',
  'python',
  'sql',
  'bash',
  'yaml',
  'html',
  'css',
  'markdown',
  'go',
  'kotlin',
  'java',
  'csharp',
  'rust',
];

const ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  py: 'python',
  yml: 'yaml',
  md: 'markdown',
  cs: 'csharp',
  'c#': 'csharp',
  kt: 'kotlin',
  rs: 'rust',
  htm: 'html',
  xml: 'html',
};

const PLAIN = new Set(['', 'plain', 'text', 'plaintext']);

/** Canonical language name, or `undefined` for plain/empty. Unknown names pass through lower-cased. */
export function normalizeCodeLanguage(raw: string | null | undefined): string | undefined {
  const k = (raw ?? '').trim().toLowerCase();
  if (PLAIN.has(k)) return undefined;
  return Object.hasOwn(ALIASES, k) ? ALIASES[k] : k;
}
