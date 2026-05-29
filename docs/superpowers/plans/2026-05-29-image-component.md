# Image Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an `<Image>` library primitive that displays remote images with a `Skeleton` loading state, fade-in on load, and a compact accessible broken-image error state (with retry + custom `fallback`), plus `objectFit` / `aspectRatio` / `radius` display props.

**Architecture:** A `forwardRef` component over an always-mounted `<img>` inside a `position: relative` wrapper; absolutely-positioned overlays render the `Skeleton` (loading) and the error placeholder. A `loading → loaded → error` `useState` machine is driven by the img's `onLoad`/`onError`; `src` changes reset it; retry bumps a nonce used as the img `key` to re-fetch. Composes `Skeleton` + `Button` (manifest tier `composition`, cluster `Display`). Token-driven styling; new `image.*` i18n keys.

**Tech Stack:** React 19 + TypeScript, `lucide-react` (peer dep — `ImageOff` icon), `clsx`, SCSS modules, Vitest (globals, RTL). Branch: `feat/image-component` (already checked out).

**Spec:** `docs/superpowers/specs/2026-05-29-image-component-design.md`

---

## File Structure

| File                                                            | Responsibility                                           |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| `packages/design-system/src/i18n/messages.ts`                   | MODIFY — `image` namespace in `Messages`                 |
| `packages/design-system/src/i18n/en.ts`                         | MODIFY — English `image` strings                         |
| `packages/design-system/src/i18n/ru.ts`                         | MODIFY — Russian `image` strings                         |
| `packages/design-system/src/components/Image/Image.tokens.scss` | NEW — `--image-*` tokens                                 |
| `packages/design-system/src/components/Image/Image.module.scss` | NEW — styles (tokens only, no layout)                    |
| `packages/design-system/src/components/Image/Image.tsx`         | NEW — component                                          |
| `packages/design-system/src/components/Image/Image.test.tsx`    | NEW — unit tests                                         |
| `packages/design-system/src/components/Image/index.ts`          | NEW — exports                                            |
| `packages/design-system/src/index.ts`                           | MODIFY — re-export Image + types                         |
| `packages/design-system/src/_meta/manifest.ts`                  | MODIFY — `Image: 'Display'` in `CLUSTERS`                |
| `packages/design-system/src/components.manifest.json`           | REGEN — `npm run build:manifest`                         |
| `packages/design-system/AGENTS.md`                              | MODIFY — `<Image>` TL;DR (Display)                       |
| `packages/playground/src/pages/components/ImageDemo.tsx`        | NEW — demo page                                          |
| `packages/playground/src/App.tsx`                               | MODIFY — `/components/image` route                       |
| `packages/playground/src/layout/AppShell/AppShell.tsx`          | MODIFY — Display nav entry + `Image as ImageIcon` import |
| `packages/playground/src/pages/components/ComponentsIndex.tsx`  | MODIFY — overview card                                   |

---

## Task 1: i18n `image` namespace

The component imports these keys, so add them first.

**Files:**

- Modify: `packages/design-system/src/i18n/messages.ts`
- Modify: `packages/design-system/src/i18n/en.ts`
- Modify: `packages/design-system/src/i18n/ru.ts`

- [ ] **Step 1: Add the `image` block to the `Messages` interface**

In `messages.ts`, add this block to the `Messages` interface (e.g. right after the `confirmationPopover` block, ~line 18):

```ts
image: {
  /** Visible text + aria-label fallback shown when an image fails to load. */
  loadError: string;
  /** Label on the retry button in the broken-image placeholder. */
  retry: string;
}
```

- [ ] **Step 2: Add the English strings**

In `en.ts`, add to the `en` object (after the `confirmationPopover` block, ~line 14):

```ts
  image: {
    loadError: 'Image failed to load',
    retry: 'Retry',
  },
```

- [ ] **Step 3: Add the Russian strings**

In `ru.ts`, add to the `ru` object (after the `confirmationPopover` block, ~line 15):

```ts
  image: {
    loadError: 'Не удалось загрузить изображение',
    retry: 'Повторить',
  },
```

- [ ] **Step 4: Typecheck (shape parity is TS-enforced across the three files)**

