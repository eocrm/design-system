import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { AccordionContext, type AccordionContextValue } from './context';
import { AccordionItem } from './AccordionItem';
import { AccordionTrigger } from './AccordionTrigger';
import { AccordionContent } from './AccordionContent';
import styles from './Accordion.module.scss';

/** Selection mode. */
export type AccordionMode = 'single' | 'multiple';

/** Heading level wrapping the trigger button. Defaults to 'h3'. */
export type AccordionHeaderLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/**
 * Visual variant. Defaults to `'bordered'`.
 * - `'bordered'` — outer border + radius + dividing lines between items. Standard standalone look.
 * - `'borderless'` — no outer border, no item borders, transparent background. Use when the accordion sits inside another bordered container (e.g., a Card) or as a section divider.
 */
export type AccordionVariant = 'bordered' | 'borderless';

/**
 * Trigger size — controls font-size + padding. Defaults to `'md'`.
 * - `'sm'` — `--font-size-sm`, tighter padding. Dense settings panels.
 * - `'md'` — `--font-size-md`, default padding. Most use cases.
 * - `'lg'` — `--font-size-lg`, larger padding. Hero FAQ sections.
 */
export type AccordionSize = 'sm' | 'md' | 'lg';

/**
 * Spacing between items. When set, items render as separated **cards** (each gets
 * its own border + radius) and the joined container chrome (outer border + item
 * dividers) is dropped. Omit for the default joined look. `'sm'`/`'md'`/`'lg'`
 * step the gap. Applies regardless of `variant`.
 */
export type AccordionGap = 'sm' | 'md' | 'lg';

/** Which side the trigger indicator (chevron) sits on. Defaults to `'right'`. */
export type AccordionIndicatorSide = 'left' | 'right';

/**
 * Whether a `<Accordion.Trigger actions>` slot stays visible when its item is
 * collapsed. `'show'` (default) keeps controls always visible; `'hide'` fades them
 * out (and removes them from focus order) while the item is closed — useful for a
 * dense sidebar of collapsed blocks whose controls act on hidden body content.
 */
export type AccordionActionsWhenClosed = 'show' | 'hide';

interface AccordionBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'defaultValue' | 'onChange'
> {
  /** Visual variant. Defaults to `'bordered'`. */
  variant?: AccordionVariant;
  /** Trigger size (font + padding). Defaults to `'md'`. */
  size?: AccordionSize;
  /**
   * Gap between items → separated "card" look (each item gets its own border +
   * radius; the outer container chrome is dropped). Omit for the joined default.
   */
  gap?: AccordionGap;
  /** Which side the chevron indicator sits on. Defaults to `'right'`. */
  indicatorSide?: AccordionIndicatorSide;
  /**
   * Whether `Accordion.Trigger` `actions` stay visible when the item is collapsed.
   * Defaults to `'show'`; `'hide'` fades them out (and drops them from focus order)
   * while closed.
   */
  actionsWhenClosed?: AccordionActionsWhenClosed;
  children: ReactNode;
}

/** Root props — `type='single'` variant. */
interface AccordionSingleProps {
  type: 'single';
  /** Controlled open item value. `''` = nothing open (only meaningful when `collapsible`). */
  value?: string;
  /** Initial open item for uncontrolled use. */
  defaultValue?: string;
  /** Fires when the open item changes. */
  onValueChange?: (next: string) => void;
  /**
   * When true, clicking the currently-open item closes it. Default: `false`
   * (matches Radix; prevents accidentally closing the only available content).
   */
  collapsible?: boolean;
}

/** Root props — `type='multiple'` variant. */
interface AccordionMultipleProps {
  type: 'multiple';
  /** Controlled open items array. */
  value?: string[];
  /** Initial open items for uncontrolled use. */
  defaultValue?: string[];
  /** Fires when the set of open items changes. */
  onValueChange?: (next: string[]) => void;
  collapsible?: never;
}

/** Discriminated union — `type` drives which variant of value/onValueChange is required. */
export type AccordionProps = AccordionBaseProps & (AccordionSingleProps | AccordionMultipleProps);

