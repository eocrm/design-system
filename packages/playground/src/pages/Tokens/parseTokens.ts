/**
 * Parsed token record extracted from the library's `tokens.scss` file.
 *
 * The explanation is sourced from inline `//` comments in the SCSS — either
 * a multi-line block immediately preceding the token declaration or a
 * trailing `// …` after the value. Trailing wins when both exist.
 */
export interface ParsedToken {
  /** Token name without the leading `--` (e.g., `color-accent`). */
  name: string;
  /** Raw value string from the SCSS (e.g., `#0052cc`, `4px`, `rgb(0 0 0 / 50%)`). */
  value: string;
  /** Inline comment from the SCSS, if any. */
  explanation?: string;
  /** Top-level category derived from the name prefix (e.g., `color`, `space`). */
  category: string;
}

const TOKEN_LINE_RE = /^--([a-z0-9-]+):\s*([^;]+?);(?:\s*(?:\/\/\s*|\/\*\s*)(.+?)(?:\s*\*\/)?)?$/;
const COMMENT_LINE_RE = /^\/\/\s?(.*)$/;

/**
 * Collapse multi-line token declarations onto a single line so the line-by-
 * line parser below sees them. Some tokens (e.g. `--font-family-sans`,
 * `--color-bg-overlay-blur`) span multiple lines because their values are
 * long lists / functions.
 */
function joinMultilineDeclarations(raw: string): string {
  // Greedy match anything starting with `--name:` up to the first `;`,
  // then collapse internal whitespace to single spaces.
  return raw.replace(/(--[a-z0-9-]+:[^;]*;)/g, (match) => match.replace(/\s+/g, ' '));
}

/**
 * Parse the raw text of `tokens.scss` into a structured list of tokens.
 *
 * Heuristic for explanations: contiguous `//` comment lines immediately
 * above a token declaration are joined with spaces. Trailing inline
 * comments on the same line as the declaration override the preceding
 * block. A blank line, a non-comment line, or a different token resets
 * the pending comment buffer.
 *
 * Section headings in the SCSS (single-line comments that head a run of
 * tokens) are intentionally NOT extracted — we derive categories from the
 * token name prefix instead, which is more stable and doesn't depend on
 * comment placement.
 */
export function parseTokens(raw: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  let pending: string[] = [];
  const normalized = joinMultilineDeclarations(raw);

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim();

    if (line === '' || line === '{' || line === '}' || line.startsWith(':root')) {
      pending = [];
      continue;
    }

    const tokenMatch = TOKEN_LINE_RE.exec(line);
    if (tokenMatch) {
      const [, name, value, trailing] = tokenMatch;
      const explanation = trailing?.trim() || pending.join(' ').trim() || undefined;
      tokens.push({
        name,
        value: value.trim(),
        explanation,
        category: name.split('-')[0],
      });
      pending = [];
      continue;
    }

    const commentMatch = COMMENT_LINE_RE.exec(line);
    if (commentMatch) {
      pending.push(commentMatch[1].trim());
      continue;
    }

    // Any other line (SCSS variable, mixin, etc.) breaks the comment-to-token
    // adjacency.
    pending = [];
  }

  return tokens;
}

/** Human-readable label + short description for each token category. */
export const CATEGORY_META: Record<string, { label: string; description: string }> = {
  color: {
    label: 'Color',
    description:
      'Surface, foreground, accent, semantic, and badge palettes. All token values are literal hex / rgb — no aliases reference other tokens, so theming swaps are straightforward.',
  },
  space: {
    label: 'Spacing',
    description:
      '4px baseline scale. `--space-05` is a half-step (2px) for tight internal padding; everything else steps by 4 from `--space-0` up.',
  },
  size: {
    label: 'Size',
    description:
      'Component-level sizing tokens — icon dimensions, control heights, avatar diameters. Use these when a component needs a discrete size variant; otherwise prefer spacing tokens.',
  },
  font: {
    label: 'Typography',
    description:
      'Font families, sizes, and weights. Sizes follow a typographic scale; use semantic names (`--font-size-sm`) rather than reaching for a specific pixel value.',
  },
  radius: {
    label: 'Border radius',
    description: 'Corner-rounding tokens — from sharp (sm) to fully circular (full).',
  },
  shadow: {
    label: 'Shadow',
    description:
      'Elevation tokens. `xs`–`xl` map to roughly increasing perceived height; pick by intent (a Tooltip is `sm`, a Modal is `lg`).',
  },
  opacity: {
    label: 'Opacity',
    description: 'Reusable opacity values for hover, disabled, overlay, and tinted-surface states.',
  },
  z: {
    label: 'Z-index',
    description:
      'Stacking layers. Use these instead of arbitrary numbers so the order is centralised and predictable.',
  },
  ring: {
    label: 'Focus ring',
    description: 'Focus-ring color + width tokens. Apply via the `@include focus-ring` mixin.',
  },
  border: {
    label: 'Border',
    description: 'Border-width tokens.',
  },
  line: {
    label: 'Line height',
    description: 'Line-height tokens — paired with `--font-size-*`.',
  },
  letter: {
    label: 'Letter spacing',
    description: 'Letter-spacing tokens — typically for headings and uppercase labels.',
  },
  transition: {
    label: 'Transition',
    description: 'Duration tokens for CSS transitions. Pair with an easing function.',
  },
  avatar: {
    label: 'Avatar',
    description:
      'Component-specific tokens for the Avatar primitive (overlap offsets for stacked avatars).',
  },
};

/** Stable display order for the categories. */
export const CATEGORY_ORDER: string[] = [
  'color',
  'space',
  'size',
  'font',
  'radius',
  'border',
  'shadow',
  'opacity',
  'ring',
  'line',
  'letter',
  'transition',
  'avatar',
  'z',
];

/** Group an array of tokens by `category`, preserving the order they appeared in. */
export function groupTokensByCategory(tokens: ParsedToken[]): Record<string, ParsedToken[]> {
  const groups: Record<string, ParsedToken[]> = {};
  for (const token of tokens) {
    (groups[token.category] ??= []).push(token);
  }
  return groups;
}
