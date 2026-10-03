# `<MediaTile>` — media tile with revealed overlay bars

`<MediaTile media title meta actions>` — a full-bleed `media` body (an `<Image>` or a file-type icon) with a top bar (`title` + `meta`) and a bottom bar (`actions`), each over a gradient gray scrim, **revealed on hover / keyboard focus**. Drop one per tile in a `<Masonry>` / `<Grid>` for a gallery or file grid. The reveal uses `opacity` (not `visibility`), so the action buttons stay tabbable — tabbing in fires `:focus-within` and reveals the bar.

```tsx
<Masonry minColumnWidth="180px" gap="sm">
  {files.map((f) => (
    <MediaTile
      key={f.id}
      media={<Image src={f.thumbUrl} alt={f.name} aspectRatio={1} objectFit="cover" />}
      title={f.name}
      meta={formatBytes(f.size)}
      actions={
        <Cluster gap="xs">
          <Button iconOnly variant="ghost" size="sm" aria-label={`Download ${f.name}`}>
            <Download size={16} />
          </Button>
        </Cluster>
      }
    />
  ))}
</Masonry>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `media` | `ReactNode` | yes | — | Tile body — full-bleed media (an `<Image>`, or a centered file-type icon). |
| `title` | `ReactNode` | no | — | Top-bar leading content (e.g. the file name). Truncates with an ellipsis. |
| `meta` | `ReactNode` | no | — | Top-bar trailing content (e.g. the file size). Sits at the end of the row. |
| `actions` | `ReactNode` | no | — | Bottom-bar controls (e.g. preview / download / delete icon buttons), centered. |
| `revealOn` | `MediaTileReveal` | no | — | When the bars + scrims reveal. Default `'hover'`. - `'hover'` — on pointer hover OR keyboard focus-within (focus always included for a11y). - `'focus'` — only on focus-within (no mouse-over reveal). - `'visible'` — always shown. |
| `radius` | `MediaTileRadius` | no | — | Corner rounding (clips the media). Default `'md'`. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- `revealOn`: `'hover'` (default — hover OR keyboard focus) · `'focus'` (focus only) · `'visible'` (always).
- Bars render only when they have content; icon-only `actions` need `aria-label`s.
- MediaTile clips + overlays only — the `media` (`<Image aspectRatio>`) owns the tile's aspect.

**When NOT to use:** a plain, non-revealing image block — `<Image>` (optionally inside a `<Card>`); a colored icon chip — `<IconTile>`.

- ❌ Putting the ONLY copy of critical info in a hover-revealed bar — it is hidden at rest for mouse users. Use `revealOn="visible"` if the info must always show.
