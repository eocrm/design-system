import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Tour styles', () => {
  it('does not fade the card while waiting', () => {
    const scss = readFileSync(resolve(__dirname, './Tour.module.scss'), 'utf8');
    // Reintroduction guard: today no rule is keyed on [data-waiting] (the
    // waiting cue is the loading row, not a fade). If one comes back, it must
    // not lower opacity — the faded card read as sitting behind the scrim.
    const rules = [...scss.matchAll(/[^{}]*\[data-waiting\][^{}]*\{([^}]*)\}/g)];
    for (const [, body] of rules) expect(body).not.toMatch(/opacity/);
  });
});
