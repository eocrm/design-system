import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
  type Placement,
} from '@floating-ui/react-dom';
import clsx from 'clsx';
import { useDropdownMenuContext } from './context';
import { mergeRefs } from '../_internal/refs';
import styles from './DropdownMenu.module.scss';

/** Which side of the trigger the menu prefers. Floating UI auto-flips if it doesn't fit. */
export type DropdownMenuSide = 'top' | 'bottom' | 'left' | 'right';
/** Which edge of the menu aligns to the corresponding trigger edge. */
export type DropdownMenuAlign = 'start' | 'center' | 'end';

/**
 * Content props.
 *
 * Note: the `style` prop from `HTMLAttributes` is reserved — Floating UI sets
 * inline `position`/`top`/`left` styles to position the menu. A consumer
 * `style` value is silently overridden. Set `minWidth` via the prop, not via
 * `style`. Class-based styling (`className` / SCSS module) is the supported
 * customization surface.
 */
export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Preferred side. Default `'bottom'`. Auto-flips on collision. */
  side?: DropdownMenuSide;
  /** Edge alignment. Default `'start'`. */
  align?: DropdownMenuAlign;
  /** Gap in px between trigger and menu. Default `4`. */
  sideOffset?: number;
  /** Minimum width in px or any CSS length. Defaults to the trigger's width. */
  minWidth?: number | string;
}

/**
 * The floating menu panel. Renders only when the menu is open, portaled to
 * `document.body`, positioned by Floating UI. Owns the keyboard handlers
 * (Escape, Tab, Arrow, Home/End, Enter/Space, typeahead) and outside-click
 * dismissal.
 */