Run: `make build-lib`
Expected: passes (no TS errors). If a key is missing from `en.ts`/`ru.ts`, TS fails here — add it.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/i18n/messages.ts packages/design-system/src/i18n/en.ts packages/design-system/src/i18n/ru.ts
git commit -m "feat(i18n): add image namespace (loadError, retry)"
```

---

## Task 2: The `<Image>` component (TDD)

**Files:**

- Create: `packages/design-system/src/components/Image/Image.tokens.scss`
- Create: `packages/design-system/src/components/Image/Image.module.scss`
- Create: `packages/design-system/src/components/Image/Image.test.tsx`
- Create: `packages/design-system/src/components/Image/Image.tsx`
- Create: `packages/design-system/src/components/Image/index.ts`

- [ ] **Step 1: Create the tokens** — `Image.tokens.scss`

```scss
:root {
  --image-radius-none: 0;
  --image-radius-sm: var(--radius-sm);
  --image-radius-md: var(--radius-md);
  --image-radius-lg: var(--radius-lg);
  --image-radius-full: var(--radius-full);

  --image-bg: var(--color-bg-muted);
  --image-transition: var(--transition-base);

  --image-error-bg: var(--color-bg-muted);
  --image-error-fg: var(--color-fg-muted);
  --image-error-gap: var(--space-2);
  --image-error-font-size: var(--font-size-sm);
}
```

- [ ] **Step 2: Create the styles** — `Image.module.scss`

```scss
@use './Image.tokens';

.wrapper {
  display: block;
  position: relative; // internal anchor for the absolute overlays (Rule 4 OK)
  width: 100%; // fills the container; parent owns outer width (Rule 4: 100% OK)
  overflow: hidden; // clip the image to the rounded corners
  background: var(--image-bg);
}

.radiusNone {
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
  object-fit: var(--image-object-fit, cover); // intrinsic (Rule 4 OK; Avatar precedent)
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
}

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

- [ ] **Step 3: Write the failing test** — `Image.test.tsx`

```tsx
import { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Image } from './Image';

const SRC = 'https://example.com/photo.jpg';

function getImg(container: HTMLElement): HTMLImageElement {
  return container.querySelector('img') as HTMLImageElement;
}

describe('Image', () => {
  it('renders an <img> with the given src and alt', () => {
    const { container } = render(<Image src={SRC} alt="A photo" />);
    const img = getImg(container);
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe(SRC);
    expect(img.getAttribute('alt')).toBe('A photo');
  });

  it('starts in the loading state with a Skeleton overlay', () => {
    const { container } = render(<Image src={SRC} alt="A photo" />);
    expect(container.querySelector('[data-state="loading"]')).not.toBeNull();
    // Skeleton renders an aria-hidden span.
    expect(container.querySelector('span[aria-hidden="true"]')).not.toBeNull();
  });

  it('transitions to loaded on the img load event', () => {
    const { container } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.load(getImg(container));
    expect(container.querySelector('[data-state="loaded"]')).not.toBeNull();
  });

  it('shows the default error placeholder on the img error event', () => {
    const { container, getByRole, getByText } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.error(getImg(container));
    expect(container.querySelector('[data-state="error"]')).not.toBeNull();
    expect(getByRole('img', { name: 'A photo' })).not.toBeNull();
    expect(getByText('Image failed to load')).not.toBeNull();
    expect(getByRole('button', { name: 'Retry' })).not.toBeNull();
  });

  it('renders a custom fallback instead of the default placeholder on error', () => {
    const { container, getByText, queryByText } = render(
      <Image src={SRC} alt="A photo" fallback={<span>custom oops</span>} />,
    );
    fireEvent.error(getImg(container));
    expect(getByText('custom oops')).not.toBeNull();
    expect(queryByText('Image failed to load')).toBeNull();
  });

  it('retry returns to loading and re-fetches (img remounts, then loads)', () => {
    const { container, getByRole } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.error(getImg(container));
    fireEvent.click(getByRole('button', { name: 'Retry' }));
    expect(container.querySelector('[data-state="loading"]')).not.toBeNull();
    fireEvent.load(getImg(container));
    expect(container.querySelector('[data-state="loaded"]')).not.toBeNull();
  });

  it('resets to loading when src changes after an error', () => {
    const { container, rerender } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.error(getImg(container));
    expect(container.querySelector('[data-state="error"]')).not.toBeNull();
    rerender(<Image src="https://example.com/other.jpg" alt="A photo" />);
    expect(container.querySelector('[data-state="loading"]')).not.toBeNull();
  });

  it('applies objectFit via the --image-object-fit custom property (default cover)', () => {
    const { container, rerender } = render(<Image src={SRC} alt="" />);
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--image-object-fit')).toBe('cover');
    rerender(<Image src={SRC} alt="" objectFit="contain" />);
    expect(wrapper.style.getPropertyValue('--image-object-fit')).toBe('contain');
  });

  it('applies the radius class (default md; none gives square corners)', () => {
    const { container, rerender } = render(<Image src={SRC} alt="" />);
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.className).toMatch(/radiusMd/);
    rerender(<Image src={SRC} alt="" radius="none" />);
    expect(wrapper.className).toMatch(/radiusNone/);
  });

  it('applies aspect-ratio from a number or a CSS string', () => {
    const { container, rerender } = render(<Image src={SRC} alt="" aspectRatio={1.5} />);
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.style.aspectRatio).toBe('1.5');
    rerender(<Image src={SRC} alt="" aspectRatio="16 / 9" />);
    expect(wrapper.style.aspectRatio).toBe('16 / 9');
  });

  it('defaults loading to lazy and allows override', () => {
    const { container, rerender } = render(<Image src={SRC} alt="" />);
    expect(getImg(container).getAttribute('loading')).toBe('lazy');
    rerender(<Image src={SRC} alt="" loading="eager" />);
    expect(getImg(container).getAttribute('loading')).toBe('eager');
  });

  it('forwards ref to the <img>', () => {
    const ref = createRef<HTMLImageElement>();
    const { container } = render(<Image src={SRC} alt="" ref={ref} />);
    expect(ref.current).toBe(getImg(container));
  });

  it('merges className onto the wrapper and spreads other attrs onto the img', () => {
    const { container } = render(
      <Image src={SRC} alt="" className="custom" data-testid="pic" sizes="50vw" />,
    );
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.className).toMatch(/custom/);
    const img = getImg(container);
    expect(img.getAttribute('data-testid')).toBe('pic');
    expect(img.getAttribute('sizes')).toBe('50vw');
  });
});
```

