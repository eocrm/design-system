import { forwardRef, useId, useMemo, type HTMLAttributes } from 'react';
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

/** "N" for 1 line, "a–b" for more, `none` for a 0 count. */
function range(start: number, count: number, none: string): string {
  if (count === 0) return none;
  return count > 1 ? `${start}–${start + count - 1}` : String(start);
}

export interface DiffViewProps extends HTMLAttributes<HTMLDivElement> {
  /** Single-file unified text diff (with hunk headers), e.g. PHP `sebastian/diff`. Ranges and gutters need numbered hunks: with sebastian/diff use `new UnifiedDiffOutputBuilder($header, true)`; hunks without ranges render as "Change 1, 2…" with no gutters. */
  diff: string;
  /** Header label for the old side; shown as "fromLabel → toLabel", or alone when `toLabel` is unset. */
  fromLabel?: string;
  /** Header label for the new side. */
  toLabel?: string;
  /**
   * Show old/new line-number gutters, computed from the `@@` ranges (only when every hunk is numbered).
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
  const label =
    fromLabel && toLabel
      ? t('diffView.labels', { from: fromLabel, to: toLabel })
      : fromLabel || toLabel;
  const labelId = useId();
  const showGutters = lineNumbers && hunks.every((h) => h.oldStart !== null);
  const cols = showGutters ? 4 : 2;
  const scrollable = wrap === false || maxHeight !== undefined;
  const tableLabel = t('diffView.tableLabel');
  const none = t('diffView.none');
  const added = t('diffView.added');
  const removed = t('diffView.removed');
  const rows = useMemo(
    () =>
      hunks.map((h, i) => (
        <tbody key={i}>
          <tr>
            <th scope="rowgroup" colSpan={cols} className={styles.hunk}>
              {h.oldStart === null
                ? t('diffView.hunkUnnumbered', { index: i + 1 })
                : t('diffView.hunk', {
                    from: range(h.oldStart, h.oldLines!, none),
                    to: range(h.newStart!, h.newLines!, none),
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
              {showGutters ? (
                <>
                  <td className={styles.gutter}>{l.oldNumber}</td>
                  <td className={styles.gutter}>{l.newNumber}</td>
                </>
              ) : null}
              <td className={styles.sign}>
                {l.kind === 'added' ? (
                  <>
                    <span aria-hidden="true">+</span>
                    <VisuallyHidden>{added}</VisuallyHidden>
                  </>
                ) : l.kind === 'removed' ? (
                  <>
                    <span aria-hidden="true">−</span>
                    <VisuallyHidden>{removed}</VisuallyHidden>
                  </>
                ) : null}
              </td>
              <td className={styles.text}>{l.text}</td>
            </tr>
          ))}
        </tbody>
      )),
    [hunks, showGutters, cols, none, added, removed, t],
  );

  return (
    <div
      {...props}
      ref={ref}
      className={clsx(styles.root, wrap ? styles.wrap : styles.noWrap, className)}
    >
      {label ? (
        <div id={labelId} className={styles.header}>
          {label}
        </div>
      ) : null}
      {hunks.length === 0 ? (
        <div className={styles.empty}>{t('diffView.noChanges')}</div>
      ) : (
        <div
          className={clsx(styles.body, maxHeight && MAX_CLASS[maxHeight])}
          // A scrollable region must be keyboard-reachable and named (axe scrollable-region-focusable).
          {...(scrollable && {
            tabIndex: 0,
            role: 'group',
            'aria-labelledby': label ? labelId : undefined,
            'aria-label': label ? undefined : tableLabel,
          })}
        >
          <table
            className={styles.table}
            aria-labelledby={label ? labelId : undefined}
            aria-label={label ? undefined : tableLabel}
          >
            <thead>
              <tr>
                {showGutters ? (
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
            {rows}
          </table>
        </div>
      )}
    </div>
  );
});
