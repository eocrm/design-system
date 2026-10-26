# `<TableOfContents>` — "On this page" navigation

Lists a long page's h2/h3 headings as in-page links, highlights the one being read (scroll-spy), and scrolls to a heading on click clear of the pinned TopBar. It does not make itself sticky — wrap it in `<Sticky top="topbar">`.

```tsx
const items = [
  { id: 'overview', label: 'Overview', level: 2 },
  { id: 'install', label: 'Install', level: 3 },
  { id: 'usage', label: 'Usage', level: 2 },
];

// Wide viewports: a pinned rail beside the content.
<Split
  side="end"
  asideWidth="240px"
  align="stretch"
  collapseBelow="md"
  onCollapsedChange={setNarrow}
  aside={
    <Sticky top="topbar">
      <TableOfContents items={items} />
    </Sticky>
  }
>
  <article>
    <h2 id="overview">Overview</h2>
    <h3 id="install">Install</h3>
    <h2 id="usage">Usage</h2>
  </article>
</Split>;

// Narrow viewports: a disclosure above the content (drive it from Split's onCollapsedChange).
{
  narrow ? <TableOfContents items={items} collapsed /> : null;
}
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `items` | `readonly TableOfContentsItem[]` | yes | Entries in document order. An empty list renders nothing. |
| `collapsed` | `boolean` | no | Render a `<details>` disclosure (summary "On this page · <active>") instead of the heading + list. Use where there is no room for a side rail, e.g. on narrow viewports above the content. Default `false`. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- `items` are explicit `{ id, label, level: 2 | 3 }`; every `id` must match a heading's `id` on the page. Level 3 is indented under the preceding level 2.
- Exactly one `<nav>` named "On this page", in both modes. Override with `aria-label` when two TOCs share a page.
- The active link gets `aria-current="location"`; there are no live announcements. The server render has no active item.
- Only the **window** scrolls: scroll-spy and click-scroll ignore inner scroll containers.
- Click scrolls smoothly (instantly under `prefers-reduced-motion`) to the heading's top minus `--sticky-top-topbar`, updates the URL hash (`pushState`, or `replaceState` when the hash is unchanged) and focuses the heading. A heading that isn't focusable gets `tabindex="-1"` added, and keeps it.
- Modifier clicks (cmd/ctrl/shift/alt, non-primary button) and ids with no matching element fall through to native link behaviour.
- Scrolled to the bottom of the page, the last item is active (short final sections can't otherwise reach the top).
- `collapsed` renders a `<details>` disclosure (summary "On this page · active heading"); choosing an entry closes it.
- Empty `items` renders nothing.
- For `#hash` links opened directly (not via a click) to clear the bar, add `html { scroll-padding-top: var(--sticky-top-topbar); }` to the app's global CSS.

When NOT to use: app or page-level navigation → `Rail` / `Tabs`; short pages with a few headings need no TOC; headings inside an inner scroll container (only the window is tracked).

- ❌ Omitting the `<Sticky top="topbar">` wrapper and expecting the rail to pin: the component is not sticky.
- ❌ `items` ids that don't match heading ids: the entry renders but never becomes active, and clicking falls back to native jump (no TopBar offset).
- ❌ Rendering both the rail and the collapsed form at once: that yields two "On this page" navs.
