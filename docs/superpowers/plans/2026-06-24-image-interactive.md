# Interactive `<Image>` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional flush, keyboard-accessible click target to `<Image>` (`interactive` / `onClick` / `ariaLabel`) — a thumbnail that opens a preview on click/Enter/Space — resolving issue eocrm/design-system#195.

**Architecture:** When interactive, the existing `<img>` (+ loading skeleton) render inside a chromeless `<button>`; the broken-image error overlay (which has its own retry button) stays a SIBLING of the trigger (never nested), and the trigger is `disabled` in the error state. The `:focus-visible` ring is rendered on the wrapper via `:has` (its `overflow:hidden` would clip a ring on the inner button). This is an enhancement to an existing component — no new exported type, route, nav, or manifest entry.

**Tech Stack:** TypeScript, React, SCSS modules, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-24-image-interactive-design.md`

---

## File map

Library (`packages/design-system/`):

- `src/components/Image/Image.tsx` (modify) — props + render + JSDoc.
- `src/components/Image/Image.module.scss` (modify) — `.trigger` + `:has` focus ring.
- `src/components/Image/Image.test.tsx` (modify) — interactive tests.
- `AGENTS.md` (modify) — extend the `<Image>` TL;DR.

Playground (`packages/playground/`):

- `src/pages/components/ImageDemo.tsx` (modify) — add an interactive-thumbnail example.

(No `src/index.ts`, manifest, route, nav, overview-card, or registry change — `<Image>` already has all of those, and no new type is exported.)

---

## Task 1: `Image` component — interactive trigger (TDD)

**Files:**

- Modify: `packages/design-system/src/components/Image/Image.tsx`
- Modify: `packages/design-system/src/components/Image/Image.module.scss`
- Test: `packages/design-system/src/components/Image/Image.test.tsx`

- [ ] **Step 1: Add the failing tests to `Image.test.tsx`**

The file already has a `describe('Image', …)` block and a `getImg(container)` helper, and imports `{ createRef }` from `'react'` and `{ fireEvent, render }` from `'@testing-library/react'`. The new tests use `userEvent` — if it isn't already imported at the top of the file, add `import userEvent from '@testing-library/user-event';` (these tests use the `render(...)` return value's `getByRole`, not `screen`, so don't add an unused `screen` import — `noUnusedLocals` would flag it). Append these tests INSIDE the existing `describe` block (before its closing `});`):

```tsx
it('is not interactive by default (no trigger button in the loaded state)', () => {
  const { container } = render(<Image src={SRC} alt="A photo" />);
  fireEvent.load(getImg(container));
  expect(container.querySelector('button')).toBeNull();
});

it('interactive renders the img inside a trigger <button>', () => {
  const { container } = render(<Image src={SRC} alt="A photo" interactive />);
  const button = container.querySelector('button');
  expect(button).not.toBeNull();
  expect(button!.querySelector('img')).not.toBeNull();
});

