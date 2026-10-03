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

| Prop            | Type            | Required | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------- | --------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`         | `RichDoc`       | yes      | —       | The document to render. Build one with `emptyDoc()` / `createBlock()` or the transforms.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `renderLink`    | `RenderLink`    | no       | —       | Substitute how a link renders. Called per link with `{ href, text }` and the default `<a>` node; return your own node (e.g. a task/member chip) or the `defaultNode` to keep the standard anchor. Render-time only — the document model is unchanged, so serialization still emits a plain link. Prose link styling (accent colour + underline) applies to BARE anchors only: an `<a>` you return with any `className` — including a DS `<Link>` — keeps its own decoration and colour entirely. |
| `renderMention` | `RenderMention` | no       | —       | Substitute how an `@`-mention renders. Called per mention with `{ id, label }` and the default mention span; return your own node (e.g. an interactive member chip / popover trigger) or the `defaultNode` to keep the standard non-interactive span. Render-time only — the document model is unchanged, so serialization still emits the mention mark. Composes with `renderLink`.                                                                                                             |
| …native         |                 |          |         | plus native `<div>` attributes                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

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

When NOT to use: plain text → `Text`. For editing → `<RichTextEditor>`. The model is immutable; render the doc returned by a transform, never mutate in place.
