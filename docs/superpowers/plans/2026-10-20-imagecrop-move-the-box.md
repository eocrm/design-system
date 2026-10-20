# ImageCrop "move the box" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ImageCrop's "drag the image under a fixed box + zoom slider" with "still image, draggable/resizable crop box".

**Architecture:** All crop arithmetic moves into a pure module `cropGeometry.ts` (unit-tested without layout). `ImageCrop.tsx` becomes a thin pointer/keyboard/wheel layer that converts screen deltas to source-pixel deltas and calls those functions. Public `CropArea` contract, `extractCropBlob`, `useCropPreview` untouched.

**Tech Stack:** React 18 + TS, SCSS modules + component tokens, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-20-imagecrop-move-the-box-design.md`

## Global Constraints

- `CropArea` stays in source-image pixels; every emitted value is inside `[0, iw] × [0, ih]`.
- Default crop = 80% of the largest centered box of the target ratio that fits the image.
- Min box = 32 viewport px on the shorter side (convert: `32 / scale` source px).
- Wheel: ±6% per tick around center; `deltaY > 0` grows, `deltaY < 0` shrinks (matches approved prototype). `onChangeEnd` 200ms after last tick.
- Keyboard step = 5 source px. PageUp/PageDown removed.
- Remove props `minZoom`, `maxZoom`, `showZoomControl`; remove i18n `imageCrop.zoom`; add `imageCrop.reset`, `imageCrop.label`, `imageCrop.keyboardHint` (en + ru + messages.ts).
- No raw values in `.module.scss` — tokens in `ImageCrop.tokens.scss` (existing scrim disable stays). No margin/position on `.root` (component doesn't own layout); internal absolute positioning inside the viewport is fine (already used).
- Never inline-disable an `eocrm/*` ESLint rule.
- Vitest runs from `packages/design-system` (`npx vitest run src/components/ImageCrop`).
- Release: `BUMP: minor` → 0.6.0. Follow-up PR after release returns it to `patch`.

## Review Focus

1. **Tiny image smaller than the min box** (e.g. 20×20 source at scale where 32px > image) — min size must clamp to the image size, never produce width > iw. → test in Task 1.
2. **Ratio-locked corner resize hitting an image edge** — must stop on both axes keeping the ratio, not stretch one axis. → test in Task 1.
3. **`value` from the consumer that's out of bounds or wrong ratio** (stale value after src change) — rendering must not crash; next interaction clamps. → test in Task 2.
4. **Wheel while not hovering/when disabled** must not `preventDefault` page scroll. → test in Task 3.
5. **Resize via a handle must not also start a box-move** (event bubbling from handle to box). → test in Task 2.

---

### Task 1: Pure crop geometry

**Files:**
- Create: `packages/design-system/src/components/ImageCrop/cropGeometry.ts`
- Test: `packages/design-system/src/components/ImageCrop/cropGeometry.test.ts`

**Interfaces:**
- Produces:
  - `type Size = { width: number; height: number }`
  - `type Handle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'`
  - `fitImage(viewport: Size, image: Size, padding: number, bottomReserve: number): { scale: number; offsetX: number; offsetY: number }` — contain-fit into `(vpW − 2·padding) × (vpH − padding − bottomReserve)`, centered horizontally, vertically centered inside that area starting at `padding`.
  - `defaultCropArea(image: Size, aspectRatio?: number): CropArea` — ratio = `aspectRatio ?? iw/ih`, largest fitting box × 0.8, centered.
  - `moveCrop(area: CropArea, dx: number, dy: number, image: Size): CropArea` — translate, clamp position.
  - `resizeCrop(start: CropArea, handle: Handle, dx: number, dy: number, image: Size, minSize: number, aspectRatio?: number): CropArea` — opposite edge/corner anchored; edge handles (`n/s/e/w`) only meaningful when free; with ratio, fit `w/h` to ratio by shrinking the larger-relative dimension, then clamp both by the space available from the anchor, re-deriving the other dimension so the ratio holds.
  - `scaleCrop(area: CropArea, factor: number, image: Size, minSize: number, aspectRatio?: number): CropArea` — around center, clamped to image and min, ratio held.
  - `effectiveMin(minSize: number, image: Size): number` — `Math.min(minSize, image.width, image.height)`; used internally by resize/scale.

- [ ] **Step 1: Write failing tests** (image `{1000×800}` throughout unless stated)

```ts
it('fitImage contains the image in the padded area', () => {
  expect(fitImage({ width: 400, height: 400 }, IMG, 16, 56)).toEqual({ scale: 0.368, offsetX: 16, offsetY: 16 + (328 - 294.4) / 2 });
});
it('defaultCropArea square = 80% of 800', () => {
  expect(defaultCropArea(IMG, 1)).toEqual({ x: 180, y: 80, width: 640, height: 640 });
});
it('defaultCropArea free = 80% of image', () => {
  expect(defaultCropArea(IMG)).toEqual({ x: 100, y: 80, width: 800, height: 640 });
});
it('default crop can move on both axes (the bug)', () => {
  const a = defaultCropArea({ width: 800, height: 1200 }, 1);
  expect(a.x).toBeGreaterThan(0);
  expect(a.y).toBeGreaterThan(0);
});
it('moveCrop clamps to image', () => {
  expect(moveCrop(SQ, 10_000, -10_000, IMG)).toMatchObject({ x: 360, y: 0, width: 640, height: 640 });
});
it('resizeCrop se with ratio grows from top-left anchor', () => {
  expect(resizeCrop(SQ, 'se', 50, 50, IMG, 87, 1)).toEqual({ x: 180, y: 80, width: 690, height: 690 });
});
it('resizeCrop ratio-locked stops at edge on both axes', () => {
  const r = resizeCrop(SQ, 'se', 500, 500, IMG, 87, 1);
  expect(r).toEqual({ x: 180, y: 80, width: 720, height: 720 }); // bottom edge limits (800−80)
});
it('resizeCrop nw moves origin, keeps se corner', () => {
  const r = resizeCrop(SQ, 'nw', -50, -50, IMG, 87, 1);
  expect(r.x + r.width).toBe(820); expect(r.y + r.height).toBe(720); expect(r.width).toBe(690);
});
it('resizeCrop free edge e changes width only', () => {
  expect(resizeCrop(FREE, 'e', 50, 999, IMG, 87)).toEqual({ ...FREE, width: 850 });
});
it('resizeCrop respects min size', () => {
  expect(resizeCrop(SQ, 'se', -10_000, -10_000, IMG, 87, 1).width).toBe(87);
});
it('min size clamps to tiny image', () => {
  const tiny = { width: 20, height: 20 };
  const r = scaleCrop(defaultCropArea(tiny, 1), 0.01, tiny, 87, 1);
  expect(r.width).toBeLessThanOrEqual(20); expect(r.x).toBeGreaterThanOrEqual(0);
});
it('scaleCrop grows around center and clamps', () => {
  expect(scaleCrop(SQ, 1.06, IMG, 87, 1)).toEqual({ x: 160.8, y: 60.8, width: 678.4, height: 678.4 });
  expect(scaleCrop(SQ, 10, IMG, 87, 1)).toEqual({ x: 100, y: 0, width: 800, height: 800 });
});
```
(`SQ = defaultCropArea(IMG, 1)`, `FREE = defaultCropArea(IMG)`. Use `toBeCloseTo` per field where floats bite.)

- [ ] **Step 2: Run, expect FAIL** — `cd packages/design-system && npx vitest run src/components/ImageCrop/cropGeometry` → module not found.
- [ ] **Step 3: Implement the functions** per the Interfaces block.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(ImageCrop): pure crop geometry helpers`

---

### Task 2: Component — still image, movable + resizable box, props removed

**Files:**
- Modify: `packages/design-system/src/components/ImageCrop/ImageCrop.tsx`
- Modify: `ImageCrop.module.scss`, `ImageCrop.tokens.scss`
- Modify: `ImageCrop.test.tsx` (drop `zoom` describe + slider assertions; replace `drag` describe)

**Interfaces:**
- Consumes: everything from Task 1.
- Produces: `ImageCropProps` without `minZoom/maxZoom/showZoomControl`. DOM contract tests in Task 3 rely on: box element `data-crop-box` (class `cropBox`), handles `data-handle="<Handle>"`, viewport class `viewport`, `cropBoxActive` class on box while dragging/resizing.
- Module-level constants in `ImageCrop.tsx`: `FIT_PADDING = 16`, `TOOLBAR_RESERVE = 56`, `MIN_BOX_PX = 32` (TS needs numbers for layout math; mirror padding with a `--image-crop-fit-padding` token comment).

Behavior: image placed with `translate(offsetX, offsetY) scale(scale)` from `fitImage`. Box positioned at `offset + area·scale`. Pointer handlers live on the box (move) and on each handle (resize, `stopPropagation` on pointerdown). Dragging converts `dx/scale`. Edge handles render only when `aspectRatio === undefined`. Thirds grid child shown via `cropBoxActive`. Image gets `pointer-events: none`. Initialization effect uses `defaultCropArea(image, aspectRatio)` (no longer needs boxW/boxH). Keep: object-URL, #574 load reset, ResizeObserver, re-measure on load, disabled cleanup effect, `{...rest}` spread. Remove `Slider` import and the zoom state. JSDoc summary → "Controlled, inline image-crop primitive: drag and resize a crop box over a still image."

Styles: `.cropBox` keeps border + scrim, gains `cursor: move`; `.handle` L-corners (tokens `--image-crop-handle-size` (24px hit area → `var(--space-6)`), `--image-crop-handle-thickness`, `--image-crop-handle-color: var(--color-white)` or nearest existing token); `.grid` thirds overlay (token `--image-crop-grid-color`). Remove `.zoomControl`, `.imageDragging`, `--image-crop-gap` if unused. `touch-action: none` on viewport.

- [ ] **Step 1: Write/replace failing tests** (400×400 viewport, 1000×800 image → scale 0.368)

```ts
it('box is positioned from value', /* SQ → left = 16 + 180*0.368, width = 640*0.368 */);
it('dragging the box moves the crop', /* pointerdown box at (200,200), move to (236.8,200) → onChange x≈280 */);
it('drag clamps to image', /* move +1000px → x 360 */);
it('pointerup fires onChangeEnd once with last value');
it('se handle resizes with ratio and does not move the box', /* +18.4px → width≈690, x stays 180; onChange calls never show a moved x */);
it('edge handles only render in free aspect', /* aspectRatio=1 → 4 handles; undefined → 8 */);
it('cropBoxActive class while dragging, removed on pointerup');
it('out-of-bounds value renders without throwing and next drag clamps', /* value {x:-50,y:0,width:2000,height:2000} */);
it('disabled: pointerdown on box/handle does nothing');
it('removed props are gone', /* @ts-expect-error <ImageCrop maxZoom={2} .../> in a type-only test line; no slider role in DOM */);
```
Keep existing rendering/loading, object URL, default-crop (update expected numbers to 80% values), misc, extractCropBlob, useCropPreview, #574 tests.

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** component + styles.
- [ ] **Step 4: Run** `npx vitest run src/components/ImageCrop` → PASS; `npx tsc --noEmit -p .` clean; from repo root `npm run lint:css` clean.
- [ ] **Step 5: Commit** — `feat(ImageCrop)!: still image with draggable/resizable crop box`

---

### Task 3: Wheel, double-click, Reset toolbar, keyboard, a11y, i18n

**Files:**
- Modify: `ImageCrop.tsx`, `ImageCrop.module.scss`, `ImageCrop.tokens.scss`, `ImageCrop.test.tsx`
- Modify: `packages/design-system/src/i18n/{messages.ts,en.ts,ru.ts}`

**Interfaces:**
- Consumes: `scaleCrop`, `moveCrop`, `resizeCrop` ('se' with dx/dy for Shift+Arrows), `defaultCropArea`.
- i18n: `imageCrop: { loadError, reset: 'Reset' / 'Сбросить', label: 'Crop area' / 'Область обрезки', keyboardHint: 'Drag the box to move it, drag corners to resize. Arrow keys move, Shift+Arrow keys resize.' / Russian equivalent }`; delete `zoom`.

Behavior: wheel listener attached natively (`addEventListener('wheel', h, { passive: false })` in an effect) — preventDefault only when interactive (loaded, not disabled). Debounced `onChangeEnd` 200ms via a ref timer cleared on unmount. Double-click on viewport and Reset button both call `reset()` = `onChange(d); onChangeEnd?.(d)`. Toolbar: floating pill (`.toolbar` positioned absolute bottom-center inside viewport, tokens for bg/blur/radius/padding) with library `Button` (size small, variant ghost-ish — use whatever existing variant reads on a dark translucent pill; check `Button.md`). Hidden unless `loadState === 'loaded'`; `disabled` passes through. Keyboard: Arrows → `moveCrop(±5)`; Shift+Arrows → `resizeCrop(value, 'se', ±5, ±5 (ratio) or axis-only (free), …)`; Home/End as today; each key fires `onChange` + `onChangeEnd`. Viewport: `role="group"`, `aria-label={t('imageCrop.label')}`, `aria-describedby` → visually-hidden span with `keyboardHint` (use the library's existing visually-hidden mixin/class).

- [ ] **Step 1: Failing tests**

```ts
it('wheel down grows box 6% around center', /* SQ → width 678.4, x 160.8 */);
it('wheel up shrinks box');
it('wheel fires onChangeEnd once after 200ms', /* vi.useFakeTimers, 3 ticks, advance 200 → 1 call */);
it('wheel when disabled does not preventDefault', /* dispatch WheelEvent cancelable → defaultPrevented false */);
it('double-click resets to default crop and fires onChangeEnd');
it('Reset button resets; hidden while loading');
it('ArrowRight moves x by 5; Shift+ArrowRight grows width by 5 (ratio keeps height)');
it('Home/End jump to corners');
it('PageUp does nothing');
it('viewport has role=group, accessible name "Crop area", description = keyboard hint');
```
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** vitest ImageCrop → PASS; full `npx vitest run` in `packages/design-system` → PASS (catches i18n key-parity tests); `node --test tools/eslint-plugin-eocrm/rules.test.mjs` from root → PASS.
- [ ] **Step 5: Commit** — `feat(ImageCrop): wheel resize, reset, keyboard resize, a11y labels`

---

### Task 4: Docs, playground, manifest, release bump

**Files:**
- Modify: `packages/design-system/docs/components/ImageCrop.md` — "Breaking in 0.6.0" note at top (delete `minZoom`/`maxZoom`/`showZoomControl`, no replacement; shorter component, floating Reset); rewrite interaction bullets (box drag, handles, wheel, dblclick, keyboard); hard rules: drop the pinch/rotation line's zoom wording, keep the rest. Then `npm run build:docs` (in `packages/design-system`).
- Modify: `packages/playground/src/pages/components/ImageCropDemo.tsx` — descriptions: drop "Pattern-A", "slider", "Hand-rolled on <canvas>", "drag/zoom"; free-aspect section describes edge handles.
- Modify: `packages/playground/src/pages/components/SliderDemo.tsx:340` — drop "the canonical ImageCrop zoom control".
- Modify: `packages/playground/src/pages/components/overviewSchematics.tsx:389-401` — replace slider row with a box-with-corner-marks schematic (no slider).
- Check: `packages/design-system/src/components/ColorPicker/SVSquare.tsx:42,155` comments still accurate; edit if they cite image-drag/zoom.
- Modify: `.github/workflows/release.yml:39` — `BUMP: minor`.
- Run: `npm run build:manifest` (design-system) and `npm run build:props` (playground); commit any diffs.

- [ ] **Step 1:** Make the edits above.
- [ ] **Step 2:** `grep -rnE "minZoom|maxZoom|showZoomControl|imageCrop\.zoom" packages --include='*.ts*' --include='*.md' | grep -v node_modules` → no hits outside the Breaking note.
- [ ] **Step 3:** `npx vitest run` in `packages/design-system` → PASS (manifest drift + structure tests); `make lint` / typecheck from root → clean.
- [ ] **Step 4:** Commit — `docs(ImageCrop): move-the-box docs, demo copy, release BUMP=minor`

---

### After tasks (orchestrator, not a subagent task)

1. Start playground on port 8090+, Playwright-check the demo (portrait + landscape, drag, corner, wheel, Reset), kill Chrome after. Send user the live link; wait for their OK (demo check before PR).
2. `pre-push-review` skill → draft PR, review-fix loop, ready, `Quality / check` green, merge.
3. After Release publishes 0.6.0: follow-up PR `chore(release): return BUMP to patch after v0.6.0`.
