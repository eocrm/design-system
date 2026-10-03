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

- `revealOn`: `'hover'` (default — hover OR keyboard focus) · `'focus'` (focus only) · `'visible'` (always).
- Bars render only when they have content; icon-only `actions` need `aria-label`s.
- MediaTile clips + overlays only — the `media` (`<Image aspectRatio>`) owns the tile's aspect.
