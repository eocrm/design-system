import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Tour styles', () => {
  it('does not fade the card while waiting', () => {
    const scss = readFileSync(resolve(__dirname, './Tour.module.scss'), 'utf8');
    // Every rule keyed on [data-waiting] — the card must stay opaque.
    const rules = [...scss.matchAll(/[^{}]*\[data-waiting\][^{}]*\{([^}]*)\}/g)];
    for (const [, body] of rules) expect(body).not.toMatch(/opacity/);
  });
});
