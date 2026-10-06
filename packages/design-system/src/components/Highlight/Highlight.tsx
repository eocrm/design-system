import {
  Children,
  cloneElement,
  useEffect,
  useMemo,
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
   * How long the ring holds before fading, in ms. Read when the highlight
   * starts; changing it mid-run has no effect. A non-finite value
   * (`Infinity`, `NaN`) keeps it on until `active` goes false. Default: `3000`.
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
   * Exactly one element that forwards `ref` and `className` to a DOM element
   * (nothing else is needed): any DS component, or a native element such as
   * `<tr>` or `<li>`. Highlight renders no wrapper of its own.
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
  const [stage, setStage] = useState<Stage>('on');

  // Render-phase reset on a false → true change (React's "adjust state when a
  // prop changes" pattern): a new activation always starts at 'on'.
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setStage('on');
  }

  // Latest props, read once at activation, so a new callback identity or a
  // mid-run `duration` change never restarts the timers or re-runs scroll/focus.
  const latest = useRef({ onDone, duration, scrollIntoView, focus });
  useEffect(() => {
    latest.current = { onDone, duration, scrollIntoView, focus };
  });

  // One run per false → true change: scroll + focus, then hold → (fade) → done.
  useEffect(() => {
    if (!active) return;
    const node = nodeRef.current;
    if (node) {
      if (latest.current.scrollIntoView) {
        node.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      }
      if (latest.current.focus) node.focus({ preventScroll: true });
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Highlight: child did not attach the ref — it must forward ref and className to a DOM element',
      );
    }

    const { duration: hold } = latest.current;
    if (!Number.isFinite(hold)) return;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
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
    }, hold);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(fadeTimer);
    };
  }, [active]);

  const childRef = child.props.ref;
  const ref = useMemo(() => mergeRefs(nodeRef, childRef), [childRef]);

  const phase = active && stage !== 'done' ? stage : undefined;
  const className =
    [child.props.className, phase && styles.highlight, phase === 'fading' && styles.fading]
      .filter(Boolean)
      .join(' ') || undefined;

  return cloneElement(child, {
    className,
    'data-highlight': phase,
    ref,
  } as object);
}
