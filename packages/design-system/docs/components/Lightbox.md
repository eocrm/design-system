# `<Lightbox>` — full-screen image & document gallery overlay

`<Lightbox open onOpenChange items>` shows one large item at a time (an image, or a PDF in an `<iframe>`) with prev/next chevrons, ← → keys, a thumbnail strip, a position counter, and an optional caption. Controlled `open` like `<Modal>`; the current index is uncontrolled (`defaultIndex`) unless you pass `index` + `onIndexChange`. `loop` (default true) wraps at the ends. The consumer owns the trigger — typically a row of interactive `<Image>` thumbnails. For a single inline image use `<Image>`.

```tsx
const [open, setOpen] = useState(false);
const [start, setStart] = useState(0);
<Lightbox
  open={open}
  onOpenChange={setOpen}
  defaultIndex={start}
  items={files.map((f) => ({ src: f.url, alt: f.name, caption: f.name }))}
/>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `open` | `boolean` | yes | — | Controlled open state. |
| `onOpenChange` | `(open: boolean) => void` | yes | — | Fired when the Lightbox wants to close — Esc, backdrop click, the × button. |
| `items` | `LightboxItem[]` | yes | — | The images. An empty array renders nothing. |
| `defaultIndex` | `number` | no | — | Initial image index (uncontrolled). Defaults to `0`. Clamped to range. |
| `index` | `number` | no | — | Controlled current index. When set, pair with `onIndexChange`. |
| `onIndexChange` | `((index: number) => void)` | no | — | Fired on navigation (chevron / arrow key / thumbnail click). |
| `loop` | `boolean` | no | — | Wrap past the first/last image. Defaults to `true`. |
| `className` | `string` | no | — | className for the dialog container. |
| `aria-label` | `string` | no | — | Accessible label for the dialog. Defaults to the i18n "Image gallery" when omitted OR empty — an empty string is not an explicit name, so it takes the default too. |

<!-- props:end -->

- Each `LightboxItem` is `{ src, alt, kind?, caption?, thumbnail? }` — `alt` is required.
- `items` accept `kind: 'pdf'` (or a `.pdf` src) → rendered in an `<iframe>` with a download action; mixed image+PDF galleries supported. A PDF without a `thumbnail` shows a document-icon placeholder in the strip; unsafe (non-http(s)) doc srcs show a "Preview unavailable" message.
- Single item → chevrons, counter, and strip auto-hide. Empty `items` → renders nothing.
- Reuses the DS overlay machinery (focus-trap, scroll-lock, Esc — yielding to open floating surfaces first like Modal/Drawer, stacking above modals).

Mixed gallery (images + a PDF):

```tsx
<Lightbox
  open={open}
  onOpenChange={setOpen}
  items={[
    { src: shot.url, alt: 'Screenshot' },
    { src: doc.url, alt: 'Contract.pdf', kind: 'pdf' },
  ]}
/>
```

**When NOT to use**

- A single, always-visible image — use `<Image>` (optionally `interactive`).
- An arbitrary modal dialog (not an image/PDF preview) — use `<Modal>`.

**Anti-patterns**

- ❌ Building your own `Modal` + `Image` + arrows — that is what this is.
- ❌ Omitting `alt` on items — it is required and names the thumbnail and the stage.
- ❌ Passing `index` without `onIndexChange` — navigation would be a no-op.
