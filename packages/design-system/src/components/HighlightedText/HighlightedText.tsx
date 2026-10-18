import { forwardRef, useMemo } from 'react';
import { Text, type TextProps } from '../Text';
import { segmentHighlights, type HighlightRange } from './highlightRanges';
import styles from './HighlightedText.module.scss';

export type { HighlightRange };

const NO_RANGES: readonly HighlightRange[] = [];

export interface HighlightedTextProps extends Omit<
  TextProps,
  'children' | 'dangerouslySetInnerHTML'
> {
  /**
   * The plain text to render. Always rendered as text, never parsed as HTML —
   * safe for untrusted search excerpts.
   */
  text: string;
  /**
   * Runs of `text` to highlight, as `{ start, length }` in UTF-16 code units
   * (JavaScript string offsets — what most search APIs return). Out-of-range
   * runs are clamped, empty ones dropped, overlapping or touching ones merged.
   * Order doesn't matter. Defaults to `[]` (plain text).
   */
  ranges?: readonly HighlightRange[];
}

/**
 * `Text` with matched runs wrapped in `<mark>` — for search-result excerpts.
 * @see docs/components/HighlightedText.md
 */
export const HighlightedText = forwardRef<HTMLElement, HighlightedTextProps>(
  function HighlightedText({ text, ranges = NO_RANGES, ...rest }, ref) {
    const segments = useMemo(() => segmentHighlights(text, ranges), [text, ranges]);
    // Every Text prop (as/size/tone/weight/lineClamp/className/…) passes straight through.
    return (
      <Text ref={ref} {...rest}>
        {segments.map((segment, i) =>
          segment.match ? (
            <mark key={i} className={styles.mark}>
              {segment.text}
            </mark>
          ) : (
            segment.text
          ),
        )}
      </Text>
    );
  },
);
