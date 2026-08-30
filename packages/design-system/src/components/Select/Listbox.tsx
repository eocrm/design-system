import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size as floatingSize,
  useFloating,
} from '@floating-ui/react-dom';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { useSelectContext, type SelectContextValue } from './context';
import { mergeRefs } from '../_internal/refs';
import { overlayStack, useFloatingSurface, useInOverlay } from '../_internal/overlay';
import type { SelectOption } from './utils-types';
import { isCreateRow } from './utils';
import { Empty } from './Empty';
import { Loading } from './Loading';
import { ErrorRow } from './Error';
import styles from './Select.module.scss';

/**
 * Portaled listbox panel. Positioned by Floating UI relative to the
 * trigger, dismissed on outside-click and Escape, restores active row
 * to the current selection (or first selectable) on open.
 *
 * Only mounted when `ctx.open` is true — there is no exit animation
 * because the node is unmounted. Click-to-select is wired here; the
 * keyboard handlers live on the Trigger so the trigger keeps focus
 * while the listbox is open (combobox / single-mode-button pattern).
 */
export function Listbox() {
  const ctx = useSelectContext('Listbox');
  const t = useTranslation();

  // Deferred by a tick so a listbox that OPENS already loading still
  // announces — mounting region and text together announces nothing.
  const [statusText, setStatusText] = useState('');
  // Synchronous Select: emptiness is always a result. Async: only once the
  // settled query matches the one on screen.
  const emptyIsSettled = ctx.loadedQuery === undefined || ctx.loadedQuery === ctx.query;
  useEffect(() => {
    // Error included. Dropping `role="alert"` from the error row removed the
    // one Select announcement that actually worked — `alert` is specified to
    // announce content inserted together with its node, so it was not one of
    // the three broken mechanisms. Without this the region reset to '' on
    // rejection and the failure was silent.
    // Empty included, but only once the emptiness is a RESULT. For an async
    // Select, `loading` is false for the entire debounce window while the rows
    // are still the previous query's — so this announced "No options." on every
    // open before the first fetch started, and "No results for X" about a
    // search that had not run, re-firing per keystroke because the
    // interpolated query made each string distinct. A synchronous Select has
    // no such window and announces immediately.
    //
    // "Nothing matched" is the most useful thing a Select can say — a keyboard user typing into a combobox gets no other signal that
    // the list went empty — and it was announced by nothing: the row carries
    // no live region and this one did not cover the state. Hard rule 10 wants
    // chosen silence written down, and this silence was not chosen.
    setStatusText(
      ctx.error
        ? t('select.loadFailed')
        : ctx.loading && ctx.rows.length === 0
          ? t('select.statusLoading')
          : ctx.rows.length === 0 && emptyIsSettled
            ? ctx.query && ctx.query.trim() !== ''
              ? t('select.noResultsFor', { query: ctx.query })
              : `${t('select.noOptions')}.`
            : '',
    );
    // `ctx.error` is in the deps deliberately. It happens to work without it
    // — a rejection also flips `loading` — but that is a coincidence of the
    // current hook, and there is no eslint in this repo to catch the day it
    // stops being true.
  }, [ctx.error, ctx.loading, ctx.rows.length, ctx.query, emptyIsSettled, t]);
  const inOverlay = useInOverlay(ctx.triggerRootRef, ctx.open);
  // #274: hosts yield Escape while we're open — our own capture/element
  // handler closes us on the same press instead of the Modal/Drawer.
  const floatingId = useFloatingSurface(ctx.open);

  const { refs, floatingStyles, isPositioned } = useFloating({
    open: ctx.open,
    placement: 'bottom-start',
    // `transform: false` — emit `top` / `left` positioning instead of an
    // inline `transform: translate(...)`. The open animation in
    // Select.module.scss animates `transform: scale(...)` on the panel; if
    // Floating UI also wrote `transform`, the keyframe would clobber the
    // inline translate and the panel would visibly snap to the document
    // origin before jumping to the trigger. Matches DropdownMenu and
    // Popover Content.
    transform: false,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      // Match listbox width to trigger width and clamp height so a long
      // option list scrolls inside the panel instead of pushing the
      // viewport bounds.
      floatingSize({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: '320px',
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
    elements: { reference: ctx.triggerRootRef.current },
  });

  // Outside-click closes. Capture-phase pointerdown fires before any
  // focused widget's handlers, matching the Popover / DropdownMenu
  // patterns. Clicks on the trigger are excluded so its own toggle
  // handler isn't double-fired; clicks on the panel are excluded so
  // option clicks aren't swallowed (they also preventDefault on
  // pointerdown — belt-and-suspenders).
  useEffect(() => {
    if (!ctx.open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const panel = ctx.listboxRef.current;
      const trigger = ctx.triggerRootRef.current;
      if (panel && panel.contains(target)) return;
      if (trigger && trigger.contains(target)) return;
      ctx.setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [ctx.open, ctx.listboxRef, ctx.triggerRootRef, ctx.setOpen]);

  // Escape closes and returns focus to the trigger. Capture-phase so a
  // future in-panel input (Phase 5/6 search input) can't stop the event
  // before we see it.
  useEffect(() => {
    if (!ctx.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // #280: defer to a DEEPER floating surface — only the innermost closes.
        // A Select listbox is normally innermost, so this is uniformity/safety
        // net, not load-bearing; the real Select-in-Popover fix is the Popover
        // deferring to us.
        if (!overlayStack.isTopFloating(floatingId)) return;
        e.preventDefault();
        overlayStack.consumeEscape(e); // hosts yield even if we ran first (#274)
        ctx.closeAndFocusTrigger();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [ctx.open, ctx.closeAndFocusTrigger, floatingId]);

  // On open: pre-highlight the current selection (if any), else the
  // first non-disabled option. Trigger's ArrowUp handler may override
  // this via a queueMicrotask to "last selectable" — that's fine, this
  // layout effect runs first and the microtask wins.
  // Only fires on the `ctx.open` transition; row changes mid-open don't
  // reset the cursor.
  useLayoutEffect(() => {
    if (!ctx.open) return;
    const firstSelectedIdx = ctx.rows.findIndex(
      (r) =>
        r.kind === 'option' &&
        !r.option.disabled &&
        (ctx.multiple
          ? (ctx.value as string[]).includes(r.option.value)
          : ctx.value === r.option.value),
    );
    if (firstSelectedIdx >= 0) {
      ctx.setActiveIndex(firstSelectedIdx);
      return;
    }
    const firstSelectableIdx = ctx.rows.findIndex((r) => r.kind === 'option' && !r.option.disabled);
    ctx.setActiveIndex(firstSelectableIdx >= 0 ? firstSelectableIdx : -1);
    // Intentionally only depends on `ctx.open`: this effect seeds the active
    // row on the open transition, and must NOT re-run when `ctx.rows` or
    // `ctx.value` shift mid-open (that would yank the cursor out from under
    // the user's keyboard / mouse navigation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.open]);

  // #305: keep the active option visible inside the height-clamped panel.
  // aria-activedescendant means DOM focus never enters the listbox, so
  // nothing scrolls it natively — with >~8 options the active row moves
  // below the fold and the highlight disappears. One effect here covers
  // every setActiveIndex source (trigger keyboard, typeahead, in-panel
  // search, open seeding). Gated on isPositioned: before Floating UI
  // places the portaled panel it sits at the document origin, where
  // scrollIntoView would scroll the WINDOW to the top (see the identical
  // fix in DropdownMenu/Content.tsx, #303) — and the size clamp hasn't
  // been applied yet anyway. `block: 'nearest'` no-ops for
  // already-visible rows, so mouse-hover activation causes no jumps.
  // Guarded — jsdom has no scrollIntoView.
  useEffect(() => {
    if (!ctx.open || !isPositioned || ctx.activeIndex < 0) return;
    const row = ctx.rows[ctx.activeIndex];
    if (!row || row.kind !== 'option') return;
    document
      .getElementById(ctx.getOptionId(row.option.value))
      ?.scrollIntoView?.({ block: 'nearest' });
    // ctx.rows is read fresh but intentionally not a dep: a mid-open rows
    // identity change (async load, filtering) must not re-scroll a row the
    // user has already scrolled away from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.open, isPositioned, ctx.activeIndex]);

  return createPortal(
    <div
      ref={mergeRefs<HTMLDivElement>(ctx.listboxRef, refs.setFloating)}
      data-in-overlay={inOverlay ? '' : undefined}
      className={clsx(styles.listbox)}
      style={floatingStyles}
    >
      {/* In-panel search for multi-summary-searchable mode. Single-mode
          searchable Select keeps the search input AS the trigger
          (ComboboxInputTrigger) since there's no second trigger to compete
          with; multi-summary keeps a select-only combobox trigger that shows
          the summary, so this filter is its sibling inside the panel. */}
      {ctx.multiple && ctx.triggerDisplay === 'summary' && ctx.searchable && <InPanelSearchInput />}
      {/* ONE live region for the whole listbox, outside the <ul>.
          Each of the three state rows used to carry its own announcement, in
          three different and partly invalid ways: `aria-live` on
          `<li role="presentation">` (a global attribute, so the presentation
          role was discarded and the row was exposed as a list item inside a
          listbox), and `role="alert"` on another `<li>` — the same
          required-children deviation. All three also mounted their region
          together with its text, which most screen readers do not announce.
          Rendered unconditionally here with the text deferred, per Hard rule
          10. See #495. */}
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {statusText}
      </span>
      <ul
        id={ctx.listboxId}
        role="listbox"
        aria-multiselectable={ctx.multiple || undefined}
        aria-labelledby={ctx.triggerId}
        tabIndex={-1}
        data-in-overlay={inOverlay ? '' : undefined}
        className={styles.listboxBody}
      >
        {renderListboxBody(ctx, t)}
      </ul>
    </div>,
    document.body,
  );
}

/**
 * Decide what goes in the listbox body. Three short-circuits ahead of the
 * normal row walk:
 *
 * 1. Loading — async request is in flight AND we have nothing else to show.
 *    Once a previous result is in `rows`, we keep showing it instead of
 *    swapping to a spinner (UI doesn't flicker between every keystroke).
 * 2. Error — the latest async request rejected. Surfaces a Retry button.
 * 3. Empty — no rows after filtering and we're not loading or in error.
 *
 * Each branch consults the consumer's `renderLoading` / `renderError` /
 * `renderEmpty` first, falling back to the bundled defaults.
 */
function renderListboxBody<T>(
  ctx: SelectContextValue<T>,
  t: ReturnType<typeof useTranslation>,
): ReactNode {
  const showLoading = ctx.loading && ctx.rows.length === 0;
  const showError = !!ctx.error && !ctx.loading;
  const showEmpty = !ctx.loading && !ctx.error && ctx.rows.length === 0;

  if (showLoading) {
    return ctx.renderLoading ? (
      <li className={styles.stateRow} role="presentation">
        {ctx.renderLoading()}
      </li>
    ) : (
      <Loading />
    );
  }
  if (showError) {
    return ctx.renderError ? (
      <li className={styles.stateRow} role="presentation">
        {ctx.renderError(ctx.error as Error, ctx.retry)}
      </li>
    ) : (
      <ErrorRow error={ctx.error as Error} onRetry={ctx.retry} />
    );
  }
  if (showEmpty) {
    return ctx.renderEmpty ? (
      <li className={styles.stateRow} role="presentation">
        {ctx.renderEmpty(ctx.query)}
      </li>
    ) : (
      <Empty query={ctx.query} />
    );
  }

  // Walk the flat rows array, wrapping each header + its following option
  // rows in `<li role="group" aria-labelledby={headerId}>` so the listbox
  // exposes proper grouping semantics. The flat index `i` is preserved
  // across the wrapping — Trigger's keyboard logic computes
  // `aria-activedescendant` from it, so option rows inside groups MUST
  // keep the same index they would have had in the flat map.
  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < ctx.rows.length) {
    const row = ctx.rows[i];
    if (row.kind === 'header') {
      const headerLabel = row.label;
      const headerId = ctx.getGroupHeaderId(headerLabel);
      const groupChildren: ReactNode[] = [];
      // Non-focusable header row; `data-group-header` is the hook
      // grouped-options tests query against (avoids relying on the hashed
      // CSS-module class name).
      groupChildren.push(
        <li key={`h-${i}`} id={headerId} data-group-header="" className={styles.groupHeader}>
          {headerLabel}
        </li>,
      );
      let j = i + 1;
      while (j < ctx.rows.length && ctx.rows[j].kind === 'option') {
        const optRow = ctx.rows[j] as Extract<(typeof ctx.rows)[number], { kind: 'option' }>;
        const selected = ctx.multiple
          ? (ctx.value as string[]).includes(optRow.option.value)
          : ctx.value === optRow.option.value;
        const active = ctx.activeIndex === j;
        groupChildren.push(renderOptionRow(optRow.option, j, selected, active, ctx, t));
        j++;
      }
      nodes.push(
        <li role="group" key={`g-${i}`} aria-labelledby={headerId}>
          <ul role="none" className={styles.groupList}>
            {groupChildren}
          </ul>
        </li>,
      );
      i = j;
      continue;
    }
    // Ungrouped (flat) option row.
    const optRow = row;
    const selected = ctx.multiple
      ? (ctx.value as string[]).includes(optRow.option.value)
      : ctx.value === optRow.option.value;
    const active = ctx.activeIndex === i;
    nodes.push(renderOptionRow(optRow.option, i, selected, active, ctx, t));
    i++;
  }
  return nodes;
}

/**
 * Render one `<li role="option">` row. Extracted as a module-local helper
 * so the listbox loop can call it from two call sites — the in-group path
 * and the flat-options path — without duplicating the JSX.
 *
 * `i` is the flat index into `ctx.rows`; it MUST match the index Trigger's
 * keyboard handlers compute against, since `aria-activedescendant` and
 * `ctx.setActiveIndex` both key off it.
 */
function renderOptionRow<T>(
  opt: SelectOption<T>,
  i: number,
  selected: boolean,
  active: boolean,
  ctx: SelectContextValue<T>,
  // Threaded rather than hooked: these are plain functions, not components.
  t: ReturnType<typeof useTranslation>,
): ReactNode {
  // Creatable "+ Create <query>" row. Rendered distinctly (italic + accent
  // colour via `.optionCreate`) and dispatches `onCreate` plus the same
  // single-vs-multi commit flow as a normal option click.
  if (isCreateRow(opt)) {
    return (
      <li
        key="__create__"
        id={ctx.getOptionId(opt.value)}
        role="option"
        aria-selected={false}
        className={clsx(styles.option, styles.optionCreate, active && styles.optionActive)}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => {
          ctx.onCreate?.(opt.label);
          if (ctx.multiple) {
            const next = [...((ctx.value as string[]) ?? []), opt.value];
            ctx.setValue(next);
            if (ctx.searchable) ctx.setQuery('');
          } else {
            ctx.setValue(opt.value);
            ctx.closeAndFocusTrigger();
          }
        }}
        onMouseEnter={() => ctx.setActiveIndex(i)}
      >
        {t('select.createOption', { label: opt.label })}
      </li>
    );
  }
  // Consumer's `renderOption` wins over the default label rendering. The
  // create-row branch above intentionally does NOT pass through here —
  // "+ Create" is internal chrome the consumer doesn't know about.
  const body = ctx.renderOption ? ctx.renderOption(opt, { active, selected }) : opt.label;

  return (
    <li
      key={opt.value}
      id={ctx.getOptionId(opt.value)}
      role="option"
      aria-selected={selected}
      aria-disabled={opt.disabled || undefined}
      className={clsx(
        styles.option,
        active && styles.optionActive,
        selected && styles.optionSelected,
        opt.disabled && styles.optionDisabled,
      )}
      onPointerDown={(e) => {
        // Stop the document-level outside-click pointerdown handler from
        // closing the listbox before the click resolves. The click handler
        // still fires and commits the selection.
        e.preventDefault();
      }}
      onClick={() => {
        if (opt.disabled) return;
        if (ctx.multiple) {
          ctx.toggleValue(opt.value);
          // Multi + searchable mode (chips-input or in-panel search):
          // clear the query so the user can immediately pick another
          // option without manually erasing the previous filter.
          if (ctx.searchable) ctx.setQuery('');
        } else {
          ctx.setValue(opt.value);
          ctx.closeAndFocusTrigger();
        }
      }}
      onMouseEnter={() => {
        if (!opt.disabled) ctx.setActiveIndex(i);
      }}
    >
      {body}
    </li>
  );
}

/**
 * Search input rendered beside the listbox inside the panel for the
 * multi-summary-searchable variant. The trigger remains a select-only
 * combobox that shows the comma-joined selection summary; this sibling
 * searchbox filters without becoming an invalid child of the listbox.
 *
 * Owns its own keyboard handling: ArrowUp/Down cycle the active option,
 * Enter toggles selection, Escape closes and returns focus to the trigger.
 * This duplicates a small slice of `useTriggerKeyboard.moveActive` —
 * deliberate, since the trigger hook is button-shaped and pulling the
 * cycle logic into a shared hook would obscure both call sites at this
 * scale. Revisit if Phase 6's chips trigger lands a third copy.
 */
function InPanelSearchInput() {
  const ctx = useSelectContext('Listbox.SearchInput');
  const t = useTranslation();
  const ref = useRef<HTMLInputElement>(null);

  // Auto-focus on mount so the user starts typing immediately after
  // clicking the trigger. `preventScroll` avoids the portaled panel
  // yanking the viewport on focus.
  useLayoutEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  const activeRow = ctx.activeIndex >= 0 ? ctx.rows[ctx.activeIndex] : undefined;
  const activeOptionId =
    activeRow && activeRow.kind === 'option' ? ctx.getOptionId(activeRow.option.value) : undefined;

  return (
    <input
      ref={ref}
      type="text"
      role="searchbox"
      aria-controls={ctx.listboxId}
      aria-activedescendant={activeOptionId}
      aria-autocomplete="list"
      className={styles.popoverSearch}
      placeholder={t('select.search')}
      autoComplete="off"
      spellCheck={false}
      value={ctx.query}
      onChange={(e) => ctx.setQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const delta = e.key === 'ArrowDown' ? +1 : -1;
          const len = ctx.rows.length;
          if (len === 0) return;
          let i = ctx.activeIndex;
          for (let s = 0; s < len; s++) {
            i = (i + delta + len) % len;
            const r = ctx.rows[i];
            if (r.kind === 'option' && !r.option.disabled) {
              ctx.setActiveIndex(i);
              break;
            }
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const row = ctx.rows[ctx.activeIndex];
          if (row && row.kind === 'option' && !row.option.disabled) {
            if (isCreateRow(row.option)) {
              ctx.onCreate?.(row.option.label);
              const next = [...((ctx.value as string[]) ?? []), row.option.value];
              ctx.setValue(next);
              ctx.setQuery('');
            } else {
              ctx.toggleValue(row.option.value);
            }
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          ctx.closeAndFocusTrigger();
        }
      }}
    />
  );
}
