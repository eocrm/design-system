# `<Image>` — image primitive with loading + error states

## Goal

A library primitive for displaying remote images _properly_: it reserves its box (no layout
shift), shows a `Skeleton` while the image loads, fades in on load, and degrades to a compact,
accessible broken-image placeholder (with an optional custom `fallback` and a retry control) on
failure. It fills the gap between a bare `<img>` (no loading/error UX, layout shift, no
token-driven framing) and `<Avatar>` (circular, identity/initials-focused).

## Locked-in decisions (brainstorm)

1. **v1 includes every extra:** fade-in on load, custom error `fallback`, retry-on-error,
   and a default of `loading="lazy"`.
2. **Loading placeholder = `<Skeleton variant="rectangular">`** (pulse). `<Image>` therefore
   **composes** `Skeleton` (manifest tier: `composition`).
3. **Error state = compact placeholder:** a lucide `ImageOff` icon + `image.loadError` text + a
   retry `Button`. Overridable wholesale via the `fallback` prop.
4. **Core display props:** `objectFit` (default `'cover'`), `aspectRatio`, `radius`
   (default `'md'`).
5. **Sizing:** the wrapper is `width: 100%` (fills its container — the parent owns outer width);
   height comes from `aspectRatio` (recommended) or a consumer-supplied height; the `<img>` is
   `width/height: 100%` + `object-fit`. Rule-4 clean (intrinsic styling only).
6. **Refs/styling split:** `ref` → the `<img>` (`HTMLImageElement`); `className` / `style` → the
   **wrapper** box (the layout surface). Documented with a Rule-7 spread-order comment.
7. **Manifest:** cluster `Display`, tier `composition` (composes `Skeleton` + `Button`).

## Architecture

A relatively-positioned wrapper holds an **always-mounted** `<img>` plus absolutely-positioned
overlay layers. Keeping the `<img>` mounted in every state gives a stable `ref` and reliable
`onLoad` / `onError` events, and lets the fade-in be a pure opacity transition.

State machine: `'loading' → 'loaded' | 'error'`, tracked with `useState`. A `useEffect` keyed on
`src` resets the state to `'loading'` whenever `src` changes (the Avatar pattern). Retry bumps a
`reloadNonce` used as the `<img>`'s React `key`, which remounts the element and re-fetches the
original `src`.

```tsx
<span class="wrapper" data-state={state} style={{ aspectRatio?, '--image-object-fit': objectFit, ...style }}>
  <img
    key={reloadNonce}
    ref={ref}
    src={src}
    alt={state === 'error' ? '' : alt}     // broken img is decorative; error overlay owns the name
    aria-hidden={state === 'error' || undefined}
    loading={loading /* default 'lazy' */}
    onLoad={() => setState('loaded')}
    onError={() => setState('error')}
    class="img"                             // opacity 0 → 1 on [data-state='loaded'] via --transition-base
    {...rest}
  />

  {state === 'loading' && (
    <Skeleton variant="rectangular" width="100%" height="100%" class="overlay" aria-hidden />
  )}

  {state === 'error' &&
    (fallback ?? (
      <span class="error" role="img" aria-label={alt || t('image.loadError')}>
        <ImageOff aria-hidden />
        <span class="errorText">{t('image.loadError')}</span>
        <Button variant="secondary" size="sm" onClick={retry}>{t('image.retry')}</Button>
      </span>
    ))}
</span>
```

- **Fade-in:** `.img { opacity: 0; transition: opacity var(--transition-base); }` and
  `.wrapper[data-state='loaded'] .img { opacity: 1; }`. Respects nothing special — opacity fades
  are safe under `prefers-reduced-motion`, but the transition is trivial; no motion guard needed.
- **`fallback`** replaces the entire default error placeholder (icon + text + retry).
- **Decorative images:** `alt=""` is allowed and valid.

## Props

```ts
/** How the image fills its box. Maps to CSS `object-fit`. */
export type ImageObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

/** Corner rounding. Maps to the radius token scale. */
export type ImageRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'children'> {
  /** Image URL. Changing it resets the component to the loading state. */
  src: string;
  /**
   * Alternative text (required). Describe the image's content/function. Pass an
   * empty string (`alt=""`) for purely decorative images so screen readers skip it.
   */
  alt: string;
  /**
   * How the image fills its box. Defaults to `'cover'` (fill + crop, no distortion).
   * - `'cover'` — fill the box, cropping overflow. Best for thumbnails/hero images.
   * - `'contain'` — show the whole image, letterboxed on the box background.
   * - `'fill'` — stretch to the box (may distort).
   * - `'none'` / `'scale-down'` — native sizing / the smaller of none|contain.
   */
  objectFit?: ImageObjectFit;
  /**
   * Reserve the box at a fixed ratio to prevent layout shift while loading.
   * Number (`1.5`) or CSS string (`'16 / 9'`). When omitted, supply a height
   * some other way (a consumer height, or the image's own dimensions).
   */
  aspectRatio?: string | number;
  /** Corner rounding. Defaults to `'md'`. Pass `'none'` for square corners; for
   * circular avatars use `<Avatar>`. */
  radius?: ImageRadius;
  /**
   * Custom node rendered in place of the default broken-image placeholder when
   * the image fails to load. Overrides the icon + message + retry entirely.
   */
  fallback?: ReactNode;
  /**
   * Native lazy-loading hint. Defaults to `'lazy'`. Pass `'eager'` for
   * above-the-fold / LCP images.
   */
  loading?: 'eager' | 'lazy';
}
```

