import {
  Fragment,
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useState,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import { Check, Copy, WrapText, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Button } from '../Button';
import { LiveRegion } from '../LiveRegion';
import { Tabs } from '../Tabs';
import { Tooltip } from '../Tooltip';
import {
  LANGUAGE_LABELS,
  highlightedLineSet,
  tokenizeLines,
  type CodeBlockLanguage,
} from './highlight';
import { resolveActiveSample, setSynced, useSyncedSample } from './sampleSync';
import styles from './CodeBlock.module.scss';

export type { CodeBlockLanguage } from './highlight';

/** One tab of a multi-sample block (e.g. the same request in cURL and Python). */
export interface CodeBlockSample {
  /** Stable id, unique within `samples`. Shared ids are what `syncKey` keeps in step. */
  id: string;
  /** Visible tab label (e.g. `'cURL'`, `'Python'`). */
  label: string;
  /** The source. Copied verbatim; one trailing newline is not rendered. */
  code: string;
  /** Grammar for highlighting. Unknown values render as plain text. */
  language?: CodeBlockLanguage | (string & {});
}

/** 1-based line numbers and inclusive `[from, to]` ranges, e.g. `[2, [5, 7]]`. */
export type CodeBlockHighlightLines = readonly (number | readonly [number, number])[];

/** Body max-height step; maps to `var(--measure-<step>)`. */
export type CodeBlockMaxHeight = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface CodeBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onChange'> {
  /** Single-sample mode: the source. Ignored when `samples` is set. */
  code?: string;
  /**
   * Single-sample mode: grammar for highlighting — `'json'`, `'bash'`,
   * `'javascript'`, `'typescript'` or `'python'` (aliases `sh`, `shell`, `js`,
   * `ts`, `py`). Anything else renders as plain text.
   */
  language?: CodeBlockLanguage | (string & {});
  /**
   * Header label in single-sample mode. Defaults to a one-item `samples`
   * entry's `label`, else the language name (`JSON`, `Bash`…), else "Plain
   * text". Also names the body (single-sample) or the sample tabs (multi-sample).
   */
  title?: string;
  /** Multi-sample mode: 2+ samples render as tabs. Wins over `code`/`language`. */
  samples?: readonly CodeBlockSample[];
  /** Controlled active sample id. Wins over `syncKey` and the user's own pick. */
  activeSampleId?: string;
  /** Initial sample id when uncontrolled and nothing is synced. Defaults to the first sample. */
  defaultSampleId?: string;
  /** Called with the new id when the user picks a tab in THIS block (not when a synced block changes it). */
  onSampleChange?: (id: string) => void;
  /**
   * Blocks sharing a `syncKey` switch together: picking `py` in one selects
   * `py` in every block with the same key that has a `py` sample. In-memory,
   * per page load; for uncontrolled blocks (controlled blocks sharing one state
   * don't need it).
   */
  syncKey?: string;
  /** Lines to emphasise (visual only — explain the emphasis in prose). */
  highlightLines?: CodeBlockHighlightLines;
  /**
   * Caps the body height; the body scrolls inside it (it is always a focusable, named region).
   * `xs` 200px · `sm` 320px · `md` 448px · `lg` 640px · `xl` 800px. Default: no cap.
   */
  maxHeight?: CodeBlockMaxHeight;
  /** Initial state of the wrap-lines toggle. Default `false` (long lines scroll horizontally). */
  defaultWrap?: boolean;
}

const MAX_HEIGHT_CLASS: Record<CodeBlockMaxHeight, string> = {
  xs: styles.maxXs,
  sm: styles.maxSm,
  md: styles.maxMd,
  lg: styles.maxLg,
  xl: styles.maxXl,
};

const COPIED_MS = 1500;

/**
 * Syntax-highlighted code sample with copy, wrap toggle and optional language tabs.
 * @see docs/components/CodeBlock.md
 */
