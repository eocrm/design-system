// StagePath.tsx
import { forwardRef, useEffect, type HTMLAttributes, type ReactNode } from 'react';
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
  /** Stable id: matched against `value` and passed to `onStageChange`. */
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
  onStageChange?: (id: string) => void;
}

type StageState = 'done' | 'current' | 'upcoming';

interface StageProps {
  stage: StagePathStage;
  state: StageState;
  onStageChange?: (id: string) => void;
}

function Stage({ stage, state, onStageChange }: StageProps) {
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
    onStageChange != null && state !== 'current' ? (
      <button
        type="button"
        className={clsx(styles.target, styles.button)}
        onClick={() => onStageChange(stage.id)}
      >
        {content}
      </button>
    ) : (
      <span className={styles.target}>{content}</span>
    );
  return (
    <li
      className={clsx(styles.stage, styles[state])}
      data-state={state}
      aria-current={state === 'current' ? 'step' : undefined}
    >
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
  { stages, value, tone = 'default', onStageChange, className, ...rest },
  ref,
) {
  const currentIndex = stages.findIndex((s) => s.id === value);
  const unknown = currentIndex === -1;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !unknown) return;
    // eslint-disable-next-line no-console
    console.warn(
      `<StagePath> value "${value}" is not the id of any stage; every stage renders as upcoming.`,
    );
  }, [unknown, value]);

  return (
    <ol
      ref={ref}
      className={clsx(styles.path, className)}
      // {...rest} before data-tone: the tone attribute is the component's styling contract.
      {...rest}
      data-tone={tone}
    >
      {stages.map((stage, i) => {
        const state: StageState = unknown
          ? 'upcoming'
          : i < currentIndex
            ? 'done'
            : i === currentIndex
              ? 'current'
              : 'upcoming';
        return <Stage key={stage.id} stage={stage} state={state} onStageChange={onStageChange} />;
      })}
    </ol>
  );
});
