import { memo } from 'react';
import clsx from 'clsx';
import type { LiquidToken, LiquidTokenType } from './liquidTokenizer';
import styles from './LiquidEditor.module.scss';

const TOKEN_CLASS: Partial<Record<LiquidTokenType, string>> = {
  delimiter: styles.delimiter,
  variable: styles.variable,
  filter: styles.filter,
  string: styles.string,
  number: styles.number,
  keyword: styles.keyword,
  operator: styles.operator,
  unknown: styles.unknown,
  // `text` has no class — inherits the base color.
};

export interface HighlightLayerProps {
  /** Contiguous tokens whose `value`s concatenate back to the editor source. */
  tokens: LiquidToken[];
  /** Extra class merged onto the `<pre>` (e.g. to forward a scroll-sync ref's styling). */
  className?: string;
}

/**
 * The colored layer painted beneath the textarea. `aria-hidden` — the textarea
 * carries the real, screen-reader-visible text. A trailing newline gets a
 * zero-width space so the last empty line keeps its height (matching the
 * textarea's own trailing-line behavior).
 */
export const HighlightLayer = memo(function HighlightLayer({
  tokens,
  className,
}: HighlightLayerProps) {
  const last = tokens[tokens.length - 1];
  const trailingNewline = last !== undefined && last.value.endsWith('\n');
  return (
    <pre className={clsx(styles.highlight, className)} aria-hidden="true">
      {tokens.map((t, idx) => {
        const cls = TOKEN_CLASS[t.type];
        return cls ? (
          <span key={idx} className={cls}>
            {t.value}
          </span>
        ) : (
          // Plain text — no token class, just inherits the base color.
          <span key={idx}>{t.value}</span>
        );
      })}
      {trailingNewline ? '​' : null}
    </pre>
  );
});
