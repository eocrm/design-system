import {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useDropdownMenuContext } from './context';
import { mergeRefs } from '../_internal/refs';
import styles from './DropdownMenu.module.scss';

/** Item color treatment. */
export type DropdownMenuItemTone = 'default' | 'danger';

export interface DropdownMenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Called when the item is activated (click or Enter/Space). The consumer performs the action. */
  onSelect: () => void;
  /**
   * Visual tone.
   * - `'default'` — normal action.
   * - `'danger'` — destructive (Delete, Revoke, Remove). Reserve for irreversible operations.
   */
  tone?: DropdownMenuItemTone;
  /** Leading icon. Rendered in a fixed-size slot so labels stay aligned across items. */
  icon?: ReactNode;
  /** Trailing shortcut hint (e.g. `'⌘D'`). Visual cue only — does NOT register a global key handler. */
  shortcut?: string;
  /**
   * Trailing secondary content *about the item itself* — a region code, a
   * count, a `<Badge>`. Distinct from `shortcut`, which is a keyboard hint
   * and is styled (and free to evolve) as one.
   *
   * `ReactNode`, so a Badge or Dot can go here. It is NOT `aria-hidden`, so
   * it joins the item's accessible name ("demo RU" rather than a second
   * identical "demo") — which is the point when the label alone is
   * ambiguous. It is a prop, not a child, so it stays out of the typeahead
   * label; type-to-select still matches the pure label text.
   *
   * Renders before `shortcut` when both are present, keeping the keyboard
   * hint rightmost.
   */
  meta?: ReactNode;
  /** Disabled items are skipped by keyboard nav, dimmed, and don't fire `onSelect` on click. */
  disabled?: boolean;
  /**
   * Whether to close the menu after `onSelect` fires. Defaults to `true`.
   *
   * Set to `false` when this item is wrapped in a Popover/ConfirmationPopover
   * trigger — the trigger will open its panel on this click; closing the
   * menu would unmount the popover before the user could interact with it.
   * The menu can be dismissed separately (Escape or outside-click).
   */
  closeOnSelect?: boolean;
}

/**
 * A selectable menu item. Self-registers with the DropdownMenu context for
 * keyboard navigation and typeahead. Fires `onSelect` on activation.
 *
 * @example
 * <DropdownMenu.Item onSelect={onRename}>Rename</DropdownMenu.Item>
 *
 * @example
 * // Two trailing slots, deliberately different things:
 * // `shortcut` is a keyboard hint; `meta` qualifies the item itself and
 * // joins the accessible name ("Duplicate 3 files").
 * <DropdownMenu.Item onSelect={onDuplicate} meta="3 files" shortcut="⌘D">
 *   Duplicate
 * </DropdownMenu.Item>
 *
 * @remarks Anti-patterns
 * - ❌ Using `shortcut` to carry text that is not a keyboard hint (a region
 *   code, a count, a status). It is styled as a key hint and may become a
 *   `<Kbd>` key cap. Use `meta` for that.
 */
export const Item = forwardRef<HTMLDivElement, DropdownMenuItemProps>(function Item(
  {
    onSelect,
    tone = 'default',
    icon,
    shortcut,
    meta,
    disabled = false,
    closeOnSelect = true,
    className,
    children,
    onClick: consumerOnClick,
    ...rest
  },
  forwardedRef,
) {
  const ctx = useDropdownMenuContext('Item');
  const itemRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  // String children become the typeahead label. Non-string fall back to '';
  // typeahead won't match those, which is acceptable.
  const label = typeof children === 'string' ? children : '';

  // useLayoutEffect (not useEffect) so item registration completes BEFORE
  // Content's parent useLayoutEffect runs to set activeIndex on open.
  useLayoutEffect(() => {
    return ctx.registerItem({ id, ref: itemRef, disabled, label });
  }, [ctx, id, disabled, label]);

  const index = ctx.itemsRef.current.findIndex((x) => x.id === id);
  const isActive = index !== -1 && index === ctx.activeIndex;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    // Run consumer's onClick first (e.g., injected by <Popover.Trigger> when
    // this Item is wrapped as a popover trigger). Consumer can call
    // `e.preventDefault()` to short-circuit the default onSelect+closeAll;
    // otherwise we proceed.
    consumerOnClick?.(e);
    if (e.defaultPrevented) return;
    onSelect();
    if (closeOnSelect) ctx.closeAll();
  };

  return (
    // {...rest} first so consumer-supplied props don't override the menuitem
    // ARIA contract (role/tabIndex/aria-disabled) or our event wiring.
    // onClick is owned by Item — we chain the consumer's onClick inside
    // handleClick instead of letting {...rest} spread it (it would be
    // overridden anyway by the explicit onClick below).
    <div
      {...rest}
      ref={mergeRefs<HTMLDivElement>(itemRef, forwardedRef)}
      role="menuitem"
      tabIndex={isActive ? 0 : -1}
      aria-disabled={disabled || undefined}
      data-tone={tone}
      className={clsx(styles.item, className)}
      onClick={handleClick}
    >
      {icon !== undefined && <span className={styles.icon}>{icon}</span>}
      <span className={styles.itemLabel}>{children}</span>
      {meta !== undefined && <span className={styles.meta}>{meta}</span>}
      {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
    </div>
  );
});

/** Visual divider between groups of items. Decorative — `role="separator"`. */
export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

/** Decorative visual divider between groups of items. `role="separator"`, not focusable. */
export const Separator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(function Separator(
  { className, ...rest },
  ref,
) {
  return (
    // {...rest} last; Separator is decorative and a consumer is free to
    // override role/className for their own grouping conventions.
    <div ref={ref} role="separator" className={clsx(styles.separator, className)} {...rest} />
  );
});
