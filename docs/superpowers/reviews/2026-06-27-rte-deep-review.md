# RichTextEditor deep review — performance + simplification (2026-06-27)

Two fresh-context deep reviews (performance, simplification) of the whole
`RichTextEditor` (editor + overlays + hooks + the pure `RichText/engine`). Verdict:
the code is unusually disciplined — pure engine layer, isolated DOM glue, heavy
comments, no dead branches. The wins are targeted, not sweeping.

**No public-API breaking changes were found or proposed.** Everything below is an
internal trade-off / judgment call. The clearly-safe items are already shipped.

## Already shipped (safe, no behavior change)

- **v0.1.95** — `perf/rte-safe-wins` (#239): memoize `renderDoc` output (stops the
  whole doc tree rebuilding on every selection/hover/focus re-render — the biggest
  win, scales with doc size); `React.memo` + stable callbacks so the block gutter +
  image resizer don't re-render every keystroke; `marksEqual` fast paths; shared
  `MARK_ORDER`; `collapsedRange()`; named `Rect` type; shared `preventSelectionLoss`.
- **v0.1.96** — `refactor/rte-shared-hooks` (#240): `marksBeforeCaret` primitive;
  `useAnchoredFloating`, `useDismissOnOutsidePointerDown`, `useShellRelativeRect`,
  `useDraggingReporter` — dedup the overlay/measurement/dismiss scaffolding.

---

## Decision list — trade-offs to weigh (NOT yet implemented)

### Performance

**P-A. Consolidate the three `selectionchange` listeners into one.**
Today, with `toolbar` + `blockControls` + `mentions` all on, each caret move (and
every keystroke moves the caret) runs `readSelection` up to 3× — once for toolbar
active-marks, once for caret→active-block, once for the mention recompute. Each
`readSelection` walks the DOM (a `Range` + `range.toString()` over the block, ×2 for
anchor/focus), so it's ~6 range walks per caret move.

- **Benefit:** one `readSelection` per event, fanned out. ~3× fewer DOM range walks
  on the hottest path; matters most with multiple features on and/or large blocks.
- **Trade-off / risk:** merges three independently-gated (`toolbar`, `controlsOn`,
  `enabled`), independently-tested subscription lifecycles — `useMention` owns its
  own listener. Real refactor + test-churn risk in a focus-sensitive path.
- **Recommendation:** worth doing if profiling shows caret-move cost; medium effort.

**P-B. Throttle or cache `blockAtPointerY` (gutter hover).**
When the pointer is in the gutter/left-padding column, every `mousemove` does an
O(blocks-above-pointer) `getBoundingClientRect` scan to resolve which row to
activate. Bounded and only in that column, but O(n) layout reads per move on a large
doc.

- **Benefit:** smoother gutter hover on large docs.
- **Trade-off:** an `rAF` throttle is near-safe but slightly delays activation; rect
  caching is faster but adds a cache-invalidation contract the current code
  deliberately avoids. Low–medium impact (only large docs + `blockControls`).
- **Recommendation:** `rAF` throttle if it ever feels laggy; skip otherwise.

**P-C. Per-block memoization of `renderDoc` output (large-doc typing).**
After v0.1.95, the only inherent per-keystroke O(n) is `renderDoc` rebuilding all
block elements when `value` changes (React then reconciles keyed blocks cheaply).
For very large docs, caching each unchanged block's element (blocks are immutable)
would cut the rebuild to just the edited block.

- **Trade-off:** a substantial `renderDoc` refactor; **only** justified by a real
  profile showing typing jank in big docs. Don't do speculatively.

**P-D. (small, deferred-but-safe) `useMention` recomputes twice per keystroke.**
A keystroke fires both the `[doc]` effect and `selectionchange`, each calling
`recompute`/`readSelection` (guarded against redundant renders, so wasted compute,
not extra renders). Narrowing to one trigger is low-risk but mention-behavior-
adjacent, so I left it for your call. Low impact; fold into P-A if you do that.

### Simplification

**S-A. Extract feature hooks from the 1572-line `RichTextEditor.tsx`.**
Real seams exist: the link editor (`useLinkEditor`), attachment config
(`useAttachmentConfig`), block controls, and history glue. The cleanest two
(`useLinkEditor`, `useAttachmentConfig`) each depend on little beyond `commit`.

- **Benefit:** smaller, more navigable editor file; each feature testable in
  isolation.
- **Trade-off:** the clusters share a dense web of refs (`commit`, `liveDocRef`,
  `latest`, `pendingSelectionRef`, `rootRef`, `historyRef`) and the
  `beforeinput`/`keydown` handlers read pending-mark/history refs directly. Threading
  4–6 refs into each hook risks trading one long file for several files + a
  coordination layer, with real regression surface in a contentEditable. It's an
  architecture/taste call, not mechanical.
- **Recommendation:** if pursued, do ONLY `useLinkEditor` + `useAttachmentConfig`
  first (smallest blast radius, ~80 lines each); leave history/pending-marks/
  block-controls inline. The strong test suite would catch breakage.

**S-B. Unify the toolbar "operative range" fallback.**
Mark/block/list buttons fall back to the `selection` state; color/emoji fall back to
`lastSelectionRef.current`. This is **intentional** — mark buttons use
`onMouseDown preventDefault` so focus never leaves (live `readSelection` succeeds),
while the color/emoji popovers take focus (need the last-known selection).

- **Options:** (a) unify all on `lastSelectionRef.current` — behavior-equivalent in
  the common path, slightly more robust when the selection is momentarily null, but
  touches a focus-sensitive path; or (b) just add a one-line comment at each site
  explaining the divergence. Low payoff either way.
- **Recommendation:** (b) document it; only do (a) if you want strict consistency.

**S-C. Delete `clampPoint` (engine/position.ts) — dead internal code.**
Referenced only by its own test; no production caller; not exported from the public
index. A tested pure helper that nothing uses.

- **Trade-off:** it's a plausible future offset-clamping primitive (~6 lines).
- **Recommendation:** delete (with its test) only if you want a "no unused engine
  exports" rule; otherwise harmless to keep.

---

## Not issues (verified, leave as-is)

`FALLBACK_SENTINEL` (load-bearing for the `renderLink` resolved/declined probe);
`liveDocRef` vs `latest.current.value` (correctness-critical split for async upload
settles); the gutter overlays' `retry` state (real mount-race fix); the `default:`
arms in the `wrapMark` switches (defensive). Engine transforms are O(edited block),
history is bounded/coalesced, and the closed color popovers don't render their 62
badges — all fine.
