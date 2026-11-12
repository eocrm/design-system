import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { useControllableState } from '../_internal/useControllableState';
import { LONG_PRESS_MS, pastSlop } from '../_internal/longPress';
import type { ChartPlotPointerEvent, ChartSelectOn } from './Chart';
import { categoryIndexAt, type ChartGeometry } from './chartModel';
import { rangeFromIndices, resolveRange, type ChartRange } from './chartRange';
import {
  domainFractionAt,
  ensureVisible,
  visibleIndexRange,
  zoomViewport,
  type ChartViewport,
} from './chartViewport';
import { useRangeWarning, type ChartDomain } from './useChartDomain';
import { useChartGestures } from './useChartGestures';

/** Span multiplier of one `+` key press (`-` divides by it). */
const KEY_ZOOM = 0.5;
const sameViewport = (a: ChartViewport | null, b: ChartViewport | null) =>
  a === b || (!!a && !!b && a.from === b.from && a.to === b.to);

/** What set the inspected category. */
export type ChartInspectSource = 'pointer' | 'keyboard';

export interface ChartInteractionOptions {
  /** `useChartDomain`'s result, from the same render. */
  domain: ChartDomain;
  /** Geometry of the laid-out view (`null` before measuring or while empty). `valueAt` (y scale inverse) feeds
   * `onPlotDoubleClick`'s `value`; without it `value` is `null`. */
  layout: (ChartGeometry & { valueAt?: (svgY: number) => number }) | null;
  /** The focusable plot element (pointer + keyboard target). */
  plotEl: HTMLElement | null;
  /** The figure: focus lands here when "Reset zoom" swaps the plot for the empty state. */
  rootEl: HTMLElement | null;
  /** The chart renders its empty state (no plot). */
  empty: boolean;
  selectedRange?: ChartRange | null;
  defaultSelectedRange?: ChartRange | null;
  onSelectedRangeChange?: (range: ChartRange | null) => void;
  /** Default `'drag'`. */
  selectOn?: ChartSelectOn;
  /** Default `false`. */
  zoomGestures?: boolean;
  onPlotDoubleClick?: (e: ChartPlotPointerEvent) => void;
  /**
   * Seam for synced charts: called after commit whenever the inspected view index or its source changes, by any
   * path (pointer, keyboard, blur, outside press, zoom reset), with `(null, null)` when inspection clears. Not
   * called for the initial `null`.
   */
  onInspect?: (index: number | null, source: ChartInspectSource | null) => void;
}

/**
 * Chart's interaction shell over a laid-out category axis: selection (controllable, with drag / long-press /
 * tap and Shift+arrows), inspection (pointer and keyboard, one inspected view index), viewport gestures and
 * keys, double-click, zoom-to-selection / reset, and the status and live-region notes. Geometry in, state and
 * bound plot handlers out; rendering stays with the chart.
 */
