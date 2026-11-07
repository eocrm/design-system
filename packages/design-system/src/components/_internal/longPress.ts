/**
 * Touch long-press (DS-15): a finger must hold still this long before a press arms (a drag in
 * DashboardCanvas, a range selection in Chart), so a swipe stays a page scroll.
 */
export const LONG_PRESS_MS = 300;
/** Pointer travel (px) that turns a pending press into a scroll (touch) or a drag (mouse in Chart). */
export const LONG_PRESS_SLOP_PX = 8;