it('onClick implies interactive and fires on click', async () => {
  const onClick = vi.fn();
  const { container } = render(<Image src={SRC} alt="A photo" onClick={onClick} />);
  const button = container.querySelector('button') as HTMLButtonElement;
  expect(button).not.toBeNull();
  await userEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('the trigger fires onClick on keyboard activation (Enter)', async () => {
  const onClick = vi.fn();
  const { container } = render(<Image src={SRC} alt="A photo" onClick={onClick} />);
  const button = container.querySelector('button') as HTMLButtonElement;
  button.focus();
  await userEvent.keyboard('{Enter}');
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('uses ariaLabel for the trigger name, falling back to alt', () => {
  const withLabel = render(
    <Image src={SRC} alt="report.png" interactive ariaLabel="Preview report.png" />,
  );
  expect(withLabel.getByRole('button', { name: 'Preview report.png' })).not.toBeNull();

  const fallback = render(<Image src={SRC} alt="report.png" interactive />);
  expect(fallback.getByRole('button', { name: 'report.png' })).not.toBeNull();
});

it('disables the trigger in the error state and never nests the retry button inside it', () => {
  const { container, getByRole } = render(<Image src={SRC} alt="A photo" onClick={() => {}} />);
  fireEvent.error(getImg(container));
  const trigger = container.querySelector('button') as HTMLButtonElement; // the FIRST button is the trigger
  expect(trigger.disabled).toBe(true);
  const retry = getByRole('button', { name: 'Retry' });
  expect(trigger.contains(retry)).toBe(false); // retry is a sibling, not nested
});

it('forwards ref to the <img> even when interactive', () => {
  const ref = createRef<HTMLImageElement>();
  const { container } = render(<Image src={SRC} alt="A photo" interactive ref={ref} />);
  expect(ref.current).toBe(getImg(container));
});
```

(Note: Vitest globals are on — `vi`/`expect`/`it` are global. `userEvent` and `screen` are not globals; ensure they're imported.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/design-system && npx vitest run src/components/Image/Image.test.tsx`
Expected: the new tests FAIL (no `button` rendered for interactive; `onClick`/`interactive`/`ariaLabel` props not handled).

- [ ] **Step 3: Add the SCSS to `Image.module.scss`**

At the top, add the mixins import next to the existing `@use './Image.tokens';`:

```scss
@use '../../styles/mixins' as *;
```

Then append these rules at the end of the file:

```scss
// Interactive trigger — a chromeless <button> wrapping the image (interactive /
// onClick). No padding/border/background; fills the wrapper box; hugs its corners.
.trigger {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  border-radius: inherit;
  color: inherit;
}

.trigger:disabled {
  cursor: default;
}

// The wrapper has overflow:hidden, which would clip a ring drawn on the inner
// button — so render the focus ring on the wrapper (its own overflow does not clip
// its own box-shadow). Follows the wrapper's border-radius.
.wrapper:has(.trigger:focus-visible) {
  @include focus-ring();
}
```

- [ ] **Step 4: Edit `Image.tsx` — types**

(a) Add `MouseEventHandler` to the existing `react` type imports (the import already brings in `CSSProperties`, `ImgHTMLAttributes`, `ReactNode` as types):

```tsx
import {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
```

(b) In `ImageProps`, add `'onClick'` to the `Omit` list and add the three new props. The current `extends Omit<…, 'alt' | 'children' | 'src' | 'loading'>` becomes:

```tsx
export interface ImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'children' | 'src' | 'loading' | 'onClick'> {
```

and add these three members to the interface (place them after `loading?` so they read together):

```tsx
  /**
   * Make the image a flush, keyboard-accessible click target — renders the image
   * inside a chromeless `<button>` (no padding/border/background; DS focus ring on
   * `:focus-visible`). Implied when `onClick` is set. Use for a thumbnail that opens
   * a preview/lightbox. The broken-image error state is non-interactive (its retry
   * control takes over).
   */
  interactive?: boolean;
  /**
   * Click handler for the interactive trigger. Setting it implies `interactive`.
   * Fires on click and on Enter/Space (native `<button>` keyboard behavior).
   */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /**
   * Accessible label for the interactive trigger — action-oriented, e.g.
   * `"Preview report.png"`. Defaults to `alt`. Only used when interactive.
   */
  ariaLabel?: string;
```

- [ ] **Step 5: Edit `Image.tsx` — destructure the new props**

In the `function Image({ … }, ref)` destructuring, add `interactive`, `onClick`, `ariaLabel`. The block becomes:

```tsx
  {
    src,
    alt,
    objectFit = 'cover',
    aspectRatio,
    size,
    radius = 'md',
    fallback,
    loading = 'lazy',
    interactive,
    onClick,
    ariaLabel,
    className,
    style,
    ...rest
  },
  ref,
```

- [ ] **Step 6: Edit `Image.tsx` — render with the conditional trigger**

Replace the current `return ( <span …> … </span> )` body. Extract the `<img>` to an `imgNode` const and the loading skeleton, then branch on `isInteractive`. The new return:

```tsx
const isInteractive = interactive || onClick != null;

const imgNode = (
  // {...rest} FIRST (Pattern B): the state machine owns src/alt/key/onLoad/onError,
  // so a careless spread can't break them.
  <img
    {...rest}
    key={reloadNonce}
    ref={ref}
    src={src}
    alt={state === 'error' ? '' : alt}
    aria-hidden={state === 'error' || undefined}
    loading={loading}
    className={styles.img}
    onLoad={() => setState('loaded')}
    onError={() => setState('error')}
  />
);

const loadingOverlay =
  state === 'loading' ? <Skeleton variant="rectangular" className={styles.overlay} /> : null;

return (
  <span
    className={clsx(styles.wrapper, RADIUS_CLASS[radius], size && SIZE_CLASS[size], className)}
    style={wrapperStyle}
    data-state={state}
  >
    {isInteractive ? (
      <button
        type="button"
        className={styles.trigger}
        onClick={onClick}
        aria-label={ariaLabel ?? alt}
        disabled={state === 'error'}
      >
        {imgNode}
        {loadingOverlay}
      </button>
    ) : (
      <>
        {imgNode}
        {loadingOverlay}
      </>
    )}

    {state === 'error' &&
      (fallback ?? (
        <span className={styles.error} role="img" aria-label={alt || t('image.loadError')}>
          <ImageOff size={28} aria-hidden="true" />
          <span className={styles.errorText}>{t('image.loadError')}</span>
          <Button variant="secondary" size="sm" onClick={retry}>
            {t('image.retry')}
          </Button>
        </span>
      ))}
  </span>
);
```

(This preserves the existing error/fallback block verbatim — only the img + loading skeleton move into the conditional. `imgNode` is one element reused in both branches; `isInteractive` is derived from props, not `state`, so the img does not remount across the load lifecycle.)

- [ ] **Step 7: Edit `Image.tsx` — JSDoc (`@example` + `@remarks`)**

In the component's JSDoc block, add one `@example` after the existing examples (before `@remarks When NOT to use`):

```tsx
 * @example
 * // Flush, keyboard-accessible thumbnail that opens a preview (no button chrome):
 * <Image
 *   src={att.url}
 *   alt={att.filename}
 *   size="lg"
 *   objectFit="cover"
 *   onClick={() => openPreview(att)}
 *   ariaLabel={`Preview ${att.filename}`}
 * />
```

and add one bullet to the existing `@remarks Anti-patterns` list:

```tsx
 * - ❌ Wrapping `<Image>` in a `<Button>` / `<Link>` for a clickable thumbnail — that
 *   paints button/link chrome over it. Use `interactive` / `onClick` for a flush trigger.
```

- [ ] **Step 8: Run tests + typecheck + stylelint**

Run: `cd packages/design-system && npx vitest run src/components/Image/ && npx tsc --noEmit && npx stylelint "src/components/Image/*.scss"`
Expected: all green (the new tests pass; all pre-existing Image tests still pass).

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/components/Image/
git commit -m "feat(Image): interactive flush click-target variant (interactive/onClick/ariaLabel)"
```

---

## Task 2: Demo + AGENTS.md

**Files:** Modify `packages/playground/src/pages/components/ImageDemo.tsx`, `packages/design-system/AGENTS.md`.

- [ ] **Step 1: Add an interactive example to `ImageDemo.tsx`**

`ImageDemo.tsx` already imports from `@eocrm/design-system` and uses `useState`. Add `Modal` to the import (and `Button` is already imported). Add this component above `export function ImageDemo()`:

```tsx
function InteractiveThumb() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Image
        src={PHOTO}
        alt="Mountain lake at dawn"
        size="lg"
        objectFit="cover"
        onClick={() => setOpen(true)}
        ariaLabel="Preview Mountain lake at dawn"
      />
      <Modal open={open} onOpenChange={setOpen}>
        <Modal.Header>Mountain lake at dawn</Modal.Header>
        <Modal.Body>
          <Image src={PHOTO} alt="Mountain lake at dawn" aspectRatio="16 / 9" />
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="secondary">Close</Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal>
    </>
  );
}
```

Then add an `<Example>` inside the `<DemoLayout>` (e.g. right after the "Fixed-size thumbnail (size)" example):

```tsx
<Example
  title="Interactive thumbnail (click to preview)"
  description="Set interactive (or onClick) to make the image a flush, keyboard-accessible click target — a chromeless button with a DS focus ring, no inset/border/hover paint. The canonical use is a dense table-cell thumbnail that opens a preview Modal. Tab to it and press Enter/Space."
  code={`<Image src={url} alt="report.png" size="lg" objectFit="cover"
  onClick={() => setOpen(true)} ariaLabel="Preview report.png" />`}
>
  <InteractiveThumb />
</Example>
```

(Confirm `Modal` exposes `Modal.Header` / `Modal.Body` / `Modal.Footer` / `Modal.Close` and `open` / `onOpenChange` props — it does, per `ModalDemo.tsx`. If the demo build flags any prop, adapt to the real Modal API; do not invent props.)

- [ ] **Step 2: Build the playground**

Run: `cd /Users/dpws/projects/design-system && make build`
Expected: typecheck + bundle succeed. Fix any prettier drift with `npx prettier --write`.

- [ ] **Step 3: Extend the `<Image>` TL;DR in `AGENTS.md`**

Find the `<Image>` section (grep for `Image` in `packages/design-system/AGENTS.md`) and add a short paragraph + bullet about the interactive trigger, matching the surrounding style:

````md
**Interactive (flush click target):** set `interactive` (or just `onClick`) to render the image inside a chromeless `<button>` (no padding/border/background; DS focus ring on `:focus-visible`) — a thumbnail that opens a preview/lightbox on click/Enter/Space. `ariaLabel` names the trigger (defaults to `alt`). The broken-image error state is non-interactive (its retry control takes over); `ref` still forwards to the `<img>`.

\```tsx
<Image src={att.url} alt={att.filename} size="lg" objectFit="cover"
  onClick={() => openPreview(att)} ariaLabel={`Preview ${att.filename}`} />
\```
````

(Use real triple-backticks for the fenced block.)

- [ ] **Step 4: Commit**

```bash
cd /Users/dpws/projects/design-system
npx prettier --write packages/design-system/AGENTS.md packages/playground/src/pages/components/ImageDemo.tsx
git add packages/playground/src/pages/components/ImageDemo.tsx packages/design-system/AGENTS.md
git commit -m "docs(Image): interactive-thumbnail demo + AGENTS.md note"
```

---

## Task 3: Full gates + browser verification

- [ ] **Step 1: Run all gates from the repo root**

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

Expected: all PASS; tarball grep `0`.

- [ ] **Step 2: Browser (Playwright, manual) on the running playground** (`/components/image`):
  - The "Interactive thumbnail" example shows a flush ~40px image with NO button chrome (no border/inset/hover paint over the image).
  - Click it → a Modal opens with the full image; close it.
  - Tab to the thumbnail → a focus ring hugs the (rounded) thumbnail; press Enter → the Modal opens. Press Esc → closes.
  - Confirm the non-interactive thumbnails (the size example) render no focus ring / button.
  - No console errors/warnings.

---

## Self-review notes

- **Spec coverage:** `interactive`/`onClick`/`ariaLabel` props (T1) · wrap with error overlay as sibling + `disabled` in error (T1 Step 6) · `:has` focus ring on wrapper (T1 Step 3) · `onClick` Omit + re-declare as button handler (T1 Step 4) · `ref` still on img (T1 Step 6 + test) · no nested buttons (T1 test) · JSDoc `@example`/`@remarks` (T1 Step 7) · demo (T2) · AGENTS (T2) · no i18n / no new export / no manifest (enhancement). All spec sections map to a task.
- **Type consistency:** `onClick?: MouseEventHandler<HTMLButtonElement>` (T1 Step 4) routes to the `<button onClick={onClick}>` (T1 Step 6). `ariaLabel ?? alt` used consistently. `isInteractive = interactive || onClick != null` defined once.
- **Backward compatibility:** non-interactive path is byte-for-byte the previous behavior (img + loading skeleton + error block); the regression test (`is not interactive by default`) guards it. Existing Image tests are unchanged and must stay green.
- **Rule 4:** `.trigger` uses only `width/height:100%`, `padding:0`, `border:0` — no `margin`/`position`. The wrapper already owns `position:relative`. Clean.