export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  {
    code = '',
    language,
    title,
    samples,
    activeSampleId,
    defaultSampleId,
    onSampleChange,
    syncKey,
    highlightLines,
    maxHeight,
    defaultWrap = false,
    className,
    ...props
  },
  ref,
) {
  const t = useTranslation();
  // Sanitised like Tabs does: React's `:r0:` ids are valid ids but not CSS-safe.
  const prefix = useId().replace(/[^a-zA-Z0-9_-]/g, '_');
  const [localPick, setLocalPick] = useState<string>();
  const [wrap, setWrap] = useState(defaultWrap);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [copyCount, setCopyCount] = useState(0);
  const synced = useSyncedSample(syncKey);

  const list: readonly CodeBlockSample[] = samples?.length
    ? samples
    : [{ id: 'code', label: '', code, language }];
  const multi = list.length > 1;
  const activeId = resolveActiveSample(
    list.map((s) => s.id),
    { controlled: activeSampleId, synced, own: localPick, fallback: defaultSampleId },
  );
  const active = list.find((s) => s.id === activeId) ?? list[0];
  const lines = useMemo(
    () => tokenizeLines(active.code, active.language),
    [active.code, active.language],
  );
  const highlighted = highlightedLineSet(highlightLines, lines.length);
  const lang = active.language;
  const label =
    title ||
    (samples?.length === 1 && samples[0].label) ||
    (lang && Object.hasOwn(LANGUAGE_LABELS, lang)
      ? LANGUAGE_LABELS[lang as CodeBlockLanguage]
      : t('codeBlock.plainText'));

  // Keyed on copyCount so a re-click restarts the window; cleanup also clears on unmount.
  useEffect(() => {
    if (copyStatus === 'idle') return;
    const id = setTimeout(() => setCopyStatus('idle'), COPIED_MS);
    return () => clearTimeout(id);
  }, [copyStatus, copyCount]);

  const copy = async () => {
    const text = active.code;
    let ok = true;
    try {
      // Called synchronously inside the click so the user-activation gate holds;
      // a missing `navigator.clipboard` throws here and lands in the catch.
      await navigator.clipboard.writeText(text);
    } catch {
      ok = false;
    }
    setCopyStatus(ok ? 'copied' : 'failed');
    setCopyCount((n) => n + 1);
  };

  const pick = (id: string) => {
    setLocalPick(id);
    if (syncKey !== undefined) setSynced(syncKey, id);
    onSampleChange?.(id);
  };

  // {...props} first so the root's ref and className composition win (Pattern B);
  // the ARIA-bearing structure lives on children consumers cannot reach.
  return (
    <div {...props} ref={ref} className={clsx(styles.root, className)}>
      <div className={styles.header}>
        {multi ? (
          // Gives the strip the header's free space. Shrink-wrapped, its scroll
          // wrapper sat at the tabs' fractional width and DPR rounding showed a
          // 1px scrollbar although every tab fit (#710).
          <div className={styles.tabs}>
            <Tabs
              items={list.map(({ id, label: tabLabel }) => ({ id, label: tabLabel }))}
              activeId={active.id}
              onChange={pick}
              panelIdPrefix={prefix}
              aria-label={title}
            />
          </div>
        ) : (
          <span id={`${prefix}-label`} className={styles.title}>
            {label}
          </span>
        )}
        <div className={styles.actions}>
          <Tooltip content={t('codeBlock.wrap')}>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={t('codeBlock.wrap')}
              aria-pressed={wrap}
              selected={wrap}
              onClick={() => setWrap((w) => !w)}
            >
              <WrapText aria-hidden="true" />
            </Button>
          </Tooltip>
          <Tooltip
            content={copyStatus === 'failed' ? t('codeBlock.copyFailed') : t('codeBlock.copy')}
          >
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={t('codeBlock.copy')}
              onClick={copy}
            >
              {copyStatus === 'copied' ? (
                <Check aria-hidden="true" />
              ) : copyStatus === 'failed' ? (
                <X aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
            </Button>
          </Tooltip>
        </div>
      </div>
      {/* Always mounted (Rule 10): the copy outcome is announced, the button keeps its name. */}
      <LiveRegion announceKey={copyCount}>
        {copyStatus === 'copied'
          ? t('codeBlock.copied')
          : copyStatus === 'failed'
            ? t('codeBlock.copyFailed')
            : null}
      </LiveRegion>
      <pre
        className={clsx(styles.body, wrap && styles.wrap, maxHeight && MAX_HEIGHT_CLASS[maxHeight])}
        // Always a tab stop: wrap-off lines overflow horizontally, and APG gives
        // a tabpanel without focusable content tabIndex=0. Multi: the tabpanel
        // named by its tab. Single: a group named by the header label, since a
        // bare <pre> may not carry a name.
        role={multi ? 'tabpanel' : 'group'}
        id={multi ? `${prefix}-${active.id}-panel` : undefined}
        aria-labelledby={multi ? `${prefix}-${active.id}-tab` : `${prefix}-label`}
        tabIndex={0}
      >
        <code className={styles.lines}>
          {lines.map((tokens, i) => (
            // Index keys: lines are derived wholesale from `code` and hold no state.
            // Lines are inline-blocks, so the '\n' between them is a real rendered
            // break: selection-copy, innerText and textContent all keep blank lines.
            <Fragment key={i}>
              {i > 0 && '\n'}
              <span
                data-line=""
                data-highlighted={highlighted.has(i + 1) ? '' : undefined}
                className={styles.line}
              >
                {tokens.map((token, j) => (
                  <span key={j} className={styles[token.key]}>
                    {token.content}
                  </span>
                ))}
              </span>
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
});
