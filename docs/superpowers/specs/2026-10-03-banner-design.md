# Banner + AppLayout banner slots

## Problem

The CRM needs app-level messages about the system or account, not about the
page in view: "Scheduled maintenance Saturday 22:00", "Email sending suspended:
bounce rate above 5%", "Email sending restored". Today the only option is
`<Alert>`. Alert is an in-flow card (radius, left accent stripe, stacked
title/description) and sits inside the padded content region, so a system
message rendered with it looks like page content.

## Decisions

| Question           | Decision                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| New component?     | Yes, `<Banner>`. Alert stays for in-page content                                                |
| Placement          | Two `AppLayout` slots: `banner` (above everything) and `contextBanner` (under TopBar)           |
| Slot semantics     | `banner` = system/account-wide; `contextBanner` = module/route-scoped; `<Alert>` = page content |
| Visual weight      | Tinted background + 1px bottom rule in tone colour (not solid fill)                             |
| Tones              | `info` (default) / `success` / `warning` / `danger`                                             |
| Dismissal          | Controlled `onDismiss`, no internal state, no persistence                                       |
| Sticky             | Neither slot is sticky; the TopBar stays the only pinned chrome                                 |
| Screen-reader tone | Visually hidden, localised tone prefix ("Warning:") before the content                          |
| Live default       | `live={false}` (`role="note"`); `live` opts in to `status` / `alert` (danger)                   |
| Multiple per slot  | Allowed; they stack. Docs recommend one per slot, most severe first                             |
| Branch             | `feat/banner`                                                                                   |

## 1. `<Banner>`

```tsx
<Banner
  tone="warning"
  title="Scheduled maintenance"
  action={<Link href="/status">Details</Link>}
  onDismiss={() => setHidden(true)}
>
  Sat 4 Oct, 22:00–23:00 CET. CRM will be read-only.
</Banner>
```

### Props

`BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'title'>`, `forwardRef<HTMLDivElement>`.

| Prop        | Type                                           | Default  | Notes                                                                                                    |
| ----------- | ---------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `tone`      | `'info' \| 'success' \| 'warning' \| 'danger'` | `'info'` | Drives background, rule, icon colour, default icon, SR prefix, live role                                 |
| `title`     | `ReactNode`                                    | —        | Bold, rendered **inline** before `children` (same text flow, wraps together)                             |
| `children`  | `ReactNode`                                    | —        | Message text                                                                                             |
| `icon`      | `ReactNode \| null`                            | per tone | `null` hides. Defaults: `Info`, `CheckCircle2`, `AlertTriangle`, `XCircle` (lucide, 16px, `aria-hidden`) |
| `action`    | `ReactNode`                                    | —        | Pinned to the end of the row. Typically one `<Link>` or `<Button size="xs">`. Not laid out by Banner     |
| `onDismiss` | `() => void`                                   | —        | When set, renders a ghost `xs` icon-only × button, `aria-label={t('banner.dismiss')}`                    |
| `live`      | `boolean`                                      | `false`  | `false` → `role="note"`. `true` → `role="status"`, or `role="alert"` for `danger`                        |

`{...props}` spreads first; `role` and `data-tone` are set after so the ARIA
contract wins (same pattern as Alert).

### Anatomy and layout

```
[icon] [SR prefix][title] children ...wraps...   [action] [×]
```

- Root: `display: flex; flex-wrap: wrap; align-items: center; gap`. The text
  block is allowed to grow; when the action no longer fits beside it, it wraps
  to its own line. There is no breakpoint or container query.
- `width: 100%` of the slot, `border-radius: 0`, `border-bottom: 1px solid <tone rule>`.
- Padding: `--banner-padding-x` defaults to `var(--topbar-padding-x)` (`--space-4`), so
  the icon lines up with TopBar content.
- Typography: `font-size-sm`, title `font-weight-semibold`, text `color-fg`.

### Tone colours (component tokens in `Banner.tokens.scss`, no new shared tokens)

| Tone    | Background                        | Rule + icon            |
| ------- | --------------------------------- | ---------------------- |
| info    | `color.info.background.subtle`    | `color.info`           |
| success | `color.success.background.subtle` | `color.success`        |
| warning | `color.warning.background.subtle` | `color.warning.strong` |
| danger  | `color.danger.background.subtle`  | `color.danger`         |

Warning uses `warning.strong` for the same reason Alert does: plain `warning` on
its subtle tint measures about 2.0:1 in light mode, below the 3:1 required for
graphical objects. The `@contrast` annotations are copied from `Alert.tokens.scss`.

