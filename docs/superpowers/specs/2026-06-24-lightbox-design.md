# `<Lightbox>` — full-screen image gallery overlay — Design

**Status:** design approved (user said "yes"), ready for plan
**Date:** 2026-06-24
**Component:** `@eocrm/design-system` → `src/components/Lightbox/` (new component)

## Goal

A full-screen **overlay image viewer**: show one large image at a time, cycle through a
set (prev/next chevrons, keyboard ← →, a bottom thumbnail strip), and display an optional
caption. Replaces the CRM's current ad-hoc "full-size image in a plain `Modal`" with a
purpose-built lightbox. The consumer owns the trigger (e.g. an attachments table of
interactive `<Image>` thumbnails) and the `open` state.

## Resolved decisions (from brainstorm)

1. **Name:** `Lightbox` (standard, unambiguous term for this overlay viewer; "Gallery"
   reads as an on-page grid).
2. **Scope:** includes a **bottom thumbnail strip** (jump directly to any image), in
   addition to prev/next + counter + caption.
3. **Index control:** **uncontrolled with optional control.** `open`/`onOpenChange` is
   controlled (like `Modal`). The current index is internal — seeded by `defaultIndex` —
   and the Lightbox manages prev/next/thumbnail navigation itself; consumers may also pass
   `index` + `onIndexChange` for full control (standard controllable pattern).
