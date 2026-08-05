import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('document background contract', () => {
  const reset = readFileSync(resolve(__dirname, 'reset.scss'), 'utf8');
  const generatedTokens = readFileSync(
    resolve(__dirname, '../../../design-tokens/generated/web/tokens.scss'),
    'utf8',
  );

  it('paints the body with the documented document token', () => {
    expect(reset).toMatch(
      /body\s*{[^}]*background:\s*var\(--document-background,\s*var\(--color-bg-subtle\)\);/s,
    );
  });

  it('defaults the document token to the full-screen surface base', () => {
    expect(generatedTokens).toContain('--document-background: var(--color-bg-subtle);');
  });
});
