# `<Image>` — image with loading + error states

```tsx
<Image src={url} alt="Quarterly revenue chart" aspectRatio="16 / 9" />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `src` | `string` | yes | — | Image URL. Changing it resets the component to the loading state. |
| `alt` | `string` | yes | — | Alternative text (required). Describe the image's content or function. Pass an empty string (`alt=""`) for purely decorative images. |
| `objectFit` | `'cover' \| 'contain' \| 'fill' \| 'none' \| 'scale-down'` | no | — | How the image fills its box. Defaults to `'cover'`. - `'cover'` — fill + crop (no distortion). Best for thumbnails / heroes. - `'contain'` — whole image, letterboxed on the box background. - `'fill'` — stretch to the box (may distort). - `'none'` / `'scale-down'` — native size / the smaller of none\|contain. |
| `aspectRatio` | `string \| number` | no | — | Reserve the box at a fixed ratio to prevent layout shift while loading. Number (`1.5`) or CSS string (`'16 / 9'`). |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | no | — | Render a fixed **square** box of this size (from the shared `--size-*` scale: `'xs'` 20 / `'sm'` 24 / `'md'` 32 / `'lg'` 40 px) instead of filling the container's width. Use for dense thumbnails (e.g. a 40px image cell in a table row) so you don't need a consumer-owned fixed-width wrapper. Omit for the default responsive behavior. When set, `aspectRatio` is ignored (the box is already square); pair with `objectFit="cover"` to crop. Note that a sized image's error tile is icon-only and **not retryable** — see the component description. |
| `radius` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'` | no | — | Corner rounding. Defaults to `'md'`. Pass `'none'` for square corners; for circular profile images use `<Avatar>`. |
| `fallback` | `ReactNode` | no | — | Custom node rendered in place of the default broken-image placeholder when the image fails to load. Overrides the icon + message + retry entirely. This is also the only way to put a control on a failed fixed-`size` image, whose built-in error tile is icon-only. At a fixed `size` the node is rendered in a slot that fills the box (so it cannot flow outside the wrapper's clip); fitting your content into those 20-40px is still yours, and a labelled button does not fit any of them. |
| `loading` | `'eager' \| 'lazy'` | no | — | Native lazy-loading hint. Defaults to `'lazy'`. Pass `'eager'` for above-the-fold / LCP images. |
| `interactive` | `boolean` | no | — | Make the image a flush, keyboard-accessible click target — renders the image inside a chromeless `<button>` (no padding/border/background; DS focus ring on `:focus-visible`). Implied when `onClick` is set. Use for a thumbnail that opens a preview/lightbox. The broken-image error state is non-interactive (the fluid tile's Retry takes over when its box has room; otherwise there is no control). |
| `onClick` | `MouseEventHandler<HTMLButtonElement>` | no | — | Click handler for the interactive trigger. Setting it implies `interactive`. Fires on click and on Enter/Space (native `<button>` keyboard behavior). |
| `ariaLabel` | `string` | no | — | Accessible label for the interactive trigger — action-oriented, e.g. `"Preview report.png"`. Defaults to `alt` when omitted OR empty — an empty string is not an explicit name, so it takes the default too. Only used when interactive. Note: a native `aria-label` passed via `{...rest}` lands on the `<img>`, not the trigger button — use `ariaLabel` to name the trigger. |
| …native | | | | plus native `<img>` attributes |

<!-- props:end -->

Robust `<img>`: `Skeleton` while loading, fade-in on load, compact `ImageOff` error
placeholder on failure — with a retry button when the image is fluid, icon-only when
it has a fixed `size`.

- `ref` → the `<img>`, which is re-created when `src` changes or on Retry (re-attach observers in an effect keyed on `src`); `className`/`style` → the wrapper box.

**The error tile depends on `size`.** Without `size` it is icon + message + a **Retry** button when the box can hold them (about 96×104px or more at the default tokens; a longer custom `image.retry` label needs a wider box; the message is kept to two lines, then truncated with an ellipsis). A smaller box gets the icon alone: Retry is removed and the message stays for screen readers, so nothing is left clipped but still focusable. A fluid `Image` with no `aspectRatio` gets a 40px height on error rather than collapsing to 0, so it shows that icon-only tile. A height you set yourself (className/style) still wins. Reserve the box if you want the retry. With `size` (all four of `xs`/`sm`/`md`/`lg` — 20/24/32/40px) it is the **icon alone**, scaled to the box, and the failure is **not retryable**: none of those squares can hold the message _and_ an `sm` Button, and the one that used to render there sat outside the wrapper's `overflow: hidden`, painted nowhere yet still focusable. A screen reader still gets the failure — the sized icon is named `"{alt}: Image failed to load"` (just the phrase when `alt=""`), where the fluid tile leaves the phrase to its visible text. Need a control on a failed thumbnail at those sizes? Pass `fallback`: at a fixed `size` it renders in a slot filling the box, so it can't escape the wrapper, but sizing it to fit 20-40px is on you.

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

```tsx
// Fixed 40px thumbnail (dense table cell) — no width:100% stretch
<Image src={url} alt="report.pdf preview" size="lg" objectFit="cover" />

// Logo contained on its muted box, square corners
<Image src={logo} alt="Acme Corp" objectFit="contain" radius="none" />

// Eager above-the-fold hero with a custom error fallback
<Image src={hero} alt="Welcome aboard" loading="eager" aspectRatio={2} fallback={<EmptyState title="Couldn't load the hero image" />} />
```

The wrapper fills its container's width: give it an `aspectRatio` (or a height) so the box is reserved before the image arrives, unless you pass `size`. Native `width` / `height` attributes on the `<img>` are intrinsic-ratio hints only, not the rendered size.

- ❌ Empty `alt` for a meaningful image — pass a real description.
- ❌ No `aspectRatio` / height when you care about layout shift.
- ❌ Wrapping `<Image>` in a `<Button>` / `<Link>` for a clickable thumbnail — it paints button/link chrome over it; use `interactive` / `onClick` for a flush trigger.
