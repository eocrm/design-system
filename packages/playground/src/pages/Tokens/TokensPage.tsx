import { useMemo, useState } from 'react';
import { Stack, Title, Text, Code, Input } from '@eocrm/design-system';
import tokensSource from '@lib-source/styles/tokens.scss?raw';
import {
  parseTokens,
  groupTokensByCategory,
  CATEGORY_META,
  CATEGORY_ORDER,
  type ParsedToken,
} from './parseTokens';
import { TokenPreview } from './TokenPreview';
import styles from './TokensPage.module.scss';

/**
 * Read-only reference page for every design token in `tokens.scss`. The
 * source file is imported via Vite's `?raw` loader and parsed at render
 * time — so adding a new token in the library automatically shows up here
 * with no playground change required.
 */
export function TokensPage() {
  const allTokens = useMemo(() => parseTokens(tokensSource), []);
  const [filter, setFilter] = useState('');

  const filtered = useMemo<ParsedToken[]>(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return allTokens;
    return allTokens.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        t.value.toLowerCase().includes(needle) ||
        t.explanation?.toLowerCase().includes(needle),
    );
  }, [allTokens, filter]);

  const grouped = useMemo(() => groupTokensByCategory(filtered), [filtered]);

  return (
    <Stack gap="lg" className={styles.page}>
      <header>
        <Stack gap="sm">
          <div className={styles.eyebrow}>Reference</div>
          <Title order={1}>Design tokens</Title>
          <Text tone="muted">
            All {allTokens.length} CSS custom properties defined in{' '}
            <Code>packages/design-system/src/styles/tokens.scss</Code>. Click a name to copy
            its <Code>var(--…)</Code> reference.
          </Text>
        </Stack>
      </header>

      <Input
        type="search"
        placeholder="Filter by name, value, or description…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Filter tokens"
      />

      {filtered.length === 0 ? (
        <Text tone="muted">No tokens match {JSON.stringify(filter)}.</Text>
      ) : (
        CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((category) => {
          const meta = CATEGORY_META[category];
          const tokens = grouped[category];
          return (
            <section key={category} className={styles.section}>
              <Stack gap="sm">
                <Title order={2}>
                  {meta?.label ?? category}{' '}
                  <Text as="span" tone="muted" size="sm">
                    ({tokens.length})
                  </Text>
                </Title>
                {meta?.description && <Text tone="muted">{meta.description}</Text>}
              </Stack>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <colgroup>
                    <col className={styles.colPreview} />
                    <col className={styles.colName} />
                    <col className={styles.colValue} />
                    <col className={styles.colExplanation} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>Name</th>
                      <th>Value</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => (
                      <tr key={token.name}>
                        <td>
                          <TokenPreview category={token.category} name={token.name} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.copyButton}
                            onClick={() =>
                              navigator.clipboard?.writeText(`var(--${token.name})`)
                            }
                            aria-label={`Copy var(--${token.name})`}
                            title="Click to copy var(--…)"
                          >
                            <Code>--{token.name}</Code>
                          </button>
                        </td>
                        <td>
                          <Code className={styles.value}>{token.value}</Code>
                        </td>
                        <td>
                          {token.explanation ? (
                            <Text size="sm">{token.explanation}</Text>
                          ) : (
                            <Text tone="muted" size="sm">
                              —
                            </Text>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </Stack>
  );
}
