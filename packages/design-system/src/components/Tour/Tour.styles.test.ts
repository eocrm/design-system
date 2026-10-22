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

  it('makes a [data-tour-inert] target and its descendants pointer-inert (#697)', () => {
    const scss = readFileSync(resolve(__dirname, './Tour.module.scss'), 'utf8');
    const m = scss.match(/:global\(\[data-tour-inert\]\)[^{]*\{([^}]*)\}/);
    // Chained attribute (>= 4) lifts specificity above library pointer-events:auto rules.
    expect(m?.[0]).toMatch(/:global\((\[data-tour-inert\]){4,} \*\)/);
    expect(m?.[1]).toMatch(/pointer-events:\s*none/);
  });

  it('card width is intrinsic, independent of its in-flight left (#698)', () => {
    const scss = readFileSync(resolve(__dirname, './Tour.module.scss'), 'utf8');
    const card = scss.match(/\n\.card \{([^}]*)\}/);
    expect(card?.[1]).toMatch(/width:\s*max-content/);
  });
});
