# `<RichText>` — read-only rich-text renderer

Renders a `RichDoc` (the in-house rich-text model) read-only: paragraphs, H1–H3, bullet/ordered lists, blockquotes, code blocks, and inline marks (bold/italic/underline/strike/code/link). No editor libraries. Build docs with the exported engine constructors/transforms.

```tsx
const doc = {
  blocks: [
    createBlock('heading', 'Notes', { level: 2 }),
    createBlock('paragraph', 'See the docs.'),
  ],
};
<RichText value={doc} />;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `RichDoc` | yes | The document to render. Build one with `emptyDoc()` / `createBlock()` or the transforms. |
| `renderLink` | `RenderLink` | no | Substitute how a link renders. Called per link with `{ href, text }` and the default `<a>` node; return your own node (e.g. a task/member chip) or the `defaultNode` to keep the standard anchor. Render-time only — the document model is unchanged, so serialization still emits a plain link. Prose link styling (accent colour + underline) applies to BARE anchors only: an `<a>` you return with any `className` — including a DS `<Link>` — keeps its own decoration and colour entirely. |
| `renderMention` | `RenderMention` | no | Substitute how an `@`-mention renders. Called per mention with `{ id, label }` and the default mention span; return your own node (e.g. an interactive member chip / popover trigger) or the `defaultNode` to keep the standard non-interactive span. Render-time only — the document model is unchanged, so serialization still emits the mention mark. Composes with `renderLink`. |
| `imageMaxHeight` | `number` | no | Maximum DISPLAYED height of image attachments, in px. Default: the `--size-rich-text-image-max-height` token (480px). A taller image shrinks (width follows, aspect preserved) — render-time only; stored `width`/`height` are unchanged, so existing documents need no migration. There is no "off": pass a large value to effectively remove the cap. |
| `onImageActivate` | `RichTextImageActivateHandler` | no | Make inline images keyboard-operable triggers (e.g. to open a `Lightbox`). When set, each ready image attachment renders inside a native `<button type="button">` named "Open image: <alt or file name>"; click, Enter and Space call this with `{ src, alt }` and the button — return focus to it when your overlay closes. Unset: the plain `<img>`, unchanged. `alt` is the stored value (may be `''` or absent) — `LightboxItem.alt` is required, so supply your own fallback. Pass a stable reference (`useCallback`): a new function each render rebuilds every attachment block. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

**`renderLink`** (optional) — substitute how a link renders. The consumer checks "is this URL in my space?" and returns its own node (e.g. a task/member chip) or the supplied `fallback` (the standard `<a>`). It's render-time only — the model and `toHtml`/`toMarkdown` still emit a plain link, so serialization is unchanged. Don't do heavy synchronous work or block on the network inside it; return a component that handles its own lookup/cache. The same resolver works in `<RichText>` (viewer) and `<RichTextEditor>` (where a substituted link becomes an atomic chip). Typing against a link's trailing edge produces UNLINKED text — the link is inherited only with the caret strictly inside it, so text typed after a chip is visible instead of disappearing into the link's text under the unchanged href.

```tsx
const renderLink: RenderLink = ({ href }, fallback) => {
  const m = /^https?:\/\/app\.eocrm\/task\/(\d+)/i.exec(href);
  return m ? <Badge tone="purple">#{m[1]}</Badge> : fallback;
};
<RichText value={doc} renderLink={renderLink} />;
```

**`renderMention`** (optional) — `(mention: { id, label }, defaultNode) => ReactNode` — same contract as `renderLink` but for `@`-mention marks (render an interactive member chip/popover trigger), or return `defaultNode` for the standard non-interactive mention span. Composes with `renderLink`. Render-time only — `toHtml`/`toMarkdown` and the model still emit the mention mark. Works in both `<RichText>` and `<RichTextEditor>` (where a substituted mention becomes an atomic chip).

**`onImageActivate`** (optional) — `(image: { src, alt? }, trigger) => void` — makes inline images keyboard-operable triggers, typically to open a `<Lightbox>`. When set, each ready image attachment renders inside a native `<button type="button">` (Tab-focusable, Enter/Space, library focus ring) named "Open image: <alt, else file name>"; the inner `<img>` gets `alt=""` so the name isn't read twice. File chips get no trigger. `trigger` is that button: focus it before opening your overlay so `Lightbox` returns focus there on close (a click doesn't focus a button in Safari). `alt` is the stored value (may be `''` or absent) — `LightboxItem.alt` is required, so supply your own fallback. Pass a stable reference (`useCallback`) — a new function each render rebuilds every attachment block. Unset, images render as the plain `<img>`, unchanged. Read-only `<RichText>` only.

```tsx
const [image, setImage] = useState<{ src: string; alt?: string } | null>(null);
const onImageActivate = useCallback<RichTextImageActivateHandler>((img, trigger) => {
  trigger.focus();
  setImage(img);
}, []);
<RichText value={doc} onImageActivate={onImageActivate} />
<Lightbox open={image !== null} onOpenChange={(o) => !o && setImage(null)} items={image ? [{ src: image.src, alt: image.alt || 'Attached image' }] : []} />;
```

When NOT to use: plain text → `Text`. For editing → `<RichTextEditor>`. The model is immutable; render the doc returned by a transform, never mutate in place.

- ❌ Hand-writing HTML to display rich content — feed a `RichDoc` to `<RichText>`.
- ❌ A delegated `onClick` on the `<RichText>` root to open images — mouse/touch only: the `<img>` isn't focusable, has no button role and leaves nothing to return focus to. Use `onImageActivate`.
