import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { Tooltip } from '../Tooltip';
import { VisuallyHidden } from '../VisuallyHidden';
import { useClippedTooltip } from '../_internal/useClippedTooltip';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './StagePath.module.scss';

/**
 * Outcome colour for the done + current stages. Upcoming stages stay neutral.
 * - `'default'` — blue; the record is in progress.
 * - `'success'` — green; the record reached a positive outcome (deal won).
 * - `'danger'` — red; the record reached a negative outcome (deal lost).
 */
export type StagePathTone = 'default' | 'success' | 'danger';

export interface StagePathStage {
  /** Stable id: matched against `value` and passed to `onValueChange`. */
  id: string;
  /** Visible stage name. Ellipsizes when space runs out; the full label shows in a tooltip only when clipped. */
  label: ReactNode;
}

export interface StagePathProps extends Omit<HTMLAttributes<HTMLOListElement>, 'children'> {
  /** Ordered stages, first to last. */
  stages: StagePathStage[];
  /**
   * Id of the current stage. Stages before it render as done, after it as
   * upcoming. An id not in `stages` renders every stage as upcoming (and warns
   * in development) rather than throwing.
   */
  value: string;
  /** Outcome colour for done + current stages. See `StagePathTone`. @default 'default' */
  tone?: StagePathTone;
  /**
   * Makes the path interactive: every non-current stage renders as a button
   * that calls this with its id. The current stage is never a button.
   * Omit for a read-only path. Whether a move is allowed (e.g. backwards) is
   * the consumer's rule — confirm or ignore inside the handler.
   */
  onValueChange?: (id: string) => void;
}

type StageState = 'done' | 'current' | 'upcoming';

interface StageProps {
  stage: StagePathStage;
  state: StageState;
  onValueChange?: (id: string) => void;
  /** Set on the current stage only: where focus lands when its button is replaced. */
  currentRef?: RefObject<HTMLSpanElement | null>;
}

function Stage({ stage, state, onValueChange, currentRef }: StageProps) {
  const t = useTranslation();
  const tip = useClippedTooltip<HTMLSpanElement>(stage.label);
  const content = (
    <>
      <span ref={tip.ref} className={styles.label}>
        {stage.label}
      </span>
      {state !== 'current' && (
        <VisuallyHidden>
          , {t(state === 'done' ? 'stagePath.completed' : 'stagePath.upcoming')}
        </VisuallyHidden>
      )}
    </>
  );
  const target =
    onValueChange != null && state !== 'current' ? (
      <button
        type="button"
        className={clsx(styles.target, styles.button)}
        onClick={() => onValueChange(stage.id)}
      >
        {content}
      </button>
    ) : (
      // Interactive current stage: focusable by script only (tabIndex -1, never a
      // Tab stop) so a keyboard user's focus survives their button becoming this span.
      <span
        ref={currentRef}
        className={styles.target}
        tabIndex={onValueChange != null && state === 'current' ? -1 : undefined}
        aria-current={state === 'current' ? 'step' : undefined}
      >
        {content}
      </span>
    );
  return (
    <li className={clsx(styles.stage, styles[state])} data-state={state}>
      <Tooltip content={tip.content} open={tip.open} onOpenChange={tip.onOpenChange}>
        {target}
      </Tooltip>
    </li>
  );
}

/**
 * Chevron row of a record's ordered stages — done, current, upcoming; optionally clickable.
 * @see docs/components/StagePath.md
 */
export const StagePath = forwardRef<HTMLOListElement, StagePathProps>(function StagePath(
  { stages, value, tone = 'default', onValueChange, className, onFocus, onBlur, ...rest },
  ref,
) {
  const currentRef = useRef<HTMLSpanElement>(null);
  // Was focus inside the list? Set on focusin; on focusout re-checked after the
  // current commit, because removing a focused button may or may not fire blur.
  const focusInside = useRef(false);
  const currentIndex = stages.findIndex((s) => s.id === value);
  const unknown = currentIndex === -1;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !unknown) return;
    // eslint-disable-next-line no-console
    console.warn(
      `<StagePath> value "${value}" is not the id of any stage; every stage renders as upcoming.`,
    );
  }, [unknown, value]);

  // Activating a stage remounts it as the current <span>, dropping focus to <body>
  // (WCAG 2.4.3). Put it back on the current stage — never steal it from elsewhere.
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (focusInside.current && (active == null || active === document.body || !active.isConnected))
      currentRef.current?.focus();
  }, [value]);

  return (
    <ol
      ref={ref}
      className={clsx(styles.path, className)}
      // {...rest} before data-tone: the tone attribute is the component's styling contract.
      {...rest}
      data-tone={tone}
      onFocus={(e) => {
        focusInside.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        const list = e.currentTarget;
        queueMicrotask(() => {
          focusInside.current = list.contains(document.activeElement);
        });
        onBlur?.(e);
      }}
    >
      {stages.map((stage, i) => {
        const state: StageState = unknown
          ? 'upcoming'
          : i < currentIndex
            ? 'done'
            : i === currentIndex
              ? 'current'
              : 'upcoming';
        return (
          <Stage
            key={stage.id}
            stage={stage}
            state={state}
            onValueChange={onValueChange}
            currentRef={state === 'current' ? currentRef : undefined}
          />
        );
      })}
    </ol>
  );
});
