# RTE image resize (persisted docs) + paste-size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix #263 (resize handle / Configure popover never appear for a persisted image attachment whose `status` was dropped on serialization) AND make a newly-uploaded/pasted image come in at its perceived size — `min(naturalWidth / devicePixelRatio, editorContentWidth)` — instead of its raw natural-pixel size.

**Architecture:** Two independent fixes in `packages/design-system`, shipped in one PR.
(A) Centralize the "this attachment is settled (renderable)" rule in one engine helper `isAttachmentSettled` = `status === 'ready' || status == null`, and use it at the three editor gates that currently hard-code `status === 'ready'`. (B) Compute an attachment's display size from its natural dimensions at upload-settle time inside `useUpload`, via a pure helper `computeDisplaySize` and a thin browser adapter `measureImageFromFile` (built on `createImageBitmap`, which returns natural dims in browsers and is `undefined` in jsdom so tests never hang).

**Tech Stack:** React + TypeScript, Vitest (jsdom, `globals: true`), SCSS modules. Pure immutable RichDoc engine in `RichText/engine/`.

---

## Background facts (verified this session)

- Renderer `RichTextAttachment.tsx` already treats "ready OR status absent" as displayable (`if uploading … if error … else render`). The three editor gates disagree by requiring strict `status === 'ready'`:
  - `RichTextEditor.tsx:1496` `canConfigure` (enables the block-menu "Configure" item)
  - `RichTextEditor.tsx:1532` `resizableImage` (the hover resize handle — issue #263)
  - `RichTextEditor.tsx:1551` `configEl` (renders the Configure popover)
- A freshly-uploaded block carries `status: 'ready'`; a persisted/imported block legitimately drops `status` (transient upload-lifecycle field).
- `<img>` natural intrinsic size = decoded device pixels. A retina screenshot reports 2× its perceived CSS size, so it renders enlarged.
- `useUpload.runUpload` settles a block with `width: res.width, height: res.height` (consumer-reported NATURAL dims, per `UploadResult` JSDoc). The DS currently uses them directly as the DISPLAY size — that is the enlargement bug.
- `safeHref` blocks `blob:`/`data:` → object-URL uploads render as a file chip, so the playground mock uploader can't show inline-image sizing. The enlargement is observed when `onUpload` returns an http(s) URL. Measuring the **File** (not the URL) makes the fix work regardless of the consumer's URL or whether it reports width.
- jsdom probes (this session): `createImageBitmap` is `undefined`; `URL.createObjectURL` returns a `blob:nodedata:` string; `new Image()` `onload`/`onerror` never fire; `window.devicePixelRatio === 1`.
- Resize commit (`onConfigWidth`) sets `width` and CLEARS `height` so the browser keeps aspect via CSS `height: auto`. So display height is only a layout hint; setting it proportionally is safe and round-trips.
- Vitest: `globals: true` — do NOT import `describe/it/expect/vi`. Component tests import `render/screen` from `@testing-library/react`, `userEvent` from `@testing-library/user-event`.

---

## Task 1: Engine helper `isAttachmentSettled`

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/attachment.ts`
- Test: `packages/design-system/src/components/RichText/engine/attachment.test.ts`

- [ ] **Step 1: Write the failing test** — append to `attachment.test.ts`:

```ts
describe('isAttachmentSettled', () => {
  it('is true for a ready upload and for a persisted block with no status', () => {
    expect(isAttachmentSettled({ status: 'ready' })).toBe(true);
    expect(isAttachmentSettled({})).toBe(true); // persisted/imported: status dropped on serialization
    expect(isAttachmentSettled({ status: undefined })).toBe(true);
  });

  it('is false while uploading or after an error', () => {
    expect(isAttachmentSettled({ status: 'uploading' })).toBe(false);
    expect(isAttachmentSettled({ status: 'error' })).toBe(false);
  });
});
```

Add `isAttachmentSettled` to the existing import from `./attachment` at the top of the test file.

- [ ] **Step 2: Run it, expect FAIL** — `npx vitest run src/components/RichText/engine/attachment.test.ts` → fails (not exported).

- [ ] **Step 3: Implement** — in `attachment.ts`, just after `attachmentIsImage` (keep it next to the other shared predicate):

```ts
/**
 * Whether an attachment is "settled" — its upload finished (`status: 'ready'`) OR
 * it is a persisted/imported block whose transient `status` was dropped on
 * serialization (`status` absent). Excludes in-flight (`uploading`) and failed
 * (`error`) blocks. This is the SAME set the renderer treats as displayable, so
 * the editor's resize-handle / Configure gates must use it (not a stricter
 * `status === 'ready'`) or they silently disagree on persisted docs. See #263.
 */
export function isAttachmentSettled(block: Pick<Block, 'status'>): boolean {
  return block.status === 'ready' || block.status == null;
}
```

- [ ] **Step 4: Run it, expect PASS.**

- [ ] **Step 5: Commit** — `fix(RichText): add isAttachmentSettled (ready-or-absent) shared predicate`

---

## Task 2: Apply `isAttachmentSettled` to the three editor gates (#263)

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx`

- [ ] **Step 1: Write the failing test** — in `RichTextEditor.test.tsx`, inside the existing image/resize area (near the `data-rte-resize-handle` test ~L1678; reuse that test's setup pattern). Seed a doc with a persisted image attachment that has **no `status`** and an http(s) src + width, render an EDITABLE editor, hover the figure, and assert the resize handle appears:

```ts
it('shows the resize handle for a persisted image (attachment with no status)', async () => {
  const persisted: RichDoc = {
    blocks: [
      { id: 'img', type: 'attachment', src: 'http://u/p.png', mime: 'image/png', width: 200 },
      { id: 'p', type: 'paragraph', inlines: [{ text: '', marks: [] }] },
    ] as unknown as RichDoc['blocks'],
  };
  function Harness() {
    const [doc, setDoc] = useState(persisted);
    return <RichTextEditor value={doc} onChange={setDoc} blockControls upload={up()} />;
  }
  renderEditor(<Harness />);
  const figure = document.querySelector('figure[data-block-id]') as HTMLElement;
  await userEvent.hover(figure);
  await waitFor(() =>
    expect(document.querySelector('[data-rte-resize-handle]')).toBeTruthy(),
  );
});
```

Notes for the implementer: match the EXACT render/hover helpers already used by the neighbouring resize-handle test (`renderEditor`, `up()`, `shellOf()`, any `getBoundingClientRect` stubbing it relies on). If that test hovers via a different mechanism, mirror it. The assertion that matters: `[data-rte-resize-handle]` is present for a `status`-less block. Confirm the test FAILS against current `RichTextEditor.tsx` before the fix.

- [ ] **Step 2: Run it, expect FAIL** (handle absent because gate requires `status === 'ready'`).

- [ ] **Step 3: Implement** — import the helper and use it at all three gates.

Add to the existing `attachment` engine import in `RichTextEditor.tsx` (it already imports `attachmentIsImage` — add `isAttachmentSettled`).

Line ~1496:

```ts
const canConfigure =
  uploadOn && activeBlock?.type === 'attachment' && isAttachmentSettled(activeBlock);
```

Lines ~1530-1533 (inside `resizableImage`'s `find`): replace `b.status === 'ready' &&` with `isAttachmentSettled(b) &&`. Update the nearby comment to say the gate mirrors the renderer's "ready-or-absent" rule (settled attachment), citing #263.

Line ~1551:

```ts
configBlock && configBlock.type === 'attachment' && isAttachmentSettled(configBlock) && uploadOn;
```

- [ ] **Step 4: Run it, expect PASS.** Also run the whole `RichTextEditor.test.tsx` to confirm no regression in the existing resize/config tests (uploading/error blocks must still be excluded).

- [ ] **Step 5: Commit** — `fix(RichTextEditor): resize handle + Configure work on persisted images (#263)`

---

## Task 3: `computeDisplaySize` + `measureImageFromFile`, and wire into `useUpload`

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/imageSize.ts`
- Create: `packages/design-system/src/components/RichTextEditor/imageSize.test.ts`
- Modify: `packages/design-system/src/components/RichTextEditor/useUpload.ts`
- Test: `packages/design-system/src/components/RichTextEditor/useUpload.test.tsx`

- [ ] **Step 1: Write the failing test for the pure helper** — `imageSize.test.ts`:

```ts
import { computeDisplaySize } from './imageSize';

describe('computeDisplaySize', () => {
  it('returns undefined when natural dimensions are missing or non-positive', () => {
    expect(computeDisplaySize(undefined, 100, 2, 700)).toBeUndefined();
    expect(computeDisplaySize(100, undefined, 2, 700)).toBeUndefined();
    expect(computeDisplaySize(0, 100, 2, 700)).toBeUndefined();
    expect(computeDisplaySize(100, 0, 2, 700)).toBeUndefined();
  });

  it('divides natural pixels by the device pixel ratio (perceived size)', () => {
    expect(computeDisplaySize(1200, 800, 2, 0)).toEqual({ width: 600, height: 400 });
  });

  it('caps the perceived width to the editor content width, scaling height to keep aspect', () => {
    // perceived 1200 (dpr 1) capped to 700 → height = round(700 * 800/1200) = 467
    expect(computeDisplaySize(1200, 800, 1, 700)).toEqual({ width: 700, height: 467 });
  });

  it('applies ÷DPR then the cap together', () => {
    // perceived 600 (1200/2) is under cap 500? no — min(600,500)=500 → height round(500*800/1200)=333
    expect(computeDisplaySize(1200, 800, 2, 500)).toEqual({ width: 500, height: 333 });
  });

  it('treats a zero/negative dpr as 1, and a zero/absent cap as no cap', () => {
    expect(computeDisplaySize(300, 150, 0, 0)).toEqual({ width: 300, height: 150 });
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (module missing).

- [ ] **Step 3: Implement `imageSize.ts`:**

```ts
// imageSize.ts — pure display-size math + a thin browser image-measurement adapter
// for RichTextEditor uploads. A newly-uploaded image is laid out at its PERCEIVED
// size (natural device pixels ÷ devicePixelRatio), capped to the editor's content
// width, instead of its raw natural-pixel size (which renders a retina screenshot
// at 2× the size you saw). See the upload flow in useUpload.ts.

/** Natural (intrinsic) pixel dimensions of an image. */
export interface NaturalSize {
  width: number;
  height: number;
}

/**
 * The on-screen display size for an image given its NATURAL pixel dimensions, the
 * current device pixel ratio, and the editor's content width. Returns `undefined`
 * when natural dimensions are unknown/invalid (caller leaves the block unsized —
 * the renderer falls back to intrinsic size capped by CSS `max-width: 100%`).
 *
 * `width = round(min(naturalWidth / dpr, capWidth))`, height scaled to preserve
 * the natural aspect ratio. A non-positive `dpr` is treated as `1`; a
 * non-positive `capWidth` means "no cap".
 */
export function computeDisplaySize(
  naturalWidth: number | undefined,
  naturalHeight: number | undefined,
  dpr: number,
  capWidth: number,
): NaturalSize | undefined {
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) return undefined;
  const ratio = dpr > 0 ? dpr : 1;
  const perceived = naturalWidth / ratio;
  const target = capWidth > 0 ? Math.min(perceived, capWidth) : perceived;
  const width = Math.max(1, Math.round(target));
  const height = Math.max(1, Math.round((width / naturalWidth) * naturalHeight));
  return { width, height };
}

/**
 * Measure an image File's natural pixel dimensions in the browser via
 * `createImageBitmap`. Resolves `null` for non-images, when the API is
 * unavailable (e.g. jsdom — so unit tests never block on image decoding), or on
 * any decode error. Injected into `useUpload` so it can be stubbed in tests.
 */
export async function measureImageFromFile(file: File): Promise<NaturalSize | null> {
  if (!file.type?.startsWith('image/') || typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return size.width > 0 && size.height > 0 ? size : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run it, expect PASS.**

- [ ] **Step 5: Write the failing useUpload sizing tests** — in `useUpload.test.tsx`. First, extend the `harness` helper to accept and pass through `measureImage` / `getContentWidth` / `getDevicePixelRatio` overrides (default `measureImage: async () => null`, `getContentWidth: () => 0`, `getDevicePixelRatio: () => 1`) so existing tests keep their current behavior. Then add:

```ts
it('sizes an uploaded image to perceived size (÷DPR) capped to the editor width', async () => {
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/p.png', mime: 'image/png' });
  const { result, getDoc } = harness(onUpload, undefined, {
    measureImage: async () => ({ width: 1200, height: 800 }),
    getDevicePixelRatio: () => 2,
    getContentWidth: () => 700,
  });
  act(() => {
    result.current.uploadFiles([new File(['x'], 'p.png', { type: 'image/png' })]);
  });
  await waitFor(() => {
    const b = getDoc().blocks.find((bl) => bl.type === 'attachment' && bl.status === 'ready');
    expect(b?.width).toBe(600); // 1200/2 = 600 < 700
    expect(b?.height).toBe(400);
  });
});

it('treats a consumer-reported width/height as natural and transforms it (no measure call)', async () => {
  const measureImage = vi.fn();
  const onUpload = vi
    .fn()
    .mockResolvedValue({ url: 'http://u/p.png', mime: 'image/png', width: 1000, height: 500 });
  const { result, getDoc } = harness(onUpload, undefined, {
    measureImage,
    getDevicePixelRatio: () => 2,
    getContentWidth: () => 700,
  });
  act(() => {
    result.current.uploadFiles([new File(['x'], 'p.png', { type: 'image/png' })]);
  });
  await waitFor(() => {
    const b = getDoc().blocks.find((bl) => bl.type === 'attachment' && bl.status === 'ready');
    expect(b?.width).toBe(500); // 1000/2 = 500 < 700
    expect(b?.height).toBe(250);
  });
  expect(measureImage).not.toHaveBeenCalled();
});

it('leaves a block unsized when dimensions are unknown (measure → null)', async () => {
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/f.pdf', mime: 'application/pdf' });
  const { result, getDoc } = harness(onUpload, undefined, { measureImage: async () => null });
  act(() => {
    result.current.uploadFiles([new File(['x'], 'f.pdf', { type: 'application/pdf' })]);
  });
  await waitFor(() => {
    const b = getDoc().blocks.find((bl) => bl.type === 'attachment' && bl.status === 'ready');
    expect(b).toBeTruthy();
    expect(b?.width).toBeUndefined();
    expect(b?.height).toBeUndefined();
  });
});
```

- [ ] **Step 6: Run, expect FAIL** (harness doesn't accept overrides; useUpload ignores them).

- [ ] **Step 7: Implement `useUpload.ts`:**

Add to imports:

```ts
import { computeDisplaySize, measureImageFromFile, type NaturalSize } from './imageSize';
```

Extend `UseUploadArgs` (all optional, with defaults so existing callers/tests are unaffected):

```ts
  /** Measure an image File's natural pixel size (injectable for tests). */
  measureImage?: (file: File) => Promise<NaturalSize | null>;
  /** Editor content width in CSS px — caps a pasted image's initial width. `0` = no cap. */
  getContentWidth?: () => number;
  /** Current device pixel ratio (injectable for tests). */
  getDevicePixelRatio?: () => number;
```

Destructure with defaults in the hook signature:

```ts
export function useUpload({
  config,
  getValue,
  applyInsert,
  applySettle,
  getCaret,
  measureImage = measureImageFromFile,
  getContentWidth = () => 0,
  getDevicePixelRatio = () => (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
}: UseUploadArgs) {
```

In `runUpload`, make the success handler async and derive the display size before settling:

```ts
      .then(
        async (res) => {
          filesRef.current.delete(id);
          // Natural dims: prefer the consumer's reported size (documented as
          // natural px), else measure the File. Then lay out at perceived size
          // (÷DPR) capped to the editor width — so a retina screenshot doesn't
          // come in at 2× the size you saw.
          let naturalW = res.width;
          let naturalH = res.height;
          if (naturalW == null || naturalH == null) {
            const measured = await measureImage(file);
            if (measured) {
              naturalW = naturalW ?? measured.width;
              naturalH = naturalH ?? measured.height;
            }
          }
          const display = computeDisplaySize(
            naturalW,
            naturalH,
            getDevicePixelRatio(),
            getContentWidth(),
          );
          applySettle(
            updateAttachmentBlock(getValue(), id, {
              status: 'ready',
              src: res.url,
              name: res.name ?? file.name,
              mime: res.mime ?? file.type,
              width: display?.width,
              height: display?.height,
              alt: res.alt,
            }),
          );
        },
        () => {
          applySettle(updateAttachmentBlock(getValue(), id, { status: 'error' }));
        },
      )
```

Add `measureImage`, `getContentWidth`, `getDevicePixelRatio` to `runUpload`'s `useCallback` dependency array.

- [ ] **Step 8: Run, expect PASS.** Run the full `useUpload.test.tsx` — existing tests must still pass (defaults: measure→null in the harness, dpr 1, cap 0 → blocks settle with no width as before; the no-width image tests are unaffected).

- [ ] **Step 9: Commit** — `feat(RichTextEditor): lay out uploaded images at perceived size (÷DPR, capped)`

---

## Task 4: Editor wiring + UploadResult JSDoc + AGENTS.md

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
- Modify: `packages/design-system/src/components/RichTextEditor/useUpload.ts` (JSDoc only)
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Wire `getContentWidth` into the editor's `useUpload` call** (~L562). Add to the args object:

```ts
      getContentWidth: () => rootRef.current?.getBoundingClientRect().width ?? 0,
```

(`measureImage` and `getDevicePixelRatio` use their real defaults — no need to pass them. This mirrors the resizer's existing `maxWidth={rootRef.current?.getBoundingClientRect().width ?? 600}` measurement.)

- [ ] **Step 2: Clarify the `UploadResult.width` / `height` JSDoc** in `useUpload.ts` so consumers know the editor derives the on-screen size:

```ts
  /**
   * NATURAL pixel dimensions of the image (not the on-screen size). The editor
   * derives the initial display size from these — scaling by the device pixel
   * ratio and capping to the editor width — so a retina screenshot isn't inserted
   * at 2× its perceived size. Omit them and the editor measures the file itself.
   */
  width?: number;
  height?: number;
```

- [ ] **Step 3: Run the FULL editor test file** — `npx vitest run src/components/RichTextEditor/RichTextEditor.test.tsx`. The existing file-paste/upload tests resolve `onUpload` with an image mime and NO width, so the real `measureImageFromFile` runs → `createImageBitmap` is `undefined` in jsdom → resolves `null` → blocks settle with no width (current behavior). Confirm green, no hangs. If any pre-existing test asserts a specific `width`/`height` on an uploaded block, reconcile it (it should provide `res.width`/`res.height`, in which case dpr 1 + cap from a `getBoundingClientRect` width — which is `0` in jsdom — yields width unchanged; verify).

- [ ] **Step 4: Update `AGENTS.md`** — in the RichTextEditor section, add a short note under the upload/image guidance:

> Uploaded/pasted images are laid out at their **perceived** size — natural pixels ÷ device pixel ratio, capped to the editor width — so a retina screenshot isn't inserted at 2× the size you saw. Return natural `width`/`height` from `onUpload` (or omit them and the editor measures the file). Persisted/imported image blocks (whose transient `status` was dropped on save) remain fully editable — the hover resize handle and the Configure popover treat "ready **or** status-absent" as settled.

Match the surrounding AGENTS.md heading style/voice.

- [ ] **Step 5: Commit** — `docs(RichTextEditor): wire content-width cap + document perceived-size image sizing`

---

## Final gates (run from repo root after all tasks)

- [ ] `make test && make build-lib && make lint && npm run format:check`
- [ ] `npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'` → expect `0`
- [ ] Hard-Rule-8 fresh-context adversarial review-fix loop until "clean enough to stop".

---

## Self-review (author check)

- **Spec coverage:** #263 → Tasks 1-2 (helper + all three gates + regression test). Paste size ÷DPR-then-cap → Task 3 (`computeDisplaySize` + measure + useUpload settle) + Task 4 (editor `getContentWidth` wiring). Consumer-reported width handled (Task 3 test). Non-image / unknown dims fall back unsized (Task 3 test). Docs (Task 4). ✓
- **Type consistency:** `isAttachmentSettled(Pick<Block,'status'>)`, `computeDisplaySize(number|undefined,…): NaturalSize|undefined`, `measureImageFromFile(File): Promise<NaturalSize|null>`, `UseUploadArgs.measureImage?/getContentWidth?/getDevicePixelRatio?` — used consistently across Tasks 3-4. ✓
- **No placeholders:** every step has concrete code/commands. ✓
- **jsdom safety:** `createImageBitmap` undefined → `measureImageFromFile` resolves null → no test hang (probed). ✓
- **Layering:** `isAttachmentSettled` is engine-internal (not added to `src/index.ts`); `imageSize.ts` is RichTextEditor-internal. No new public API → no Rule 5 export needed. Confirm no new public types must be exported (none — all internal). ✓
