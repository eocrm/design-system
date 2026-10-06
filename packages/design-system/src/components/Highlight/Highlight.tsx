import {
  Children,
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from 'react';
import { mergeRefs } from '../_internal/refs';
import styles from './Highlight.module.scss';

/** Mirrors `--highlight-fade` (`--transition-slow`, 260ms). */
const FADE_MS = 260;

export interface HighlightProps {
  /**
   * Turns the highlight on. Each false → true change starts it once: the ring
   * shows, the optional scroll and focus run, and after `duration` it fades
   * out and `onDone` fires. Setting it back to false early removes the ring at
   * once WITHOUT calling `onDone`. Keeping it `true` doesn't restart anything;
   * toggle false → true to highlight again.
   */
  active: boolean;
  /**
   * How long the ring holds before fading, in ms. `Infinity` keeps it on
   * until `active` goes false. Default: `3000`.
   */
  duration?: number;
  /**
   * Called once, after the fade ends (straight after `duration` under
   * `prefers-reduced-motion`). Typically clears the consumer's `active`
   * state. Not called when `active` is cleared early or on unmount.
   */
  onDone?: () => void;
  /**
   * On activation, scroll the child to the vertical centre of its scroll
   * container. Smooth, or instant under `prefers-reduced-motion`.
   * Default: `false`.
   */
  scrollIntoView?: boolean;
  /**
   * On activation, move focus to the child (`preventScroll`, so it never
   * fights `scrollIntoView`). The child must be focusable: give a
   * non-interactive block (`Card`, `<section>`, `<tr>`) `tabIndex={-1}`.
   * Highlight never adds it for you. Default: `false`.
   */
  focus?: boolean;
  /**
   * Exactly one element that forwards `ref` and `className`: any DS
   * component, or a native element such as `<tr>` or `<li>`. Highlight
   * renders no wrapper of its own.
   */
  children: ReactElement;
}

type Stage = 'on' | 'fading' | 'done';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Temporary attention ring + glow on any single block, with optional scroll and focus.
 * @see docs/components/Highlight.md
 */
export function Highlight({
  active,
  duration = 3000,
  onDone,
  scrollIntoView = false,
  focus = false,
  children,
}: HighlightProps) {
  const child = Children.only(children) as ReactElement<{
    className?: string;
    ref?: Ref<HTMLElement>;
  }>;
  const nodeRef = useRef<HTMLElement | null>(null);
  // Set when a run finishes, so a later `duration` change can't re-arm the
  // timers and call onDone twice. Reset on each activation.
  const doneRef = useRef(false);
  const [stage, setStage] = useState<Stage>('on');

  // Render-phase reset on a false → true change (React's "adjust state when a
  // prop changes" pattern): a new activation always starts at 'on'.
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setStage('on');
  }

  // Latest callbacks and flags, so a new identity on each render never
  // restarts the timers or re-runs scroll/focus.
  const latest = useRef({ onDone, scrollIntoView, focus });
  useEffect(() => {
    latest.current = { onDone, scrollIntoView, focus };
  });

  // Activation side effects: scroll + focus, once per false → true change.
  useEffect(() => {
    if (!active) return;
    doneRef.current = false;
    const node = nodeRef.current;
    if (!node) return;
    if (latest.current.scrollIntoView) {
      node.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
    if (latest.current.focus) node.focus({ preventScroll: true });
  }, [active]);

  // Lifecycle timers: hold → (fade) → done.
  useEffect(() => {
    // Declared after the activation effect, so doneRef is already reset in the same commit.
    if (!active || doneRef.current || !Number.isFinite(duration)) return;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      doneRef.current = true;
      setStage('done');
      latest.current.onDone?.();
    };
    const holdTimer = setTimeout(() => {
      if (prefersReducedMotion()) {
        finish();
      } else {
        setStage('fading');
        fadeTimer = setTimeout(finish, FADE_MS);
      }
    }, duration);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(fadeTimer);
    };
  }, [active, duration]);

  const phase = active && stage !== 'done' ? stage : undefined;
  const className =
    [child.props.className, phase && styles.highlight].filter(Boolean).join(' ') || undefined;

  return cloneElement(child, {
    className,
    'data-highlight': phase,
    ref: mergeRefs(nodeRef, child.props.ref),
  } as object);
}
