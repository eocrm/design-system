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

interface AccordionBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'defaultValue' | 'onChange'
> {
  /** Visual variant. Defaults to `'bordered'`. */
  variant?: AccordionVariant;
  /** Trigger size (font + padding). Defaults to `'md'`. */
  size?: AccordionSize;
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
 * Vertically-stacked collapsible panels. Compound component:
 *
 * - `<Accordion>` — root (this component). Configures mode + state + collapsible.
 * - `<Accordion.Item value>` — one section, identified by a string value.
 * - `<Accordion.Trigger>` — clickable header (wrapped in `<h3>` by default).
 * - `<Accordion.Content>` — the collapsible body.
 *
 * Two modes via the discriminated `type` prop:
 * - `type='single'` — one item open at a time. Optional `collapsible` lets the user close the open item.
 * - `type='multiple'` — any combination of items can be open.
 *
 * Both controlled (`value` + `onValueChange`) and uncontrolled (`defaultValue`) supported.
 *
 * @example
 * // Single-open with collapsible (FAQ-style)
 * <Accordion type="single" collapsible defaultValue="faq-2">
 *   <Accordion.Item value="faq-1">
 *     <Accordion.Trigger>How do I reset my password?</Accordion.Trigger>
 *     <Accordion.Content>Visit Settings → Security → Reset.</Accordion.Content>
 *   </Accordion.Item>
 *   <Accordion.Item value="faq-2">
 *     <Accordion.Trigger>How do I export my data?</Accordion.Trigger>
 *     <Accordion.Content>Use the gear icon → Export → CSV.</Accordion.Content>
 *   </Accordion.Item>
 * </Accordion>
 *
 * @example
 * // Multiple — independent sections
 * <Accordion type="multiple" defaultValue={['account', 'notifications']}>
 *   <Accordion.Item value="account">...</Accordion.Item>
 *   <Accordion.Item value="notifications">...</Accordion.Item>
 * </Accordion>
 *
 * @example
 * // Controlled
 * const [open, setOpen] = useState('');
 * <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
 *   ...
 * </Accordion>
 *
 * @remarks When NOT to use
 * - Mutually-exclusive view switchers → `<Tabs>`.
 * - Single show/hide toggle → `<Button>` + conditional render.
 * - Sequential wizard flows → dedicated Stepper (not yet shipped).
 *
 * @remarks Anti-patterns
 * - ❌ Nesting `<Accordion.Trigger>` inside a heading the consumer also renders. Trigger wraps itself in a heading.
 * - ❌ Manually setting `aria-expanded` on the Trigger via `{...props}`. The component owns the ARIA contract.
 * - ❌ Using `headerLevel="h1"`. There should only be one `<h1>` per page; Accordion lives below it.
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
          className={clsx(styles.accordion, className)}
        >
          {children}
        </div>
      </AccordionContext.Provider>
    );
  },
);

/** Compound export. */
export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});