export const Content = forwardRef<HTMLDivElement, DropdownMenuContentProps>(function Content(
  { side = 'bottom', align = 'start', sideOffset = 4, minWidth, className, children, ...rest },
  forwardedRef,
) {
  const ctx = useDropdownMenuContext('Content');
  const inOverlay = ctx.inOverlay;

  const placement: Placement = (align === 'center' ? side : `${side}-${align}`) as Placement;

  const {
    refs,
    floatingStyles,
    placement: resolvedPlacement,
  } = useFloating({
    open: ctx.open,
    placement,
    transform: false,
    middleware: [
      offset(sideOffset),
      flip(),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, rects, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${availableHeight}px`,
            minWidth:
              typeof minWidth === 'number'
                ? `${minWidth}px`
                : ((minWidth as string | undefined) ?? `${rects.reference.width}px`),
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
    elements: { reference: ctx.triggerRef.current },
  });

  const [resolvedSide, resolvedAlign = 'center'] = resolvedPlacement.split('-') as [
    DropdownMenuSide,
    DropdownMenuAlign | undefined,
  ];

  const setFloatingRef = mergeRefs<HTMLDivElement>(refs.setFloating, forwardedRef);

  const typeaheadRef = useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({
    buffer: '',
    timer: null,
  });

  useEffect(() => {
    return () => {
      if (typeaheadRef.current.timer) clearTimeout(typeaheadRef.current.timer);
    };
  }, []);

  // Outside-click: pointerdown on document, target is neither inside this
  // Content nor inside the Trigger, AND not inside any other open submenu
  // panel (recognised by [data-dropdown-menu-content]) OR any open popover
  // panel (recognised by [data-popover-content]). Excluding the trigger
  // prevents fighting the trigger's own toggle handler. Excluding popovers
  // lets a Popover opened from inside a menu item handle its own clicks
  // (Cancel/Confirm buttons, form controls) without collapsing the menu.
  useEffect(() => {
    if (!ctx.open) return;
    const onPointerDown = (e: globalThis.PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const content = refs.floating.current;
      const trigger = ctx.triggerRef.current;
      if (content && content.contains(target)) return;
      if (trigger && trigger.contains(target)) return;
      // If the click is inside a deeper submenu panel or any popover panel,
      // let that surface handle it.
      const allPanels = document.querySelectorAll(
        '[data-dropdown-menu-content], [data-popover-content]',
      );
      for (const panel of allPanels) {
        if (panel !== content && panel.contains(target)) return;
      }
      ctx.setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [ctx, refs]);

  // Escape: close from anywhere (focus may be on the trigger or inside the menu).
  // Tab: close and return focus to trigger when focus is inside the menu.
  // These use document-level listeners so they fire regardless of which element
  // currently holds focus.
  // For subs (depth > 0): stop propagation after handling Escape so the
  // parent Content's listener does not also close the parent.
  useEffect(() => {
    if (!ctx.open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Only handle Escape for this level if focus is inside this panel or
        // no deeper sub is open. A deeper sub (higher depth) will have
        // registered its own capture listener and should handle Escape first.
        // Since deeper subs register their listener AFTER this one (they mount
        // later), and both listeners are on document in capture phase, this
        // listener fires BEFORE the sub's listener. Skip here if a deeper
        // panel is open — the sub's listener will handle it and stop propagation.
        if (ctx.depth === 0) {
          const deeperPanels = document.querySelectorAll(
            `[data-dropdown-menu-content][data-dropdown-depth]`,
          );
          let hasDeeper = false;
          for (const panel of deeperPanels) {
            const depth = Number(panel.getAttribute('data-dropdown-depth') ?? '0');
            if (depth > ctx.depth) {
              hasDeeper = true;
              break;
            }
          }
          if (hasDeeper) return;
        }
        if (ctx.depth > 0) {
          // Stop propagation so the parent Content's listener does not fire.
          e.stopImmediatePropagation();
        }
        ctx.setOpen(false);
        ctx.triggerRef.current?.focus({ preventScroll: true });
        return;
      }
      if (e.key === 'Tab') {
        const content = refs.floating.current;
        const activeEl = document.activeElement as Node | null;
        // Only intercept Tab when focus is inside the menu.
        // Do NOT preventDefault — browser continues Tab traversal from the
        // (now-focused) trigger to the next focusable element (WAI-ARIA menu pattern).
        if (content && activeEl && content.contains(activeEl)) {
          ctx.setOpen(false);
          ctx.triggerRef.current?.focus({ preventScroll: true });
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [ctx, refs]);

  // When the menu opens, set activeIndex from openIntent and focus the active item.
  // useLayoutEffect (not useEffect) so this runs after Items' layout effects
  // have populated itemsRef.current (layout effects fire bottom-up: children first).
  useLayoutEffect(() => {
    if (!ctx.open) return;

    if (ctx.openIntent === null) {
      // Mouse-opened: don't pre-highlight any item. Focus the menu container
      // itself so subsequent Arrow keys still route through handleKeyDown,
      // and so Escape works from inside the menu.
      ctx.setActiveIndex(-1);
      // preventScroll: the portaled menu starts at the document origin until
      // Floating UI's autoUpdate computes the real coords. Focusing it without
      // preventScroll yanks the page to the top.
      queueMicrotask(() => refs.floating.current?.focus({ preventScroll: true }));
      return;
    }

    // Keyboard-opened: focus first/last enabled item per intent.
    const enabled = ctx.itemsRef.current.filter((x) => !x.disabled);
    if (enabled.length === 0) return;
    const target = ctx.openIntent === 'last' ? enabled[enabled.length - 1] : enabled[0];
    const idx = ctx.itemsRef.current.findIndex((x) => x.id === target.id);
    ctx.setActiveIndex(idx);
    queueMicrotask(() => target.ref.current?.focus({ preventScroll: true }));
    ctx.setOpenIntent(null);
    // Depend only on ctx.open so this fires exactly when the menu transitions
    // to open. openIntent is read but not re-fired on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.open]);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      ctx.setOpen(false);
      ctx.triggerRef.current?.focus({ preventScroll: true });
      return;
    }
    if (e.key === 'Tab') {
      // Close, focus trigger, do NOT preventDefault — browser continues Tab
      // traversal from the (now-focused) trigger to the next focusable element
      // (the WAI-ARIA menu pattern).
      ctx.setOpen(false);
      ctx.triggerRef.current?.focus({ preventScroll: true });
      return;
    }

    if (e.key === 'ArrowLeft' && ctx.depth > 0) {
      e.preventDefault();
      ctx.setOpen(false);
      ctx.triggerRef.current?.focus({ preventScroll: true });
      return;
    }

    if (e.key === 'ArrowRight') {
      const items = ctx.itemsRef.current;
      if (ctx.activeIndex >= 0 && ctx.activeIndex < items.length) {
        const target = items[ctx.activeIndex];
        if (target.openSubmenu) {
          e.preventDefault();
          target.openSubmenu();
        }
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const items = ctx.itemsRef.current;
      if (ctx.activeIndex >= 0 && ctx.activeIndex < items.length) {
        const target = items[ctx.activeIndex];
        if (!target.disabled) {
          if (target.openSubmenu) {
            target.openSubmenu();
          } else {
            target.ref.current?.click();
          }
        }
      }
      return;
    }

    const items = ctx.itemsRef.current;
    const enabledIndices = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i !== -1);
    if (enabledIndices.length === 0) return;

    const currentPos = enabledIndices.indexOf(ctx.activeIndex);

    const focusAt = (registryIndex: number) => {
      ctx.setActiveIndex(registryIndex);
      queueMicrotask(() => items[registryIndex].ref.current?.focus({ preventScroll: true }));
    };

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextPos = currentPos === -1 ? 0 : (currentPos + 1) % enabledIndices.length;
        focusAt(enabledIndices[nextPos]);
        return;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevPos =
          currentPos === -1
            ? enabledIndices.length - 1
            : (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
        focusAt(enabledIndices[prevPos]);
        return;
      }
      case 'Home': {
        e.preventDefault();
        focusAt(enabledIndices[0]);
        return;
      }
      case 'End': {
        e.preventDefault();
        focusAt(enabledIndices[enabledIndices.length - 1]);
        return;
      }
    }

    // Typeahead: printable characters (length 1) with no modifier keys append
    // to a debounced buffer and jump to the first non-disabled matching item.
    // This block comes AFTER Enter/Space and Arrow/Home/End so those keys are
    // not accidentally consumed here (' ' is length 1 but is caught above).
    if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
      const ta = typeaheadRef.current;
      ta.buffer += e.key.toLowerCase();
      if (ta.timer) clearTimeout(ta.timer);
      ta.timer = setTimeout(() => {
        ta.buffer = '';
        ta.timer = null;
      }, 500);

      const match = items.findIndex(
        (it) => !it.disabled && it.label.toLowerCase().startsWith(ta.buffer),
      );
      if (match !== -1) {
        e.preventDefault();
        ctx.setActiveIndex(match);
        queueMicrotask(() => items[match].ref.current?.focus({ preventScroll: true }));
      }
      return;
    }
  };

  if (!ctx.open) return null;

  return createPortal(
    // {...rest} first so consumer-supplied props don't override the menu
    // ARIA contract or our event wiring.
    <div
      {...rest}
      ref={setFloatingRef}
      id={ctx.contentId}
      role="menu"
      tabIndex={-1}
      aria-orientation="vertical"
      data-side={resolvedSide}
      data-align={resolvedAlign}
      data-dropdown-menu-content=""
      data-dropdown-depth={ctx.depth}
      data-in-overlay={inOverlay ? '' : undefined}
      style={floatingStyles}
      className={clsx(styles.content, className)}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>,
    document.body,
  );
});
