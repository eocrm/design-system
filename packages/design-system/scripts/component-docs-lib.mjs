// Pure helpers for generate-component-docs.mjs, importable by its test.

export const START = '<!-- props:start -->';
export const END = '<!-- props:end -->';

export const ALLOWED_TAGS = [
  'default',
  'example',
  'remarks',
  'see',
  'deprecated',
  'link',
  'internal',
  'param',
  'returns',
  'defaultValue',
];

export const unknownTags = (names) => names.filter((n) => !ALLOWED_TAGS.includes(n));

export function insertBlock(text, block) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s !== -1 && e > s) return text.slice(0, s) + block + text.slice(e + END.length);
  const lines = text.split('\n');
  const open = lines.findIndex((l) => /^\s*```/.test(l));
  const close = open === -1 ? -1 : lines.findIndex((l, i) => i > open && /^\s*```\s*$/.test(l));
  if (close === -1) return `${text.replace(/\n*$/, '\n')}\n${block}\n`;
  lines.splice(close + 1, 0, '', block);
  return lines.join('\n');
}

export function extractFences(description) {
  const fences = [];
  const text = description.replace(/```[\s\S]*?```/g, (fence) => {
    fences.push(fence);
    return ' (example below)';
  });
  return { text, fences };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const unquote = (s) => s.replace(/['"`]/g, '');

export function withDefault(description, value) {
  if (!value) return description;
  const v = `(?<![\\w-])${escapeRe(unquote(value))}(?![\\w-]|\\.\\d)`;
  const stated = new RegExp(`default(?:s to|:)?\\s*${v}|${v}\\s*\\(default\\)`, 'i');
  return stated.test(unquote(description))
    ? description
    : `${description} Default: \`${value}\`.`.trim();
}
