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
| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | yes | Controlled open state. |
| `onOpenChange` | `(open: boolean) => void` | yes | Fired when the Lightbox wants to close — Esc, backdrop click, the × button. |
| `items` | `LightboxItem[]` | yes | The images and documents (mixed galleries are supported; see `kind` on `LightboxItem` for PDFs). A PDF without a `thumbnail` shows a document-icon placeholder in the strip; an unsafe (non-http(s)) document `src` shows a "Preview unavailable" message. An empty array renders nothing. |
| `defaultIndex` | `number` | no | Initial image index (uncontrolled). Defaults to `0`. Clamped to range. |
| `index` | `number` | no | Controlled current index. When set, pair with `onIndexChange`. |
| `onIndexChange` | `((index: number) => void)` | no | Fired on navigation (chevron / arrow key / thumbnail click). |
| `loop` | `boolean` | no | Wrap past the first/last image. Defaults to `true`. |
| `actions` | `((item: LightboxItem, index: number) => ReactNode)` | no | Extra header actions for the current item (e.g. a Download `<Button>`, a `<DropdownMenu>` "more" menu). Called with the current item and its index on every render, so it follows navigation. Rendered in the top-right toolbar BEFORE the close button. Use `<Button iconOnly variant="ghost" size="sm">` (or a DropdownMenu trigger built from one) — the toolbar re-themes ghost Buttons for the dark scrim (ghost tokens, full radius, `sm` height = the toolbar control size), so text Buttons render pill-shaped — keep actions icon-only. While an action's menu is open, Esc closes the menu first, and ←/→ stay with the menu (not the gallery) while focus is in it; a Tooltip on an action doesn't block navigation. Returning `null`/`undefined` renders nothing. REPLACES the built-in PDF download link: when `actions` is set, the Lightbox renders no download action of its own — include your own Download for PDF items if you want one. |
| `className` | `string` | no | className for the dialog container. |
| `aria-label` | `string` | no | Accessible label for the dialog. Defaults to the i18n "Image gallery" when omitted OR empty — an empty string is not an explicit name, so it takes the default too. |

<!-- props:end -->

- Each `LightboxItem` is `{ src, alt, kind?, caption?, thumbnail? }` — `alt` is required.
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

Header actions — `actions(item, index)` renders consumer controls in the top-right toolbar, before the close button, for the current item (re-rendered on navigation). Use `<Button iconOnly variant="ghost" size="sm">` (and DropdownMenu triggers built from one); the toolbar re-themes ghost Buttons for the dark scrim. The toolbar re-themes any Button inside it (ghost tokens, full radius, `sm` height = the toolbar control size), so a text Button renders pill-shaped — keep actions `variant="ghost" iconOnly`. A DropdownMenu opened from an action works normally — while focus is in it, ←/→ stay with the menu (no gallery navigation), and Esc closes the menu first, then the Lightbox. A Tooltip on an action does not block ←/→.

```tsx
<Lightbox
  open={open}
  onOpenChange={setOpen}
  items={files}
  actions={(item) => (
    <>
      <Button
        as="a"
        href={item.src}
        download
        target="_blank"
        rel="noopener noreferrer"
        iconOnly
        variant="ghost"
        size="sm"
        aria-label={t('download')}
      >
        <Download size={20} aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <Button iconOnly variant="ghost" size="sm" aria-label={t('more')}>
            <MoreHorizontal size={20} aria-hidden="true" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item onSelect={() => rename(item)}>Rename</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </>
  )}
/>
```

**`actions` replaces the built-in PDF download.** Without `actions`, a PDF item gets a Download link automatically. With `actions` set, the Lightbox renders no download of its own — the consumer owns the whole header, so include a Download action yourself if PDFs (or images) should be downloadable.

Tall or wide images are scaled down (`object-fit: contain`) to fit the stage — never cropped.

**When NOT to use**

- A single, always-visible image — use `<Image>` (optionally `interactive`).
- An arbitrary modal dialog (not an image/PDF preview) — use `<Modal>`.

**Anti-patterns**

- ❌ Building your own `Modal` + `Image` + arrows — that is what this is.
- ❌ Omitting `alt` on items — it is required and names the thumbnail and the stage.
- ❌ Passing `index` without `onIndexChange` — navigation would be a no-op.
- ❌ Passing `actions` and expecting the built-in PDF download to stay — `actions` replaces it; add your own Download action.
- ❌ Primary/secondary Buttons in `actions` — they ignore the scrim re-theme and look out of place; use `variant="ghost" iconOnly size="sm"`.