- [ ] **Step 4: Run the test — verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/Image/Image.test.tsx`
Expected: FAIL — `Failed to resolve import './Image'` (the component doesn't exist yet).

- [ ] **Step 5: Create the component** — `Image.tsx`

```tsx
import {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { ImageOff } from 'lucide-react';
import { Button } from '../Button';
import { Skeleton } from '../Skeleton';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './Image.module.scss';

/** How the image fills its box. Maps to CSS `object-fit`. */
export type ImageObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

/** Corner rounding. Maps to the radius token scale. */
export type ImageRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface ImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'alt' | 'children' | 'src' | 'loading'
> {
  /** Image URL. Changing it resets the component to the loading state. */
  src: string;
  /**
   * Alternative text (required). Describe the image's content or function.
   * Pass an empty string (`alt=""`) for purely decorative images.
   */
  alt: string;
  /**
   * How the image fills its box. Defaults to `'cover'`.
   * - `'cover'` — fill + crop (no distortion). Best for thumbnails / heroes.
   * - `'contain'` — whole image, letterboxed on the box background.
   * - `'fill'` — stretch to the box (may distort).
   * - `'none'` / `'scale-down'` — native size / the smaller of none|contain.
   */
  objectFit?: ImageObjectFit;
  /**
   * Reserve the box at a fixed ratio to prevent layout shift while loading.
   * Number (`1.5`) or CSS string (`'16 / 9'`).
   */
  aspectRatio?: string | number;
  /**
   * Corner rounding. Defaults to `'md'`. Pass `'none'` for square corners; for
   * circular profile images use `<Avatar>`.
   */
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

type LoadState = 'loading' | 'loaded' | 'error';

const RADIUS_CLASS: Record<ImageRadius, string> = {
  none: styles.radiusNone,
  sm: styles.radiusSm,
  md: styles.radiusMd,
  lg: styles.radiusLg,
  full: styles.radiusFull,
};

/**
 * Displays a remote image with built-in loading and error states. Reserves its
 * box (no layout shift), shows a `Skeleton` while loading, fades in on load, and
 * degrades to a compact, accessible broken-image placeholder (with retry) on
 * failure.
 *
 * The wrapper fills its container's width — give it an `aspectRatio` (or a
 * height) so the box is reserved before the image arrives. `className` / `style`
 * apply to the wrapper box; `ref` forwards to the underlying `<img>`.
 *
 * @example
 * // Responsive 16:9 thumbnail
 * <Image src={url} alt="Quarterly revenue chart" aspectRatio="16 / 9" />
 *
 * @example
 * // Contain a logo on its muted box, square corners
 * <Image src={logo} alt="Acme Corp" objectFit="contain" radius="none" />
 *
 * @example
 * // Eager above-the-fold hero with a custom error fallback
 * <Image
 *   src={hero}
 *   alt="Welcome aboard"
 *   loading="eager"
 *   aspectRatio={2}
 *   fallback={<EmptyState title="Couldn't load the hero image" />}
 * />
 *
 * @remarks When NOT to use
 * - Circular profile / identity images → use `<Avatar>` (initials fallback).
 * - Cropping / zoom UI → use `<ImageCrop>`.
 * - Decorative CSS backgrounds → use a `background-image`, not a content `<img>`.
 * - Icons / vector glyphs → use a `lucide-react` icon or inline SVG.
 *
 * @remarks Anti-patterns
 * - ❌ Empty `alt` for a meaningful image — pass a real description.
 * - ❌ No `aspectRatio` / height when you care about layout shift — reserve the box.
 */
export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  {
    src,
    alt,
    objectFit = 'cover',
    aspectRatio,
    radius = 'md',
    fallback,
    loading = 'lazy',
    className,
    style,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const [state, setState] = useState<LoadState>('loading');
  const [reloadNonce, setReloadNonce] = useState(0);

  // Reset to loading whenever the source changes (the Avatar pattern).
  useEffect(() => {
    setState('loading');
  }, [src]);

  const retry = () => {
    setState('loading');
    setReloadNonce((n) => n + 1); // re-key the <img> to force a re-fetch
  };

  const wrapperStyle = {
    aspectRatio:
      aspectRatio === undefined
        ? undefined
        : typeof aspectRatio === 'number'
          ? String(aspectRatio)
          : aspectRatio,
    '--image-object-fit': objectFit,
    ...style,
  } as CSSProperties;

  return (
    <span
      className={clsx(styles.wrapper, RADIUS_CLASS[radius], className)}
      style={wrapperStyle}
      data-state={state}
    >
      {/* {...rest} FIRST (Pattern B): the state machine owns
          src/alt/key/onLoad/onError, so a careless spread can't break them. */}
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

      {state === 'loading' && <Skeleton variant="rectangular" className={styles.overlay} />}

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
});
```

- [ ] **Step 6: Create the barrel** — `index.ts`

```ts
export { Image } from './Image';
export type { ImageProps, ImageObjectFit, ImageRadius } from './Image';
```

- [ ] **Step 7: Run the test — verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/Image/Image.test.tsx`
Expected: PASS — all 13 tests green.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/Image
git commit -m "feat(Image): image primitive with loading/error states, objectFit/aspectRatio/radius"
```

---

## Task 3: Library wiring (export + manifest + AGENTS)

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/src/_meta/manifest.ts`
- Regen: `packages/design-system/src/components.manifest.json`
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Re-export from `src/index.ts`**

Add these two lines alongside the other component exports (e.g. directly after the existing `Avatar` export block, keeping rough alpha order):

```ts
export { Image } from './components/Image';
export type { ImageProps, ImageObjectFit, ImageRadius } from './components/Image';
```

- [ ] **Step 2: Classify in the manifest generator**

In `packages/design-system/src/_meta/manifest.ts`, add `Image` to the `CLUSTERS` map (next to `Avatar: 'Display',`):

```ts
  Image: 'Display',
```

- [ ] **Step 3: Regenerate the committed manifest**

Run: `cd packages/design-system && npm run build:manifest`
Expected: `src/components.manifest.json` updates to include an `Image` entry with `tier: 'composition'`, `cluster: 'Display'`, `composes: ['Button', 'Skeleton']`, and adds `Image` to the `composedBy` arrays of `Button` and `Skeleton`. Stage the regenerated file.

- [ ] **Step 4: Add the AGENTS.md TL;DR**

In `packages/design-system/AGENTS.md`, add this entry in the Display section (match the surrounding entry format):

````markdown
### `<Image>` — image with loading + error states

```tsx
<Image src={url} alt="Quarterly revenue chart" aspectRatio="16 / 9" />
```

Robust `<img>`: `Skeleton` while loading, fade-in on load, compact `ImageOff` error
placeholder with a retry button on failure.

- `src` / `alt` — required (`alt=""` for decorative).
- `objectFit`: `cover` (default) | `contain` | `fill` | `none` | `scale-down`.
- `aspectRatio`: number (`1.5`) or string (`'16 / 9'`) — reserves the box, no layout shift.
- `radius`: `none` | `sm` | `md` (default) | `lg` | `full`.
- `fallback` — custom node shown on error instead of the default placeholder.
- `loading` defaults to `'lazy'`; `ref` → the `<img>`; `className`/`style` → the wrapper box.

**When NOT to use:** circular avatars → `<Avatar>`; crop/zoom UI → `<ImageCrop>`; CSS
backgrounds → `background-image`; icons → lucide / inline SVG.
````

- [ ] **Step 5: Verify library gates (structure + manifest meta-tests included)**

Run: `make build-lib && make test`
Expected: typecheck passes; all tests pass, including `structure.test.ts` (Image has the 4 required files + index export) and the manifest meta-test (Image present + classified).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/src/components.manifest.json packages/design-system/AGENTS.md
git commit -m "feat(Image): export + manifest classification + AGENTS entry"
```

---

## Task 4: Playground demo + nav wiring

**Files:**

- Create: `packages/playground/src/pages/components/ImageDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`

- [ ] **Step 1: Create the demo** — `ImageDemo.tsx`

```tsx
import { useState } from 'react';
import { Image, Stack, Cluster, Grid, Text, Button, EmptyState } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const PHOTO = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80';
const PORTRAIT = 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=500&q=80';
const BROKEN = 'https://example.com/does-not-exist.jpg';

const GALLERY = [
  'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=80',
  'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=400&q=80',
];

function RetryDemo() {
  // Force the error state by pointing at a broken URL; retry is built in.
  return <Image src={BROKEN} alt="Intentionally broken image" aspectRatio="16 / 9" />;
}

export function ImageDemo() {
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  return (
    <DemoLayout
      name="Image"
      componentName="Image"
      description="Displays a remote image with a Skeleton loading state, fade-in on load, and a compact accessible broken-image placeholder (with retry). Use for content images; for circular avatars use Avatar."
      files={getComponentFiles('Image')}
    >
      <Example
        title="Basic"
        description="Give it an aspectRatio so the box is reserved (no layout shift). Fills its container's width."
        code={`<Image src={url} alt="Mountain lake" aspectRatio="16 / 9" />`}
      >
        <div style={{ maxWidth: 360 }}>
          <Image src={PHOTO} alt="Mountain lake at dawn" aspectRatio="16 / 9" />
        </div>
      </Example>

      <Example
        title="object-fit"
        description="cover fills + crops; contain shows the whole image letterboxed on the muted box."
        code={`<Image src={url} alt="…" objectFit="cover" aspectRatio="16 / 9" />
<Image src={url} alt="…" objectFit="contain" aspectRatio="16 / 9" />`}
      >
        <Stack gap="sm">
          <Cluster gap="sm">
            <Button
              variant={fit === 'cover' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFit('cover')}
            >
              cover
            </Button>
            <Button
              variant={fit === 'contain' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFit('contain')}
            >
              contain
            </Button>
          </Cluster>
          <div style={{ maxWidth: 360 }}>
            <Image src={PORTRAIT} alt="A dog" objectFit={fit} aspectRatio="16 / 9" />
          </div>
        </Stack>
      </Example>

      <Example
        title="Radius"
        description="none / sm / md (default) / lg / full."
        code={`<Image src={url} alt="…" radius="lg" aspectRatio="1" />`}
      >
        <Cluster gap="md">
          {(['none', 'sm', 'md', 'lg', 'full'] as const).map((r) => (
            <Stack key={r} gap="xs" align="center">
              <div style={{ width: 80 }}>
                <Image src={PHOTO} alt="" radius={r} aspectRatio="1" />
              </div>
              <Text size="xs" tone="muted">
                {r}
              </Text>
            </Stack>
          ))}
        </Cluster>
      </Example>

      <Example
        title="Error + retry"
        description="A failed load shows the ImageOff placeholder with a Retry button (re-fetches the source)."
        code={`<Image src={brokenUrl} alt="…" aspectRatio="16 / 9" />`}
      >
        <div style={{ maxWidth: 360 }}>
          <RetryDemo />
        </div>
      </Example>

      <Example
        title="Custom fallback"
        description="Override the default error placeholder with any node via `fallback`."
        code={`<Image src={brokenUrl} alt="…" aspectRatio="16 / 9" fallback={<EmptyState title="Couldn't load image" />} />`}
      >
        <div style={{ maxWidth: 360 }}>
          <Image
            src={BROKEN}
            alt="Broken with custom fallback"
            aspectRatio="16 / 9"
            fallback={<EmptyState size="sm" title="Couldn't load image" />}
          />
        </div>
      </Example>

      <Example
        title="In a gallery grid"
        description="Responsive grid of square thumbnails — each reserves its box and loads independently."
        code={`<Grid minColumnWidth="160px" gap="sm">{urls.map((u) => <Image key={u} src={u} alt="" aspectRatio="1" />)}</Grid>`}
      >
        <Grid minColumnWidth="160px" gap="sm">
          {GALLERY.map((u) => (
            <Image key={u} src={u} alt="" aspectRatio="1" />
          ))}
        </Grid>
      </Example>
    </DemoLayout>
  );
}
```

(The `style={{ maxWidth }}` / `style={{ width }}` wrappers are plain demo-page layout — demo pages are NOT mockups, so playground Hard rule 6 does not apply here; inline style for demo framing is normal, cf. ComponentsIndex.)

- [ ] **Step 2: Add the route in `App.tsx`**

Add the import near the other component-demo imports:

```tsx
import { ImageDemo } from './pages/components/ImageDemo';
```

Add the route among the `/components/*` routes (e.g. after the `/components/image-crop` or near the `i` entries):

```tsx
<Route path="/components/image" element={<ImageDemo />} />
```

- [ ] **Step 3: Add the sidebar nav entry in `AppShell.tsx`**

Add a lucide import (aliased to avoid clashing with the design-system `Image` concept) to the `lucide-react` import block:

```tsx
  Image as ImageIcon,
```

Add the item to the `Display` group in `componentGroups` (alpha order, near `image-crop` / `kbd`):

```tsx
      { to: '/components/image', label: 'Image', icon: ImageIcon, end: false },
```

- [ ] **Step 4: Add the overview card in `ComponentsIndex.tsx`**

Add an entry to the index grid matching the existing card shape, with a small live preview:

```tsx
<Link to="/components/image" style={{ textDecoration: 'none', color: 'inherit' }}>
  <Card padding="md">
    <Stack gap="sm">
      <div style={{ maxWidth: 220 }}>
        <Image
          src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=80"
          alt=""
          aspectRatio="16 / 9"
        />
      </div>
      <Text size="lg" weight="semibold">
        Image
      </Text>
      <Text size="sm" tone="muted">
        Loading + error states, objectFit, aspectRatio, radius.
      </Text>
    </Stack>
  </Card>
</Link>
```

Add `Image` to the `@eocrm/design-system` import in `ComponentsIndex.tsx` if not already imported. (Match the exact card/link markup already used in that file — the snippet above mirrors its pattern; adjust to the real wrapper if it differs.)

- [ ] **Step 5: Build the playground (typecheck + bundle)**

Run: `make build`
Expected: passes. Fix any TS error against the real component APIs if reported.

- [ ] **Step 6: Commit**

```bash
git add packages/playground/src/pages/components/ImageDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "feat(playground): Image demo + route + nav + index card"
```

---

## Task 5: Gates + Hard-rule-8 library review loop

This change touches `packages/design-system/**`, so the library review loop is **mandatory**.

- [ ] **Step 1: Run all gates**

```bash
make test          # vitest (all packages)
make build-lib     # tsc --noEmit (library)
make lint          # stylelint (both packages)
make build         # typecheck + bundle playground
npm pack --dry-run -w @eocrm/design-system   # no test files / internal paths in the tarball
```

All must pass before review.

- [ ] **Step 2: Spawn a fresh-context reviewer** (`general-purpose`) on the diff (`git diff main..HEAD`). Tell it to read `packages/design-system/CLAUDE.md`, `AGENTS.md`, the spec, then review against the 10 Rule-8 categories: bugs, a11y, API inconsistencies, type safety, rule violations (Rules 1–7), test coverage, token discipline, SCSS, cross-package leakage, package/distribution. Specifically verify:
  - Rule 1 (tests cover states/variants/ref/className), Rule 4 (no margin/fixed-width/positioning beyond the relative-anchor + intrinsic object-fit/aspect-ratio), Rule 5 (Image + 3 types exported), Rule 6 (forwardRef + spread), Rule 7 (full JSDoc + spread-order comment), Rule 9 (no inline English — `loadError`/`retry` via `t()`).
  - The `loading`/`loaded`/`error` machine + retry re-fetch + `src`-reset are correct; `--image-object-fit` consumed in SCSS; tokens resolve.
  - lucide-react used as a peer import (consistent with Alert/PasswordInput).
    Ask for Critical/Important/Nice-to-have/Regression-watch + verdict (`clean enough to stop` / `keep iterating`).

- [ ] **Step 3: Fix every Critical + Important.** Document any deliberate skip in one line.

- [ ] **Step 4: Re-run the gates from Step 1.**

- [ ] **Step 5: Spawn another reviewer** (same brief). Repeat Steps 3–5 until verdict is `clean enough to stop` with 0 Critical / 0 Important.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A && git commit -m "fix(Image): address library review findings"
```

---

## Task 6: Visual verification + PR

- [ ] **Step 1: Visual check** — run `make dev` (or reuse a running playground on :8080) and drive a browser (Playwright MCP) to `http://localhost:8080/components/image`. Confirm: loaded image fades in; the gallery shows skeletons → images; the Error example shows the `ImageOff` placeholder + a working Retry; object-fit cover/contain toggle; radius row; custom fallback renders the EmptyState. Screenshot the page.

- [ ] **Step 2: Push the branch**

Run: `git push -u origin feat/image-component`
Expected: the pre-push hook (prettier + stylelint + typecheck) passes. If prettier flags files, run `npx prettier --write <files>`, commit, and re-push. Never use `--no-verify`.

- [ ] **Step 3: Open the PR**

```bash
gh pr create --base main --title "Add Image component (loading + error states)" --body "$(cat <<'EOF'
## Summary
A new `<Image>` library primitive: `Skeleton` loading state, fade-in on load, and a compact accessible `ImageOff` error placeholder with retry + custom `fallback`. Display props `objectFit` / `aspectRatio` / `radius`, default `loading="lazy"`, full i18n (`image.loadError`, `image.retry`). Composes Skeleton + Button (tier: composition, cluster: Display). Tests, demo, exports, manifest, and AGENTS entry included.

## Test Plan
- [x] make test / make build-lib / make lint / make build green
- [x] npm pack --dry-run clean
- [x] Hard-rule-8 review loop → clean
- [x] Visual check at /components/image (loaded, loading, error+retry, object-fit, radius, fallback, gallery)
- [ ] CI Quality / check

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Wait for `Quality / check` to pass.**

---

## Self-review checklist

1. **Spec coverage:** state machine + always-mounted img + overlays (Task 2 Image.tsx); Skeleton loading (Task 2); fade-in (scss opacity transition); error placeholder ImageOff + loadError + retry (Task 2 + Task 1 i18n); custom fallback (Task 2); default loading=lazy (Task 2); objectFit/aspectRatio/radius=md (Task 2); src-reset (useEffect); ref→img, className→wrapper (Task 2 + tests); i18n keys (Task 1); export/manifest/AGENTS (Task 3); demo/route/nav/index (Task 4); Rule-8 loop (Task 5). All covered.
2. **Placeholders:** none — full code for tokens/scss/tsx/test/index, exact i18n blocks, exact manifest + export + AGENTS additions, exact demo. The only "match the real wrapper" note is for the ComponentsIndex card (its exact JSX may differ slightly); the snippet mirrors the documented pattern and the engineer aligns it.
3. **Type/name consistency:** `ImageProps`/`ImageObjectFit`/`ImageRadius`, `state`/`reloadNonce`/`retry`, `--image-object-fit`, `RADIUS_CLASS`, `image.loadError`/`image.retry`, `styles.wrapper/img/overlay/error/errorText/radius*` used consistently across component, test, scss, and i18n.