### Accessibility

- A `<VisuallyHidden>` prefix with the tone label comes first in the text block:
  `t('banner.tone.<tone>')` + ": ". Unlike Alert, a Banner is read out of the
  context of the page, so its tone must be spoken.
- `live` decides the role at mount (same contract and JSDoc caveats as Alert's
  `live`): flipping it later announces nothing.
- The icon is decorative (`aria-hidden`).

### i18n keys (`en.ts`, `ru.ts`, `messages.ts`)

| Key                   | en          | ru             |
| --------------------- | ----------- | -------------- |
| `banner.dismiss`      | Dismiss     | Закрыть        |
| `banner.tone.info`    | Information | Информация     |
| `banner.tone.success` | Success     | Успешно        |
| `banner.tone.warning` | Warning     | Предупреждение |
| `banner.tone.danger`  | Error       | Ошибка         |

### JSDoc `@remarks`

When NOT to use:

- Content about the current page or section → `<Alert>`.
- Transient confirmation → `toast.success(...)`.
- Mounted anywhere other than `AppLayout`'s `banner` / `contextBanner` slots.

Anti-patterns:

- ❌ `onDismiss` on a `danger` banner whose condition still holds (sending
  suspended). The user can't close their way out of the problem; remove the
  banner when the condition clears.
- ❌ Several banners per slot as routine. Pick the most severe and put it first.
- ❌ System-wide messages in `contextBanner`, or route-specific ones in `banner`.
- ❌ `live` on a banner that is present when the app loads.

## 2. `AppLayout` slots

```tsx
<AppLayout
  banner={maintenance && <Banner tone="warning" …/>}
  contextBanner={inEmail && suspended && <Banner tone="danger" …/>}
  topBar={<TopBar …/>}
  sidebar={<Rail …/>}
>
```

New props:

- `banner?: ReactNode`: full window width, above the sidebar + content row.
- `contextBanner?: ReactNode`: inside the content column, between the TopBar
  wrapper and the padded content region, so it is full-bleed within the column.

Structure change: `.root` becomes `flex-direction: column` holding
`[banner wrapper?, .row]`, and the existing row layout moves to a new `.row`
element (`display: flex; flex: 1; align-items: stretch`). Slot wrappers render
only when their prop is non-null. `contextBanner`'s wrapper is not sticky and
scrolls away under the sticky TopBar.

Known interaction: with `banner` set and `sidebarPinned`, the pinned sidebar is
`100dvh` tall but starts below the banner. At scroll position 0 its bottom
(a `Rail.Footer`) sits up to one banner height below the fold, and it comes into
view as soon as the page scrolls past the banner. This is accepted. The
alternative (a scroll-linked height) costs more than it is worth for a
temporary banner. It is documented in `sidebarPinned`'s JSDoc.

Below `sidebarOverlayBelow`, both slots still render: `banner` above the column
and `contextBanner` under the TopBar.

## 3. Testing

`Banner.test.tsx`:

- Default tone is `info`, and `data-tone` reflects the `tone` prop.
- Role: `note` by default; `status` with `live`; `alert` with `live` + `danger`.
- The SR prefix renders the localised tone label.
- The title and children render; `icon={null}` hides the icon; a custom icon renders.
- `action` renders; `onDismiss` renders a button labelled "Dismiss" and calls the handler; no button without it.
- `{...props}` cannot override `role`; the ref is forwarded.
- (No axe infra in the repo; a11y is covered by the role/prefix tests.)

`AppLayout.test.tsx`:

- `banner` renders before the sidebar/content row; `contextBanner` renders after
  the TopBar and outside the padded content region.
- No wrapper elements render when the slots are omitted.

## 4. Completion checklist (root CLAUDE.md invariant)

1. `Banner.test.tsx`
2. `packages/playground/src/pages/components/BannerDemo.tsx`: tones, title +
   action + dismiss, wrapping, a mini `AppLayout` showing both slots
3. Wiring: `App.tsx` route, `navItems.ts`, `ComponentsIndex.tsx`,
   `overviewSchematics.tsx`, and `'Banner'` in the `ComponentName` union in `registry.ts`
4. Re-export from `src/index.ts`
5. JSDoc `@remarks` + an `AGENTS.md` section (plus `AppLayout` AGENTS/JSDoc for the slots)
6. `CLUSTERS` entry in `manifest.ts` and `generate-manifest.mjs`, then `npm run build:manifest`
7. The playground's `AppShell` passes neither slot by default (no demo banner in the real shell)