`ref` forwards to the `<img>`. `className` and `style` apply to the **wrapper** (the box you
size/position); all other native `<img>` attributes (`srcSet`, `sizes`, `width`, `height`,
`decoding`, `crossOrigin`, `referrerPolicy`, …) spread onto the `<img>`.

**Rule-7 spread choice: Pattern B (component-owned attrs win)** — `src`/`alt`/`onLoad`/`onError`/
`key` are component-controlled (the state machine depends on them), so the JSX writes
`{...rest}` _before_ the controlled attributes. A JSX comment notes this.

## Tokens — `Image.tokens.scss`

```scss
:root {
  --image-radius-none: 0;
  --image-radius-sm: var(--radius-sm);
  --image-radius-md: var(--radius-md);
  --image-radius-lg: var(--radius-lg);
  --image-radius-full: var(--radius-full);

  --image-bg: var(--color-bg-muted); // box bg behind contain/letterbox + error
  --image-transition: var(--transition-base); // fade-in

  // Error placeholder
  --image-error-bg: var(--color-bg-muted);
  --image-error-fg: var(--color-fg-muted);
  --image-error-gap: var(--space-2);
  --image-error-font-size: var(--font-size-sm);
}
```

The `ImageOff` icon size is passed via lucide's numeric `size` prop in TSX (e.g.
`<ImageOff size={28} aria-hidden />`), like Avatar/Alert pass icon sizes — not a CSS token, so
`Image.tokens.scss` stays free of raw px values (matching the convention; cf. Badge's tokens).

## Styles — `Image.module.scss` (sketch)

```scss
@use './Image.tokens';

.wrapper {
  display: block;
  position: relative; // internal anchor for overlays (Rule 4: relative-for-child OK)
  width: 100%; // fills container (Rule 4: 100% allowed)
  overflow: hidden; // clip to radius
  background: var(--image-bg);
  border-radius: var(--image-radius-none);
}
.radiusSm {
  border-radius: var(--image-radius-sm);
}
.radiusMd {
  border-radius: var(--image-radius-md);
}
.radiusLg {
  border-radius: var(--image-radius-lg);
}
.radiusFull {
  border-radius: var(--image-radius-full);
}

.img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--image-object-fit, cover); // intrinsic (Rule 4: object-fit OK; Avatar precedent)
  opacity: 0;
  transition: opacity var(--image-transition);
}
.wrapper[data-state='loaded'] .img {
  opacity: 1;
}
.wrapper[data-state='error'] .img {
  display: none;
}

.overlay {
  position: absolute;
  inset: 0;
} // Skeleton fill

.error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--image-error-gap);
  background: var(--image-error-bg);
  color: var(--image-error-fg);
}
.errorText {
  font-size: var(--image-error-font-size);
}
```

`position: absolute` + `inset` on `.overlay`/`.error` are internal-anchor layering (the wrapper is
`relative`), matching `PasswordInput`'s wrapper/eye pattern — not layout positioning of the
component within its parent.

## i18n (Hard rule 9)

Add an `image` namespace in all three files. Mirror the `passwordInput` pattern (string leaves
with JSDoc).

- `messages.ts` — `image: { loadError: string; retry: string }` (each with a JSDoc line).
- `en.ts` — `image: { loadError: 'Image failed to load', retry: 'Retry' }`.
- `ru.ts` — `image: { loadError: 'Не удалось загрузить изображение', retry: 'Повторить' }`.

Consumed via `useTranslation()`. The Skeleton is `aria-hidden`; the loaded `<img>` carries the
consumer `alt`.

## Files

| File                                                            | Change                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/design-system/src/components/Image/Image.tsx`         | NEW — component (forwardRef + state machine + JSDoc)                                 |
| `packages/design-system/src/components/Image/Image.module.scss` | NEW — styles (tokens only, no layout)                                                |
| `packages/design-system/src/components/Image/Image.tokens.scss` | NEW — `--image-*` tokens                                                             |
| `packages/design-system/src/components/Image/Image.test.tsx`    | NEW — unit tests                                                                     |
| `packages/design-system/src/components/Image/index.ts`          | NEW — `export { Image }` + `export type { ImageProps, ImageObjectFit, ImageRadius }` |
| `packages/design-system/src/index.ts`                           | MODIFY — re-export Image + its types                                                 |
| `packages/design-system/src/i18n/messages.ts`                   | MODIFY — `image` namespace in `Messages`                                             |
| `packages/design-system/src/i18n/en.ts`                         | MODIFY — `image` strings                                                             |
| `packages/design-system/src/i18n/ru.ts`                         | MODIFY — `image` strings                                                             |
| `packages/design-system/src/_meta/manifest.ts`                  | MODIFY — add `Image: 'Display'` to the `CLUSTERS` map                                |
| `packages/design-system/src/components.manifest.json`           | REGEN — run the manifest generator (exact command confirmed in planning)             |
| `packages/design-system/AGENTS.md`                              | MODIFY — `<Image>` TL;DR entry (Display section)                                     |
| `packages/playground/src/pages/components/ImageDemo.tsx`        | NEW — demo (DemoLayout + Example)                                                    |
| `packages/playground/src/App.tsx`                               | MODIFY — `/components/image` route                                                   |
| `packages/playground/src/layout/AppShell/AppShell.tsx`          | MODIFY — Display group nav entry (`ImageIcon`)                                       |
| `packages/playground/src/pages/components/ComponentsIndex.tsx`  | MODIFY — overview card w/ live preview                                               |

`structure.test.ts` and the manifest meta-test enforce the 4 required files + `index.ts`
export + manifest presence — they pass automatically once the files above exist and the
manifest is regenerated.

## Tests (`Image.test.tsx` minimum)

Drive the state machine by firing `load`/`error` on the rendered `<img>` (`fireEvent.load` /
`fireEvent.error`).

- Renders an `<img>` with the given `src` and `alt`.
- Initial state shows the Skeleton overlay (loading); `<img>` present but not yet `loaded`.
- After `fireEvent.load`, the wrapper is `data-state="loaded"` and the Skeleton is gone.
- After `fireEvent.error`, the default error placeholder renders (`ImageOff` + `image.loadError`
  text + retry Button) and the `<img>` is hidden/`aria-hidden`.
- `fallback` node replaces the default error placeholder on error.
- Retry: clicking retry returns to loading and re-fetches (the `<img>` remounts — `key` changes;
  a subsequent `fireEvent.load` reaches `loaded`).
- Changing `src` resets a previously-errored/loaded component to loading.
- `objectFit` sets the `--image-object-fit` custom property; default is `cover`.
- `radius` applies the matching class; default `md` (and `radius="none"` yields square corners).
- `aspectRatio` (number and string) applies `aspect-ratio` on the wrapper.
- `loading` defaults to `'lazy'`; an explicit `loading="eager"` overrides.
- `ref` forwards to the `<img>`.
- `className` merges onto the **wrapper**; other native attrs (e.g. `data-*`, `sizes`) land on
  the `<img>`.
- `alt=""` renders a decorative image (empty alt) without error.

## Demo page outline (`ImageDemo.tsx`)

1. Basic (loaded image, default cover).
2. The three states side-by-side: loading (point `src` at a slow/never-resolving URL or show the
   Skeleton), loaded, error (a deliberately-broken `src`).
3. `objectFit`: cover vs contain (tall image in a wide box).
4. `radius`: none / sm / md / lg / full.
5. `aspectRatio`: `16 / 9`, `1`, `4 / 3`.
6. Custom `fallback` on error.
7. Retry interaction (broken `src` + retry button).
8. In-context: a small responsive gallery `Grid` of images (real Unsplash URLs).

## When NOT to use (JSDoc `@remarks` + AGENTS.md)

- **Circular profile/identity images** → use `<Avatar>` (initials fallback, deterministic color).
- **Cropping/zoom UI** → use `<ImageCrop>`.
- **Pure CSS background imagery** → use a background-image on the consumer's element; `<Image>`
  is a content `<img>` for meaningful images.
- **Icons / vector glyphs** → use `lucide-react` (or an inline SVG), not `<Image>`.
- Anti-pattern: ❌ using `placeholder`-style empty `alt` for a meaningful image — pass real `alt`.
- Anti-pattern: ❌ relying on `<Image>` without an `aspectRatio` or height and expecting no layout
  shift — give it a reserved box.

## Out of scope (v1)

- Lightbox / zoom / fullscreen.
- Blur-up / blurhash / LQIP placeholders (Skeleton only).
- `<figure>` / `<figcaption>` (compose with `Text`).
- Built-in `srcSet`/`sizes` generation (pass-through only).
- Art-direction `<picture>` / multiple `<source>` (consumer can wrap if needed).
