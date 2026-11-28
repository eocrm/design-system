// Prism-free language list so the RichText engine can import it without pulling in Prism.
export type CodeBlockLanguage =
  | 'json'
  | 'bash'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'go'
  | 'kotlin'
  | 'java'
  | 'csharp'
  | 'rust'
  | 'php'
  | 'sql'
  | 'yaml'
  | 'html'
  | 'css'
  | 'markdown';

export const CODE_LANGUAGE_LABELS: Record<CodeBlockLanguage, string> = {
  json: 'JSON',
  bash: 'Bash',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
  kotlin: 'Kotlin',
  java: 'Java',
  csharp: 'C#',
  rust: 'Rust',
  php: 'PHP',
  sql: 'SQL',
  yaml: 'YAML',
  html: 'HTML',
  css: 'CSS',
  markdown: 'Markdown',
};
