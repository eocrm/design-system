import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('List styles', () => {
  it("scopes size='heading' marker vars to its own markers, so nested lists don't inherit them (#711)", () => {
    // Source-shape check (jsdom can't resolve module SCSS cascades): keep the rule
    // flat, or update this regex alongside a refactor to SCSS nesting.
    const scss = readFileSync(resolve(__dirname, './List.module.scss'), 'utf8');
    const rules = [...scss.matchAll(/([^{}]*\[data-size='heading'\][^{}]*)\{([^}]*)\}/g)];
    expect(rules.length).toBeGreaterThan(0);
    for (const [, selector, body] of rules) {
      if (!/--list-/.test(body)) continue;
      // Set on the list itself, the vars would cascade into a nested List's markers.
      expect(selector.trim().split('\n').pop()).toBe(
        ".list[data-size='heading'] > .item > .marker",
      );
    }
  });
});
