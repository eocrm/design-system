import type { Page } from '@playwright/test';

export type Band = 'top' | 'right' | 'bottom' | 'left';
export type Sweep = { measured: number; findings: { key: string; band: Band }[] };

/**
 * Focuses every focusable on the page and measures whether an `overflow`
 * ancestor eats a band of its ring.
 *
 * Focus is set programmatically rather than walked with `Tab`, after one real
 * `Tab` has put the page in keyboard modality. Two reasons, both measured in
 * Chromium rather than assumed:
 *
 * 1. `Tab` cannot reach a roving-tabindex member, and that is where one of the
 *    three clips #510 fixed lives: only the selected `DayCell` is tabbable, and
 *    it is never the first-column cell whose left band the month grid eats.
 * 2. `:focus-visible` is modality-dependent in principle, but Chromium matches
 *    it on programmatic focus — the negative case is a *pointer* interaction,
 *    which this sweep never performs.
 *
 * `preventScroll` only stops the sweep perturbing scroll state as it walks; it
 * is not what makes the result deterministic. Running the shipped sweep with it
 * off produces byte-identical output. Determinism comes from not seeding the
 * clip with the viewport, and from the scroll-axis rule below.
 *
 * WHAT THIS DOES NOT SEE, so nobody reads a green run as more than it is:
 *
 * - **Whatever the caller did not put in front of it.** The script measures
 *   the DOM it is handed. `focus-ring-geometry.spec.ts` hands it a loaded
 *   route with nothing opened, so every closed overlay is absent;
 *   `focus-ring-geometry-overlays.spec.ts` hands it opened surfaces on ten
 *   routes, which is not all of them.
 * - **`border-radius` corners.** The clip rect is the ancestor's padding box
 *   since #526, which is where `overflow` clips — but a rounded corner cuts
 *   further still, and a band lost only to that curve passes.
 * - **`box-shadow` rings.** It looks for a computed `outline`, so a ring
 *   drawn any other way is invisible to it in both directions: never
 *   reported, never confirmed present.
 * - **Rings on an element it cannot focus**, including every
 *   `aria-activedescendant` list, whose rows are never DOM-focused at all.
 * - **One viewport.** `devices['Desktop Chrome']` pins 1280x720, and overflow
 *   clipping is a responsive defect by nature.
 * - **Whether the ring is any GOOD.** Colour is
 *   `packages/design-system/src/styles/contrast.test.ts`; this measures
 *   geometry and nothing else.
 *
 * Two leniencies #526 recorded are CLOSED as of that issue — the border-box
 * clip rect and the scroll extremes — and the comments at each site say what
 * closing them cost.
 */
