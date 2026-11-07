/**
 * Elements whose press performs their own action — a tap on (or inside) one
 * must never be hijacked by a surrounding gesture (Tooltip's tap toggle #567,
 * DashboardCanvas's touch long-press DS-15).
 */
export const INTERACTIVE_SELECTOR =
  'a[href], button, input, select, textarea, summary, label, audio[controls], video[controls], [contenteditable="true"], [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="combobox"], [role="slider"], [role="spinbutton"], [role="treeitem"], [role="gridcell"]';
