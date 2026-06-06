/**
 * A flat map of CSS design-token overrides: custom-property name → value.
 * Keys must start with `--` (e.g. `--color-accent`, `--radius-md`,
 * `--font-family-sans`). Consumed by `<AppProvider tokens>` / `darkTokens`.
 */
export type TokenMap = Partial<Record<`--${string}`, string>>;

// Read NODE_ENV defensively so the library never throws at module init
// (mirrors components/Tabs/Tabs.tsx).
const IS_DEV = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

// A valid CSS custom-property name: `--` followed by word chars / dashes.
const KEY_RE = /^--[\w-]+$/;
// Characters that could break out of a CSS declaration or the <style> element.
const UNSAFE_VALUE_RE = /[{}<>]/;

function warn(message: string): void {
  if (IS_DEV) console.warn(`[AppProvider] ${message}`);
}

/**
 * Keep only entries whose key is a valid custom-property name and whose value
 * cannot break out of a CSS declaration / the <style> element. Rejected
 * entries are dropped with a dev warning (the consumer is trusted — this is
 * defensive, not a security boundary). Preserves the map's own key order.
 */
function sanitizeEntries(map: TokenMap | undefined): Array<[string, string]> {
  if (!map) return [];
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(map)) {
    if (value == null) continue;
    if (!KEY_RE.test(key)) {
      warn(`ignoring override with invalid key ${JSON.stringify(key)} (must match --name)`);
      continue;
    }
    if (UNSAFE_VALUE_RE.test(value)) {
      warn(`ignoring override ${key}: value contains an unsafe character ({ } < >)`);
      continue;
    }
    out.push([key, value]);
  }
  return out;
}

function declarations(entries: Array<[string, string]>, indent: string): string {
  return entries.map(([key, value]) => `${indent}${key}: ${value};`).join('\n');
}

/**
 * Build the CSS for consumer token overrides, mirroring `dark.scss`'s scopes so
 * the cascade resolves correctly:
 * - `tokens` → `:root {}` (wins in light by source order) AND re-emitted into
 *   the dark scopes so a single map applies in both themes.
 * - `darkTokens` → layered AFTER `tokens` inside the dark scopes only.
 *
 * Returns `null` when there is nothing to emit, so `<AppProvider>` renders no
 * `<style>` for the no-override case (preserving its zero-side-effect default).
 */
export function buildThemeTokenCss(tokens?: TokenMap, darkTokens?: TokenMap): string | null {
  const base = sanitizeEntries(tokens);
  const dark = sanitizeEntries(darkTokens);
  if (base.length === 0 && dark.length === 0) return null;

  const blocks: string[] = [];

  if (base.length > 0) {
    blocks.push(`:root {\n${declarations(base, '  ')}\n}`);
  }

  // tokens re-emitted into dark so a single map applies in dark too; darkTokens
  // layered after so they win.
  const darkScope = [...base, ...dark];
  if (darkScope.length > 0) {
    blocks.push(`:root[data-theme='dark'] {\n${declarations(darkScope, '  ')}\n}`);
    blocks.push(
      `@media (prefers-color-scheme: dark) {\n` +
        `  :root:not([data-theme='light']) {\n` +
        `${declarations(darkScope, '    ')}\n` +
        `  }\n}`,
    );
  }

  return blocks.join('\n');
}