4. **Reuse:** the DS overlay machinery (`_internal/overlay`: `useOverlayStack`,
   `useScrollLock`, `useFocusTrap`, `createPortal`) and the existing `<Image>` (interactive
   variant) for the thumbnail strip. Own full-bleed layout (NOT built on `Modal`'s card).

## Architecture

```
src/components/Lightbox/
  Lightbox.tsx           ← (new) root: portal + overlay behavior + state + layout
  Lightbox.module.scss   ← (new) full-bleed scrim, stage, chevrons, caption, counter, strip
  Lightbox.tokens.scss   ← (new) --lightbox-* tokens → primitives
  Lightbox.test.tsx      ← (new)
  index.ts               ← (new)
```

- **Overlay behavior reused from `_internal/overlay`:** `useOverlayStack` (z-index layering
  so a Lightbox opened from within a `Modal` stacks above it), `useScrollLock` (lock body
  scroll while open), `useFocusTrap` (trap Tab within the overlay; the trap also wires Esc),
  and `createPortal(…, document.body)`. This mirrors how `Modal`'s `Overlay`/`ModalRoot` are
  composed — the Lightbox is a sibling overlay component, not a Modal consumer.
- **Single responsibility:** `Lightbox.tsx` holds the root. If the thumbnail strip grows
  unwieldy it MAY be extracted to an internal `LightboxThumbnails` piece in the same folder;
  start in one file.

## Public API

```ts
import type { ReactNode } from 'react';

export interface LightboxItem {
  /** Full-size image URL. */
  src: string;
  /** Alt text (required, describes the image — same contract as `<Image>`). */
  alt: string;
  /** Optional caption, shown below the stage when set. */
  caption?: ReactNode;
  /** Optional thumbnail URL for the strip. Defaults to `src`. */
  thumbnail?: string;
}

export interface LightboxProps {
  /** Controlled open state. */
  open: boolean;
  /** Fired when the Lightbox wants to close — Esc, backdrop click, the × button. */
  onOpenChange: (open: boolean) => void;
  /** The images. An empty array renders nothing. */
  items: LightboxItem[];
  /** Initial image index (uncontrolled). Defaults to `0`. Clamped to range. */
  defaultIndex?: number;
  /** Controlled current index. When set, pair with `onIndexChange`. */
  index?: number;
  /** Fired on navigation (chevron / arrow key / thumbnail click). */
  onIndexChange?: (index: number) => void;
  /** Wrap past the first/last image. Defaults to `true`. When `false`, the prev/next
   *  chevrons are disabled at the ends. */
  loop?: boolean;
  /** className for the dialog container. */
  className?: string;
  /** Accessible label for the dialog. Defaults to the i18n "Image gallery". */
  'aria-label'?: string;
}

export const Lightbox: React.FC<LightboxProps>;
```

Consumer usage (the attachments pattern):

```tsx
const [open, setOpen] = useState(false);
const [start, setStart] = useState(0);

<Cluster gap="sm">
  {attachments.map((a, i) => (
    <Image
      key={a.id}
      src={a.thumbUrl}
      alt={a.filename}
      size="lg"
      objectFit="cover"
      onClick={() => { setStart(i); setOpen(true); }}
      ariaLabel={`Preview ${a.filename}`}
    />
  ))}
</Cluster>

<Lightbox
  open={open}
  onOpenChange={setOpen}
  defaultIndex={start}
  items={attachments.map((a) => ({ src: a.url, alt: a.filename, caption: a.filename }))}
/>;
```

### Index resolution (controllable pattern)

```ts
const isControlled = index !== undefined;
const [internalIndex, setInternalIndex] = useState(clamp(defaultIndex ?? 0, items.length));
const current = clamp(isControlled ? index! : internalIndex, items.length);

function goTo(next: number) {
  const target = loop ? wrap(next, items.length) : clamp(next, items.length);
  if (!isControlled) setInternalIndex(target);
  onIndexChange?.(target);
}
```

- `wrap(i, n) = ((i % n) + n) % n` (loop). `clamp(i, n) = Math.min(Math.max(i, 0), n - 1)`.
- When `open` transitions false→true, reset the internal index to `clamp(defaultIndex ?? 0)`
  (so reopening at a new `defaultIndex` works) — via an effect keyed on `open`.

## Layout & behavior

- **Stage:** the current image centered on the dark scrim, `object-fit: contain` (whole
  image, letterboxed). Purpose-built `<img>` (NOT `<Image>`, whose sizing model needs a
  fixed `aspectRatio`; the lightbox wants intrinsic-contain to the stage box). The stage
  owns a minimal load/error state:
  - **loading:** a centered DS `Skeleton` (or spinner) overlay until the `<img>` `onLoad`.
  - **error:** a compact "couldn't load" message on `onError` (reuse the `image.loadError`
    i18n string). Keyed on the current `src` so switching images resets the state.
- **Chevrons:** prev (‹) left-center, next (›) right-center. Hidden entirely when
  `items.length <= 1`. Disabled at the ends when `loop === false`.
- **Counter:** "`{current+1} / {items.length}`" (digits — no translation). Hidden when a
  single item.
- **Caption:** rendered below the stage when `items[current].caption` is set.
- **Thumbnail strip:** a horizontal row of **interactive `<Image>`s** (reuse the new
  `interactive`/`onClick` — each thumb is a flush, keyboard-accessible button). The active
  thumb gets a highlight (a `data-active`/class → ring) and is scrolled into view
  (`scrollIntoView({ block: 'nearest', inline: 'center' })` in an effect on `current`).
  Hidden when `items.length <= 1`.
- **Close:** an × button top-right (`aria-label` = i18n `lightbox.close`).
- **Dismissal:** Esc (via focus trap), backdrop click (clicking the scrim/empty area — NOT
  the image, chevrons, caption, strip, or close), and the × button all call
  `onOpenChange(false)`.
- **Keyboard:** ArrowLeft → prev, ArrowRight → next (no-op/clamped at ends when not
  looping), Esc → close. Tab cycles within the overlay (focus trap). On open, focus moves
  into the overlay (the close button or the dialog container).
- **a11y:** `role="dialog"`, `aria-modal="true"`, labelled by `aria-label` (default i18n
  "Image gallery"). Chevrons / close / thumbnails have aria-labels. The stage `<img>` keeps
  its `alt`.

## Styling / tokens

`Lightbox.tokens.scss` — `--lightbox-*` defaulting to primitives:

- `--lightbox-scrim`: a dark backdrop (e.g. `rgb(0 0 0 / 92%)` — add the raw value as a
  token here, the ONE place raw values are allowed for a component's own tokens; or reuse an
  existing scrim token if one exists — check `--color-*` / Modal's overlay token first).
- control chip bg/hover/fg (the chevron + close circles), caption color, counter color,
  thumb active-ring color (`--ring-accent`), strip bg, gaps from `--space-*`.

Rule 4: the only layout-ish properties are the overlay's own `position: fixed; inset: 0`
(the portal scrim) — the SAME exemption `Modal`'s `Overlay` uses (a portaled full-screen
layer is not a "component in a parent's layout"). Everything inside uses flex + gap +
tokens; document the `position:fixed` with a justified `stylelint-disable` if the linter
flags it (mirror how `Modal`'s Overlay does it).

## i18n

New `lightbox` message group in `src/i18n/messages.ts` + `en.ts` + `ru.ts`:

- `lightbox.label` — default dialog label, "Image gallery".
- `lightbox.previous` — prev chevron aria-label, "Previous image".
- `lightbox.next` — next chevron aria-label, "Next image".
- `lightbox.close` — close button aria-label, "Close gallery".

Thumbnail buttons derive their aria-label from the item `alt` (or a composed
`Go to {alt}` — keep simple: use the item alt via the interactive `<Image ariaLabel>`).
The counter is digits/symbols (no string). `alt`/`caption` are consumer data (no i18n).

## Testing

`Lightbox.test.tsx`:

- Renders nothing when `open={false}` or `items=[]`.
- When open, portals a `role="dialog"` with the current image (`defaultIndex`) and its alt.
- Next/prev chevrons change the image (assert the visible stage `alt`/`src`); fires
  `onIndexChange`.
- ArrowRight / ArrowLeft navigate; Esc calls `onOpenChange(false)`.
- `loop={false}`: prev is disabled at index 0, next disabled at the last index; `loop`
  default wraps (next from last → first).
- Controlled `index`: navigation calls `onIndexChange` but the displayed image only changes
  when the prop changes (doesn't self-advance).
- Clicking a thumbnail jumps to that index (fires `onIndexChange`).
- Single item (`items.length === 1`): no chevrons, no counter, no strip.
- Caption renders when set; absent when not.
- The close (×) button calls `onOpenChange(false)`; backdrop click calls it; clicking the
  image does NOT.
- Reopening with a new `defaultIndex` shows that image (the open-reset effect).
- (jsdom note: `scrollIntoView` is a no-op stub — guard the call so tests don't throw.)

## Packaging (Core invariant — new component)

- Component + tests beside it.
- **Exports** `src/index.ts`: `Lightbox`, `LightboxProps`, `LightboxItem`.
- **Manifest CLUSTERS:** `Lightbox: 'Overlays'` in BOTH `src/_meta/manifest.ts` and
  `scripts/generate-manifest.mjs`; then `npm run build:manifest` (entry: `composition` — it
  composes `Image`/`Skeleton`). Commit the regenerated JSON.
- **Demo** `packages/playground/src/pages/components/LightboxDemo.tsx`: a small grid of
  interactive `<Image>` thumbnails that opens the Lightbox at the clicked index, with
  captions; plus a single-image example and a `loop={false}` example. Wire into `App.tsx`
  route `/components/lightbox`, `navItems.ts` **Overlays** group, `ComponentsIndex.tsx`
  overview card, `registry.ts` `ComponentName` union (`'Lightbox'`).
- **JSDoc (Rule 7):** description + `@example` (attachments pattern) + `@remarks`
  anti-patterns (don't use for a single static image — use `<Image>`; don't build your own
  Modal+Image; the trigger/`open` is the consumer's; items `alt` is required).
- **AGENTS.md** TL;DR in the Overlays area.

## Risks / decisions (resolved)

- **Stage uses a raw `<img>`, not `<Image>`** — Image's fill-width + aspectRatio model
  doesn't fit intrinsic-contain; the stage reimplements a minimal load/error state (~15
  lines). Thumbnails DO reuse the interactive `<Image>`.
- **Stacking above modals** — handled by `useOverlayStack` (the established pattern).
- **Open-reset of internal index** — an effect on `open` reseeds from `defaultIndex` so
  reopening at a different start image works; controlled `index` is unaffected.
- **`scrollIntoView` in jsdom** — guarded so tests don't throw.
- **Scrim raw value** — prefer an existing scrim/overlay token (check Modal's tokens); only
  add a raw value inside `Lightbox.tokens.scss` if none exists (component tokens are the
  sanctioned place).