export function useChartInteraction(o: ChartInteractionOptions) {
  const {
    domain,
    layout,
    plotEl,
    rootEl,
    empty,
    selectedRange,
    defaultSelectedRange,
    onSelectedRangeChange,
    selectOn = 'drag',
    zoomGestures = false,
    onPlotDoubleClick,
  } = o;
  const { allCategories, loaded, setZoom, zoomIdx, categories, n, changeViewport, vp } = domain;
  const t = useTranslation();
  const selectable =
    selectedRange !== undefined ||
    defaultSelectedRange !== undefined ||
    onSelectedRangeChange !== undefined;
  const zoomFrom = zoomIdx?.from;
  const zoomTo = zoomIdx?.to;
  const originalIndex = (i: number) => (zoomFrom ?? 0) + i;

  const [selection, setSelection] = useControllableState<ChartRange | null>({
    value: selectedRange,
    defaultValue: defaultSelectedRange ?? null,
    onChange: onSelectedRangeChange,
  });
  useRangeWarning(
    'selectedRange',
    selection,
    loaded && resolveRange(selection, allCategories) === null,
    domain.name,
  );
  const selectionIdx = selectable ? resolveRange(selection, allCategories) : null;
  const hasSelection = selectionIdx !== null;
  // Clipped to the zoom window, in view indices. The part outside is not drawn and a click there clears,
  // but the selection still exists (Escape clears it, and it can be zoomed to).
  const viewFrom = zoomFrom ?? 0;
  const clipFrom = Math.max(selectionIdx?.from ?? 0, viewFrom);
  const clipTo = Math.min(selectionIdx?.to ?? -1, zoomTo ?? allCategories.length - 1);
  const selectedIdx =
    selectionIdx && clipFrom <= clipTo
      ? { from: clipFrom - viewFrom, to: clipTo - viewFrom }
      : null;
  const selectedText = (r: ChartRange) =>
    r.from === r.to
      ? t('chart.selectedOne', { category: r.from })
      : t('chart.selected', { from: r.from, to: r.to });
  // Persistent zoom and selection, in the plot's description (Hard rule 10: a state the user arrives at).
  const zoomedText = (from: string, to: string) =>
    from === to ? t('chart.zoomedOne', { category: from }) : t('chart.zoomed', { from, to });
  // The table caption names the domain (the table lists all of it); the plot names what it shows.
  const zoomText = zoomIdx
    ? zoomedText(allCategories[zoomIdx.from], allCategories[zoomIdx.to])
    : '';
  const shownIdx = vp && visibleIndexRange(vp, n);
  const plotZoomText = shownIdx
    ? zoomedText(categories[shownIdx.from], categories[shownIdx.to])
    : zoomText;
  const statusText = [
    plotZoomText,
    selectionIdx &&
      selectedText(rangeFromIndices(selectionIdx.from, selectionIdx.to, allCategories)),
  ]
    .filter(Boolean)
    .map((part) => `${part}.`)
    .join(' ');
  // Last user selection change, announced until keyboard inspection takes over the live region.
  const [selectionNote, setSelectionNote] = useState('');
  const select = (next: ChartRange | null) => {
    setSelection(next);
    setSelectionNote(next === null ? t('chart.selectionCleared') : selectedText(next));
    setZoomNote('');
  };
  // Hard rule 10: a keyboard zoom says what the plot shows now. Written when the rendered window actually changes
  // (a controlled `viewport` may keep or adjust it), so a no-op zoom is silent; any other window change (wheel,
  // pan, Reset zoom, zoomRange, new data) clears it, so the same text later is heard again.
  const [zoomNote, setZoomNote] = useState('');
  const [keyZoomFrom, setKeyZoomFrom] = useState<string | null>(null);
  const windowKey = `${zoomFrom}|${zoomTo}|${n}|${vp ? `${vp.from}|${vp.to}` : ''}`;
  const [noteWindowKey, setNoteWindowKey] = useState(windowKey);
  if (noteWindowKey !== windowKey || keyZoomFrom !== null) {
    setNoteWindowKey(windowKey);
    setKeyZoomFrom(null);
    const shown = visibleIndexRange(vp, n);
    const changed = noteWindowKey !== windowKey;
    if (keyZoomFrom !== null && keyZoomFrom !== windowKey && n > 0)
      setZoomNote(zoomedText(categories[shown.from], categories[shown.to]));
    else if (changed) setZoomNote('');
  }

  const [active, setActive] = useState<number | null>(null);
  const [activeSource, setActiveSource] = useState<ChartInspectSource | null>(null);
  const current = active !== null && active < n ? active : null;

  // Shift+arrow anchor: the category inspected when Shift was first used; any other key, any pointer
  // inspection and any zoom change drops it.
  const anchor = useRef<number | null>(null);
  const inspect = (index: number | null, source: ChartInspectSource | null) => {
    if (source !== 'keyboard') anchor.current = null;
    setActive(index);
    setActiveSource(index === null ? null : source);
  };
  // A zoom change (ours or the consumer's) re-indexes the view: stale indices would name other categories.
  // Reset during render, so no frame (tooltip, announcement) ever uses an index from the old view.
  const zoomKey = `${zoomFrom}|${zoomTo}`;
  const [inspectedZoomKey, setInspectedZoomKey] = useState(zoomKey);
  if (inspectedZoomKey !== zoomKey) {
    setInspectedZoomKey(zoomKey);
    setActive(null);
    setActiveSource(null);
  }
  useEffect(() => {
    anchor.current = null;
  }, [zoomKey]);
  // Plot-local scalars so `point` keeps its identity until x/y change; the tooltip resolves viewport coords itself.
  // Kept on the plot: with a viewport the inspected category can be scrolled out of view.
  const anchorX =
    current !== null && layout
      ? Math.max(
          layout.plot.x,
          Math.min(layout.plot.x + layout.plot.width, layout.categoryX[current]),
        )
      : undefined;
  const anchorY = layout?.plot.y;
  const point = useMemo(
    () => (anchorX === undefined || anchorY === undefined ? null : { x: anchorX, y: anchorY }),
    [anchorX, anchorY],
  );

  const clampIndex = (i: number) => Math.max(0, Math.min(n - 1, i));
  const rangeAt = (a: number, b: number) =>
    rangeFromIndices(clampIndex(a), clampIndex(b), categories);
  // One category: a second pick of the selected single category clears it, any other replaces the selection.
  const toggleSelect = (i: number) =>
    select(selectedIdx && selectedIdx.from === i && selectedIdx.to === i ? null : rangeAt(i, i));
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const extending = selectable && e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft');
    if (!extending && e.key !== 'Shift') anchor.current = null;
    const plainKey = !e.ctrlKey && !e.metaKey && !e.altKey;
    if (zoomGestures && plainKey && (e.key === '+' || e.key === '=' || e.key === '-')) {
      e.preventDefault();
      // Around the inspected category's centre (as a fraction of the visible plot), else the middle.
      const at =
        current !== null && layout
          ? Math.max(
              0,
              Math.min(1, (layout.categoryX[current] - layout.plot.x) / layout.plot.width),
            )
          : 0.5;
      const next = zoomViewport(vp, e.key === '-' ? 1 / KEY_ZOOM : KEY_ZOOM, at, n);
      if (!sameViewport(next, vp)) {
        changeViewport(next, true);
        setSelectionNote('');
        setKeyZoomFrom(windowKey);
      }
      return;
    }
    if (
      e.key === 'Enter' &&
      onPlotDoubleClick &&
      current !== null &&
      layout &&
      anchorX !== undefined
    ) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      onPlotDoubleClick({
        index: originalIndex(current),
        fraction: (current + 0.5) / n,
        value: null,
        clientX: rect.left + anchorX,
        clientY: rect.top + layout.plot.y + layout.plot.height / 2,
        source: 'keyboard',
      });
      return;
    }
    if (e.key === ' ' && selectable && plainKey && !e.shiftKey && current !== null) {
      e.preventDefault();
      toggleSelect(current);
      return;
    }
    let next: number | null;
    switch (e.key) {
      case 'ArrowRight':
        next = current === null ? 0 : Math.min(n - 1, current + 1);
        break;
      case 'ArrowLeft':
        next = current === null ? n - 1 : Math.max(0, current - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = n - 1;
        break;
      case 'Escape':
        // Mid-drag, Escape cancels the gesture only: the release then commits nothing.
        if (press.current) {
          e.preventDefault();
          press.current = null;
          setDraft(null);
          return;
        }
        if (hasSelection) {
          e.preventDefault();
          select(null);
          return;
        }
        if (current === null) return; // let a surrounding dialog close
        next = null;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (extending && next !== null) {
      anchor.current ??= current ?? next;
      select(rangeAt(anchor.current, next));
    } else {
      setSelectionNote('');
      setZoomNote('');
    }
    // Pan any window (app-set too) so keyboard inspection never lands off-screen.
    if (next !== null) {
      const panned = ensureVisible(vp, next, n);
      if (!sameViewport(panned, vp)) changeViewport(panned, true);
    }
    inspect(next, 'keyboard');
  };

  // A tap leaves the tooltip open (touch fires pointerleave right after pointerup, which
  // we ignore). Dismiss it on the next press outside the plot instead of relying on the
  // plot losing focus: mobile Safari does not reliably focus a tabIndex div on tap.
  const pointerActive = activeSource === 'pointer' && current !== null;
  useEffect(() => {
    if (!pointerActive || !plotEl) return;
    const dismiss = (e: Event) => {
      // composedPath, not target: inside a shadow root the target is retargeted to the host.
      if (e.composedPath().includes(plotEl)) return;
      setActive(null);
      setActiveSource(null);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [pointerActive, plotEl]);

  const indexAt = (e: PointerEvent<HTMLElement>) =>
    layout
      ? categoryIndexAt(layout, e.clientX - e.currentTarget.getBoundingClientRect().left)
      : null;

  // Mouse/pen selection: a press becomes a drag once it moves past the slop; a release without one is a click.
  // Touch: the press stays `pending` (a tap or a scroll) until it holds still for LONG_PRESS_MS, then it
  // lifts into a drag; moving past the slop first hands the gesture to the page (the browser pans).
  type Press = {
    id: number;
    index: number;
    x: number;
    y: number;
    dragging: boolean;
    touch?: 'pending' | 'lifted';
  };
  const press = useRef<Press | null>(null);
  const liftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // An unmount mid-press must not fire the lift on a detached plot.
  useEffect(() => () => clearTimeout(liftTimer.current), []);
  const [draft, setDraft] = useState<{ from: number; to: number } | null>(null);

  // Reset zoom into all-null data swaps the plot for the EmptyState: keep focus in the figure.
  const refocusAfterReset = useRef(false);
  useEffect(() => {
    if (!refocusAfterReset.current) return;
    refocusAfterReset.current = false;
    if (empty) rootEl?.focus();
  });

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const index = indexAt(e);
    if (index === null) return;
    if (selectable && (e.pointerType === 'mouse' || e.pointerType === 'pen') && e.button === 0) {
      press.current = { id: e.pointerId, index, x: e.clientX, y: e.clientY, dragging: false };
    } else if (selectable && e.pointerType === 'touch' && !press.current) {
      const lifting: Press = {
        id: e.pointerId,
        index,
        x: e.clientX,
        y: e.clientY,
        dragging: false,
        touch: 'pending',
      };
      press.current = lifting;
      const plot = e.currentTarget;
      // Every teardown just drops `press`, so the timer checks identity instead of being cleared.
      liftTimer.current = setTimeout(() => {
        if (press.current !== lifting) return;
        lifting.touch = 'lifted';
        lifting.dragging = true;
        // Keep the moves and the release when the finger leaves the plot mid-drag.
        plot.setPointerCapture?.(lifting.id);
        setDraft({ from: lifting.index, to: lifting.index });
      }, LONG_PRESS_MS);
    }
    inspect(index, 'pointer');
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const index = indexAt(e);
    if (index === null) return;
    const p = press.current;
    if (p && p.id === e.pointerId && p.touch === 'pending') {
      // Past the slop before the timer: the page's scroll, not ours.
      if (pastSlop(e.clientX - p.x, e.clientY - p.y)) press.current = null;
    } else if (p && p.id === e.pointerId) {
      if (!p.dragging && pastSlop(e.clientX - p.x, e.clientY - p.y)) {
        p.dragging = true;
        // Keep receiving moves and the release when the pointer leaves the plot mid-drag.
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      if (p.dragging) setDraft({ from: Math.min(p.index, index), to: Math.max(p.index, index) });
    }
    inspect(index, 'pointer');
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    setDraft(null);
    const index = indexAt(e) ?? p.index;
    if (p.dragging) select(rangeAt(p.index, index));
    else if (selectOn === 'tap') toggleSelect(index);
    else if (
      hasSelection &&
      (selectedIdx === null || index < selectedIdx.from || index > selectedIdx.to)
    )
      select(null);
  };

  const onPointerCancel = () => {
    press.current = null;
    setDraft(null);
  };

  const firePlotDoubleClick = (clientX: number, clientY: number, source: 'mouse' | 'touch') => {
    if (!layout || !plotEl || !onPlotDoubleClick) return;
    const rect = plotEl.getBoundingClientRect();
    const x = clientX - rect.left;
    onPlotDoubleClick({
      index: originalIndex(categoryIndexAt(layout, x)),
      fraction: domainFractionAt(layout, x),
      value: layout.valueAt ? layout.valueAt(clientY - rect.top) : null,
      clientX,
      clientY,
      source,
    });
  };
  const gestures = useChartGestures({
    plotEl,
    layout,
    enabled: zoomGestures,
    selectable,
    viewport: vp,
    n,
    onChange: changeViewport,
    onDoubleClick: onPlotDoubleClick && firePlotDoubleClick,
    // A lifted long-press selection keeps the touch; otherwise a pending one gives way to the pan/pinch.
    claim: () => {
      if (press.current?.touch === 'lifted') return false;
      if (press.current?.touch === 'pending') press.current = null;
      return true;
    },
  });

  // Touch scroll suppression, as in DashboardCanvas (DS-15): the plot keeps `touch-action: pan-y` so a
  // swipe scrolls, and touch-action can't change mid-gesture, so a lifted press cancels its own
  // touchmoves instead. Bound non-passive for as long as selection is on (a browser may decide at
  // touchstart whether to wait for listeners). `contextmenu` is what a held finger would open.
  useEffect(() => {
    if (!selectable || !plotEl) return;
    const block = (e: Event) => {
      if (press.current?.touch === 'lifted') e.preventDefault();
    };
    plotEl.addEventListener('touchmove', block, { passive: false });
    plotEl.addEventListener('contextmenu', block);
    return () => {
      plotEl.removeEventListener('touchmove', block);
      plotEl.removeEventListener('contextmenu', block);
    };
  }, [selectable, plotEl]);

  // Synced-chart seam: report inspection changes after commit, from every path that sets them.
  const { onInspect } = o;
  const reported = useRef<string>('null|null');
  useEffect(() => {
    // No index, no source: data shrinking under the inspected index leaves `activeSource` set.
    const source = current === null ? null : activeSource;
    const key = `${current}|${source}`;
    if (reported.current === key) return;
    reported.current = key;
    onInspect?.(current, source);
  });

  // The clicked button unmounts (zoom clears the selection; reset removes itself): keep focus on the plot.
  const zoomToSelection = () => {
    if (!selection) return;
    setZoom(selection);
    setSelection(null);
    setSelectionNote('');
    plotEl?.focus();
  };
  // Clears both in one action; the viewport first, so the zoomRange reset finds no window left to notify about.
  const resetZoom = () => {
    if (vp) changeViewport(null, true);
    if (zoomIdx !== null) setZoom(null);
    plotEl?.focus();
    refocusAfterReset.current = true;
  };

  return {
    /** Selection is on (any of the three selection props was passed). */
    selectable,
    /** Inspected view index (`null` = none) and what set it. */
    current,
    activeSource,
    /** Committed selection clipped to the view, in view indices; `null` when none is in view. */
    selectedIdx,
    /** A selection exists (possibly outside the zoomed view). */
    hasSelection,
    /** In-progress drag range, in view indices. */
    draft,
    /** Tooltip anchor in plot coordinates (the inspected category, clamped to the plot). */
    point,
    /** Persistent plot description: zoom window and selection. */
    statusText,
    /** Zoomed domain text for the data table caption (`''` unzoomed). */
    zoomText,
    /** Live-region notes, highest priority first: the last selection change, then the last keyboard zoom. */
    selectionNote,
    zoomNote,
    /** Header zoom buttons: show "Reset zoom" while `zoomed`, "Zoom to selection" while `hasSelection`. */
    zoomed: zoomIdx !== null || vp !== null,
    zoomToSelection,
    resetZoom,
    /** Spread on the focusable plot element. */
    plotHandlers: {
      onKeyDown,
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        gestures.onPointerMove(e);
        onPointerMove(e);
      },
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        gestures.onPointerDown(e);
        onPointerDown(e);
      },
      onPointerUp: (e: PointerEvent<HTMLElement>) => {
        gestures.onPointerUp(e);
        onPointerUp(e);
      },
      onPointerCancel: (e: PointerEvent<HTMLElement>) => {
        gestures.onPointerUp(e);
        onPointerCancel();
      },
      onDoubleClick: gestures.onDoubleClick,
      // Touch fires pointerleave right after pointerup; keep the tapped tooltip (an outside press clears it).
      onPointerLeave: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'touch' && activeSource === 'pointer') inspect(null, null);
      },
      onBlur: () => inspect(null, null),
    },
  };
}

/** What `useChartInteraction` returns. */
export type ChartInteraction = ReturnType<typeof useChartInteraction>;
