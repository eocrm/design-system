# `<MediaTile>` — media tile with caption, revealed actions and selection

`<MediaTile media title meta actions>` — a full-bleed `media` body (an `<Image>` or a file-type icon) with a `title` + `meta` caption and `actions`. Drop one per tile in a `<Masonry>` / `<Grid>` for a gallery or file grid.

- `captionPlacement="overlay"` (default) — caption in a top bar and `actions` in a bottom bar, each over a gradient scrim, **revealed on hover / keyboard focus**. Compact; the name is hidden at rest.
- `captionPlacement="below"` — caption in a **solid, always-visible** bar under the media (normal text colour on the surface); `actions` move to a top-right chip over the media, still revealed per `revealOn`. Use for a record's Files tab, where file names must be readable.
- `selectable` adds a checkbox top-left over the media (`selected` / `onSelectedChange` / `selectLabel`); a selected tile gets `data-selected` and an accent ring. Only the checkbox toggles selection — the tile's own `onClick` (e.g. open preview) keeps working.

The reveal uses `opacity` (not `visibility`), so the controls stay tabbable — tabbing in fires `:focus-within` and reveals them. On touch devices (`(hover: none)`), `revealOn="hover"` behaves like `"visible"` in both placements, so touch users can reach the controls. A checked checkbox is always shown.

```tsx
// File grid: readable names, multi-select, actions top-right
const [selected, setSelected] = useState<Set<string>>(new Set());
const anySelected = selected.size > 0;

<Masonry minColumnWidth="180px" gap="sm">
  {files.map((f) => (
    <MediaTile
      key={f.id}
      captionPlacement="below"
      media={
        <Image
          src={f.thumbUrl}
          alt={f.name}
          aspectRatio={1}
          objectFit="cover"
          objectPosition="top"
        />
      }
      title={f.name}
      meta={formatBytes(f.size)}
      selectable
      selected={selected.has(f.id)}
      onSelectedChange={(next) => toggle(f.id, next)}
      revealOn={anySelected ? 'visible' : 'hover'} // selection mode: show every checkbox
      onClick={() => openPreview(f)} // the tile still opens the preview; the checkbox selects
      actions={
        <Button iconOnly variant="ghost" size="sm" aria-label={`Download ${f.name}`}>
          <Download size={16} />
        </Button>
      }
    />
  ))}
</Masonry>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `media` | `ReactNode` | yes | Tile body — full-bleed media (an `<Image>`, or a centered file-type icon). |
| `title` | `ReactNode` | no | Caption leading content (e.g. the file name). Truncates with an ellipsis. |
| `meta` | `ReactNode` | no | Caption trailing content (e.g. the file size). Sits at the end of the row. |
| `actions` | `ReactNode` | no | Tile controls (e.g. preview / download / delete icon buttons). With `captionPlacement="overlay"` they sit in a centered bottom bar over a scrim; with `"below"` they sit in a top-right cluster over the media. Either way they follow `revealOn`. |
| `captionPlacement` | `'overlay' \| 'below'` | no | Where `title` + `meta` render. Default `'overlay'`. - `'overlay'` — a top bar over a gradient scrim on the media, revealed per `revealOn`. Compact, but the name is hidden at rest for mouse users. - `'below'` — a solid bar under the media in normal text colour, ALWAYS visible (not affected by `revealOn`). Use for file grids where the name must be readable. |
| `revealOn` | `'hover' \| 'focus' \| 'visible'` | no | When the overlay bars, `actions` and the selection checkbox reveal. Default `'hover'`. - `'hover'` — on pointer hover OR keyboard focus-within (focus always included for a11y). On touch devices (`(hover: none)`) it behaves like `'visible'`. - `'focus'` — only on focus-within (no mouse-over reveal). - `'visible'` — always shown. A checked selection checkbox is always shown regardless. |
| `radius` | `'none' \| 'sm' \| 'md' \| 'lg'` | no | Corner rounding (clips the media). Default `'md'`. |
| `selectable` | `boolean` | no | Render a selection checkbox top-left over the media. Default `false`. Only the checkbox toggles selection — clicking the tile does not (so a tile `onClick`, e.g. open preview, keeps working; checkbox clicks don't bubble to it). |
| `selected` | `boolean` | no | Controlled selected state (only used when `selectable`). Sets `data-selected` + an accent ring on the tile. Default `false`. |
| `onSelectedChange` | `((next: boolean) => void)` | no | Fires with the next selected state when the checkbox is toggled. |
| `selectLabel` | `string` | no | Accessible name of the selection checkbox, e.g. `"Select report.pdf"`. Defaults to the localized "Select {title}" when `title` is a string, else "Select". |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- Bars/caption render only when they have content; icon-only `actions` need `aria-label`s.
- MediaTile clips + overlays only — the `media` (`<Image aspectRatio>`) owns the media's aspect; `captionPlacement="below"` adds the caption bar's height under it.
- `selectLabel` defaults to the localized "Select {title}" when `title` is a string, else "Select" — pass it when `title` is a node.

**When NOT to use:** a plain, non-revealing image block — `<Image>` (optionally inside a `<Card>`); a colored icon chip — `<IconTile>`.

- ❌ Putting the ONLY copy of critical info in a hover-revealed overlay bar — it is hidden at rest for mouse users. Use `captionPlacement="below"` (or `revealOn="visible"`).
- ❌ Making the tile itself toggle selection (`onClick={() => toggle(id)}`) — it steals the click from preview/open and is not announced as a checkbox. Use `selectable` + `onSelectedChange`; the tile click stays free for opening.
- ❌ Leaving `revealOn="hover"` while some tiles are selected — mouse users can't see which other tiles are selectable. Switch the grid to `revealOn="visible"` once anything is selected.