export const sweepScript = (rootSelector: string | null = null) => `
(() => {
  const ROOT_SELECTOR = ${JSON.stringify(rootSelector)};
  const FOCUSABLE = 'a[href],area[href],button,input,select,textarea,summary,' +
    'iframe,object,embed,audio[controls],video[controls],[tabindex],' +
    '[contenteditable]:not([contenteditable="false"])';

  // Strip the content hash off a CSS-module class so a stylesheet edit does
  // not invalidate every baseline entry. generateScopedName in
  // packages/playground/vite.config.ts is '[name]__[local]__[hash:base64:5]'.
  const mod = (n) =>
    [...n.classList]
      .map((c) => c.replace(/__[\\w+/-]{5}$/, ''))
      .filter((c) => c.includes('__'))
      .sort()
      .join('.');

  // Bare <button>s in a demo have no module class of their own; the nearest
  // ancestor that does keeps their keys apart.
  const stable = (n) => {
    const own = mod(n);
    if (own) return n.tagName.toLowerCase() + '.' + own;
    for (let p = n.parentElement, d = 0; p && d < 3; p = p.parentElement, d++) {
      const m = mod(p);
      if (m) return m + ' >> ' + n.tagName.toLowerCase();
    }
    return n.tagName.toLowerCase();
  };

  const inflate = (r, by) => ({
    top: r.top - by, right: r.right + by, bottom: r.bottom + by, left: r.left - by,
  });
  const intersect = (a, b) => ({
    top: Math.max(a.top, b.top), right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom), left: Math.max(a.left, b.left),
  });
  const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);

  const findings = new Map();
  let measured = 0;
  const previous = document.activeElement;

  // The subtree to sweep. \'null\' means the whole document, which is what the
  // static sweep passes; the overlay sweep passes the open surface, so a menu
  // is measured without re-measuring the page behind it on every trigger.
  const root = ROOT_SELECTOR ? document.querySelector(ROOT_SELECTOR) : document;
  if (!root) return { measured: 0, findings: [] };

  for (const el of root.querySelectorAll(FOCUSABLE)) {
    if (el.disabled || el.closest('[inert]') || !el.checkVisibility()) continue;

    el.focus({ preventScroll: true });
    if (document.activeElement !== el) continue;

    // The ring is not always on the focused element. Image draws it on the
    // wrapper because a wrapper's overflow does not clip its own outline, and
    // every :focus-within / :has() input shell does the same:
    //   grep -rn -B4 'include focus-ring' --include='*.scss' packages/design-system/src \
    //     | grep -E ':has\(|:focus-within'
    // Measure wherever it actually renders, or the sweep certifies the wrong box.
    // outline-style 'auto' is Chromium's own default ring, not one this
    // library declared.
    let ring = null;
    for (let n = el, d = 0; n && d < 5; n = n.parentElement, d++) {
      const s = getComputedStyle(n);
      const w = parseFloat(s.outlineWidth) || 0;
      if (w && s.outlineStyle !== 'none' && s.outlineStyle !== 'auto') { ring = n; break; }
    }
    if (!ring) continue;
    measured++;

    const cs = getComputedStyle(ring);
    const width = parseFloat(cs.outlineWidth) || 0;

    const box = ring.getBoundingClientRect();
    if (!box.width || !box.height) continue;

    // Only real overflow ancestors clip. NOT the viewport: what is below the
    // fold is a scroll position, not a lost ring.
    let clip = { top: -Infinity, left: -Infinity, right: Infinity, bottom: Infinity };
    let revealUp = false;
    let revealDown = false;
    let revealLeft = false;
    let revealRight = false;
    // A fixed element is clipped by none of its overflow ancestors, and an
    // absolute one only from its containing block outward. Climbing regardless
    // reports rings that are plainly on screen, and a false positive is how a
    // gate gets switched off. Dormant today only because every floating surface
    // here portals to <body>.
    //
    // position !== 'static' is a PROXY for "is the containing block", not a
    // synonym: transform / filter / will-change / contain / perspective
    // establish one too. Accordion's .inner is exactly that (overflow: hidden
    // with transform: translateZ(0)), so an absolutely positioned focusable in
    // an open panel is skipped where it used to be measured. That trades a
    // false-positive class for a narrower false-negative one, which is the
    // right way round for a gate.
    let inContainingBlock = cs.position !== 'absolute';
    // Starts at the ring's parent: an element's own overflow never clips its
    // own outline.
    for (let p = cs.position === 'fixed' ? null : ring.parentElement; p; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (!inContainingBlock) {
        if (pcs.position === 'static') continue;
        inContainingBlock = true;
      }
      if (pcs.overflowX === 'visible' && pcs.overflowY === 'visible') continue;
      // The PADDING box, which is where overflow actually clips — the border
      // box that getBoundingClientRect returns is too generous by the
      // ancestor's border width, a systematic bias toward passing (#526).
      // Tightening it cost nothing: zero new findings on all 106 routes, so
      // the leniency was buying no slack anyone was using. 'border-radius'
      // corners cut further still and are NOT modelled; a ring lost only to
      // the curve of a rounded corner passes.
      const b = p.getBoundingClientRect();
      const r = {
        top: b.top + (parseFloat(pcs.borderTopWidth) || 0),
        bottom: b.bottom - (parseFloat(pcs.borderBottomWidth) || 0),
        left: b.left + (parseFloat(pcs.borderLeftWidth) || 0),
        right: b.right - (parseFloat(pcs.borderRightWidth) || 0),
      };
      // A band outside a scrolling ancestor is one scroll away rather than
      // lost — but only while there is scroll left in that DIRECTION.
      // scrollTop cannot go below 0, so the top band of a scroller's first
      // child is permanently unreachable, and the same holds at all four
      // extremes. This used to drop the whole AXIS as soon as anything could
      // scroll it, which made the sweep silent on exactly the shape it exists
      // for: the first row of a scrollable list, the first item in a menu.
      //
      // So the four directions are tracked separately (#526). #523 recorded a
      // fear that tightening this would make 'Rail' fire on all 93 routes;
      // measured, it produces TWO findings on one key, both real — Image's
      // Retry button is wider than a 20px thumbnail wrapper, so its inset
      // ring's left band sits outside a container that can never scroll to
      // reveal it.
      //
      // The EPS is subpixel tolerance: scroll offsets are fractional, and a
      // scroller sitting 0.5px off its extreme is at the extreme.
      //
      // An 'overflow: clip' ancestor never scrolls, whatever scrollHeight
      // reports for it. An 'overflow: hidden' one does: it cannot be scrolled
      // by a USER, but its offsets are settable, and treating it as immovable
      // is what would make every hidden ancestor a clipper.
      const scrollsY = pcs.overflowY !== 'clip' && p.scrollHeight > p.clientHeight;
      const scrollsX = pcs.overflowX !== 'clip' && p.scrollWidth > p.clientWidth;
      const EPS = 1;
      revealUp = revealUp || (scrollsY && p.scrollTop > EPS);
      revealDown = revealDown || (scrollsY && p.scrollTop < p.scrollHeight - p.clientHeight - EPS);
      revealLeft = revealLeft || (scrollsX && p.scrollLeft > EPS);
      revealRight = revealRight || (scrollsX && p.scrollLeft < p.scrollWidth - p.clientWidth - EPS);
      // PER AXIS. The guard above only skips an ancestor when BOTH axes are
      // visible, so a mixed one — 'overflow: clip visible', a horizontal
      // scroller with a visible block axis — used to clip all four sides here
      // and report bands that are plainly painted. That made the sweep blind
      // to the narrowest real remedy for a clip: stop clipping the axis that
      // never overflowed. PersonDisplay's Description is the live case.
      // Exact, not a leniency: an inline-axis clip does not clip vertically.
      const clipsX = pcs.overflowX !== 'visible';
      const clipsY = pcs.overflowY !== 'visible';
      if (clipsY && !revealUp) clip.top = Math.max(clip.top, r.top);
      if (clipsY && !revealDown) clip.bottom = Math.min(clip.bottom, r.bottom);
      if (clipsX && !revealLeft) clip.left = Math.max(clip.left, r.left);
      if (clipsX && !revealRight) clip.right = Math.min(clip.right, r.right);
    }

    // A focusable that is itself wholly outside its clip — inside a collapsed
    // nav group, say — has no ring on screen to lose. That is a different bug
    // from a clipped ring, and reporting all four of its bands buries the ones
    // that matter.
    if (area(intersect(box, clip)) === 0) continue;

    const offset = parseFloat(cs.outlineOffset) || 0;
    const inner = inflate(box, offset);
    const outer = inflate(box, offset + width);
    const bands = {
      top:    { ...outer, bottom: inner.top },
      bottom: { ...outer, top: inner.bottom },
      left:   { ...outer, right: inner.left },
      right:  { ...outer, left: inner.right },
    };

    for (const [band, rect] of Object.entries(bands)) {
      // A band with no area of its own is not a clip — skip it rather than
      // reporting every zero-height ring as lost.
      if (area(rect) === 0) continue;
      if (area(intersect(rect, clip)) === 0) findings.set(stable(ring) + '|' + band, { key: stable(ring), band });
    }
  }

  if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
  else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

  return { measured, findings: [...findings.values()] };
})()
`;

/** Runs the sweep in the page and returns its result, typed. */
export const sweep = (page: Page, rootSelector: string | null = null): Promise<Sweep> =>
  page.evaluate(sweepScript(rootSelector)) as Promise<Sweep>;
