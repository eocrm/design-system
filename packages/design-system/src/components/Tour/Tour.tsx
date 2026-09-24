import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type Placement,
} from '@floating-ui/react-dom';
import clsx from 'clsx';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { Stack } from '../Stack';
import { useTranslation } from '../../i18n/useTranslation';
import { mergeRefs, sanitizeId } from '../_internal/refs';
import { useControllableState } from '../_internal/useControllableState';
import { Spotlight } from './Spotlight';
import { useTourTarget } from './useTourTarget';
import styles from './Tour.module.scss';

/** Preferred side of the target for the card. Auto-flips on collision. */
export type TourSide = 'top' | 'right' | 'bottom' | 'left';
/** Which card edge aligns with the matching target edge. */
export type TourAlign = 'start' | 'center' | 'end';
/** Why a tour ended: `'completed'` = Done on the last step; `'skipped'` = Skip or Escape. */
export type TourFinishReason = 'completed' | 'skipped';

/** One step of a `<Tour>`. Plain data — keep tours in a config module. */
export interface TourStep {
  /**
   * `data-tour` value of the element to spotlight (`<Button data-tour="bulk-edit">`
   * ↔ `target: 'bulk-edit'`). Omit for a centered step with no spotlight
   * (welcome / finish). If the target isn't mounted yet the Tour waits for it
   * — see `targetTimeout`.
   */
  target?: string;
  /** Card heading; also the dialog's accessible name. */
  title: ReactNode;
  /** Card text; also the dialog's accessible description. Links, `Kbd`, etc. are fine. */
  body?: ReactNode;
  /** Preferred side of the target. Default `'bottom'`. Auto-flips if it doesn't fit. */
  side?: TourSide;
  /** Edge alignment against the target. Default `'center'`. */
  align?: TourAlign;
  /** Px of spotlight around the target. Default `8`. */
  spotlightPadding?: number;
  /**
   * Modal mode only. The target stays clickable through the spotlight and joins
   * the focus trap — for "click X to continue" steps. Default `false`
   * (look-only: the target is blocked like the rest of the page).
   */
  interactive?: boolean;
  /**
   * `'click'` advances to the next step after the target's own click handler
   * runs. Needs a clickable target: `interactive: true` in modal mode, or any
   * step with `modal={false}`. Ignored (dev warning) otherwise.
   */
  advanceOn?: 'click';
}

export interface TourProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** The steps, in order. Must be non-empty. */
  steps: TourStep[];
  /**
   * Controlled open state (required — like `Modal`, there is no uncontrolled
   * mode: an uncontrolled tour could not be started or replayed).
   */
  open: boolean;
  /** Called with `false` on Skip, Escape and Done. */
  onOpenChange: (open: boolean) => void;
  /** Called once per close with why it ended. Use it to persist "seen" state. */
  onFinish?: (reason: TourFinishReason) => void;
  /**
   * Controlled step index. Control it when a step change must do something
   * first — navigate to another page, open an accordion, switch a tab — then
   * the Tour waits for the next target to mount.
   */
  step?: number;
  /** Fires on every step change (Next, Back, arrow keys, `advanceOn`), controlled or not. */
  onStepChange?: (index: number) => void;
  /** Uncontrolled starting step. Default `0`. Every re-open starts here again. */
  defaultStep?: number;
  /**
   * `true` (default): dims the page with a spotlight cutout, blocks clicks
   * outside it and traps focus — onboarding. `false`: card only, page stays
   * usable — feature announcements.
   */
  modal?: boolean;
  /**
   * Ms to wait for a step's target before falling back to a centered card.
   * Default `5000` (room for a route change + data fetch). `Infinity` waits forever.
   */
  targetTimeout?: number;
  /** Called when a step's target didn't appear within `targetTimeout`. Log it. */
  onTargetMissing?: (step: TourStep, index: number) => void;
  /**
   * Contextual label for the last step's button, e.g. `'Got it'` for a
   * one-step announcement. Defaults to the i18n `tour.done` (`'Done'`). An
   * empty string counts as unset.
   */
  doneLabel?: string;
}

/** Unmount fallback when `transitionend` never fires (reduced motion, jsdom). */
const EXIT_FALLBACK_MS = 300;
/** Gap in px between target and card (room for the arrow). */
const CARD_OFFSET = 12;

/* JSDoc for Tour is written in Task 8. */
export const Tour = forwardRef<HTMLDivElement, TourProps>(function Tour(props, ref) {
  const { open } = props;
  const [present, setPresent] = useState(open);
  const [session, setSession] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPresent(true);
      setSession((s) => s + 1);
    }
  }
  const onExited = useCallback(() => setPresent(false), []);
  if (!present) return null;
  // A fresh session per open resets uncontrolled step state to defaultStep.
  return <TourSession key={session} {...props} ref={ref} closing={!open} onExited={onExited} />;
});

interface TourSessionProps extends TourProps {
  closing: boolean;
  onExited: () => void;
}

