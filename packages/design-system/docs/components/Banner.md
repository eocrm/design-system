# `<Banner>` — full-width system / app message bar

Tinted, full-width bar for messages about the system or account, not the page: maintenance, "Email sending suspended", "Sending restored". Mount it ONLY in `<AppLayout>`'s `banner` (system-wide, above everything) or `contextBanner` (module/route-scoped, under the top bar) slot. For page content use `<Alert>`.

```tsx
import { AppLayout, Banner, Link } from '@eocrm/design-system';

<AppLayout
  banner={
    <Banner
      tone="warning"
      title="Scheduled maintenance"
      action={<Link href="/status">Details</Link>}
    >
      Sat 4 Oct, 22:00–23:00 CET. CRM will be read-only.
    </Banner>
  }
  contextBanner={
    inEmail &&
    suspended && (
      <Banner tone="danger" title="Email sending suspended.">
        Bounce rate 7.2% (limit 5%).
      </Banner>
    )
  }
  topBar={<TopBar />}
  sidebar={<Rail>{nav}</Rail>}
>
  {routes}
</AppLayout>;

// Module-scoped banner that appeared mid-session: danger + live is announced on insertion (role="alert")
<Banner
  tone="danger"
  live
  title="Email sending suspended."
  action={
    <Button size="xs" variant="secondary">
      Review bounces
    </Button>
  }
>
  Bounce rate 7.2% (limit 5%).
</Banner>;

// Dismissible: the app persists the dismissal
{
  !dismissed && (
    <Banner tone="success" onDismiss={() => setDismissed(true)}>
      Email sending restored.
    </Banner>
  );
}
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `tone` | `BannerTone` | no | — | Tone. Defaults to `'info'`. See `BannerTone`. |
| `title` | `ReactNode` | no | — | Optional bold lead-in, rendered INLINE before `children` in the same text flow ("**Scheduled maintenance** Sat 22:00–23:00."). Keep it short — the banner is one line on desktop. Collapses the native HTML `title` (tooltip) attribute. |
| `children` | `ReactNode` | no | — | Message text. Wraps with the title. Keep to one sentence. |
| `icon` | `ReactNode` | no | — | Override the tone's default icon (any ReactNode, typically a 16px lucide icon with `aria-hidden`). `null` hides it. Defaults: `info` → `Info`, `success` → `CheckCircle2`, `warning` → `AlertTriangle`, `danger` → `XCircle`. |
| `action` | `ReactNode` | no | — | One action pinned to the end of the row — typically a `<Link>` ("Details") or a `<Button size="xs">` ("Review bounces"). Banner doesn't lay out multiple actions; pass one. |
| `live` | `boolean` | no | false | Whether the Banner is a live region. Defaults to `false`: `role="note"`, right for a banner that is present when the app loads. Pass `live` for a banner that APPEARS mid-session. Caveat: a mid-session Banner mounts together with its text, and a `role="status"` region that mounts with its text is not reliably announced. Only `tone="danger"` + `live` (`role="alert"`) is announced on insertion. For a must-hear non-danger message, pair the banner with a `<LiveRegion>` or a toast. Decide it at mount — flipping it on a mounted Banner announces nothing. |
| `onDismiss` | `(() => void)` | no | — | Called when the × is clicked. When set, the × renders. **Controlled** — Banner keeps no hidden state and persists nothing; the app decides what "dismissed" means (per session, per incident, per user) and stops rendering it. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- `tone`: `info` (default) / `success` / `warning` / `danger`. Info = advance notice; warning = imminent/degrading; danger = broken now; success = condition resolved.
- `title` renders bold and **inline** before the text. Keep the whole thing to one line on desktop.
- `action`: one `<Link>` or `<Button size="xs">`. `onDismiss` shows the × button and is **controlled**: the app persists the dismissal.
- **The tone is spoken.** A visually hidden, localised prefix ("Warning: ") comes before the text.
- `icon`: overrides the tone's default icon; `icon={null}` hides it.
- The tone is `danger`, not Alert's `error`.
- **`live` defaults to `false`** (`role="note"`), because banners are usually present at load. Pass `live` for one that appears mid-session — but a Banner mounts together with its text, so `role="status"` is not reliably announced; only `tone="danger"` + `live` (`role="alert"`) is. For a must-hear non-danger message, add a `<LiveRegion>` or a toast alongside the banner.
- Neither slot is sticky; only the TopBar pins.

**Anti-patterns**

- ❌ A Banner inside page content. Use `<Alert>`.
- ❌ `onDismiss` on a `danger` banner while the condition still holds.
- ❌ Routine stacks of banners in one slot. Show the most severe first.
- ❌ A system-wide message in `contextBanner`, or a route-specific one in `banner`.
- ❌ `live` on a banner that is present when the app loads.
- ❌ Relying on `live` for a non-danger banner to be announced on appearing. Add a `<LiveRegion>` or a toast.
- ❌ Multiple actions or a paragraph of text. Link to a details page.

**When NOT to use:** content about the current page or a section of it → `<Alert>`; a transient confirmation ("Saved") → `toast.success(...)`; anywhere other than `AppLayout`'s `banner` / `contextBanner` slots (inside page content it is just a borderless Alert).
