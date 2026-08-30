import { describe, expect, it } from 'vitest';
import { en } from '../../i18n/en';
import { emptyStateText } from './emptyStateText';
import type { useTranslation } from '../../i18n/useTranslation';

/**
 * Direct cover for copy the Rule 9 gate cannot see.
 *
 * The gate's visitor fires on JSX nodes, and this helper has none — so moving
 * the sentence out of `Empty.tsx`'s JSX moved it from a gated position to an
 * ungated one. A `ts.isReturnStatement` rule was tried and reverted for
 * flagging six internal values, so this file is the cover instead: it fails if
 * either branch stops going through the translator.
 */
const t = ((key: string, params?: Record<string, unknown>) => {
  const entry = key.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], en);
  return typeof entry === 'function'
    ? (entry as (p: Record<string, unknown>) => string)(params ?? {})
    : (entry as string);
}) as unknown as ReturnType<typeof useTranslation>;

describe('emptyStateText', () => {
  it('routes both branches through the translator', () => {
    expect(emptyStateText(t, '')).toBe(`${en.select.noOptions}.`);
    expect(emptyStateText(t, '  ')).toBe(`${en.select.noOptions}.`);
    expect(emptyStateText(t, 'abc')).toBe(en.select.noResultsFor({ query: 'abc' }));
  });

  it('interpolates the query rather than hardcoding a sentence', () => {
    // The query-carrying branch was the unpinned one: nothing in the Select
    // suite asserted `noResultsFor`, so replacing it wholesale left the whole
    // 5388-test run green.
    expect(emptyStateText(t, 'Zürich')).toContain('Zürich');
    expect(emptyStateText(t, 'a')).not.toBe(emptyStateText(t, 'b'));
  });
});