const TourSession = forwardRef<HTMLDivElement, TourSessionProps>(function TourSession(
  {
    steps,
    open: _open,
    onOpenChange,
    onFinish,
    step: stepProp,
    onStepChange,
    defaultStep = 0,
    modal = true,
    targetTimeout = 5000,
    onTargetMissing,
    doneLabel,
    closing,
    onExited,
    className,
    style,
    ...rest
  },
  forwardedRef,
) {
  const t = useTranslation();
  const [index, setIndex] = useControllableState<number>({
    value: stepProp,
    defaultValue: defaultStep,
    onChange: onStepChange,
  });
  const current = steps[index];
  const total = steps.length;
  const isLast = index === total - 1;

  const uid = sanitizeId(useId());
  const titleId = `tour-title-${uid}`;
  const bodyId = `tour-body-${uid}`;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLSpanElement | null>(null);

  const { element, status } = useTourTarget(current?.target, targetTimeout, () => {
    if (!current) return;
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[Tour] target "${current.target}" not found after ${targetTimeout}ms; showing step ${index + 1} centered.`,
      );
    }
    onTargetMissing?.(current, index);
  });
  const found = status === 'found' ? element : null;
  const waiting = status === 'waiting';
  const centered = !found;

  const finish = (reason: TourFinishReason) => {
    if (closing) return;
    onOpenChange(false);
    onFinish?.(reason);
  };
  const goNext = () => (isLast ? finish('completed') : setIndex(index + 1));
  const goBack = () => {
    if (index > 0) setIndex(index - 1);
  };
  // Latest-callback ref for listeners registered in effects (advanceOn, keys).
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  // ---- Positioning ----
  const side = current?.side ?? 'bottom';
  const align = current?.align ?? 'center';
  const placement = (align === 'center' ? side : `${side}-${align}`) as Placement;
  const {
    refs,
    floatingStyles,
    placement: resolvedPlacement,
    middlewareData,
    isPositioned,
  } = useFloating({
    open: !!found,
    placement,
    strategy: 'fixed',
    // CSS `transform` stays free for the entrance scale (as in Popover).
    transform: false,
    middleware: [offset(CARD_OFFSET), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })],
    whileElementsMounted: autoUpdate,
    elements: { reference: found },
  });
  const resolvedSide = resolvedPlacement.split('-')[0] as TourSide;
  const staticSide = ({ top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const)[
    resolvedSide
  ];

  // Glide (top/left/translate + spotlight geometry) only after the first
  // placement, so nothing sweeps in from the viewport origin on open.
  const [glide, setGlide] = useState(false);
  useEffect(() => {
    if (glide || !(centered || isPositioned)) return;
    const id = requestAnimationFrame(() => setGlide(true));
    return () => cancelAnimationFrame(id);
  }, [glide, centered, isPositioned]);

  // ---- Scroll the target into view ----
  useEffect(() => {
    if (!found) return;
    const r = found.getBoundingClientRect();
    const inView =
      r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
    if (inView) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    found.scrollIntoView?.({
      block: 'center',
      inline: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    });
  }, [found]);

  // ---- Exit: unmount after the fade ----
  useEffect(() => {
    if (!closing) return;
    const el = cardRef.current;
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el) onExited();
    };
    el?.addEventListener('transitionend', onEnd);
    const timer = setTimeout(onExited, EXIT_FALLBACK_MS);
    return () => {
      el?.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
    };
  }, [closing, onExited]);

  if (!current) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Tour] no step at index ${index} (steps: ${total}).`);
    }
    return null;
  }

  const state = closing ? 'closed' : 'open';
  // No isPositioned-gated visibility hiding — same as Popover.Content, whose
  // floatingStyles apply directly with no flash-prevention gate.
  const cardStyle: CSSProperties = centered
    ? { position: 'fixed', top: '50%', left: '50%', translate: '-50% -50%' }
    : { ...floatingStyles, translate: '0 0' };
  const arrowXY = middlewareData.arrow;

  return createPortal(
    <>
      {modal && (
        <Spotlight
          target={found}
          padding={current.spotlightPadding ?? 8}
          interactive={!!current.interactive}
          state={state}
          glide={glide}
        />
      )}
      {/* {...rest} first so role / aria-* / tabIndex / data-state always win. */}
      <div
        {...rest}
        ref={mergeRefs<HTMLDivElement>(cardRef, refs.setFloating, forwardedRef)}
        role="dialog"
        aria-modal={modal}
        aria-labelledby={titleId}
        aria-describedby={current.body != null ? bodyId : undefined}
        aria-busy={waiting || undefined}
        tabIndex={-1}
        data-state={state}
        data-side={centered ? undefined : resolvedSide}
        data-centered={centered ? '' : undefined}
        data-waiting={waiting ? '' : undefined}
        data-glide={glide ? '' : undefined}
        className={clsx(styles.card, className)}
        style={{ ...style, ...cardStyle }}
      >
        {!centered && (
          <span
            ref={arrowRef}
            aria-hidden="true"
            className={styles.arrow}
            style={{
              left: typeof arrowXY?.x === 'number' ? `${arrowXY.x}px` : undefined,
              top: typeof arrowXY?.y === 'number' ? `${arrowXY.y}px` : undefined,
              [staticSide]: 'calc(var(--tour-arrow-size) / -2)',
            }}
          />
        )}
        <Stack gap="md">
          <Stack key={index} gap="xs" className={styles.content}>
            <span className={styles.progress}>
              {t('tour.progress', { current: index + 1, total })}
            </span>
            <h2 id={titleId} className={styles.title}>
              {current.title}
            </h2>
            {current.body != null && (
              <div id={bodyId} className={styles.body}>
                {current.body}
              </div>
            )}
          </Stack>
          <Cluster justify={isLast ? 'end' : 'between'} gap="sm">
            {!isLast && (
              <Button variant="ghost" size="sm" onClick={() => finish('skipped')}>
                {t('tour.skip')}
              </Button>
            )}
            <Cluster gap="sm">
              {index > 0 && (
                <Button variant="secondary" size="sm" onClick={goBack}>
                  {t('tour.back')}
                </Button>
              )}
              <Button size="sm" onClick={goNext}>
                {isLast ? doneLabel || t('tour.done') : t('tour.next')}
              </Button>
            </Cluster>
          </Cluster>
        </Stack>
      </div>
    </>,
    document.body,
  );
});
