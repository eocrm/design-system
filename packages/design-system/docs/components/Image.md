# `<Image>` — image with loading + error states

```tsx
<Image src={url} alt="Quarterly revenue chart" aspectRatio="16 / 9" />
```

Robust `<img>`: `Skeleton` while loading, fade-in on load, compact `ImageOff` error
placeholder on failure — with a retry button when the image is fluid, icon-only when
it has a fixed `size`.

- `src` / `alt` — required (`alt=""` for decorative).
- `objectFit`: `cover` (default) | `contain` | `fill` | `none` | `scale-down`.
- `aspectRatio`: number (`1.5`) or string (`'16 / 9'`) — reserves the box, no layout shift.
- `size`: `xs` (20) | `sm` (24) | `md` (32) | `lg` (40 px) — fixed **square** box from the `--size-*` scale instead of `width:100%` (dense table-cell thumbnails; won't squish in a flex row). Omit for responsive. Overrides `aspectRatio`.
- `radius`: `none` | `sm` | `md` (default) | `lg` | `full`.
- `fallback` — custom node shown on error instead of the default placeholder.
- `loading` defaults to `'lazy'`; `ref` → the `<img>`, which is re-created when `src` changes or on Retry (re-attach observers in an effect keyed on `src`); `className`/`style` → the wrapper box.

**The error tile depends on `size`.** Without `size` it is icon + message + a **Retry** button when the box can hold them (about 96×104px or more at the default tokens; a longer custom `image.retry` label needs a wider box; the message is kept to two lines, then truncated with an ellipsis). A smaller box gets the icon alone: Retry is removed and the message stays for screen readers, so nothing is left clipped but still focusable (#542). A fluid `Image` with no `aspectRatio` gets a 40px height on error rather than collapsing to 0, so it shows that icon-only tile. A height you set yourself (className/style) still wins. Reserve the box if you want the retry. With `size` (all four of `xs`/`sm`/`md`/`lg` — 20/24/32/40px) it is the **icon alone**, scaled to the box, and the failure is **not retryable**: none of those squares can hold the message _and_ an `sm` Button, and the one that used to render there sat outside the wrapper's `overflow: hidden`, painted nowhere yet still focusable (#538). A screen reader still gets the failure — the sized icon is named `"{alt}: Image failed to load"` (just the phrase when `alt=""`), where the fluid tile leaves the phrase to its visible text. Need a control on a failed thumbnail at those sizes? Pass `fallback`: at a fixed `size` it renders in a slot filling the box, so it can't escape the wrapper, but sizing it to fit 20-40px is on you.

**When NOT to use:** circular avatars → `<Avatar>`; crop/zoom UI → `<ImageCrop>`; CSS
backgrounds → `background-image`; icons → lucide / inline SVG.

**Interactive (flush click target):** set `interactive` (or just `onClick`) to render the image inside a chromeless `<button>` (no padding/border/background; DS focus ring on `:focus-visible`) — a thumbnail that opens a preview/lightbox on click/Enter/Space. `ariaLabel` names the trigger (defaults to `alt`). The broken-image error state is non-interactive (the fluid tile's retry control takes over; a sized tile has no control at all); `ref` still forwards to the `<img>`.

```tsx
<Image
  src={att.url}
  alt={att.filename}
  size="lg"
  objectFit="cover"
  onClick={() => openPreview(att)}
  ariaLabel={`Preview ${att.filename}`}
/>
```
