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
```

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