/**
 * Vertically-stacked collapsible panels. Compound component with `Item`, `Trigger` and `Content`.
 * @see docs/components/Accordion.md
 */
const AccordionRoot = forwardRef<HTMLDivElement, AccordionProps>(
  function AccordionRoot(props, ref) {
    if (props.type === 'single') {
      return <AccordionSingleImpl {...props} ref={ref} />;
    }
    return <AccordionMultipleImpl {...props} ref={ref} />;
  },
);

interface SingleImplProps extends AccordionBaseProps, AccordionSingleProps {}

const AccordionSingleImpl = forwardRef<HTMLDivElement, SingleImplProps>(
  function AccordionSingleImpl(
    {
      type: _type,
      value,
      defaultValue,
      onValueChange,
      collapsible = false,
      variant = 'bordered',
      size = 'md',
      gap,
      indicatorSide = 'right',
      actionsWhenClosed = 'show',
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const [internalValue, setInternalValue] = useState<string>(defaultValue ?? '');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const isOpen = useCallback((itemValue: string) => currentValue === itemValue, [currentValue]);

    const toggle = useCallback(
      (itemValue: string) => {
        if (currentValue === itemValue) {
          if (collapsible) {
            if (!isControlled) setInternalValue('');
            onValueChange?.('');
          }
        } else {
          if (!isControlled) setInternalValue(itemValue);
          onValueChange?.(itemValue);
        }
      },
      [currentValue, collapsible, isControlled, onValueChange],
    );

    const ctx = useMemo<AccordionContextValue>(
      () => ({ mode: 'single', isOpen, toggle }),
      [isOpen, toggle],
    );

    return (
      <AccordionContext.Provider value={ctx}>
        {/* Pattern A — consumer props reach the div, but data-accordion /
            data-variant / data-size / className are set AFTER the spread so
            the keyboard-scope marker, variant, size, and component class
            can't be overridden by a consumer. */}
        <div
          ref={ref}
          {...rest}
          data-accordion=""
          data-variant={variant}
          data-size={size}
          data-gap={gap}
          data-indicator-side={indicatorSide}
          data-actions-when-closed={actionsWhenClosed}
          className={clsx(styles.accordion, className)}
        >
          {children}
        </div>
      </AccordionContext.Provider>
    );
  },
);

interface MultipleImplProps extends AccordionBaseProps, AccordionMultipleProps {}

const AccordionMultipleImpl = forwardRef<HTMLDivElement, MultipleImplProps>(
  function AccordionMultipleImpl(
    {
      type: _type,
      value,
      defaultValue,
      onValueChange,
      variant = 'bordered',
      size = 'md',
      gap,
      indicatorSide = 'right',
      actionsWhenClosed = 'show',
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? []);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const isOpen = useCallback(
      (itemValue: string) => currentValue.includes(itemValue),
      [currentValue],
    );

    const toggle = useCallback(
      (itemValue: string) => {
        const next = currentValue.includes(itemValue)
          ? currentValue.filter((v) => v !== itemValue)
          : [...currentValue, itemValue];
        if (!isControlled) setInternalValue(next);
        onValueChange?.(next);
      },
      [currentValue, isControlled, onValueChange],
    );

    const ctx = useMemo<AccordionContextValue>(
      () => ({ mode: 'multiple', isOpen, toggle }),
      [isOpen, toggle],
    );

    return (
      <AccordionContext.Provider value={ctx}>
        {/* Pattern A — consumer props reach the div, but data-accordion /
            data-variant / data-size / className are set AFTER the spread so
            the keyboard-scope marker, variant, size, and component class
            can't be overridden by a consumer. */}
        <div
          ref={ref}
          {...rest}
          data-accordion=""
          data-variant={variant}
          data-size={size}
          data-gap={gap}
          data-indicator-side={indicatorSide}
          data-actions-when-closed={actionsWhenClosed}
          className={clsx(styles.accordion, className)}
        >
          {children}
        </div>
      </AccordionContext.Provider>
    );
  },
);

/**
 * Compound export.
 * @see docs/components/Accordion.md
 */
export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});
