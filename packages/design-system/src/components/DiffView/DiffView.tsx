import { forwardRef, useMemo, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { VisuallyHidden } from '../VisuallyHidden';
import { parseUnifiedDiff } from './parseUnifiedDiff';
import styles from './DiffView.module.scss';

/** Frame max-height step; maps to `var(--measure-<step>)`. */
export type DiffViewMaxHeight = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const MAX_CLASS: Record<DiffViewMaxHeight, string> = {
  xs: styles.maxXs,
  sm: styles.maxSm,
  md: styles.maxMd,
  lg: styles.maxLg,
  xl: styles.maxXl,
};

export interface DiffViewProps extends HTMLAttributes<HTMLDivElement> {
  /** Unified text diff (`@@ -a,b +c,d @@` hunks), e.g. from `git diff` or PHP `sebastian/diff`. */
  diff: string;
  /** Header label for the old side; shown as "fromLabel → toLabel", or alone when `toLabel` is unset. */
  fromLabel?: string;
  /** Header label for the new side. */
  toLabel?: string;
  /**
   * Show old/new line-number gutters, computed from the `@@` ranges.
   * @default true
   */
  lineNumbers?: boolean;
  /**
   * Wrap long lines. `false` keeps each line on one row and scrolls horizontally.
   * @default true
   */
  wrap?: boolean;
  /** Frame max-height step; the diff scrolls past it. */
  maxHeight?: DiffViewMaxHeight;
}

/**
 * Read-only unified text diff with added/removed tinting and optional line numbers.
 * @see docs/components/DiffView.md
 */
export const DiffView = forwardRef<HTMLDivElement, DiffViewProps>(function DiffView(
  { diff, fromLabel, toLabel, lineNumbers = true, wrap = true, maxHeight, className, ...props },
  ref,
) {
  const t = useTranslation();
  const hunks = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const label = fromLabel && toLabel ? `${fromLabel} → ${toLabel}` : (fromLabel ?? toLabel);
  const cols = lineNumbers ? 4 : 2;

  return (
    <div
      {...props}
      ref={ref}
      className={clsx(
        styles.root,
        wrap ? styles.wrap : styles.noWrap,
        maxHeight && MAX_CLASS[maxHeight],
        className,
      )}
    >
      {label ? <div className={styles.header}>{label}</div> : null}
      {hunks.length === 0 ? (
        <div className={styles.empty}>{t('diffView.noChanges')}</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              {lineNumbers ? (
                <>
                  <th scope="col">
                    <VisuallyHidden>{t('diffView.oldLine')}</VisuallyHidden>
                  </th>
                  <th scope="col">
                    <VisuallyHidden>{t('diffView.newLine')}</VisuallyHidden>
                  </th>
                </>
              ) : null}
              <th scope="col">
                <VisuallyHidden>{t('diffView.change')}</VisuallyHidden>
              </th>
              <th scope="col">
                <VisuallyHidden>{t('diffView.text')}</VisuallyHidden>
              </th>
            </tr>
          </thead>
          {hunks.map((h, i) => (
            <tbody key={i}>
              <tr>
                <th scope="rowgroup" colSpan={cols} className={styles.hunk}>
                  {t('diffView.hunk', {
                    oldFrom: h.oldStart,
                    oldTo: h.oldStart + Math.max(h.oldLines - 1, 0),
                    newFrom: h.newStart,
                    newTo: h.newStart + Math.max(h.newLines - 1, 0),
                  })}
                  {h.section ? ` ${h.section}` : ''}
                </th>
              </tr>
              {h.lines.map((l, j) => (
                <tr
                  key={j}
                  className={clsx(
                    l.kind === 'added' && styles.added,
                    l.kind === 'removed' && styles.removed,
                    l.kind === 'note' && styles.note,
                  )}
                >
                  {lineNumbers ? (
                    <>
                      <td className={styles.gutter}>{l.oldNumber}</td>
                      <td className={styles.gutter}>{l.newNumber}</td>
                    </>
                  ) : null}
                  <td className={styles.sign}>
                    {l.kind === 'added' ? (
                      <>
                        <span aria-hidden="true">+</span>
                        <VisuallyHidden>{t('diffView.added')}</VisuallyHidden>
                      </>
                    ) : l.kind === 'removed' ? (
                      <>
                        <span aria-hidden="true">−</span>
                        <VisuallyHidden>{t('diffView.removed')}</VisuallyHidden>
                      </>
                    ) : null}
                  </td>
                  <td className={styles.text}>{l.text}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}
    </div>
  );
});
