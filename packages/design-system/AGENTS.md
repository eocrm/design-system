# AGENTS.md — `@eocrm/design-system`

Primer for AI coding agents building UI on top of this package.

Read this first. The authoritative per-component contracts live in **JSDoc on each component** — hover any import in your editor. This file is a quick reference + token table + anti-patterns list. See [README.md](./README.md) for installation, bundler notes, and publishing/deploy ops.

---

## Hard rules — never deviate

1. **All UI is built from `@eocrm/design-system` components.** Don't write raw `<button>`, `<input>`, or pull in another component library.
2. **All visual values come from tokens.** No raw `#hex`, `Npx`, `Nrem`, or `Nem` in your SCSS. Use `var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--border-width)`, etc.
3. **Components don't own positioning.** No `margin` on or around components in your SCSS. Use `<Stack>` (vertical), `<Cluster>` (horizontal + wrap), or set layout in the parent's `.module.scss`.
4. **Import only from the package root.** `import { Button, Stack, ... } from '@eocrm/design-system'`. Never reach into `@eocrm/design-system/src/...`.
5. **6-digit hex only.** When defining your own CSS custom properties at the app level, use `#ffffff` not `#fff`.

---

## Setup (once per consuming app)

Two steps at your app root:

```tsx
// 1. Import the stylesheet once (tokens, modern reset, base typography).
import '@eocrm/design-system/styles/global.scss';

// 2. Wrap your tree in <AppProvider>.
import { AppProvider } from '@eocrm/design-system';

<AppProvider locale="en" intlLocale="en-US">
  <App />
</AppProvider>;
```

`<AppProvider>` bundles the app-level contexts so you don't wire them by hand:

- `locale` (`'en' | 'ru'`) — selects the built-in UI-string bundle.
- `intlLocale?` (BCP-47, e.g. `'en-US'`) — locale for Intl formatting (Calendar, dates, numbers). Defaults to `locale`.
- `translations?` — deep-partial overrides merged over the built-in strings (rebrand a few keys; memoize the object).
- `toast?` — `<ToastViewport>` config, or `false` to mount it yourself. Omitted ⇒ mounted with defaults.
- `tokens?` — CSS design-token overrides (a flat `{ '--color-accent': '#7c3aed', '--radius-md': '6px' }` map) applied in **both** themes. Rebrands the system globally — including portaled `Modal`/`Tooltip`/`Toast`. Memoize it.
- `darkTokens?` — token overrides applied **only** in dark (forced + system), merged over `tokens` (e.g. a lighter accent on dark surfaces). Memoize it.

It composes `LocaleProvider` + `I18nProvider` and mounts the toast viewport. **Routing is yours** (`<AppProvider>` ships no router), and the stylesheet import above is still required. The individual providers (`LocaleProvider`, `I18nProvider`, `ToastViewport`) remain exported for advanced cases like pinning a subtree to a different locale.

**Rebranding via tokens:**

```tsx
const tokens = useMemo(() => ({ '--color-accent': '#7c3aed', '--radius-md': '6px' }), []);
const darkTokens = useMemo(() => ({ '--color-accent': '#a78bfa' }), []);

<AppProvider locale="en" tokens={tokens} darkTokens={darkTokens}>
  <App />
</AppProvider>;
```

`tokens` apply in light **and** dark; `darkTokens` refine the dark scope only. They're emitted as a single declarative `<style>` that layers over the [dark theme](#dark-theme) correctly. Any design token can be overridden — see the generated `@eocrm/design-tokens` Sass contract for the full CSS custom-property set. Contributors change shared values only in `packages/design-tokens/src/tokens.json`; `src/styles/tokens.scss` remains the stable consumer entry point.

---

## Localization (i18n)

Every user-facing string the library renders — visible text, aria-labels, placeholders, default empty/loading copy — flows through a single React Context. Wrap your app once; every component picks up the right copy. There are NO `labels` / `cancelLabel` / `searchPlaceholder` props on any component.

```tsx
import { I18nProvider } from '@eocrm/design-system';

<I18nProvider locale="ru">
  <App />
</I18nProvider>;
```

**Overrides** are a deep-partial of the messages tree:

```tsx
<I18nProvider
  locale="ru"
  overrides={{
    pagination: { next: 'Дальше' },
    badge: { modified: 'Изменено!' },
  }}
>
  <App />
</I18nProvider>
```

- Missing override keys fall back to the locale defaults.
- Missing locale keys fall back to `en` (safety net for v2-and-beyond).
- No provider at all = `en` defaults.

**Available locales:** `'en'` (default), `'ru'`. v1.

**`I18nProvider` vs `LocaleProvider` — pair them.** `I18nProvider` carries the message catalog (translated strings). `LocaleProvider` carries the BCP-47 tag used by `Intl.*` formatters inside Calendar / DatePicker / DateRangePicker (month names, weekday order, date-range formatting). They are independent — a Russian app should wrap with BOTH so visible strings AND Intl-rendered dates speak the right language:

```tsx
<I18nProvider locale="ru">
  <LocaleProvider locale="ru-RU">
    <App />
  </LocaleProvider>
</I18nProvider>
```

**Adding a new string in a library component**:

1. Add the key to `src/i18n/messages.ts` (`Messages` interface).
2. Add the English value to `src/i18n/en.ts`.
3. Add the Russian value to `src/i18n/ru.ts` (use `ruPlural()` from `i18n/format.ts` for count-varying strings).
4. In the component, `const t = useTranslation();` then `aria-label={t('component.key')}`. For array messages (months / weekdays), use `useTranslationArray()`.
5. Never inline an English string — `aria-label="Close"` is a Hard rule 9 violation.

**Drag-and-drop announcements** are localized too. Every drag surface (`Sortable`,
`SortableGroup`, `Kanban`, `DataTable` column reorder, `RichTextEditor` block
gutter) overrides dnd-kit's English defaults with the `drag.*` messages, and
names what it drags by its **rendered text** rather than its id — "Amount due,
position 3 of 7", not "col_amount was moved over droppable area col_name". Text
is read from the DOM, so a closed `DropdownMenu` / `Tooltip` / `Popover` inside
a card contributes nothing, and `aria-hidden` decoration is skipped.

Two things are worth doing yourself:

```tsx
{/* Name the CONTAINER — the library can't invent one. Either attribute works. */}
<Kanban.Column id="qualified" aria-label="Qualified">          {/* → "…in Qualified" */}
<Kanban.Column id="qualified" aria-labelledby="qualified-h">   {/* same, from the heading */}
<SortableGroup.Container id="review" items={ids} aria-label="In review" />

{/* Override a chatty ITEM. Without this the whole card is read out. */}
<Kanban.Card id="d-1" aria-label="Acme renewal">…title, owner, due date, badges…</Kanban.Card>
<Sortable.Item id="f-1" aria-label="Company name">…</Sortable.Item>
```

An unnamed container falls back to its position ("column 2 of 3").

---

## Dark theme

The library ships a full dark palette, driven entirely by CSS. There is **no theme component, no React context, no JS API** — you control it with one attribute on `<html>`:

| `<html>` attribute   | Result                                                 |
| -------------------- | ------------------------------------------------------ |
| _(none)_             | **System** — follows the OS via `prefers-color-scheme` |
| `data-theme="light"` | **Forced light** (wins over a dark OS)                 |
| `data-theme="dark"`  | **Forced dark** (wins over a light OS)                 |

```html
<html data-theme="dark">
  …
</html>
```

`color-scheme` is set automatically for each state, so native form controls and the browser chrome match the theme. Scrollbars go a step further: `reset.scss` applies `scrollbar-width: thin` + a token-colored `scrollbar-color` to every element, so every scroller in the app is thin and theme-colored rather than OS-default. Opt a scroller out with its own `scrollbar-width: auto` / `scrollbar-color: auto` — or drop the bar altogether with `scrollbar-width: none`, which is what a **collapsed** `<Rail>` does: a gutter is a quarter of the 56px rail's inner width. With no bar to drag, it scrolls by wheel/trackpad and scroll-into-view on Tab.

**What flips for free:** every component whose colors resolve through the design tokens — which is all of them. Surfaces, text, borders, the accent and semantic palettes, shadows, overlays, focus rings, Badge tones, and Tooltip all redefine under dark with zero markup changes.

**Your responsibility:**

- **Set the attribute.** The library reads it; it never writes it (it performs no _imperative_ DOM mutation — the one thing `<AppProvider>` injects is a declarative `<style>` for `tokens` overrides, see [Setup](#setup-once-per-consuming-app)). Persist the user's choice (e.g. `localStorage`) and apply it: `'light'`/`'dark'` → `document.documentElement.dataset.theme = choice`; `'system'` → remove the attribute.
- **Add the no-flash snippet** (below) so a forced light/dark choice doesn't flash the default theme before your bundle boots.
- **Theme-aware images.** Raw `<img>` assets with baked-in colors (e.g. a logo SVG) can't be recolored by CSS — swap the `src` per theme if it matters. The `<Logo>` wordmark _text_ flips automatically (`--color-fg`); the image mark does not.

The 30-color categorical `--color-palette-*` set flips in dark too — same hue, dark tinted bg + light fg.

**Out of scope (theme-independent by design):** avatar identity colors and BrandIcon brand marks.

### No-flash snippet

Inline this in your app's `<head>` **before** your bundle loads. It applies the persisted choice before first paint. `'system'`/unset writes nothing → the CSS media query handles it with no flash either way.

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('your-theme-key');
      if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    } catch (e) {
      /* localStorage blocked (private mode) — fall back to System */
    }
  })();
</script>
```

---

## Components — TL;DR

Each component is fully JSDoc'd. Hover any usage in your editor for inline docs including `@example` blocks, `@remarks` "When NOT to use" and "Anti-patterns" sections. The summaries below are for orientation only — the **JSDoc is the contract**.

### `<Title>` — semantic heading

```tsx
<Title order={1}>Dashboard</Title>
<Title order={2}>Recent activity</Title>
<Title order={3} tone="muted">Filter group</Title>
<Title order={2} size="lg">Visually compact h2</Title>
```

- `order: 1 | 2 | 3 | 4 | 5 | 6` — required. Renders `<h1>` … `<h6>` AND drives the default visual size.
- Default size map: `1→3xl`, `2→2xl`, `3→xl`, `4→lg`, `5→md`, `6→sm`. Override with `size` (same vocab: `xs | sm | md | lg | xl | 2xl | 3xl`).
- `tone`: `default | muted | subtle | accent | danger`.
- `weight`: `regular | medium | semibold | bold` (default `semibold`).
- `truncate`: single-line ellipsis.
- **Use `<Title>` for every heading in your UI.** Raw `<h1>` / `<h2>` is forbidden.

### `<Text>` — body / inline text

```tsx
<Text>Default body — block <p>, md, regular.</Text>
<Text as="span" size="sm" tone="muted">12m ago</Text>
<Text as="label" htmlFor="email" weight="medium">Email</Text>
<Text lineClamp={2}>A long description that wraps and ellipses after two lines.</Text>
<Text size="sm" tone="danger">Email is required.</Text>
```

- `as: 'p' | 'span' | 'div' | 'label'` (default `'p'`). Constrained string union — no polymorphic generic.
- `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'inherit'` (default `'md'`).
- `tone`: `default | muted | subtle | accent | danger | success | warning`.
- `weight`: `regular | medium | semibold | bold` (default `regular`).
- `align`: `left | center | right` (default `left`).
- `truncate`: single-line ellipsis. `lineClamp: number`: multi-line ellipsis. `lineClamp` overrides `truncate`.
- **Use `<Text>` for every non-heading run.** No more `<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>`.
- **`size="inherit"`** — for a muted/toned inline run INSIDE a heading (e.g. `<Text as="span" size="inherit" tone="muted">ENG-5</Text>` at the start of a `<Title order={1}>` task name) that must keep the heading's size instead of shrinking to `md`. Font-size AND line-height both inherit from the parent.

### `<Code>` — inline `<code>` chip

```tsx
<Text>Use <Code>npm install</Code> to add deps.</Text>
<Code tone="danger">--no-verify</Code>
```

- `tone`: `default | muted | accent | danger` (only the text color changes; chip background stays the same).
- **Inline only.** Block code with syntax highlighting belongs in the playground's `CodeBlock` (Prism), not the library.

### `Kbd`

Inline keyboard-shortcut display: one `<kbd>` chip per key, joined with a faint `+` separator. Use for shortcut hints in tooltips, command palettes, search inputs, and help/shortcut sheets.

```tsx
<Kbd keys={['⌘', 'K']} />
<Kbd keys={['Ctrl', 'Shift', 'P']} size="md" />
<Kbd keys={['Esc']} />
```

- `keys: string[]` — one chip per entry. Pass the literal labels you want shown — Kbd does NOT translate `Cmd` → `⌘` on macOS. App layer decides.
- `size: 'sm' | 'md'` — `sm` (default, 18px tall) matches `TopBar.Search`. `md` (24px) for standalone shortcut sheets.
- Wrapper carries `aria-label = keys.join(' + ')` (override via prop); inner `<kbd>` and `+` separator are `aria-hidden`.

**When NOT to use:** for inline code use `<Code>`; for chip-shaped text labels use `<Badge>`. `<kbd>` implies keyboard input semantically.

### Typography hard rule

- ❌ `style={{ fontSize: 'var(--font-size-sm)' }}` / `style={{ color: 'var(--color-fg-muted)' }}` — use `<Text size="sm" tone="muted">`.
- ❌ Raw `<h1>` / `<h2>` / `<h3>` — use `<Title order={N}>`.
- ❌ `<Text style={{ color: '#someHex' }}>` — pick a tone from the whitelist.
- For semantic emphasis (the bold _is_ the meaning — e.g. a user's name in a notification, an error keyword), use `<strong>` or `<em>` inside `<Text>`. For visual-only weight changes (a medium-weight name in a list because hierarchy says so, not because the name is emphatic), use `<Text weight="medium">`. Pick the one that matches _why_ the text is heavy.
- If the size / tone / weight you need isn't on `<Title>` or `<Text>`, **that's a token-vocabulary conversation, not a component-skipping conversation.**

### `<RichText>` — read-only rich-text renderer

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

**`renderLink`** (optional) — substitute how a link renders. The consumer checks "is this URL in my space?" and returns its own node (e.g. a task/member chip) or the supplied `fallback` (the standard `<a>`). It's render-time only — the model and `toHtml`/`toMarkdown` still emit a plain link, so serialization is unchanged. Don't do heavy synchronous work or block on the network inside it; return a component that handles its own lookup/cache. The same resolver works in `<RichText>` (viewer) and `<RichTextEditor>` (where a substituted link becomes an atomic chip).

```tsx
const renderLink: RenderLink = ({ href }, fallback) => {
  const m = /^https?:\/\/app\.eocrm\/task\/(\d+)/i.exec(href);
  return m ? <Badge tone="purple">#{m[1]}</Badge> : fallback;
};
<RichText value={doc} renderLink={renderLink} />;
```

**`renderMention`** (optional) — `(mention: { id, label }, defaultNode) => ReactNode` — same contract as `renderLink` but for `@`-mention marks (render an interactive member chip/popover trigger), or return `defaultNode` for the standard non-interactive mention span. Composes with `renderLink`. Render-time only — `toHtml`/`toMarkdown` and the model still emit the mention mark. Works in both `<RichText>` and `<RichTextEditor>` (where a substituted mention becomes an atomic chip).

When NOT to use: plain text → `Text`. For editing → `<RichTextEditor>`. The model is immutable; render the doc returned by a transform, never mutate in place.

### `<Button>` — action triggers

```tsx
<Button onClick={save}>Save</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button variant="secondary" disabled>Cancel</Button>
```

- `variant`: `primary` (default — one per section) / `secondary` / `ghost` / `danger` / `success`
- `size`: `xs` / `sm` / `md` (default) / `lg` — use `xs` for icon-only or dense inline actions; pass `aria-label` when icon-only.
- `iconOnly`: boolean. Renders a square icon-only button (`aspect-ratio: 1`, tight 4px padding). Width tracks the size's height token. **Always pair with `aria-label`** — there's no other accessible name.
- Always renders `<button type="button">` unless you pass `type="submit"`.
- `variant="success"` is a **transient confirmation state**, not an action intent. Flip to it for ~1.5s after the action resolves, then flip back to `primary`. The timer is the consumer's responsibility — Button stays stateless. Never render a button as `success` on initial mount. Track the timer in a `useRef` and clear on unmount + on rapid re-clicks so the flash doesn't outlive the component or get cut short.

  ```tsx
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  const handleSave = async () => {
    await save();
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaved(true);
    timerRef.current = setTimeout(() => setSaved(false), 1500);
  };
  <Button variant={saved ? 'success' : 'primary'} onClick={handleSave}>
    {saved ? 'Saved!' : 'Save'}
  </Button>;
  ```

### `<SocialButton>` — provider sign-in button

```tsx
<SocialButton provider="google" label="Continue with Google" onClick={signIn} />
```

- A `<Button>` (default `variant="secondary"`) with the provider's `<BrandIcon>` mark + `label`. `provider`: `'google'` / `'yandex'` (BrandIcon's set). Spreads Button props (`onClick`, `size`, `disabled`, …); width comes from the parent.
- The mark is decorative — `label` is the accessible name. For a non-SSO icon button use `<Button>` + a lucide icon.

### `<ButtonGroup>` — joined Buttons + segmented control

```tsx
// Visual mode — joined Buttons, no shared state.
<ButtonGroup aria-label="Edit actions">
  <Button>Cut</Button>
  <Button>Copy</Button>
  <Button>Paste</Button>
</ButtonGroup>

// Segmented mode — single-select toggle group.
<ButtonGroup value={view} onValueChange={setView} aria-label="View mode">
  <ButtonGroup.Item value="grid">Grid</ButtonGroup.Item>
  <ButtonGroup.Item value="list">List</ButtonGroup.Item>
  <ButtonGroup.Item value="calendar">Calendar</ButtonGroup.Item>
</ButtonGroup>
```

- **Mode detection** is by props: with `value` + `onValueChange` you get segmented; without, you get visual joining.
- **Children differ by mode.** Visual: `<Button>` children. Segmented: `<ButtonGroup.Item>` children. Mixing the two is undefined behavior.
- **Size propagation** — `size` on the group propagates to children. Per-child override wins.
- **Keyboard nav (segmented only)** — Arrow keys move selection + focus; Home / End jump to ends; Tab moves IN/OUT of the group on the currently-selected item. Disabled items are skipped.
- **ARIA** — visual mode is `role="group"`; segmented mode is `role="radiogroup"` (requires `aria-label`).

**Anti-patterns:**

- ❌ Mixing visual `<Button>` children with `<ButtonGroup.Item>` in the same ButtonGroup — undefined behavior.
- ❌ Using ButtonGroup as a routing tab strip. That's what `<Tabs>` is for.
- ❌ Passing only `value` without `onValueChange` — type error.
- ❌ Multi-select via clever workarounds. Compose Checkboxes for that.

**See also:** `<Tabs>` for routing-style content switching, `<Radio>` for vertical radio lists.

### `<Link>` — polymorphic styled anchor

Inline navigation link. Polymorphic via `as` — defaults to `<a>`, consumers pass a router's `<Link>` for SPA navigation. Three visual variants cover the inline use cases.

```tsx
import { Link } from '@eocrm/design-system';

// External — defaults to <a>
<Link href="https://docs.example.com">Documentation</Link>

// SPA route — pass router's Link
import { Link as RouterLink } from 'react-router-dom';
<Link as={RouterLink} to="/contacts">Contacts</Link>

// Variants
<Link href="/x">View all</Link>                                  {/* default — accent, hover-underline */}
<Link href="/x" variant="muted">Subdued nav</Link>               {/* breadcrumb-style */}
<Link href="/x" variant="subtle">Contact name</Link>             {/* fg color, hover-accent */}
```

- **Polymorphic**: `as={Component}` forwards all of Component's props with full TypeScript inference.
- **Library has no router dependency** — the `as` mechanism is consumer-driven.
- **Three variants**:
  - `default`: accent color, hover-underline. Inline CTA ("View all →").
  - `muted`: muted color, hover-accent. Low-emphasis nav (breadcrumb-style).
  - `subtle`: foreground color, hover-accent + underline. Dense-surface name links.
- **No `disabled` state** — render `<span>` directly for non-clickable labels.

#### When NOT to use

- ❌ Action triggers (submit, open modal) → use `<Button>`.
- ❌ Mutually-exclusive switchers → use `<Tabs>` or `<ButtonGroup>`.
- ❌ "Link styled as button" → use `<Button variant="ghost">`.

#### Anti-patterns

- ❌ `<Link href="#" onClick={...}>` — fake hrefs break right-click "open in new tab".
- ❌ Forgetting `rel="noopener noreferrer"` on `target="_blank"` links.
- ❌ Using `variant="default"` for low-emphasis nav like breadcrumbs.

### `<LinkCard>` — clickable, full-surface Card

```tsx
// SPA route — pass your router's Link as `as`
<LinkCard as={RouterLink} to="/contacts/42" padding="md">
  <Stack gap="xs">
    <Text weight="semibold">Acme Corp</Text>
    <Text size="sm" tone="muted">12 open deals</Text>
  </Stack>
</LinkCard>

<LinkCard href="https://status.example.com" tone="success">All systems operational</LinkCard>
<LinkCard as="button" type="button" onClick={openImporter}>Import contacts</LinkCard>
```

- A Card whose **whole surface** navigates/acts. Polymorphic like `<Link>` — `as` defaults to `<a>`; pass `as={RouterLink} to=…` for routes or `as="button"` for actions (the library has no router dep).
- Carries `Card`'s `padding` (default `md`) + `tone` stripe (reuses `--card-*` tokens), plus a hover lift (border + shadow) and a `:focus-visible` ring.
- Use `<Card>` for non-interactive grouping, `<Link>` for inline text, `<Button>` for form actions. **Don't nest** interactive controls inside it (invalid nested interactives).

**Anti-patterns:**

- ❌ Nesting interactive controls (`<Button>` / `<Link>`) inside a LinkCard — nested interactives are invalid + confusing.
- ❌ `<LinkCard href="#" onClick={…}>` — fake href breaks "open in new tab". Use `as="button"` for actions.
- ❌ `<LinkCard href="https://…" target="_blank">` without `rel="noopener noreferrer"` — security risk.

### `<Input>` — single-line text

```tsx
<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
<Input invalid value={email} aria-describedby="email-error" />
```

- All native `<input>` attributes pass through, except `size` — that's been replaced by the component-level `size` prop (the native HTML `size` attribute, visible-character count, is shadowed).
- `invalid` toggles the error visual + sets `aria-invalid="true"`. Pair with an error message and `aria-describedby`.
- Sizes: `sm` (24px) / `md` (32px, default) / `lg` (40px). Same scale as `<Select>`. (`<Button>` exposes `xs/sm/md/lg`; fields don't ship `xs` yet.)
- **Autofill is BLOCKED by default** — `<Input />` carries `autoComplete="off"` + the 1Password / LastPass / generic data-\* opt-out hints so password managers don't misfire on search / filter / free-text fields. Set `autoComplete="email"` (or `"username"`, `"current-password"`, etc.) to opt INTO autofill for real form fields. Force the behavior either way via `disableAutofill={true | false}`.
- Validation logic lives in your form layer (React Hook Form + Zod recommended), not in the component.

### `<Textarea>` — multi-line text

The dumb multi-line companion to `<Input>`. Auto-grows by default; capped by `maxRows`. Optional character counter below the field.

```tsx
import { Textarea } from '@eocrm/design-system';

// Default — auto-grows, 3 min rows, no max.
<Textarea placeholder="Write something…" />

// With counter (Twitter-style).
<Textarea maxLength={140} defaultValue={value} onChange={(e) => setValue(e.target.value)} />

// Fixed rows + drag-to-resize.
<Textarea autoGrow={false} minRows={4} resize="vertical" />

// Capped growth.
<Textarea minRows={2} maxRows={8} />

// Error state.
<Textarea invalid aria-describedby="bio-error" />
<p id="bio-error">Bio is required.</p>
```

- **Auto-grow is on by default** (`autoGrow={true}`). When on, `resize` is forced to `'none'` because the two conflict.
- **Counter** shows automatically when `maxLength` is set. Force on with `showCount`, force off with `showCount={false}`.
- **Sizes** (`sm` / `md` / `lg`) affect typography + padding only, not height. Height comes from `minRows`.
- **Smart autofill blocking** — same heuristic as Input.

#### When NOT to use

- ❌ Single-line input → `<Input>`.
- ❌ Choosing from a fixed list → `<Select>`.
- ❌ Rich text editing (bold, lists, mentions) → use `<RichTextEditor>` (toolbar, list toggles, mark shortcuts shipped).
- ❌ Password fields → `<PasswordInput>`.

#### Anti-patterns

- ❌ Using `placeholder` as a label.
- ❌ Setting both `autoGrow={true}` AND expecting `resize="vertical"` to render a drag handle — auto-grow wins; the handle is hidden.
- ❌ Building your own character counter outside the component when `maxLength` / `showCount` would do it.

### `<PasswordInput>` — password field with eye toggle + optional warnings

```tsx
<PasswordInput name="password" placeholder="Password" />
<PasswordInput capsLockWarning wrongLayoutWarning name="password" required />
<PasswordInput revealable={false} placeholder="Locked-down (no toggle)" />
```

- Renders a real `<input type='password' | 'text'>` underneath — full autofill, RHF/Zod, form-submission integration.
- Eye toggle (`Eye` / `EyeOff`) flips `type`; `aria-pressed` exposes the state to AT. Toggle aria-labels come from `passwordInput.show` / `passwordInput.hide` in the i18n catalog.
- `revealed` / `defaultRevealed` / `onRevealChange` for controlled / uncontrolled toggle state.
- `revealable={false}` removes the toggle entirely (compliance / kiosk screens).
- `capsLockWarning?: boolean` (default `false`) — opt-in caps-lock detection. When active, `ArrowBigUpDash` icon appears + a polite `aria-live` region announces `passwordInput.capsLockOn` from the i18n catalog. Cleared on blur.
- `wrongLayoutWarning?: boolean` (default `false`) — opt-in non-ASCII-keystroke detection. Catches "typing Cyrillic on a Russian layout when you meant Latin." Heuristic: any single non-ASCII char triggers. DO NOT enable on systems that allow non-Latin passwords. Cleared on blur.
- Both warnings can stack — they render in separate slots with separate live regions.
- Sizes: `sm` / `md` (default) / `lg`. Same scale as `<Input>`.
- `Omit<…, 'size' | 'type'>` — component locks `type` to password/text and shadows native `size`.

### `<PasswordStrengthMeter>` — 4-segment strength visualization

```tsx
<PasswordStrengthMeter value={password} />
// or, with a real scorer (zxcvbn / server-side):
<PasswordStrengthMeter score={zxcvbnScore(password)} />
```

- Two driving modes: `value` (uses default heuristic) or `score` (consumer-provided 0–4). `score` wins when both are set.
- **Default scoring is a UX hint, NOT a security control.** The heuristic flags long+mixed passwords as "Strong" even if they're in a breach corpus. Production deployments should pass `score` from a real scorer.
- Polite `aria-live` region announces label changes ("Weak" → "Fair" → "Strong") so screen-reader users hear progress as they type.
- `showLabel={false}` to hide the textual label (segments only).
- Use `aria-describedby` on the paired `<PasswordInput>` to associate the meter with the field for AT.

### `<PhoneInput>`

International phone field: searchable country picker (DS `Select`) + national-number `Input`, controlled on a single `value: string | null` (**E.164**), `onChange(e164 | null)`. `defaultCountry` (ISO alpha-2) seeds the picker when empty; `countries` restricts the list; `size`/`invalid`/`disabled` pass through. Country names are localized via `Intl.DisplayNames`; metadata/validation via `libphonenumber-js`. Validate with the exported `isValidPhone(e164)` and drive `invalid` (or wrap in `<Field error>`). `countryDisplay` sets how the SELECTED country shows in the trigger — `"code"` (default, `+1`), `"iso"` (`US +1`), `"name"` (`United States +1`), or `"flag"` (`🇺🇸 +1`; emoji flags don't render on Windows Chrome/Edge). Dropdown rows always show the full name + code (searchable); opening the picker selects the text for instant type-to-search; the country can't be cleared. Store the emitted E.164, not the formatted display.

```tsx
const [phone, setPhone] = useState<string | null>(null);
<PhoneInput value={phone} onChange={setPhone} defaultCountry="GB" />;
```

### `<Checkbox>` — checkbox with native input + custom paint

```tsx
<Checkbox label="I agree" />
<Checkbox checked={agreed} onChange={setAgreed} label="Subscribe" />
<Checkbox indeterminate checked={allSelected} onChange={selectAll} aria-label="Select all" />
```

- Native `<input type='checkbox'>` is visually hidden but stays in tab order + AT tree — keyboard, screen reader, form submission, RHF/Zod, autofill all work for free.
- `size`: `sm` (14px) / `md` (16px, default) / `lg` (20px). Same scale as `<Input>`.
- `checked` + `onChange(next, event)` for controlled; `defaultChecked` for uncontrolled.
- `indeterminate` is a **display flag, not a third value**. Pairs with `checked` for the "select all where some-but-not-all are picked" pattern. Clicking an indeterminate checkbox emits `onChange(nextChecked)` based on the current `checked`; consumer typically clears `indeterminate` in response.
- `label` (ReactNode) renders next to the box; the whole `<label>` is the click target. Omit `label` for icon-only checkboxes (e.g., DataTable row selectors) and pass `aria-label` instead.
- `invalid` adds the danger border + sets `aria-invalid='true'`. Pair with a visible error + `aria-describedby`. Hover preview is border-only (no fill tint).
- Native HTML attrs flow through (`name`, `value`, `required`, `form`, `autoFocus`, etc.). `FormData.getAll(name)` returns the array of checked values for same-`name` checkboxes.
- forwardRef points at the native `<input>` so consumers can `.focus()` or programmatically set `.indeterminate`.

### `<ColorPicker>` — controlled HEX color picker (popover + inline)

```tsx
const [hex, setHex] = useState('#4F46E5');

// Default popover with the built-in trigger swatch:
<ColorPicker value={hex} onChange={setHex} triggerLabel="Brand color" />

// Custom trigger:
<ColorPicker value={hex} onChange={setHex}>
  <ColorPicker.Trigger asChild>
    <Button variant="secondary">Pick a color</Button>
  </ColorPicker.Trigger>
</ColorPicker>

// Inline (always-visible panel — for theme builders, settings rows):
<ColorPicker.Panel value={hex} onChange={setHex} />
```

- **Controlled-only.** `value: string` in `#RRGGBB` form. Loose input accepted on the HEX text field (`#FFF`, `FFF`, `#ffffff`); the component always emits the canonical `#RRGGBB` (uppercase, with `#`).
- **Two distribution shapes via the compound API.** `<ColorPicker>` is the popover-wrapped form-field-ready widget. `<ColorPicker.Panel>` is the same picker without the popover wrapping — drop it directly into a settings page or theme builder.
- **Default trigger** is an input-field-shaped button with a 16×16 swatch + uppercase HEX text. Override via `<ColorPicker.Trigger asChild>{customNode}</ColorPicker.Trigger>` (the child must `forwardRef` because `<Popover.Trigger>` clones it).
- **`onChange` fires per drag/zoom tick (high frequency).** Use `onChangeEnd` for commit-style logic (network calls, history snapshots) — it fires on pointer release, slider release, HEX input blur, and preset click.
- **Presets via `presets?: string[]`.** Invalid entries are dropped silently. The library doesn't ship a default palette — pass your own brand colors. Selected swatch gets an inset ring + check overlay.
- **Color math is exported.** `hexToHsv(hex)`, `hsvToHex({h,s,v})`, `normalizeHex(loose)` are usable directly for downstream theme builders, contrast calculators, etc.
- **Keyboard (SV pad)**: arrows ±1% S/V, Shift+arrow ±10%, Home/End for S=0/100, PageUp/Down for V=100/0.
- **Keyboard (hue slider)**: inherits Slider's keyboard — arrows ±1°, PgUp/Dn ±10°, Home/End for 0°/360°.
- **Popover placement** via `popoverPlacement?: 'bottom-start' | 'bottom' | 'top-start' | ...`. Default `'bottom-start'`.
- **Disabled** dims the panel, sets `aria-disabled` on the SV pad, disables the slider + input, makes presets non-interactive. Trigger doesn't open.

#### Color math API

```ts
import { hexToHsv, hsvToHex, normalizeHex } from '@eocrm/design-system';

normalizeHex('#fff'); // '#FFFFFF'
normalizeHex('orange'); // null

hexToHsv('#FF0000'); // { h: 0, s: 100, v: 100 }
hexToHsv('not a color'); // null

hsvToHex({ h: 240, s: 100, v: 100 }); // '#0000FF'
```

#### Hard rule

- ❌ Passing non-HEX `value` — named colors, `rgb()`, `hsl()`, alpha hex (`#RRGGBBAA`). Convert in the consumer or use the exported `normalizeHex` first. Invalid input falls back to `#000000` with a dev-only warning.
- ❌ Reaching into the picker's internal HSV state. Consumer contract is HEX-only.
- ❌ Hand-rolling a color picker per page. Use this.
- ❌ Bundling a default palette inside the consumer. Pass via `presets`.
- ❌ Calling expensive work in `onChange`. Use `onChangeEnd` (one fire per gesture).
- ❌ Wrapping a non-`forwardRef` component in `<ColorPicker.Trigger asChild>`. `<Popover.Trigger>` clones the child to inject the ref; non-forwardRef silently drops it.
- ❌ Forgetting to wire `disabled` into the consumer's custom trigger element. The picker dims its wrapper and blocks pointer events, but the trigger button's own disabled visuals are the consumer's responsibility.

### `<Switch>` — binary toggle

Hand-rolled track + thumb on a native `<input type="checkbox" role="switch">`. The dumb on/off toggle for settings, feature flags, and async persisted state.

```tsx
import { Switch } from '@eocrm/design-system';

// Default — uncontrolled, accent tone.
<Switch>Enable notifications</Switch>

// Controlled, success tone.
<Switch tone="success" checked={enabled} onChange={(next) => setEnabled(next)}>
  Daily digest
</Switch>

// Async (server-persisted) toggle.
<Switch
  checked={enabled}
  loading={saving}
  onChange={async (next) => {
    setSaving(true);
    setEnabled(next);            // optimistic
    try { await api.save(next); }
    catch { setEnabled(!next); } // rollback
    finally { setSaving(false); }
  }}
>
  Two-factor auth
</Switch>

// Icon-only.
<Switch aria-label="Mute notifications" />
```

- **Native `<input type="checkbox" role="switch">`**. Form submission works; AT announces as switch.
- **Three tones** (`accent`/`success`/`danger`) for the checked track. Unchecked track is always neutral muted.
- **`loading={true}`** shows a spinner inside the thumb + disables the input (sets `aria-busy`). Consumer manages the optimistic-update flow.
- **`onChange(checked, event)`** signature matches Checkbox — first arg is the next boolean, second is the raw event.

#### Hard rule

A switch whose toggle triggers an **immediate action** — persisting to a server or firing any side effect — MUST use the async optimistic-update flow: flip the state optimistically, set `loading` while the request is in flight, and roll back on failure (see the async toggle example above). Never fire-and-forget a side-effecting toggle — the user needs the in-flight (`loading`) and rollback feedback. A switch over pure local UI state (no side effect) may toggle synchronously.

#### When NOT to use

- ❌ Selecting one option from a list of mutually-exclusive choices → `<Radio>` / `<RadioGroup>`.
- ❌ Selecting multiple from a list → `<Checkbox>`.
- ❌ A mixed / indeterminate state ("some-but-not-all enabled") → use Checkbox's `indeterminate`.
- ❌ Triggering an action immediately on click (no state) → `<Button>`.

#### Anti-patterns

- ❌ Using `placeholder`-style hints inside the track ("OFF" / "ON" text). Use a real label.
- ❌ Toggle without an external optimistic-update flow when `loading` is set. Without it, the user clicks the switch, the spinner appears, and the visual state never changes — confusing.
- ❌ `tone="success"` for "Mark as failed". Tone communicates the meaning of "on", not just decoration.

### `<Radio>` — single radio button

```tsx
<Radio name="plan" value="pro" checked={plan === 'pro'} onChange={setPlan} label="Pro" />
```

- Native `<input type='radio'>` is visually hidden but stays in tab order + AT tree — browser arrow-key navigation between same-`name` radios works for free.
- `size`: `sm` (14px) / `md` (16px, default) / `lg` (20px). Same scale as `<Checkbox>` and `<Input>`.
- `value` (required) — the value submitted when this radio is selected.
- `checked` + `onChange(value, event)` for controlled standalone use; `defaultChecked` for uncontrolled standalone use.
- `label` (ReactNode) — text rendered next to the ring; the whole `<label>` is the click target. Omit + pass `aria-label` for icon-only.
- `invalid` — danger border + `aria-invalid='true'`. Hover preview is border-only and skips invalid (red stays red on hover).
- **Prefer `<RadioGroup>`** for proper fieldset/legend a11y and centralized state. Standalone `<Radio>` is for embedding a single radio next to other controls.

### `<RadioGroup>` — fieldset wrapper for related radios

```tsx
<RadioGroup name="size" defaultValue="md" label="T-shirt size">
  <Radio value="sm" label="Small" />
  <Radio value="md" label="Medium" />
  <Radio value="lg" label="Large" />
</RadioGroup>
```

- Renders `<fieldset>` + optional `<legend>` for AT grouping. Children should be `<Radio>`s.
- `name` (required) — shared by all radio children via context.
- `value` + `onChange(value, event)` for controlled; `defaultValue` for uncontrolled.
- `size`, `disabled`, `invalid`, `required` propagate to children as defaults — per-child explicit prop still wins.
- `orientation`: `'vertical'` (default) / `'horizontal'`. Vertical uses Stack-like gap; horizontal wraps with a wider gap.
- `FormData.get(name)` returns the selected value on native `<form>` submit.
- The group's `value` drives each child's `checked` — don't set `checked` per-child inside a group (the group already does it).
- Per-child `onChange` fires BEFORE the group's `onChange` (both run on every selection — `preventDefault` does NOT gate the group's state update). Use per-child handlers for side-effects scoped to one option; the group's handler is the single source of truth for the selected value.

### `<Field>` — labeled-control unit

```tsx
<Field label="Work email" error={errors.email} required>
  <Input type="email" />
</Field>

// wrapped / native control → render-prop, spread `field`:
<Field label="Email" error={errors.email}>
  {(field) => <input type="email" {...field} />}
</Field>
```

- Wraps ONE control with its label + help/error + required marker, and auto-wires
  `id` / `aria-labelledby` / `aria-describedby` / `invalid` (controls map `invalid → aria-invalid`).
- When a `label` is present, Field injects `aria-labelledby` onto the cloned child, so
  composite controls that forward ARIA props (`Select`, `Slider`, `ColorPicker`,
  `FileUpload`, `TimeField`) get an accessible name for free. The render-prop `field`
  object also carries `aria-labelledby` for wrapped/nested DOM.
- `error` replaces `description` and flips the control invalid. `required` shows `*`;
  `optional` shows `(optional)`. `orientation="horizontal"` = label beside control.
- Field owns the control `id` — to set one, use `<Field id>`, not the control.
- Groups: `<Field asGroup>` around `<RadioGroup>` → label becomes a `role="group"` caption.
- ❌ Don't wrap a single `<Checkbox>`/`<Switch>` (they self-label). ❌ No validation/state — pass `error` from your form layer.

### `<FormSection>` — titled group of fields

```tsx
<FormSection title="Profile" description="Basic contact details.">
  <FormRow>
    <Field label="First name" required>
      <Input />
    </Field>
    <Field label="Last name" required>
      <Input />
    </Field>
  </FormRow>
  <Field label="Work email" required>
    <Input type="email" />
  </Field>
</FormSection>
```

- Heading (`title`, level via `titleOrder`, default 2) + `description` over a stack of fields.
- Consecutive `<FormSection>`s get an automatic divider (adjacency, no margin).
- Layout-family primitive — arranges its own children only. ❌ Not a `<Card>` (no surface), ❌ not a `<PageHeader>`.

### `<FormRow>` — fields side by side

```tsx
<FormRow>
  <Field label="First name" required><Input /></Field>
  <Field label="Last name" required><Input /></Field>
</FormRow>

<FormRow columns={3}>{/* fixed, non-reflowing */}</FormRow>
```

- Thin wrapper over `<Grid>`. Default: auto-fit, reflows to stacked when narrow
  (container-based, `minColumnWidth` default `'16rem'`). `columns={2|3}` = fixed count.
- `gap` default `'lg'`. ❌ Not for a single field; ❌ not a general tile grid (use `<Grid>`).

### `<FileUpload>` — controlled file picker with dropzone

```tsx
<FileUpload
  files={files}                                  // controlled FileEntry[]
  onFilesAdded={(files) => /* wrap with id + status: 'pending' */}
  onFileRemove={(entry) => /* remove from state */}
  onFileReject={(file, reason) => toast.error(`${file.name}: ${reason}`)}
  multiple
  accept=".csv,application/vnd.ms-excel"
  maxSize={10 * 1024 * 1024}
  maxFiles={5}
  validator={(f) => f.name.includes(' ') ? 'No spaces in filenames' : null}
  dropzoneHint="CSV or Excel, up to 10 MB"
/>
```

- **Pure UI shell.** Consumer owns the `files: FileEntry[]` state and the network code. The component handles drag/drop + click + validation + per-row rendering ONLY.
- `FileEntry`: `{ id: string, file: File, status: 'pending' | 'uploading' | 'done' | 'error', progress?: number, error?: string }`. Consumer assigns `id` (typically `crypto.randomUUID()`); File has no stable identity in JS.
- **Status drives the row:** `uploading` renders `<Progress size="sm" value={progress}>`; `error` renders the error string in danger color and tints the row border; `done` renders a green check icon; `pending` is neutral. The remove button (X) is always visible regardless of status.
- **Validation pipeline** (per file, in order): type (`accept`) → size (`maxSize`) → count (`maxFiles`, multi mode only) → duplicate (name + size) → custom (`validator`). First failure fires `onFileReject(file, reason, message?)`; passing files batch into ONE `onFilesAdded(File[])` call.
- **Single mode (default):** implicit count cap of 1. Dropzone HIDES once `files.length === 1` and re-appears after the user removes the file. Multi-file drops in single mode → first valid file accepted, rest rejected as `'too-many'`.
- **Defensive guards.** `NaN`, `Infinity`, and `max <= 0` on the underlying `<Progress>` fall back to indeterminate — covers the file-upload race condition where `bytes_uploaded / total_bytes` produces NaN before the total is known.
- **Drag and click both open the same hidden `<input type="file">`.** Drag is mouse-only; keyboard users use the dropzone's `role="button"` + Enter/Space to open the picker.
- `disabled`: dropzone shows grayed, drag/click no-op, remove buttons disabled.
- `dropzoneLabel`, `dropzoneIcon`, `dropzoneHint` override the dropzone's default content. **A11y note:** when `dropzoneLabel` is a ReactNode (not a plain string), the component falls back to `aria-label="Upload files"` — pass `aria-label` via the spread for a screen-reader-equivalent description.

#### `FileRejectReason`

- `'invalid-type'` — didn't match `accept`
- `'too-large'` — exceeded `maxSize`
- `'too-many'` — would exceed `maxFiles` (or the implicit cap of 1 in single mode)
- `'duplicate'` — same name + size as an existing entry
- `'custom'` — `validator` returned a non-null string (message passed as 3rd arg to `onFileReject`)

#### Hard rule

- ❌ Hand-rolling a `<input type="file">` + dashed-border div per page. Use `<FileUpload>`.
- ❌ Wiring upload progress with a custom bar — use the `progress` field on `FileEntry`, which renders via `<Progress>` automatically.
- ❌ Storing the file list in the component (it has no internal state). Always pass `files` + the two callbacks.
- ❌ Setting `multiple=true` and showing only one file slot via custom CSS. The component decides dropzone visibility from `multiple` + `files.length`; don't fight it.
- ❌ Calling `onFilesAdded` from inside `onFileReject` (or vice versa) in an attempt to "auto-retry." Reject is terminal for that file; the user has to re-drop.

### `<Slider>` — controlled slider (single + range, horizontal + vertical)

```tsx
<Slider value={zoom} min={1} max={3} step={0.1} onChange={(v) => setZoom(v as number)} aria-label="Zoom" />

<Slider
  value={price}                                   // tuple → range mode
  min={0} max={100000} step={1000}
  label={(v) => `$${v.toLocaleString()}`}
  onChange={(v) => setPrice(v as [number, number])}
/>

<Slider
  value={volume}
  orientation="vertical"
  marks={[0, 25, 50, 75, 100]}
  onChange={(v) => setVolume(v as number)}
/>
```

- **Controlled-only.** Always pass `value` + `onChange`. No `defaultValue`. Same architecture as FileUpload, Progress, and the rest of the controlled primitives.
- **`value: number | [number, number]`** — discriminated union. `number` for single-thumb; tuple for range (two-thumb). `onChange` mirrors the shape.
- **`onChange` fires per pointer-move tick (high frequency).** Debounce in the consumer OR use `onChangeEnd` (fires at pointerup, or at blur when the value actually changed) for server-state / expensive logic.
- `min`/`max`/`step` default to `0`/`100`/`1`. Fractional `step` (e.g. `0.1`) is the canonical way to do zoom/opacity controls.
- `size`: `sm` (4px track / 14px thumb) / `md` (6/18, default) / `lg` (8/22).
- `tone`: `default` (accent) / `success` / `warning` / `danger`. Use `warning`/`danger` for threshold-style sliders (disk usage, alert level).
- `orientation`: `horizontal` (default) / `vertical`. Vertical defaults to 200px tall; override via `style={{ height }}`.
- `marks`: `number[]` (auto-labeled) OR `SliderMark[]` (`{ value, label }`) for custom labels.
- `label`: `false` (default) / `true` (show `{value}` bubble on hover/focus/drag) / `(v) => ReactNode` (custom formatter; also sets `aria-valuetext`).
- `name`: when set, renders hidden `<input>`(s) so the slider works inside `<form action=...>`. Range mode emits TWO inputs with `-min` / `-max` suffixes. **Hidden inputs are NOT rendered when the slider is `disabled`** — prevents the form from submitting a stale disabled value (`disabled` is a no-op on `<input type="hidden">` per HTML spec).
- `disabled`: thumbs become non-interactive (`tabIndex=-1`, `aria-disabled`, `pointer-events: none` + `cursor: not-allowed` on each thumb).

#### Keyboard

- Arrow Left/Down: `-step`. Arrow Right/Up: `+step`.
- Page Down/Up: `-10×step` / `+10×step`.
- Home / End: jump to `min` / `max`.
- All keys respect range-mode clamping (`value[0] ≤ value[1]`). `onChange` per key. `onChangeEnd` fires on blur ONLY if the value actually changed during the focus session — Tab-in / Tab-out without any nav does NOT fire.

#### Hard rule

- ❌ Raw `<input type="range">` — can't do range mode, doesn't theme cleanly across browsers. Use `<Slider>`.
- ❌ Hand-rolling drag math per page. The pointer / keyboard handling is non-trivial; the primitive owns it.
- ❌ Hitting a network endpoint inside `onChange` — fires on every pointer-move tick. Use `onChangeEnd` or debounce.
- ❌ `<Slider role="region">` — `role="slider"` is locked on each thumb. The TypeScript `Omit` prevents the root override.
- ❌ Passing `value[0] > value[1]` in range mode. The component clamps but the inverted tuple is a consumer bug — fix the state shape.

### `<Sortable>` — drag-to-reorder list (single column)

For reorderable lists — todo priority, image gallery, settings ordering, queue management. Renders `<ol>`/`<li>`. Compound: `Sortable`, `Sortable.Item`, `Sortable.Handle`. Built on `@dnd-kit/sortable`; mouse / touch / pen via PointerSensor + keyboard via KeyboardSensor.

```tsx
import { arrayMove } from '@dnd-kit/sortable';

const [items, setItems] = useState([
  { id: 1, title: 'Onboarding email' },
  { id: 2, title: 'Renewal reminder' },
  { id: 3, title: 'Quarterly report' },
]);

<Sortable onReorder={({ from, to }) => setItems((curr) => arrayMove(curr, from, to))}>
  {items.map((item) => (
    <Sortable.Item key={item.id} id={item.id}>
      <Card>
        <Cluster gap="sm" align="center">
          <Sortable.Handle aria-label={`Reorder ${item.title}`}>
            <GripVertical size={14} />
          </Sortable.Handle>
          <Title order={3}>{item.title}</Title>
        </Cluster>
      </Card>
    </Sortable.Item>
  ))}
</Sortable>;
```

Props on the root: `onReorder?: ({ from, to, id }) => void` — fires only when the drop position differs from the source. Consumer owns the items array and re-renders with the new order. `arrayMove` is shipped by `@dnd-kit/sortable` (the library is already a dep) — import it from there. Items must have a stable `id` prop (`string | number`). `restrictToContainer?: boolean` (default `true`) — clamps the drag to the list's bounding box so the dragged item can't leave the `<ol>`; pass `false` for free-drag (item follows the cursor anywhere on the page). `arrangement?: 'list' | 'grid'` (default `'list'`) + `columns?: number` (grid only, default 12) — see **Grid arrangement** below.

**Grid arrangement** (`arrangement="grid"`): re-lays the `<ol>` as a `columns`-track CSS grid (`columns?: number`, default 12) driven by dnd-kit's `rectSortingStrategy`, so siblings reflow in **2D** during a drag instead of shifting only vertically. Give each item a span via `<Sortable.Item span="50%">` (or `span={6}` / `span="100%"`) — **same values as `Grid.Item`** (`25%`→3 … `75%`→9 tracks of 12; `100%`/`full`→whole row). Rows are equal-height (`align-items: stretch`). Semantics stay order-based: a drop reorders the flow — nothing persists a grid x/y position. `restrictToContainer` still clamps the drag to the grid box. Default `arrangement="list"` is unchanged (single vertical column). Canonical use: a WYSIWYG dashboard customize view where edit mode mirrors view mode's 12-col widget grid.

```tsx
<Sortable arrangement="grid" columns={12} onReorder={handle}>
  {widgets.map((w) => (
    <Sortable.Item key={w.id} id={w.id} span={w.span}>
      <Card style={{ height: '100%' }}>{w.title}</Card>
    </Sortable.Item>
  ))}
</Sortable>
```

`collapseBelow` (grid arrangement only) mirrors Grid's `collapseBelow` exactly — `'sm' | 'md' | 'lg'` for a binary collapse to one column, or `{ md: 6, sm: 1 }` for a graduated step-down with item spans clamped per step. The map form wraps the `<ol>` in an extra size-container `<div>`, for the same reason and with the same consequences as Grid's map form (see `<Grid>` below); `ref`, `className`, `style` and spread props stay on the `<ol>`.

**Drag origin** (hybrid): if `<Sortable.Handle>` is present in the Item subtree, only the Handle initiates drag. If no Handle is present, the entire Item is draggable + focusable. A 5px activation distance means short clicks-without-movement on internal buttons / links pass through.

**Keyboard reorder**: Tab to focus the Handle (or the Item if no Handle), press **Space** to pick up, **ArrowUp** / **ArrowDown** to move, **Space** to drop, **Escape** to cancel. dnd-kit's KeyboardSensor ships built-in `aria-live` announcements describing each move. Inside a `Modal`/`Drawer`, an in-progress drag is an Escape-consuming mode: Escape cancels the drag and the host survives that press; the next Escape closes the host (#282). Same for `DataTable` column reorder.

**Drop visual / async-safe**: the dragged item renders in a dnd-kit `<DragOverlay>` (a portaled, fixed-position clone); the active list `<li>` is an invisible placeholder during drag. Because the overlay owns the drop animation, the in-list row never carries a stale drag transform — so `onReorder` may commit the new order **asynchronously / optimistically** (e.g. an optimistic TanStack mutation's `onMutate` that lands a tick late) without the dropped row glitching ("fly up then settle"). You no longer need to reorder synchronously. The drop animation respects `prefers-reduced-motion` (it's disabled under reduced motion).

**Anti-patterns**

- ❌ Mutating items in place inside `onReorder`. Always return a new array (`arrayMove(items, from, to)` from `@dnd-kit/sortable`) — React needs a fresh reference.
- ❌ Using a non-stable `id` (e.g. array index). The id must persist across reorders for React reconciliation and for `onReorder`'s `id` field to be meaningful.
- ❌ Wrapping non-`Sortable.Item` content inside `<Sortable>`. dnd-kit's `SortableContext` only tracks the ids you pass it; arbitrary children render but won't be reorderable.
- ❌ Relying on whole-item drag (no Handle) for screen-reader-accessible lists. Without a Handle, dnd-kit puts `role="button"` on the `<li>` and the listitem semantics are lost — screen readers stop announcing "item N of M." For accessible lists, always include a `<Sortable.Handle>`.

### `<SortableGroup>` — multi-container sortable (drag between lists)

`<SortableGroup onMove>` + `<SortableGroup.Container id items>` under one shared `DndContext` — drag `<Sortable.Item>`s within a list AND between lists. Controlled + live: `onMove({ id, from:{container,index}, to:{container,index} })` fires on each cross-container handoff during the drag AND on drop; apply it with the exported pure `moveSortableItem(containers, event)` (immutable, generic over item type). For a single list, use `<Sortable>`.

```tsx
const [groups, setGroups] = useState<Record<string, Field[]>>(initial);
<SortableGroup onMove={(e) => setGroups((g) => moveSortableItem(g, e))}>
  {Object.entries(groups).map(([gid, fields]) => (
    <SortableGroup.Container key={gid} id={gid} items={fields.map((f) => f.id)}>
      {fields.map((f) => (
        <Sortable.Item key={f.id} id={f.id}>
          <Sortable.Handle>⋮⋮</Sortable.Handle>
          {f.label}
        </Sortable.Item>
      ))}
    </SortableGroup.Container>
  ))}
</SortableGroup>;
```

- Give each `Container` an `aria-label` (or `aria-labelledby`) — it names the `<ol>` for screen readers AND names the list in drag announcements ("…position 2 of 4 in In review").
- Container ids and item ids share dnd-kit's one id namespace — keep them all unique.
- Each `Container.items` must match its `<Sortable.Item>` child ids (it's the ordering source of truth).
- Esc-cancel doesn't revert (moves are applied to your state optimistically) — snapshot before drag to undo.

### `<Kanban>` — multi-column board (drag-to-reorder + cross-column drag with live reflow)

Trello/Jira-style board UI. Compound: `Kanban`, `Kanban.Column`, `Kanban.Card`, `Kanban.Handle` (re-exported `Sortable.Handle`). Built on the same `@dnd-kit/sortable` plumbing as `<Sortable>` with internal items state that re-arranges cards live as the dragged card crosses column boundaries.

```tsx
import { Kanban, type KanbanMoveEvent } from '@eocrm/design-system';

const [board, setBoard] = useState({
  todo: [{ id: 'a', title: 'Buy milk' }],
  doing: [{ id: 'b', title: 'Write spec' }],
  done: [{ id: 'c', title: 'Ship Sortable' }],
});

function handleMove(event: KanbanMoveEvent) {
  const { from, to, cardId } = event;
  setBoard((curr) => {
    const next = { ...curr };
    const source = [...next[from.columnId as keyof typeof curr]];
    const [moved] = source.splice(from.index, 1);
    next[from.columnId as keyof typeof curr] = source;
    const target =
      from.columnId === to.columnId ? source : [...(next[to.columnId as keyof typeof curr] ?? [])];
    target.splice(to.index, 0, moved);
    next[to.columnId as keyof typeof curr] = target;
    return next;
  });
}

<Kanban onMove={handleMove}>
  {(['todo', 'doing', 'done'] as const).map((colId) => (
    <Kanban.Column key={colId} id={colId}>
      <Title order={3}>{colId}</Title>
      {board[colId].map((c) => (
        <Kanban.Card key={c.id} id={c.id}>
          <Card>{c.title}</Card>
        </Kanban.Card>
      ))}
    </Kanban.Column>
  ))}
</Kanban>;
```

Props on the root: `onMove?: (event: KanbanMoveEvent) => void` — fires once per drop with the diff between the initial layout and the final layout. Consumer applies the move (immutable splice in/out). Columns and Cards both need stable `id` props (`string | number`).

**Drag origin** (hybrid): `<Kanban.Handle>` inside a Card restricts drag origin to the Handle. Without a Handle, the whole Card is draggable (and dnd-kit assigns it `role="button"`).

**Cross-column drag is LIVE**: as the dragged card crosses into a new column, cards in the target column shift to make room in real time. `onMove` still fires only once on release. This is driven by internal Kanban state — consumer's state is untouched until drop, so re-renders are scoped to the Kanban subtree (avoids the measureRect cascade that would happen if mid-drag mutations went through consumer setState).

**Drop slot**: `to.index` is the slot the preview showed at release — it re-evaluates as the cursor moves inside the target column, not only when the card crosses the boundary (#376).

**Releasing off the board cancels**: release with the cursor outside the columns — over unrelated page content, past the last column — and the card snaps back with NO `onMove` (#387). "Outside" means outside the columns' collective bounding box, so the gutter between two columns still commits to the nearer one; only leaving the band of columns entirely cancels. Escape and a release that never left the card's own slot cancel the same way.

**Overflowing boards auto-scroll**: the board is its own horizontal scroll container, so dragging a card near the left/right edge scrolls it — that is how you reach an off-screen column. The dragged card is confined to the board's scrollable content box on both axes (it stops at the outer edge of the first/last column rather than following the cursor out of the board). That bound is what keeps auto-scroll from running away: the card renders in flow, so an unbounded one would extend the board's own `scrollWidth` and auto-scroll would chase the edge it just created (#373). Nothing to configure. Caveat: the bound is the card's NEAREST scrolling ancestor. Capping a column (`overflow-y: auto` + `max-height` on `<Kanban.Column>`) makes the column that ancestor, and the dragged card is then confined to its own column while dragging — the drop still lands wherever the cursor is, but the card won't visibly cross into the neighbour. Scroll the board, not the columns.

**Keyboard reorder** works WITHIN a column (Tab to Card/Handle, Space pick up, Arrow keys move, Space drop). Cross-column keyboard moves are NOT supported in v1.

**Anti-patterns**

- ❌ Expecting cross-column keyboard reorder. dnd-kit's stock coordinate-getter is per-`SortableContext`. v2 will ship a custom getter that bridges columns.
- ❌ Leaving `<Kanban.Column>` unnamed. Screen-reader drag announcements name the destination column from its `aria-label` or `aria-labelledby`; without either they fall back to "column 2 of 3". A named column also renders as `role="group"` so the name isn't inert.
- ❌ A content-heavy `<Kanban.Card>` with no `aria-label`. The card announces itself by its rendered text, so a card carrying title + assignee + due date + badges reads all of it on every drag step. One `aria-label` fixes it.
- ❌ Interleaving non-`Kanban.Card` children with cards inside a `<Kanban.Column>`. The Root walks each column's children to extract a contiguous card block; if non-cards appear between cards, the rendering re-arranges them awkwardly. Keep header / count badges BEFORE the cards, footer / "Add card" buttons AFTER.
- ❌ Wrapping `<Kanban.Card>` inside a custom component. The Root walks direct descendants of `<Kanban.Column>` to find cards; nested cards are invisible to it.
- ❌ Non-stable column / card ids (e.g. array indices). Both must persist across reorders.
- ❌ Mutating board state in place inside `onMove`. Always return a new object/array reference.

### `<FlowCanvas>` — pan/zoom canvas for directed node-edge diagrams

Pan/zoom canvas for directed node-edge diagrams (workflow builders). Events-only: you own
`nodes`/`edges`; the canvas emits intents (`onNodeCreate`, `onNodeMove`, `onNodeOpen`,
`onNodeDelete`, `onEdgeCreate`, `onEdgeOpen`, `onEdgeDelete`, `onEdgeReconnect`) and never
mutates data. Nodes
without `position` auto-layout left → right and stay draggable for the session. Nodes with an
explicit `position` are pinned and don't affect the auto-layout of the others (nodes without a
`position` are auto-laid-out). `arrangeNodes(nodes, edges)` (exported) re-flows the whole graph
and returns the nodes with fresh positions — wire it to your own "Re-arrange" button. Selection is
single (`selection`/`defaultSelection`/`onSelectionChange`); `readOnly` disables editing but
keeps select/open. Validation of new connections via `isValidConnection` (default: no
self-loops, no duplicate pairs). **Rewire an existing edge:** select it, then drag either
endpoint handle onto another node (or press `R` / `Shift+R`) → `onEdgeReconnect(id, from, to)`
(reuses `isValidConnection`; reverts on empty/invalid drop). `allowConnections={false}` disables
all create + rewire while keeping node drag/move/delete/select. `confineNodesToView` clamps a
dragged node to the visible canvas area. `renderNodeActions(id)` / `renderEdgeActions(id)` return
a `ReactNode` floated as a toolbar on the selected node/edge, tracking it through pan/zoom (e.g.
a delete icon-button, or one behind a `ConfirmationPopover`). The canvas fills its parent — give
the wrapper a height. Full keyboard: arrows rove nodes, E cycles a node's edges, C connect mode,
R / Shift+R rewire the selected edge's target / source, Shift+arrows nudge, +/−/0 zoom/fit,
Ctrl+arrows pan, Delete deletes, Enter opens. Inside a `Modal`/`Drawer`, an armed connect gesture
(and a `Sortable`/`DataTable` reorder drag — keyboard or pointer) is an Escape-consuming **mode**:
the first Escape cancels the mode and the host survives that press; a mere selection does NOT hold
the host (Escape closes the host, deselect is incidental) (#282). Pass `controls` (a
`ReactNode`) to render your own buttons top-left; a built-in Maximize toggle (top-right / `F`
key, Escape to restore) expands the canvas in place to fill the viewport. `maximizeControl={false}`
hides the toggle if you drive `maximized` yourself. The canvas fits-to-content once on mount; to
re-center afterward — on a maximize toggle, a viewport resize, or a programmatic re-arrange that
moves every node — change the **`refitKey`** prop (any `string | number | boolean`): a new value
re-runs the fit **without a remount**, preserving viewport/selection/focus. Don't force a re-fit
with a changing React `key` — that remounts and drops focus to `<body>`. Bind `refitKey={maximized}`
to re-fit on maximize enter/exit, or bump a counter after a re-arrange.

```tsx
const [nodes, setNodes] = useState<FlowCanvasNode[]>([
  { id: 'open', label: 'Open', color: '#0052CC', adornment: <Badge tone="info">Initial</Badge> },
  { id: 'done', label: 'Done', color: '#1F845A' },
]);
const [edges, setEdges] = useState<FlowCanvasEdge[]>([
  { id: 't1', from: 'open', to: 'done', label: <Badge tone="purple">Guard</Badge> },
]);

<div style={{ height: 480 }}>
  <FlowCanvas
    nodes={nodes}
    edges={edges}
    controls={
      <Button size="sm" onClick={addNode}>
        Add node
      </Button>
    }
    onEdgeCreate={(from, to) => createTransition(from, to)}
    onNodeOpen={(id) => openStateModal(id)}
    onNodeDelete={(id) => confirmDeleteState(id)}
  />
</div>;
```

When NOT to use: >100-node graphs (no virtualization); list/column reordering (use
Kanban/Sortable); undirected/free-form drawing; as the only editing surface for complex
attributes (anchor your own modals via the open callbacks — keep a form-based fallback).

### `<DashboardCanvas>` — 2D snap-grid dashboard

Datadog-style 2D snap-grid dashboard. `value` is `{ items: DashboardPlacement[], sections: DashboardSection[] }` — top-level items plus an ordered array of full-width collapsible sections, each with its own sub-grid on the same column count (`columns` prop, default 24 — pass `columns={12}` for layouts saved against a 12-column schema like the eocrm layout-v2 spec; placements are NOT converted between column counts). Always controlled, no uncontrolled mode: `onChange(next)` fires once per completed gesture (a drop, a resize end, a collapse toggle, a band reorder, a cross-container move) with the whole engine-computed next value; omit it for a static layout — drags still preview live but nothing persists past pointerup. `renderItem(id)` renders every item's body — including items inside a COLLAPSED section, whose body stays mounted and `inert` rather than unmounting, so a widget that fetches on mount pays that cost even while collapsed — called once more for the drag ghost mid-gesture, so keep it pure. **The grid cell is chrome-less** (no background/border/radius/shadow, no minimum height beyond its `h` row-span) — wrap the return in `<Card>` for the boxed widget look, and size the content to the cell or accept bare (dotted, in edit mode) space showing below a shorter widget. `renderSectionHeader(id)` adds small extras (a title editor, a `DropdownMenu` trigger) to the right of a section's title, in the same `Accordion.Trigger` `actions` slot as the section's own band-reorder grip handle — neither ever starts a collapse toggle or a drag. `constraints` — a `Record<id, { minW?, minH?, maxH? }>` or a `(id) => constraints | undefined` function — clamps resize gestures per item; unlisted items default to `minW: 1`, `minH: 1`, no `maxH`. Section bands compose the DS `Accordion` (`type="multiple"`) for their header/chevron/panel look; edit mode (not `readOnly`, not below `stackBelow`) also shows a snap-grid of dots on each container so a drag/resize's destination cell is visible before you commit.

Gestures: drag-to-move with push-down collision + live compaction preview, E/S/SE resize handles, cross-container drag (top level ↔ any expanded section), and vertical band reorder by dragging a section header. Full keyboard: Tab to an item, Enter/Space picks it up, arrows move it (crossing a container's edge moves it into the next band), Shift+arrows resize, Enter/Space drops, Escape cancels; Shift+arrows on a focused section header reorders bands.

```tsx
const [value, setValue] = useState<DashboardCanvasValue>(initialLayout);

<DashboardCanvas
  value={value}
  onChange={setValue}
  renderItem={(id) => <Card>{widgets[id].title}</Card>}
  constraints={{ kpi: { minW: 2, maxH: 4 } }}
/>;
```

**Cells are SQUARE by default**: the row unit derives from the canvas's own width (`(width - (columns - 1) * gap) / columns`), so cell height == cell width at every size and the whole layout scales fluidly — override `--dashboard-canvas-row` with a fixed length for fixed-height rows (`--dashboard-canvas-row-stacked`, default 48px, is the row unit of the single-column stack, where the square unit would be uselessly tiny).

`readOnly` turns off all editing (no handles, no keyboard editing) while section collapse toggles keep working — collapse is navigation, not editing. Independent of `readOnly`, at and below the `stackBelow` breakpoint (`'sm'` 480px / `'md'` 640px, the default / `'lg'` 768px) of the canvas's OWN width (a CSS container query, not the viewport) every container automatically re-templates to one column and editing turns off the same way — a `ResizeObserver` mirrors the breakpoint so a gesture can never half-start below it.

When NOT to use: a single ordered list (priority queue, simple reordering) — use `Sortable`; fixed kanban-style columns — use `Kanban`; a free-form node/edge graph — use `FlowCanvas`. The canvas is ALWAYS a size container (named `dashboard-canvas`, unconditionally) — give it a parent with a concrete width; an intrinsic-width context (a `Cluster` item, `width: max-content`) renders it at width 0, same caveat as Grid's `collapseBelow`.

### `<LiquidEditor>` — Liquid template editor

Liquid template editor: syntax highlighting, line-number gutter, variable-insert menu, caret autocomplete, client-side unknown-variable flagging, and a controlled preview pane. Controlled only (`value` + `onChange`). It never parses or renders Liquid — backend syntax errors arrive via `invalid`/`error`; the rendered preview arrives via `preview`/`previewStatus`.

```tsx
const VARS = [
  { code: 'first_name', label: 'First name', type: 'text', group: 'Built-in' },
  { code: 'last_name', label: 'Last name', type: 'text', group: 'Built-in' },
];

<LiquidEditor value={formula} onChange={setFormula} variables={VARS} />;
```

**Toolbar:** the right-aligned "Insert variable" dropdown is a bordered `secondary` `sm` button. Pass `toolbarActions` (a `ReactNode`, e.g. `<Button variant="ghost" size="sm">…</Button>` for a Docs/Help link) to add extra buttons right-aligned just before it. Hidden when `showToolbar={false}`.

**Gutter:** `showLineNumbers={false}` hides the line-number gutter (default `true`) — right for single-line formula inputs and dense forms; combine with `showToolbar={false}` for the most minimal chrome.

**Grouped/dotted palettes (`group`, `description`, `collection`):** each `variables` entry can carry a `group` (a section label in the insert menu, first-seen order — ungrouped entries render unlabeled), a `description` (a muted second line in the insert menu and autocomplete list, and — when the caret sits inside that exact reference — the footer, as `label — description`), and `collection: true` (an autocomplete/menu "list" tag; inserting it drops a `{% for item in code %}{{ item }}{% endfor %}` snippet with the caret left after `{{ item }}`, instead of `{{ code }}`). Unknown-variable flagging matches on the dotted `code` **root** (a variable coded `event.type` still validates inside `event.type.sub` — nested-field codes don't false-flag as unknown); autocomplete prefix-matches the full dotted `code` (typing `ev` or `event.t` suggests `event.type`).

```tsx
const VARS = [
  {
    code: 'event.type',
    label: 'Event type',
    group: 'Event',
    description: 'The journal event type',
  },
  {
    code: 'record.associations',
    label: 'Associations',
    group: 'Record',
    collection: true,
    description: "The record's links — iterate with for",
  },
];

<LiquidEditor value={tpl} onChange={setTpl} variables={VARS} />;
```

When NOT to use: plain prose → `Textarea`; static read-only code → playground `CodeBlock`. Don't expect it to validate syntax (feed `error` from the backend) or to produce its own preview (preview is consumer-rendered).

### `<RichTextEditor>` — controlled rich-text editor (contentEditable)

Controlled WYSIWYG over the in-house engine. `value: RichDoc` + `onChange: (doc) => void` (feed it back into `value`). Type to edit; ⌘/Ctrl+B/I/U and ⌘/Ctrl+⇧X toggle marks over a selection; Enter splits, Backspace/Delete merge.

```tsx
const [doc, setDoc] = useState(emptyDoc());
// Plain editor (keyboard shortcuts only)
<RichTextEditor value={doc} onChange={setDoc} placeholder="Write a note…" />;

// With built-in formatting toolbar
<RichTextEditor value={doc} onChange={setDoc} toolbar placeholder="Write a note…" />;
```

**`toolbar` prop** (`boolean | 'auto'`, default `false`): renders a formatting bar above the editor surface. `toolbar="auto"` shows the bar only when the editor is **focused or non-empty**, and keeps it shown while the editor's own overlays (link editor / mention menu) are open — so opening the link editor on a focused-but-empty composer doesn't collapse the bar. The editable is not remounted as the bar appears/hides (no focus/selection loss). Use `'auto'` for a compact, focus-gated composer (e.g. a comment box) instead of hand-rolling show-on-focus + overlay-focus handling. The toolbar contains:

- **Mark buttons** — Bold, Italic, Underline, Strikethrough. Reflect `aria-pressed` based on the current selection (or pending marks at a collapsed caret). Clicking with a selection toggles the mark over it; clicking at a collapsed caret sets a "pending" mark applied to the next typed characters (then clears).
- **Block-type dropdown** — Paragraph, Heading 1–3, Quote, Code block. Shows the current block type; mixed multi-block selections show "Mixed".
- **List toggles** — Bullet list, Numbered list. Toggle between the list type and paragraph.
- **Link button** — add/edit a link on the selection. Reflects `aria-pressed` when the caret is inside a link.
- **Emoji insert** — opens a searchable `EmojiPickerPopover`; selecting an emoji inserts it at the caret.
- **Color** — two separate pickers, **Text color** and **Highlight**, each its own toolbar button (and its own ⠿-menu submenu when `blockControls` is enabled). Each picker is a grid of small **named badges** (the Palette-demo chip look — subtle bg fill + strong fg text): the default brand colors first (gray + semantic red/green/amber/blue, backed by the `--color-fg-muted`/`--color-danger`/`--color-success`/`--color-warning`/`--color-accent` tokens), then the rest of the categorical palette (each palette extra uses its `-fg`/`-bg` token), led by a Default/clear badge. Applied to the selection from the toolbar, or to a whole block from the ⠿ menu. Colors round-trip through HTML and are dropped in Markdown.
- **Undo / Redo buttons** — undo/redo the last change; disabled at the ends of the history.

**List keys:**

- `Enter` on an empty list item exits the list (converts to paragraph).
- `Tab` / `Shift+Tab` indent and outdent list items (clamped at depth 0).

**Pending marks:** toggling a mark at a collapsed caret (via toolbar or ⌘B/I/U/⌘⇧X shortcut) queues it; the next inserted text gets that mark applied, then the queue clears. Moving the caret discards pending marks.

**`blockControls` prop** (opt-in, default off): Notion-style per-block gutter — `＋` insert below, drag the gutter (the whole strip) to reorder with an in-place reflow (subtree-aware for nested lists) + a block menu (turn into / duplicate / move up·down / delete). Reorder/duplicate/delete are subtree-aware for nested lists (a list item carries its nested children); **turn-into acts on the single anchor block only** (idempotent — choosing the current type is a no-op). Keyboard: Shift+F10 opens the menu, ⌘/Ctrl+⇧↑·↓ move, ⌘/Ctrl+D duplicate. Independent of `toolbar`; ignored when `readOnly`. All ops route through `value`/`onChange` and are undoable.

**`upload` prop** (opt-in): file upload via a toolbar button (when `toolbar`) + clipboard-file paste. `upload={{ onUpload, accept?, onUploadingChange? }}` — `onUpload(file)` resolves `{ url, name?, mime?, width?, height?, alt? }`; images render inline as a preview, other files as a download chip. Reject `onUpload` to show a retry/remove error. Wire `onUploadingChange(uploading)` to your submit button's disabled state. Validate size/type inside `onUpload` (the picker `accept` is a hint only; paste bypasses it). Uploaded files are void **attachment blocks** — `blockControls` can reorder/duplicate/delete them. Stored doc JSON round-trips losslessly; HTML import maps `<img>` → an image attachment (Markdown image import is not supported). Ignored when `readOnly`. Ready image attachments are configurable via the block-menu's "Configure" item (requires `blockControls`): alt text, alignment, replace-in-place, open/download — plus a width slider **only** when the image renders as a preview (a safe, fetchable src — an embedded/imported image); an uploaded image whose object-URL src renders as a download chip isn't resizable here. A previewable image also gets a drag handle on its bottom-right corner (pointer only — keyboard/AT users use the Width slider); both the slider and the handle resize the image **live** and a whole drag is one undo step. Alignment + width persist in the doc and serialize to HTML; Markdown drops them. A newly uploaded/pasted image is laid out at its **perceived** size — natural pixels ÷ device pixel ratio, capped to the editor width — so a retina screenshot isn't inserted at 2× the size you saw; return natural `width`/`height` from `onUpload` (or omit them and the editor measures the file). Persisted/imported image blocks (whose transient upload `status` is dropped on save) stay fully editable — the resize handle and the "Configure" popover treat "ready **or** status-absent" as settled, so editing an existing image comment works exactly like the brand-new composer.

**Links:** select text and press ⌘/Ctrl+K (or the toolbar link button) to add or edit a link; with the caret inside a link the URL is pre-filled and a Remove button appears; with no selection the URL is inserted as linked text. Esc / click-outside cancels. Stored hrefs are sanitized at render time (`safeHref` blocks `javascript:`/`data:`/protocol-relative).

**Autolink** (`autolink` prop, default `true`): typing a URL followed by a space, or pasting text containing a URL, turns it into a `link` mark automatically (`http(s)://…` or a bare `www.…` host; unsafe schemes are left as plain text). Set `autolink={false}` to disable both the type rule and paste autolinking.

**`renderLink`** (optional, same `RenderLink` as `<RichText>`): preview links inline — the consumer checks "is this URL in my space?" and returns a chip or the `fallback` `<a>`. In the editor a substituted link becomes an **atomic chip**: the caret sits before/after it (arrow keys step over it, never inside) and Backspace deletes the whole chip in one step. It's render-time only — `toHtml`/`toMarkdown` and the model still emit a plain link, so serialization is unchanged. Don't do heavy synchronous work inside it.

**`renderMention`** (optional, same `RenderMention` as `<RichText>`): `(mention: { id, label }, defaultNode) => ReactNode` — same contract as `renderLink` but for `@`-mention marks (render an interactive member chip/popover trigger); composes with `renderLink`. A substituted mention becomes an **atomic chip** the caret steps over as one unit. Render-time only — `toHtml`/`toMarkdown` and the model still emit the mention mark.

```tsx
const renderLink: RenderLink = ({ href }, fallback) => {
  const m = /^https?:\/\/app\.eocrm\/task\/(\d+)/i.exec(href);
  return m ? <Badge tone="purple">#{m[1]}</Badge> : fallback;
};
// autolink is on by default; type/paste a URL to link it
<RichTextEditor value={doc} onChange={setDoc} toolbar renderLink={renderLink} />;
```

**Import:** `fromHtml(html)` and `fromMarkdown(md)` parse a string into a `RichDoc` (e.g. to seed `value` from stored/legacy content). Pasting rich HTML into the editor imports it as formatted content (parsed + sanitized). Markdown import is via `fromMarkdown` only — pasted plain text (incl. Markdown source) inserts literally, except that bare URLs in pasted plain text autolink (see Autolink above). Both `from*` functions require a DOM environment (`DOMParser`); Markdown has no underline syntax and images/tables aren't modeled.

**Export:** `toHtml(doc)` and `toMarkdown(doc)` serialize a `RichDoc` back to a string (the inverse of `fromHtml`/`fromMarkdown`) — e.g. for storage, email bodies, or display outside the editor. `toHtml` is lossless (`fromHtml(toHtml(doc))` round-trips); `toMarkdown` drops underline (no Markdown syntax — use `toHtml` for full fidelity). Both escape output and run hrefs through `safeHref`.

**Mentions:** pass `mentions={{ onQuery }}` (optional `trigger`, default `@`) to
enable `@`-autocomplete. `onQuery(query)` returns `MentionItem[]` (`{ id, label,
description?, avatarUrl? }`), sync or async. Picking a candidate inserts a chip
carrying the `id`; chips survive `toHtml`/`fromHtml` round-trips but degrade to
plain `@label` text in `toMarkdown`. Chips are inert references, not links.

**Undo/redo:** built in — ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z (or ⌘/Ctrl+Y) redo, plus the toolbar Undo/Redo buttons. Typing coalesces into one step (short bursts), and replacing `value` from outside the editor clears the history.

**Input rules:** typing a Markdown marker + space at the start of a paragraph auto-converts the block — `# `/`## `/`### ` → headings, `- `/`* `/`+ ` → bullet list, `1. ` → ordered list, `> ` → blockquote, a triple-backtick fence → code block. One Undo reverts the conversion.

When NOT to use: read-only display → `<RichText>`. It's controlled — render `onChange`'s doc back into `value`, never mutate in place.

### `<ImageCrop>` — controlled image cropper

```tsx
const [crop, setCrop] = useState<CropArea | null>(null);

<ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />;

// In the Save handler:
const handleSave = async () => {
  if (!crop) return;
  const blob = await extractCropBlob(file, crop, {
    type: 'image/jpeg',
    quality: 0.9,
    outputWidth: 512,
  });
  await uploadToS3(blob);
};
```

- **Controlled-only.** `value: CropArea | null` (in source-image pixels). Pass `null` initially — the component computes the default centered crop on first image load and fires `onChange` once. From then on, the consumer owns the state.
- **`src: string | File | Blob`** — string URLs pass through; File/Blob are normalized to object URLs internally with cleanup on unmount + src change. Consumer never sees the URL.
- **Pattern A drag**: the crop box is centered in the viewport; the user drags the IMAGE to reposition. Zoom adjusts via the embedded `<Slider>`. No corner / edge resize handles.
- **`aspectRatio?: number`** — pass `1` for square, `16/9` for landscape, etc. Omit for free aspect (crop box fills the viewport; zoom controls effective cropped region).
- **`onChange` fires per drag/zoom tick (high frequency).** Debounce in the consumer OR use `onChangeEnd` (fires on pointerup / slider release).
- **`extractCropBlob(src, area, options?)`** is a top-level utility (NOT a ref method). Call it in the Save handler to produce the cropped Blob. Supports `type` (PNG/JPEG/WebP), `quality` (0..1 for lossy), and `outputWidth` (proportional resize — useful for capping avatar size).
- **Keyboard** (when the viewport is focused): Arrow keys pan by 5px (source coords). Home/End jump to top-left / bottom-right. PageUp/Down zoom by ±0.25.
- **Loading state**: shows `<Skeleton variant="rectangular">` until the image's `onload` fires. Errors show "Couldn't load image" in danger tone.
- **`disabled`**: drag and zoom both disabled. Viewport opacity dimmed.

#### `CropArea` (in source-image pixels)

```ts
interface CropArea {
  x: number; // top-left X in source-image pixels
  y: number; // top-left Y in source-image pixels
  width: number; // crop width in source-image pixels
  height: number; // crop height in source-image pixels
}
```

#### `ExtractCropOptions`

```ts
interface ExtractCropOptions {
  type?: 'image/png' | 'image/jpeg' | 'image/webp'; // default 'image/png'
  quality?: number; // 0..1, default 0.92 (ignored for PNG)
  outputWidth?: number; // resize output width; height proportional
}
```

#### `useCropPreview(src, crop, options?)` — live-preview hook

Reusable hook for the canonical "avatar / cover photo picker" flow. Debounces an `extractCropBlob` encode on every crop change, guards against stale in-flight encodes, and owns the object URL lifecycle. Returns `{ previewUrl, previewBlob, previewSize, encoding }`.

```tsx
const [file, setFile] = useState<File | null>(null);
const [crop, setCrop] = useState<CropArea | null>(null);

const { previewUrl, previewBlob, encoding } = useCropPreview(file, crop, {
  type: 'image/jpeg',
  quality: 0.9,
  outputWidth: 256,
});

const handleSave = async () => {
  if (!previewBlob) return;
  const fd = new FormData();
  fd.append('file', previewBlob, 'avatar.jpg');
  await fetch('/api/upload-avatar', { method: 'POST', body: fd });
};

return (
  <Stack gap="md">
    <FileUpload onFilesAdded={([f]) => setFile(f)} ... />
    {file && (
      <>
        <ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />
        {previewUrl && <img src={previewUrl} style={{ opacity: encoding ? 0.5 : 1 }} />}
        <Button onClick={handleSave} disabled={!previewBlob || encoding}>Save</Button>
      </>
    )}
  </Stack>
);
```

`previewBlob` is the same content backing `previewUrl` — reuse it in the Save handler instead of calling `extractCropBlob` again (the hook already encoded it).

`UseCropPreviewOptions` extends `ExtractCropOptions` with one extra field:

```ts
interface UseCropPreviewOptions extends ExtractCropOptions {
  debounceMs?: number; // default 120; set to 0 in tests, 250+ for 4K photos
}
```

#### Hard rule

- ❌ Hand-rolling a `<canvas>` + drag math per page. Use this.
- ❌ Calling `extractCropBlob` on every `onChange` tick. Use `useCropPreview` if you need a live preview — it debounces and race-guards correctly. For one-shot extraction (Save click only), call `extractCropBlob` once in the handler.
- ❌ Calling `extractCropBlob` AGAIN in the Save handler when you already have `useCropPreview` mounted. Reuse `previewBlob` — it's the same encoded result.
- ❌ Wrapping `<img>` in CSS clip-path for a "crop preview" — that doesn't produce a cropped Blob. Use `extractCropBlob` or `useCropPreview`.
- ❌ `<ImageCrop ref={ref}>` expecting `.getBlob()`. There's no imperative API. The extraction utility is a top-level export.
- ❌ Calling `URL.revokeObjectURL(previewUrl)` from `useCropPreview` manually. The hook owns the URL lifecycle.
- ❌ Cropping a circular avatar at the canvas level. Crop rectangular, then CSS-mask in the consumer.

### `<Card>` — bordered container

```tsx
<Card padding="md">
  <Stack gap="md">...</Stack>
</Card>

// Tone-coded stat card — 3px left-edge stripe in the tone color:
<Card padding="md" tone="accent">Open deals</Card>
```

```tsx
// Compound API — section card with header + list (Dashboard's "Deals needing attention" pattern).
// No `padding` prop needed — Card auto-detects compound children and defaults to padding="none".
<Card>
  <Card.Header
    action={
      <Link as={RouterLink} to="/deals">
        View all
      </Link>
    }
  >
    Deals needing attention
  </Card.Header>
  <Card.List>
    {deals.map((d) => (
      <Card.ListRow key={d.id}>
        <Stack gap="xs">
          <span>{d.title}</span>
          <span>{d.company}</span>
        </Stack>
        <Avatar name={d.owner} size="sm" />
      </Card.ListRow>
    ))}
  </Card.List>
</Card>
```

- `padding`: `none` / `sm` / `md` / `lg`. Defaults to `md` for plain content, `none` when `Card.Header` / `Card.List` / `Card.ListRow` is a direct child. Pass explicitly to override.
- `tone`: `accent` / `info` / `success` / `warning` / `danger` — draws a 3px left-edge stripe in the tone color. Default: no stripe (standard bordered look). A transparent border-left is always reserved so toggling `tone` never shifts layout.
- `overflow`: `hidden` (default) / `visible`. The default clips children to the card's rounded border so square-cornered children (a `<Table>`'s internal scroll wrapper, an `<img>`, a full-bleed `<video>`) don't show a seam at the rounded corners. Overlay primitives in this library (DropdownMenu, Tooltip, Popover, Drawer, Modal) portal to `document.body` and are NOT clipped by this. Focus rings use CSS `outline` which is also unaffected by ancestor overflow. Pass `overflow="visible"` only when a direct child genuinely needs to overhang the card edge (decorative badges that protrude past a corner, hover-lift transforms whose shadow extends outward).
- **Compound API** — `Card.Header` / `Card.List` / `Card.ListRow` for the section-with-list pattern (Dashboard's "Deals needing attention"). Drop `padding="none"` — the parent Card auto-detects compound children.
- `Card.Header`: title row (`h3` by default, override via `headerLevel`) with optional right-aligned `action` slot and bottom-border separator.
- `Card.List`: semantic `<ul>` with list-reset styling — screen readers announce "list with N items".
- `Card.ListRow`: `<li>` with padded content and bottom dividing border; last-child border suppressed automatically.
- **Never nest Card in Card.**

### `<DefinitionList>` — semantic key/value pairs (dl / dt / dd)

For displaying entity properties — contact details, settings rows, metadata sidebars. Renders proper `<dl>`/`<dt>`/`<dd>` so screen readers announce term/description pairs natively. Compound: `DefinitionList`, `DefinitionList.Item`, `DefinitionList.Term`, `DefinitionList.Description`.

```tsx
<DefinitionList dividers>
  <DefinitionList.Item>
    <DefinitionList.Term>Email</DefinitionList.Term>
    <DefinitionList.Description icon={<Mail size={14} />}>
      ada@example.com
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Phone</DefinitionList.Term>
    <DefinitionList.Description icon={<Phone size={14} />}>
      +1 (415) 555-0142
    </DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>
```

Props on the root: `layout='horizontal' | 'stacked'` (default `'horizontal'`), `termWidth` (CSS length, default `max-content` — column sizes to the longest term), `spacing='sm' | 'md' | 'lg'` (default `'sm'` — compact; bump to `md`/`lg` for roomier), `dividers` (default `false`). The `Description` has an `icon` prop — leading-position, automatically wrapped `aria-hidden` because the `<dt>` carries the semantic label.

Use this instead of `Card.List` + `Card.ListRow` whenever the data is genuinely key/value (every row has a label and a value). Use `Card.List` when rows aren't keyed (activity feeds, list of cards).

**Anti-patterns**

- ❌ Wrapping a `<DefinitionList.Description>` directly in `<DefinitionList>` without an enclosing `<DefinitionList.Item>` — the dev warning fires and grid layout breaks.
- ❌ Putting interactive content in `<DefinitionList.Term>`. Use `<DefinitionList.Description>` for values, including ones containing `<Link>` or `<Button>`.
- ❌ Stacking multiple `<DefinitionList.Description>` children under one Item to render "multiple values for one key." Works HTML-wise but doesn't have styling support — render multiple Items with the same Term text if you need that pattern.

### `<Stack>` — vertical layout

```tsx
<Stack gap="md">
  <Input ... />
  <Input ... />
  <Cluster justify="end" gap="sm">
    <Button variant="secondary">Cancel</Button>
    <Button type="submit">Save</Button>
  </Cluster>
</Stack>
```

- `gap`: `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32) — pixels
- `align`: `start` / `center` / `end` / `stretch` (default)

### `<Page>` — page-root layout primitive

```tsx
// Canonical CRM page shape
<Page>
  <PageHeader>
    <PageHeader.Title>Contacts</PageHeader.Title>
  </PageHeader>
  <Card>{filters}</Card>
  <Table>{rows}</Table>
</Page>

// Per-page rhythm override (rare — only when 'lg' doesn't fit)
<Page gap="md">
  {denseDashboardSections}
</Page>
```

- `gap`: `'xs'` (4) / `'sm'` (8) / `'md'` (12) / `'lg'` (16, **default**) / `'xl'` (24) / `'2xl'` (32). The default `'lg'` is the canonical CRM page rhythm — match it across pages unless you have a specific reason.
- Page is the OUTER wrapper at the page root. Inside it, sections compose with `<PageHeader>`, `<Card>`, `<Table>`, etc.
- **Use Page at the page root, not nested.** For sub-regions (inside a card, modal, drawer), use `<Stack>` instead — those contexts have their own padding contract.
- Page does NOT add padding. The page container (AppShell content, modal body) provides outer padding; Page just provides inner section rhythm.
- Page is intentionally thin — a renamed Stack with a page-level default. It exists so future page-level concerns (max-width, scroll restoration, container queries) have a natural home.

### `<Cluster>` — horizontal layout that wraps

```tsx
// Form footer:
<Cluster justify="end" gap="sm">
  <Button variant="secondary">Cancel</Button>
  <Button type="submit">Save</Button>
</Cluster>

// Toolbar (title left, actions right):
<Cluster justify="between" gap="md">
  <h1>Users</h1>
  <Cluster gap="sm">
    <Button variant="secondary">Filter</Button>
    <Button>Add user</Button>
  </Cluster>
</Cluster>

// Inline, inside a <button>/<a>/<label> where a <div> is invalid HTML —
// as="span" renders inline-flex (e.g. icon + label in a ButtonGroup.Item):
<ButtonGroup.Item value="list">
  <Cluster as="span" gap="xs" align="center" wrap={false}>
    <List size={14} aria-hidden />
    List
  </Cluster>
</ButtonGroup.Item>
```

- `as`: `div` (default) / `span` / `section` / `aside`. `span` = inline-flex for phrasing-content contexts (inside `<button>`, `<a>`, `<label>`). `section`/`aside` only for genuinely standalone, labelled regions — `aside` creates a `complementary` landmark; never use it for visual grouping.
- `gap`: same scale as Stack
- `justify`: `start` (default) / `center` / `end` / `between`
- `align`: `start` / `center` (default) / `end` / `baseline`
- `wrap`: `true` (default). Set `false` only for narrow table cells where overflow is preferable to wrapping.

### `<Constrain>` — width / flex constraint

```tsx
<Constrain maxWidth="sm"><Input placeholder="Search…" /></Constrain>

<Cluster wrap={false} gap="sm">
  <Constrain flex="grow"><Progress value={x} max={y} /></Constrain>
  <Button>Upgrade plan</Button>
</Cluster>
```

- The one place width/flex sizing lives — `Stack`/`Cluster`/`Grid` are spacing-only (Rule 4). Constrain sizes its **own** box; it does not arrange children (put a `Cluster`/`Stack` inside).
- `width` / `minWidth` / `maxWidth`: a named scale `'xs'` (200) / `'sm'` (320) / `'md'` (448) / `'lg'` (640) / `'xl'` (800) / `'full'` (100%), via `--measure-*` tokens.
- `flex`: `'grow'` (fill remaining space) / `'auto'` / `'shrink'` (no grow, may shrink — the CSS flex default) / `'none'` (fixed). Omitting `flex` applies no class; the element behaves as its flex container dictates. Use `flex="grow"` to let a child fill a `Cluster` row.
- No padding/border/background — for those use `<Card>`; for a full-bleed shell use `<Screen>`.

### `<Indent>` — indent nested content by depth

`<Indent level={n} gutter="lg">` indents its own box by `level × gutter` via `padding-inline-start` (token-based, RTL-aware). The DS-native way to express nesting depth — threaded comment trees, file/outline views — without inline CSS. `level={0}` is flush; nesting compounds. It pads its own box only (wrap a `<Stack>` inside for a multi-row block). For plain sibling spacing use `<Stack gap>`, not Indent.

```tsx
{
  comments.map((c) => (
    <Indent key={c.id} level={c.depth}>
      <CommentCard comment={c} />
    </Indent>
  ));
}
```

- `gutter`: `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 (default) · `xl` 24 · `2xl` 32 (px per level).
- `level` is a depth count (0, 1, 2, …); negatives clamp to 0.

### `<Screen>` — full-bleed / centered screen layout

```tsx
// Standalone (full viewport) — auth / 404 / error
<Screen
  backdrop="accent"
  header={<Link to="/">← Home</Link>}
  footer={<Cluster gap="lg"><Link>Privacy</Link><Link>Terms</Link></Cluster>}
>
  <ErrorState title="Page not found" actions={<Button>Go home</Button>} />
</Screen>

// In-app variant — fills the shell content area instead of the viewport
<Screen fill="block">
  <ErrorState title="Page not found" />
</Screen>
```

- Page-root layout for **chromeless** screens that render outside the app shell (sign-in, 404, error, onboarding). Three slots: pinned `header`, centered `children` (main), pinned `footer`.
- `fill`: `'viewport'` (**default**, `min-height:100vh`) / `'block'` (fills its container — use inside the shell content area).
- `backdrop`: `'none'` (**default**, transparent) / `'plain'` (subtle solid) / `'accent'` (soft accent wash — the login backdrop) / `'danger'` (danger wash — standalone error).
- `align`: `'center'` (default) / `'start'` — vertical placement of the main slot.
- Layout-owning primitive (the `<Page>` / `<Rail>` exception to "no layout properties"). Don't nest inside `<Page>` or another `<Screen>`. For a normal in-shell page use `<Page>`; to center a small element use `<Cluster>` / `<Stack>`.

### `<AppLayout>` — viewport-filling app shell

```tsx
<AppLayout topBar={<TopBar />} sidebar={<Rail>{nav}</Rail>}>
  <Page>{content}</Page>
</AppLayout>
```

- Top-level shell layout, mounted **once** at the app root. Matches the CRM shell topology: a **full-height `sidebar`** down the left, an optional `topBar` **over the content column** (not full window width), and the main `children` below it. Root is `min-height: 100vh`.
- `topBar`: optional region over the content column (omit for none). `sidebar`: optional full-height left region, intrinsic width (omit for none). `children`: the main content (required).
- Layout-owning primitive (the `<Page>` / `<Screen>` / `<Rail>` exception to "no layout properties"). Its only own-styling is the main region's gutter + subtle canvas (both token-driven, below); the slots bring their own surfaces. Don't nest inside `<Page>` / `<Screen>`, and don't nest inside another `AppLayout` **in product code** — the only sanctioned AppLayout-in-AppLayout nesting is a demo/documentation preview (see the landmark note below); for a chromeless page use `<Screen>`, for in-page layout use `<Stack>` / `<Cluster>`.
- **Content padding (default):** the main region ships the canonical shell gutter (`--app-layout-content-padding`, default `var(--space-6)`, stepping down to `var(--space-4)` at ≤640px viewport width) — routed content is padded with **no prop and no raw CSS**. For a full-bleed main region, override the token (`--app-layout-content-padding: 0`) in your scope; there is no prop. Scope the override to a class or `body`, not another `:root` rule — the narrow-viewport step-down is itself a `:root` rule at the same specificity, so two `:root` rules fight on load order below 640px. _Migration:_ if you previously shimmed this gutter with your own `padding: var(--space-6)` wrapper, remove that shim now or the padding doubles.
- **Content canvas (default):** the main region paints a subtle canvas (`--app-layout-content-background`, default `var(--color-bg-subtle)`) so white `<Card>`s lift off it — matches every mockup, **no prop, no raw CSS**. For a flat content area, override the token (`--app-layout-content-background: transparent`); there is no prop. _Migration:_ if you shimmed your own `background: var(--color-bg-subtle)` on the content region, remove it.
- **Page-scroll shell:** `min-height: 100vh` means tall content scrolls the whole window, but the chrome doesn't scroll away with it — `topBar` is always pinned (`position: sticky`), and `sidebar` pins too when `sidebarPinned` is set. Only the main content region scrolls. For fixed chrome + independently-scrolling content, override the root to a fixed `height: 100vh` / `100dvh` via `className`.
- **`sidebarPinned`** (default `false`): on pages taller than the viewport, pins the sidebar wrapper (`position: sticky; top: 0; height: 100dvh; overflow-y: auto`) so a `Rail`'s footer/`CollapseToggle` stays glued to the viewport bottom instead of scrolling away with the page. Don't reach for wrapping the sidebar slot in `<Sticky>` instead — the Rail pins its footer by filling its own `height: 100%` box, and `Sticky`'s `align-self: start` drops the row stretch that made that height definite, so the footer-pinning doesn't work. `100dvh` is always relative to the real browser viewport, not a nested scroll container — only use it when AppLayout is the outermost, page-scroll shell (its documented top-level use); nested inside another scrollable region, the sidebar sizes to the whole window and overflows it.
- **`sidebarOverlayBelow`** (default: none): below a **viewport** threshold (`'sm'` 480 / `'md'` 640 / `'lg'` 768) the sidebar leaves the flow and renders in a left `<Drawer>`, so the content column gets the full viewport width — the fix for a 240px rail eating a phone screen. **AppLayout renders no trigger** — put a hamburger in your `topBar` and gate it with the `useBelowBreakpoint` hook (see below) so it only shows while the overlay is active. Because there's no built-in trigger, `sidebarOpen` + `onSidebarOpenChange` are technically optional props but **effectively required together**: with both omitted nothing can ever open the drawer (Esc/backdrop still close it once open, but there's no way in). `sidebarPinned` is ignored below the threshold (the drawer owns the sidebar's box there).
- The `children` slot renders inside a plain `<div>`, not a `<main>` — `AppLayout` can be nested in a demo or documentation preview (never in product code, see above), so it must not unilaterally claim the page's `main` landmark. The consuming app owns that: wrap your top-level routed content in your own `<main>` once, at your app shell (not per-page), the way the playground's `AppShell` does.

### `<Grid>` — 2D layout primitive

```tsx
// Auto-fit responsive (default) — columns reflow by container width.
<Grid gap="md">
  {cards.map(c => <Card key={c.id}>...</Card>)}
</Grid>

// Fixed N equal columns.
<Grid columns={2} gap="lg">
  <Input label="First name" />
  <Input label="Last name" />
</Grid>

// Dashboard widgets — 12-column base, fraction spans, collapses under 640px.
<Grid columns={12} gap="md" collapseBelow="md">
  <Grid.Item span="25%"><Card>KPI</Card></Grid.Item>
  <Grid.Item span="75%"><Card>Chart</Card></Grid.Item>
  <Grid.Item span="33%"><Card>List</Card></Grid.Item>
  <Grid.Item span="67%"><Card>Table</Card></Grid.Item>
  <Grid.Item span="100%"><Card>Footer row</Card></Grid.Item>
</Grid>
```

- **One of `columns` or `minColumnWidth`, not both.** TypeScript enforces it.
- **Default** when neither is set: `minColumnWidth="240px"`. Naturally responsive without breakpoints.
- **Gap scale:** `xs` (4px) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32) — same as Stack and Cluster.
- **alignItems / justifyItems** — pass `start` / `center` / `end` / `stretch` to override the default browser stretch on either axis. Useful for cards of varying intrinsic height.
- **`as` prop** — 10 common semantic elements (`div` default, `section`, `ul`, `ol`, `nav`, `main`, `aside`, `article`, `header`, `footer`). Limited rather than fully polymorphic to keep types simple.

**`<Grid.Item span>` — per-cell column span:**

| `span`              | Tracks (12-col grid)                                      |
| ------------------- | --------------------------------------------------------- |
| `'25%'`             | 3/12                                                      |
| `'33%'`             | 4/12                                                      |
| `'50%'`             | 6/12                                                      |
| `'67%'`             | 8/12                                                      |
| `'75%'`             | 9/12                                                      |
| `'100%'` / `'full'` | full row (`1 / -1`), safe in ANY grid                     |
| number              | `span N` tracks of whatever `columns` the parent declares |

Fractions assume a 12-column grid — pair them with `columns={12}` on the parent `<Grid>`. A numeric `span` is relative to the parent's actual `columns` count, no 12-col assumption. `Grid.Item` is opt-in; plain children remain valid Grid cells.

**`collapseBelow` — collapse to one column below a width preset:**

Only valid on a fixed-`columns` Grid (auto-fit grids already reflow). Presets: `'sm'` 480px / `'md'` 640px / `'lg'` 768px. This is a **container query on the Grid's own width, not the viewport** — it fires based on the space the Grid itself has, not the browser window, so it collapses correctly inside a narrow sidebar or split pane even on a wide screen — provided the pane gives the grid a definite width. Below the threshold every child spans the full row, `Grid.Item` spans included.

Also takes a graduated breakpoint→columns map instead of a single string, for a step-down rather than straight-to-1-column collapse — `Grid.Item` spans clamp to fit each step:

```tsx
<Grid columns={12} gap="md" collapseBelow={{ md: 6, sm: 1 }}>
```

The map form — and only the map form — renders an extra wrapper `<div>` around the grid element, because re-templating the grid needs the size container on an ancestor (a container query never restyles its own container). `ref`, `className`, `style`, `as` and spread props all stay on the grid element, so the only thing that changes for a consumer is the DOM: a `> child` selector aimed at the Grid from its parent now hits the wrapper, and layout meant for "the Grid" (`flex: 1`, `grid-column`, `align-self` via `className`) lands inside the wrapper where the parent can't see it — put that layout on your own element around the Grid. The string form's DOM is unchanged.

**Anti-patterns:**

- ❌ Grid for a single column of vertical flow — use Stack.
- ❌ Grid for unaligned wrapping rows (toolbars, tag lists) — use Cluster.
- ❌ `<Grid columns="auto 1fr">` strings — not supported in v1. For asymmetric / named tracks, use raw CSS Grid via className.
- ❌ `<Grid as="ul">` with non-`<li>` children. The component doesn't enforce list semantics; consumers must.
- ❌ Fraction spans (other than `'100%'`) on a Grid whose `columns` isn't 12 — the span is a fixed track count, so it overflows into implicit tracks on a non-12 grid.
- ❌ A `collapseBelow` grid in an intrinsic-width context (`Split`'s default `auto` aside track, a `Cluster` item, `width: max-content`). `container-type: inline-size` makes the grid contribute zero intrinsic width, so it renders at width 0 — the grid must get its width from its parent; give the aside a concrete width instead. The element carrying the containment also becomes the containing block for absolutely-positioned descendants (layout containment) — the grid itself for the string form, the wrapper for the map form; same box geometry either way.

### `<Split>` — master–detail two-pane layout

Intrinsic-width `aside` pane beside a filling `main` pane (`children`), via CSS
grid `auto 1fr`. Never wraps. Sibling to Stack/Cluster/Grid; for in-page
master–detail (a vertical `Tabs` rail beside its detail panel, a filter column
beside results).

```tsx
<Split
  asideWidth="220px"
  collapseBelow="sm"
  aside={<Tabs orientation="auto" items={items} activeId={id} onChange={setId} />}
  gap="lg"
>
  <SectionPanel id={id} />
</Split>
```

- `aside` (required ReactNode) — the narrow pane; `children` — the filling main pane.
- `side`: `'start'` (default) or `'end'` — which edge the aside sits on (RTL-aware).
- `asideWidth`: `'auto'` (default, intrinsic) or a CSS length like `'240px'` to pin the rail.
- `gap`: `xs`/`sm`/`md` (default)/`lg`/`xl`/`2xl` — same scale as Stack/Cluster/Grid.
- `align`: `'start'` (default) / `'stretch'` (full-height aside) / `'center'`.
- `collapseBelow`: `sm` (480px) / `md` (640px) / `lg` (768px) — stack the panes vertically when the SPLIT'S OWN width (container query, not viewport) drops below the preset. Same scale as `Grid`'s `collapseBelow`. Use it whenever `asideWidth` pins a rail, else the rail squeezes `main` to nothing on narrow screens.
- `main` has `min-width: 0` — long content shrinks/scrolls instead of overflowing.

```tsx
// Settings screen: a 220px rail that becomes a horizontal strip when it stacks.
<Split aside={<Tabs orientation="auto" ... />} asideWidth="220px" collapseBelow="sm">
  <SettingsPanel />
</Split>
```

- Collapsed panes stack in **DOM order**: aside → main for `side="start"` (default), main → aside for `side="end"`. No CSS `order` flip — visual order stays in sync with tab order. Need the aside on top when stacked? Use `side="start"`.
- ❌ A `collapseBelow` split in an intrinsic-width context (another `Split`'s default `auto` aside track, a `Cluster` item, `width: max-content`). `container-type: inline-size` makes it contribute zero intrinsic width, so it renders at width 0 — give the parent a concrete width instead. It also becomes the containing block for absolutely-positioned descendants (layout containment). Splits without the prop pay neither cost.

When NOT to use: equal columns → `<Grid columns={2}>`; wrapping peer row → `<Cluster>`; app shell sidebar → `<AppLayout>`/`<Rail>`.

### `<Sticky>` — sticky-positioning primitive

Pins its box to the top of the scroll container while the page scrolls past — for a record/detail-page sidebar (owner, tags, linked records) that stays in view while the wide main column scrolls. Sets `align-self: start` so it also works as a grid/flex item. Positions its OWN box only (put a `Stack`/`Cluster` inside to arrange the pinned content).

```tsx
// Detail page: main column scrolls, sidebar pins. align="stretch" gives the
// aside track full height so the Sticky has a tall containing block to pin within.
<Split
  side="end"
  asideWidth="320px"
  align="stretch"
  aside={
    <Sticky top="md">
      <Stack gap="md">{sidebarCards}</Stack>
    </Sticky>
  }
>
  <Stack gap="lg">{fields}</Stack>
</Split>
```

- `top`: `none` (default, `top:0`) / `xs` / `sm` / `md` / `lg` / `xl` — offset from the top (spacing scale); use a non-zero step to clear a sticky header.
- `scroll`: cap the pinned box at the viewport height with internal `overflow-y:auto` + `overscroll-behavior:contain` — for a sidebar taller than the screen (pair with a non-`none` `top`). The bottom gap defaults to the selected top offset. If `--sticky-top-*` also includes pinned chrome clearance, set `--sticky-bottom-gap: var(--space-4)` on the Sticky so that chrome height is subtracted only at the top.
- Inside a `<Split>` aside, pair with `align="stretch"` (else the content-height aside track gives nowhere to pin).

When NOT to use: arranging children → `<Stack>`/`<Cluster>`; a fixed overlay above content → `position: fixed` chrome (`Popover`/`Modal`/app bar); the split itself → `<Split>`. Note: `position: sticky` breaks if a clipping ancestor (`overflow: hidden/auto`) isn't the intended scroll container.

### `<Masonry>` — height-balanced masonry layout

```tsx
<Masonry minColumnWidth="220px" gap="md">
  {photos.map((p) => (
    <Image key={p.id} src={p.src} alt={p.alt} aspectRatio={p.ratio} />
  ))}
</Masonry>
```

Packs variable-height children into columns (greedy shortest-column-first) →
left→right reading order, balanced heights. Measures on the client + rebalances
via `ResizeObserver`.

- `columns: number` **xor** `minColumnWidth: string` (default `'240px'`, px).
- `gap`: `xs`|`sm`|`md` (default)|`lg`|`xl`|`2xl`.

**When NOT to use:** equal-height tiles → `<Grid>`; one column → `<Stack>`;
wrapping rows → `<Cluster>`. Display content only — rebalancing remounts children.

### `<Divider>` — separator primitive

Thin rule between content sections. Horizontal (default) or vertical. Optional centered label slot. Three size tiers + solid/dashed variants.

```tsx
import { Divider } from '@eocrm/design-system';

// Default horizontal
<Divider />

// Vertical inside a Cluster (toolbar separator)
<Cluster gap="sm">
  <Button>Edit</Button>
  <Divider orientation="vertical" />
  <Button>Duplicate</Button>
</Cluster>

// Labeled (auth-form pattern)
<Divider>OR</Divider>

// Variants + sizes
<Divider variant="dashed" />
<Divider size="lg" />
```

- **Default**: solid, size `'sm'` (1px), horizontal.
- **Labeled** dividers use `<div role="separator">` instead of `<hr>` because HTML `<hr>` can't have children.
- **Vertical** dividers stretch to the parent's height — works inside Cluster/Stack/Flex but needs a parent with known height. Falls back to `--space-3` minimum height as a sanity floor.
- **No spacing prop** — parent owns layout per Rule 4. Use Stack `gap` around the Divider.

#### When NOT to use

- ❌ Decorative under a heading → just style the heading's `border-bottom`.
- ❌ Between unrelated stacked sections → use Stack with `gap` instead.
- ❌ A tone-driven separator (warning/danger) → use `<Alert>` for persistent tone-tied messages.

#### Anti-patterns

- ❌ `<Divider>OR</Divider>` with `orientation="vertical"` — text wraps awkwardly across two short line segments.
- ❌ `<Divider size="lg" />` for casual section breaks. Reserve `lg` (3px) for strong visual hierarchy.
- ❌ Adding `margin` via inline `style`. The parent should own spacing.

### `<PageHeader>` — top-of-page heading area

```tsx
<PageHeader>
  <PageHeader.Breadcrumb>
    <Breadcrumb items={[...]} />
  </PageHeader.Breadcrumb>
  <PageHeader.BackButton href="/contacts" aria-label="Back to contacts" />
  <PageHeader.Aside>
    <Avatar size="lg" name="Acme Corp" />
  </PageHeader.Aside>
  <PageHeader.Title>Acme Corporation</PageHeader.Title>
  <PageHeader.Subtitle>Founded 2014 · 230 employees</PageHeader.Subtitle>
  <PageHeader.Meta>
    <Badge tone="success">Active</Badge>
    <Text size="sm" tone="muted">Last contacted 2 days ago</Text>
  </PageHeader.Meta>
  <PageHeader.Actions>
    <Button variant="secondary">Email</Button>
    <Button>Edit</Button>
  </PageHeader.Actions>
</PageHeader>
```

- **Compound API.** Seven slots: `Breadcrumb`, `BackButton`, `Aside`, `Title`, `Subtitle`, `Meta`, `Actions`. Detected via `c.type === SubComponent` after one level of Fragment unwrap. Unrecognized children are silently dropped.
- **All slots optional.** Missing slots collapse to zero-height rows; minimal usage is `<PageHeader><PageHeader.Title>…</PageHeader.Title></PageHeader>`.
- **`borderBottom: boolean = true`** — toggles the 1px bottom border. Set `false` when placing `<Tabs>` immediately below (Tabs has its own bottom border; you don't want two lines).
- **`<PageHeader.BackButton>`** renders as `<a href>` when `href` is provided, or `<button onClick>` when `onClick` is provided. Mutually exclusive — both → button wins with a dev warn; neither → disabled button with a dev warn. Default `aria-label="Go back"`; default icon `<ChevronLeft size={16}>`. Lives in the breadcrumb row, left of the breadcrumb itself.
- **`<PageHeader.Aside>`** is a position-based slot (not named "Icon" / "Avatar") so it accepts whatever leading element you need. Vertically centered with the title block.
- **`<PageHeader.Title>`** passes through to `<Title order={order} size={size}>`. Default `order={1}` (renders `<h1>`); set `order={2}` for sub-page section headers.
- **`<PageHeader.Subtitle>`** is a `<p>` with muted color.
- **`<PageHeader.Meta>`** is a flex row that wraps — good for badges + timestamps.
- **`<PageHeader.Actions>`** is a flex row, right-aligned by default. On viewports < 640px, Actions wraps below the title block.
- **NOT a `<header>` landmark.** PageHeader renders a `<div>` to avoid conflicting with the AppShell's app-level `<header role="banner">`.

#### Hard rule

- ❌ Nesting `<PageHeader>` inside another `<PageHeader>` — undefined behavior. Use one PageHeader per page.
- ❌ Putting non-PageHeader children (a `<div>`, a `<Stack>`) inside `<PageHeader>` — they're silently dropped. Use one of the seven slots.
- ❌ Wrapping a sub-component in an HOC or deep nesting. The `c.type ===` detection handles ONE level of Fragment unwrap only.
- ❌ Putting an Avatar inside `<PageHeader.Title>` — muddles the `<h1>`'s text content for screen readers. Use `<PageHeader.Aside>` instead.
- ❌ `position: sticky` directly on `<PageHeader>` — out of scope for v1. Wrap in your own sticky container if you need sticky behavior.
- ❌ Passing both `href` and `onClick` to `<PageHeader.BackButton>` — onClick wins with a dev warn. Pick one.

### `<Avatar>` — profile circle

```tsx
<Avatar name="Alex Rivera" />
<Avatar name="Alex Rivera" src="https://example.com/alex.jpg" size="lg" />
```

- `name` (required) — alt/aria-label, initials source, and color seed. Same name → same color, always.
- `src` — image URL. Empty/whitespace = no image. Falls back to initials on load failure.
- `size`: `sm` (24) / `md` (32, default) / `lg` (40) / `xl` (80, member-card popovers / profile headers)
- `status?` — presence dot in the bottom-right corner. `'online' | 'busy' | 'away' | 'offline'`. Omit to render no dot.
- `tooltip?` — wraps the avatar in `<Tooltip>` with `content={name}`. Defaults to `false` standalone (back-compat). Inside `<AvatarGroup>`, the group's `tooltip` becomes the default (which itself defaults to `true`); explicit per-child still wins.
- Inside `<AvatarGroup>`, the group's `size` and `tooltip` become defaults — explicit per-child props still win. The avatar also picks up a `--color-bg` ring so stacked siblings read as distinct.
- Use `avatarColorIndex(name)` if you need to match an avatar's color elsewhere (e.g. a chart segment).

### `<AvatarGroup>` — Slack-style stacked row of avatars

```tsx
<AvatarGroup max={4} size="md" onOverflowClick={(_e, n) => openMembersPopover(n)}>
  {team.map((m) => (
    <Avatar key={m.id} name={m.name} src={m.avatarUrl} status={m.presence} />
  ))}
</AvatarGroup>
```

- Horizontal row of overlapping `<Avatar>`s with a `+N` overflow control when child count exceeds `max` (default `4`).
- `size` is the default for child avatars (per-child explicit `size` still wins). Four sizes: `'sm' | 'md' | 'lg' | 'xl'` (`xl` = member-card popovers / profile headers). For a strictly uniform group, just don't set per-child sizes.
- `tooltip` defaults to `true` (group context flips the per-Avatar default — standalone `<Avatar tooltip>` is opt-in, but inside a group each visible face shows its name on hover by default). Set `tooltip={false}` at the group level to suppress all tooltips, or per-child to opt out one.
- `onOverflowClick(event, hiddenCount)` — the library does NOT render its own popover. The app decides what happens (open a `<Popover>` listing all members, navigate to a page, open a modal). When omitted, `+N` renders as a non-interactive `<span>` (still labelled for AT).
- The group wrapper is `role="list"` and each visible avatar is wrapped in a `role="listitem"` div; the +N (button or span) is the last list item.
- forwardRef to the outer `<div>`. `className` is merged.

### `<PersonDisplay>` — Avatar + name (+ optional description lines)

```tsx
// Canonical: avatar + linked name + email
<PersonDisplay size="md">
  <PersonDisplay.Avatar name="Sarah Chen" src="/avatars/sarah.png" />
  <PersonDisplay.Name href="/contacts/sarah-chen">Sarah Chen</PersonDisplay.Name>
  <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
</PersonDisplay>

// Multiple description lines (email + role)
<PersonDisplay size="md">
  <PersonDisplay.Avatar name="Marcus Vega" />
  <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
  <PersonDisplay.Description>marcus@acme.com</PersonDisplay.Description>
  <PersonDisplay.Description>Account Executive</PersonDisplay.Description>
</PersonDisplay>

// Tight table cell — sm; name only
<PersonDisplay size="sm">
  <PersonDisplay.Avatar name="Avery Liu" />
  <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
</PersonDisplay>
```

- Compound: `<PersonDisplay>` + `<PersonDisplay.Avatar>` + `<PersonDisplay.Name>` + repeating `<PersonDisplay.Description>`.
- `size`: `'sm'` / `'md'` (default) / `'lg'`. Propagates to Avatar size and Text scales via context. Don't pass `size` to `PersonDisplay.Avatar` directly — Root controls it (the prop is omitted from `PersonDisplayAvatarProps` by type).
- `<PersonDisplay.Name href="...">` renders the name as a `<Link variant="subtle">` (real `<a>`). Omit `href` for read-only displays (audit actor, activity timeline).
- `<PersonDisplay.Description>` is muted text; repeat for additional lines. Children can be `ReactNode` — e.g. `admin@acme.com <Badge tone="warning" size="sm">impersonating</Badge>` to inline a marker.
- All Avatar props (`name`, `src`, `status`, `tooltip`) flow through `<PersonDisplay.Avatar>` except `size`.
- `shrink` (boolean, default `false`): force content-width (`width: fit-content`). PersonDisplay shrink-wraps on its own, but a **stretching** flex/grid parent (`align-items: stretch` / `justify-self: stretch`) stretches it full-width, so a `Popover.Trigger`/`Tooltip` cloned onto it anchors to the wide box and centers right of the person. Add `shrink` on such an overlay trigger to re-anchor it to the avatar+name.
- **Use for the standard "person row" — Avatar + name + 0–2 muted lines.** Not for Avatar-only badges (use `<Avatar>`), avatar stacks (use `<AvatarGroup>`), or click-anywhere row interactions (wrap PersonDisplay in your own Link).

### `<Badge>` — status / category pill

```tsx
<Badge tone="success">Active</Badge>
<Badge tone="danger">Churned</Badge>

// Stripe variant — rectangular category marker with left stripe:
<Badge variant="stripe" tone="info">Lead</Badge>
<Badge variant="stripe" tone="warning">Renewal due</Badge>

// Categorical palette color (non-semantic) — for tag-like labels:
<Badge color="amber">Marketing</Badge>
<Badge color="teal">Engineering</Badge>
<Badge variant="stripe" color="violet">Design</Badge>
```

- `tone`: `neutral` (default) / `info` / `success` / `warning` / `danger` / `purple`. Semantic. Use for status (Active / Won / Churned / Lead / Enterprise).
- `color`: optional `PaletteColor` (30 named colors). Categorical — no semantic meaning. Use for tag-like labels where the 6 tones aren't enough (audit event namespaces, team tags, project labels). Takes precedence over `tone` when both are set. Works for both `filled` and `stripe` variants (stripe's left border picks up the palette fg).
- `size`: `md` (20, default) / `sm` (16). `md` is the uppercase tracked "loud label" pill. `sm` drops the uppercase + tracking and renders case as-typed — use it for dense table cells, compact toolbars, or anywhere the uppercase treatment shouts next to body copy.
- `variant`: `filled` (default) / `stripe`. `filled` is the standard pill. `stripe` renders a rectangular block with a tone-colored 3px left stripe and a softly tinted body — no uppercase or letter-spacing. Use for category markers or sidebar labels where pill emphasis is too loud. Composes with both `tone` (6 semantic) and `color` (30 palette).
- `dot`: `start` / `end` — adds a small filled circle in the badge's text color before or after the content. Use for Slack/GitHub-style status indicators (`<Badge tone="success" dot="start">Online</Badge>`). Decorative only (`aria-hidden`); the text is still the accessible label.
- `align`: `baseline` (default) / `middle`. Use `align="middle"` for a badge inside a heading line (`<Title>` / `<PageHeader.Title>`) — pairs with `<Text size="inherit">` — so it centers on the line box instead of riding the heading's baseline and looking sunken next to large text.
- **Non-interactive.** If it's clickable, use `<Button>` instead.
- Doesn't auto-add `role="status"`. Wrap in `aria-live` if a state change should be announced.

### `<EntityChip>` — inline entity-link chip

```tsx
// Inline, inside a sentence — canonically a link to its entity:
<Text>
  Reassigned <EntityChip href="/contacts/12" icon={<User size={14} />} label="Priya Shah" /> to this deal.
</Text>

// href, prefix + status:
<EntityChip
  href="/tasks/5"
  prefix="ENG-5"
  label="Fix login bug"
  status={{ label: 'In progress', category: 'in_progress' }}
/>

// RouterLink via `as`, or a status color override:
import { Link as RouterLink } from 'react-router-dom';
<EntityChip as={RouterLink} to="/deals/9" label="Acme Corp" status={{ label: 'At risk', color: 'amber' }} />

// Chip fill override (categorical, independent of status):
<EntityChip href="/deals/9" label="Acme Corp" color="violet" />
```

- Polymorphic inline chip: optional `icon` (rendered `aria-hidden`), optional muted `prefix` (e.g. a task key), the `label`, and an optional colored `status`. All inline `<span>`s inside one root — safe to drop directly inside a `<p>`/`<Text>`.
- **An EntityChip is always a link to its entity**: pass `href` (renders `<a href>`) or `as` (`RouterLink`, `'button'`, any component — same polymorphic contract as `<Link>`). The bare `<span>` form (no target) is for rare non-navigable contexts only.
- Default chip fill matches RichText's `@mention` styling (`--color-accent-bg-subtle` / `--color-accent`) — a chip and a rendered mention read as the same visual object in both themes. `color?: PaletteColor` overrides the fill (same inline-injection contract as `Badge color`) — independent of `status`, which keeps its own resolved color. `unavailable` still mutes the label/status/dot over any `color`.
- `status`: `{ label, category?, color? }`. `category` (`to_do`/`in_progress`/`open`/`done`/`won`/`lost`) resolves a default palette color; `color` (a `PaletteColor`) overrides it — same category → color mapping as `<StatusMenu>`. The separator dot between name and status takes the status's resolved color too (reads as one unit with the status label).
- `loading`: swaps the body for an `aria-busy` ellipsis. `unavailable`: mutes the chip (entity deleted or no access). Both are purely visual when the chip has a link target — it stays a live, keyboard-reachable link. Only a target-less `unavailable` chip is non-interactive with `aria-disabled`.
- Hover affordance on link/button chips: the background deepens a step plus a brightness dip. Never a weight change, never an underline, even under aggressive consumer link CSS.
- Chip text inherits the surrounding font size — inside a heading it renders at heading size, by design (that's what keeps the chip box symmetric around the local text in any context).
- **When NOT to use**: plain status with no linked entity → `<Badge>`/`<StatusMenu>`; standalone navigation with no icon/prefix/status chrome → `<Link>`; removable filter pills → `<FilterChip>`.
- **Anti-pattern**: nesting a `<Badge>` inside another `<Badge>` to fake an entity-with-status chip — `EntityChip` replaces that composition. `status.color` and the chip's own `color` are `PaletteColor` names, never raw hex strings. Omitting a link target (`href`/`as`) is also an anti-pattern — an EntityChip should link to its entity.

### `<StatusMenu>` — status-transition dropdown

```tsx
<StatusMenu
  current={{ id: 'todo', name: 'To do', category: 'to_do' }}
  options={[
    { id: 'in_progress', name: 'In progress', category: 'in_progress' },
    { id: 'done', name: 'Done', category: 'done' },
  ]}
  onSelect={(id) => updateStatus(task.id, id)}
/>

// Read-only chip — omit `options` for a static colored chip, no menu:
<StatusMenu current={{ id: 'won', name: 'Won', category: 'won' }} />
```

- A colored pill trigger that opens a menu of transition targets, each row colored to its own status. Composes `<DropdownMenu>` internally.
- `current` / each option: `{ id, name, category?, color? }`. `category` (`to_do` / `in_progress` / `open` / `done` / `won` / `lost`) maps to a default palette color (slate / blue / violet / green / green / red); `color` (a `PaletteColor`) overrides it per-status.
- `options` omitted or empty → read-only mode: a static colored `<span>` chip, no button, no `aria-haspopup`. This is the read-only surface — there's no separate `readOnly` prop.
- `disabled` blocks the trigger (dims via opacity, stays colored). `busy` sets `aria-busy` for a transition in flight — also non-interactive, no built-in spinner.
- Not for a plain action menu (use `<DropdownMenu>`), a non-interactive status with no transition (use `<Badge>`), or picking from a long searchable list (use `<Select>`).

### `<Dot>` — bare palette/tone colored circle

```tsx
// Palette color, paired with a label:
<Cluster gap="xs"><Dot color="violet" /> Design</Cluster>

// Semantic tone:
<Dot tone="success" />
```

- A bare, background-less 6px circle (`--size-badge-dot`) for color-coding affordances — a leading dot on a filter / `FilterChip`, a status indicator, a legend swatch. Unlike `<Badge dot>` it paints NO badge surface; it is just the dot.
- `color`: optional `PaletteColor` (30 categorical colors) — renders the dot in that color's saturated `--color-palette-<name>-fg` token (the same color OptionsPicker groups / palette Badges use). Takes precedence over `tone`.
- `tone`: optional `BadgeTone` (`neutral` default / `info` / `success` / `warning` / `danger` / `purple`) — used when `color` is omitted. Neither set → `neutral`.
- **Decorative**: `aria-hidden` by default (overridable). The dot alone conveys nothing to assistive tech — always pair it with a visible label / accessible text.
- **When NOT to use**: a status pill WITH text → use `<Badge>` (it owns a surface + label). The sole signal of meaning → color isn't an accessible signal on its own; accompany with text.

### `<Timeline>` — vertical activity-feed primitive

`<Timeline>` + `<Timeline.Item node>` — a connector line running between per-item `node` slots (`<Avatar>` / `<Dot>` / icon) with content to the right; the line stops at the last node. `<Timeline compact>` tightens it for a sidebar widget. Semantic `<ol>`/`<li>`. For a plain list use `<Stack>`.

```tsx
<Timeline>
  {activities.map((a) => (
    <Timeline.Item key={a.id} node={<Avatar name={a.actor} size="sm" />}>
      <Text size="sm">
        <strong>{a.actor}</strong> · {a.type} · {a.time}
      </Text>
      <Text size="sm" tone="muted">
        {a.body}
      </Text>
    </Timeline.Item>
  ))}
</Timeline>
```

- `node` is a SLOT (pass `<Dot>` / `<Avatar size="sm">` / a small icon) — there's no built-in dot.
- The last item's connector stops automatically (CSS `:last-child`); `compact` flows via CSS vars.

### `<Thread>` — nested-reply threading primitive

`<Thread>` + `<Thread.Item node>` — a per-level left vertical rail connecting a parent comment to its nested replies, with the leading `node` slot (`<Avatar>` / icon / `<Dot>`) as the connection point. Replies are written as nested `<Thread.Item>`s; the recursive compound detects them (by identity) and indents under the rail. Depth-capped (`maxDepth`, default `4`) so deep threads stop marching right — past the cap, replies render flat at the same indent. `<Thread compact>` tightens the gaps for dense sidebars. The node centers on the first body line (the header) by default — pass `nodeAlign="top"` to top-align it instead. The rail terminates at the last reply's elbow, so it's surface-independent (no `--thread-surface` to keep in sync — works on tinted backgrounds). Semantic `<ul>`/`<li>`.

```tsx
<Thread maxDepth={4}>
  <Thread.Item node={<Avatar name="Maya Chen" size="sm" />}>
    <Stack gap="xs">
      <Text size="sm">
        <strong>Maya Chen</strong> · 2h ago
      </Text>
      <Text size="sm">Flagged the Acme renewal — usage dropped last quarter.</Text>
    </Stack>
    {/* replies = nested <Thread.Item>s; render them inline with the body */}
    <Thread.Item node={<Avatar name="Tom Okafor" size="sm" />}>
      <Text size="sm">Good catch — I'll set up a call.</Text>
    </Thread.Item>
  </Thread.Item>
</Thread>
```

- `node` is a SLOT (pass `<Avatar size="sm">` / a small icon / `<Dot>`) — there's no built-in avatar. Match the node to `--thread-node-size` (default `sm` / 24px) so the rail/elbow connectors meet it cleanly; override `--thread-node-size` for a larger node. The rail branches to each reply with an elbow (`├─`/`└─`).
- `nodeAlign` (default `header`): the node centers on the first body line — set your header (`<Avatar size="sm">` + author/timestamp) as the first child and it aligns automatically; no consumer line-height hack. **Remove any old `lineHeight: var(--size-sm)` (or similar) header override** — it now double-compensates and pushes the text off the node's centre. `nodeAlign="top"` top-aligns the node instead. If your header line-box differs from `<Text size="sm">`, override `--thread-header-line-height`.
- Plain children are the comment body; any direct `<Thread.Item>` child is a reply. Don't wrap a reply in a Fragment / wrapper — the sort matches `Thread.Item` by identity and it won't be detected.
- `maxDepth` (default `4`): once nesting hits the cap, deeper replies render flat (same indent) instead of marching further right. `compact` flows to every nested level via CSS vars.
- **When NOT to use**: a flat activity feed with no parent/child nesting → `<Timeline>`; plain indentation with no connecting line → `<Indent>`.

### `<BrandIcon>` — third-party brand marks

```tsx
<Button variant="secondary">
  <BrandIcon name="google" size={16} /> Continue with Google
</Button>
```

Full-color official brand marks for SSO buttons. Ships `google` + `yandex`.

- `name`: `'google' | 'yandex'`. `size`: px (default 20). Colors are brand-mandated (not themeable).
- Decorative by default (`aria-hidden`); pass `title` for a labeled standalone icon (`role="img"`).

**When NOT to use:** generic UI glyphs → `lucide-react`. Don't recolor brand marks.

### `<Logo>` — brand logo lockup

```tsx
import logo from '../assets/eocrm-logo.svg'; // a consumer-owned asset
<Logo src={logo} text="eocrm" size="lg" />                       // mark + wordmark
<Logo src={logo} label="eocrm" />                                // mark only (accessible name)
<Logo src={logo} text="eocrm" textPlacement="bottom" />
<Logo src={logo} text="eocrm" subtext="Free trial" size="sm" />  // mark + name + muted subline
```

- Arranges a **consumer-supplied** mark image (`src`, required — import an SVG/PNG) with an optional wordmark beside (default) or below (`textPlacement="bottom"`). The design system ships **no** logo of its own.
- `size`: `sm` (24) / `md` (32, default) / `lg` (40) — the mark box; rendered as `<img object-fit:contain>` (no CSS recolor — the asset carries its own color).
- `text` → wordmark + decorative mark (`alt=""`); `label` → the image `alt`/accessible name for a mark-only logo (never pass both). For third-party SSO marks use `<BrandIcon>`, not `<Logo>`.
- `subtext` → a small muted line under the wordmark (e.g. `subtext="Free trial"`); only shown when `text` is set.
- **Wordmark font:** override `--logo-text-font` / `--logo-text-font-weight` to set the wordmark's font + weight (defaults: inherited sans, bold). Affects only `text`, not the mark or `subtext`; load the font yourself (the DS ships none).

### Palette — categorical color set

```tsx
import { paletteTokens, type PaletteColor } from '@eocrm/design-system';

// Consumer-side mapping: domain → color
const TEAM_COLOR: Record<string, PaletteColor> = {
  marketing: 'violet',
  engineering: 'teal',
  sales: 'amber',
  ops: 'slate',
};

// Custom consumer chip using the palette tokens
function TeamChip({ team }: { team: string }) {
  const { bg, fg } = paletteTokens(TEAM_COLOR[team] ?? 'stone');
  return (
    <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 4 }}>{team}</span>
  );
}

// Color-tagged checkbox (library-level integration)
<Checkbox color="violet" label="Marketing" />;
```

- 30 named colors with bg + fg pairs: `red` / `coral` / `orange` / `amber` / `gold` / `yellow` / `olive` / `lime` / `green` / `emerald` / `mint` / `teal` / `cyan` / `sky` / `blue` / `navy` / `indigo` / `violet` / `lavender` / `purple` / `plum` / `fuchsia` / `magenta` / `pink` / `rose` / `brown` / `taupe` / `slate` / `stone` / `charcoal`.
- `PaletteColor` is the TypeScript union; `PALETTE_COLORS` is the ordered readonly array (use for pickers / demos).
- `paletteTokens(color)` returns `{ bg, fg }` as `var(...)` strings — use to apply palette colors in consumer-built components.
- **Categorical, not semantic.** For status, use `<Badge tone="success" />` etc. Palette colors carry no built-in meaning.
- Consumers own the **domain → color mapping** (e.g., per-event-namespace, per-team, per-tag). The library provides only the colors and the type surface.
- `<Checkbox color="violet">` is the one library component that accepts palette colors out-of-the-box — tints the checked / indeterminate fill. Others (Badge, FilterChip) keep their existing semantic-tone unions; consumers build custom chips when they want palette colors.
- The generated token contract exposes `--color-palette-<name>-bg` and `--color-palette-<name>-fg`; contributors change their source definitions in `packages/design-tokens/src/tokens.json`.

### `<FilterChip>` — dismissible "active filter" pill

```tsx
<FilterChip onDismiss={() => removeFilter('event')}>
  <FilterChip.Label>Event</FilterChip.Label>
  <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
</FilterChip>

// Value-only chip (no label slot):
<FilterChip onDismiss={() => removeFilter('tenant')}>
  <FilterChip.Value>beta</FilterChip.Value>
</FilterChip>

// Read-only chip (no dismiss button):
<FilterChip>
  <FilterChip.Label>Status</FilterChip.Label>
  <FilterChip.Value>Active</FilterChip.Value>
</FilterChip>
```

- Compound API: `<FilterChip>` root + optional `<FilterChip.Label>` and `<FilterChip.Value>` children.
- `onDismiss`: when provided, the chip renders a trailing `×` button wired to this callback. Omit for a read-only chip.
- `dismissLabel`: overrides the default `'Remove filter'` `aria-label` on the dismiss button. Pass a contextual label (`'Remove Event: auth.* filter'`) for screen-reader clarity.
- `onActivate`: makes the chip BODY a `<button>` (for _editable_ filters — e.g. a date-range chip whose body re-opens its range-picker). Wire it to a controlled `<Popover open onOpenChange>` to open an editor popover. The dismiss ✕ stays a separate button whose click **stops propagation**, so removing the filter never fires `onActivate` (and never bubbles to a wrapping `Popover.Trigger` / ancestor click handler).
- `expanded`: surfaced as `aria-expanded` on the body button — pass the open state of the disclosure the body opens. Only meaningful with `onActivate`; omit if the body doesn't toggle a disclosure. The body button also carries `aria-haspopup="dialog"`.
- `<FilterChip.Value tone={...}>`: optional `tone` (same palette as `<Badge>`) prefixes a colored 6px dot (a `<Dot>`) before the value text. Or pass `color` for a full `PaletteColor` (30 categorical colors) when the 6 tones aren't enough — `color` wins over `tone`. Omit both for plain values (e.g., a tenant slug).
- **Use for active-filter pills, not tags / status badges.** If it's a status or category, use `<Badge>`. If it's a clickable filter trigger that navigates or runs an action, use `<Button>` or `<OptionsPicker.Trigger>`.
- Root carries `role="group"` so screen readers announce the chip as one unit. A read-only chip's only interactive target is the dismiss ✕; an _editable_ chip adds a body button via `onActivate`.

```tsx
// Editable chip — body re-opens an editor popover; ✕ removes the filter
const [open, setOpen] = useState(false);
<Popover open={open} onOpenChange={setOpen}>
  <Popover.Trigger>
    <FilterChip onActivate={() => setOpen((o) => !o)} expanded={open} onDismiss={remove}>
      <FilterChip.Label>Range</FilterChip.Label>
      <FilterChip.Value>Jun 1 – Jul 31</FilterChip.Value>
    </FilterChip>
  </Popover.Trigger>
  <Popover.Content maxWidth={520}>{/* range picker */}</Popover.Content>
</Popover>;
```

### `<Tabs>` — tab strip (horizontal or vertical)

```tsx
const [tab, setTab] = useState('overview');

<Tabs
  items={[
    { id: 'overview', label: 'Overview', icon: <Eye size={14} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 12 },
  ]}
  activeId={tab}
  onChange={setTab}
/>;
{
  tab === 'overview' && <OverviewPanel />;
}
```

```tsx
// Responsive master–detail rail:
<Split
  asideWidth="220px"
  collapseBelow="sm"
  aside={
    <Tabs
      orientation="auto"
      items={[
        { id: 'general', label: 'General' },
        { id: 'security', label: 'Security', trailing: <Badge tone="warning">Unsaved</Badge> },
        { id: 'billing', label: 'Billing', count: 3 },
      ]}
      activeId={section}
      onChange={setSection}
    />
  }
>
  <SectionPanel id={section} />
</Split>
```

- `items: { id, label, icon?, count?, leading?, trailing?, actions? }[]` — `id` must be unique. `icon` is a decorative leading glyph; `count` renders as a chip after the label. `leading`/`trailing` are free-form ReactNode adornments (status dot, unsaved-changes `Badge`); they are NOT `aria-hidden`, so give meaningful ones accessible text. In vertical orientation `trailing` pins to the row's right edge.
- `actions` on a `TabItem` renders **interactive** control(s) (a `Switch`, a close button, a `⋯` menu) OUTSIDE that tab's `role="tab"` button — use it for anything focusable/clickable (a `Badge` or a static status dot stays in `leading`/`trailing`, which render _inside_ the button). `endContent` (a `TabsProps` slot) renders controls for the whole bar (an "add tab" button, a filter toggle) at the end of the strip, outside the tablist, so they never scroll with the tabs and aren't part of arrow-key tab navigation. Keyboard: arrows rove tabs only; `Tab` reaches a tab's `actions`, then `endContent`. Each per-tab `actions` adds a Tab stop, so they're cleanest on the active tab or a handful of tabs.
- `activationMode`: `auto` (default — Arrow keys fire onChange) or `manual` (Arrow only focuses; Enter/Space activates). Use `manual` when panels lazy-load expensive content.
- `orientation`: `horizontal` (default), `vertical`, or `auto`. `auto` is vertical below `autoOrientationBreakpoint` and horizontal at or above it based on the available Tabs/tab-strip width; the breakpoint defaults to 320px and can be set per Tabs instance to match the surrounding layout threshold. Use it with a collapsing `Split` so a fixed rail stays vertical until its pane stacks.
- `panelIdPrefix`: optional. When set, each tab gets `aria-controls="${prefix}-${itemId}-panel"`. Set this if you render the panels in the DOM and want assistive tech to follow the link.
- The active-tab underline slides between tabs when `activeId` changes. Respects `prefers-reduced-motion: reduce`.
- `action?: { label, icon?, onClick, disabled? }` renders a `+ New entity`-style button-like pseudo-tab after the tab items, inside the same strip — tab-shaped but visibly muted, NOT `role="tab"`, never selected, skipped by arrow-key roving (reachable via `Tab` instead), and the sliding indicator never targets it. It only fires `onClick`; if the click should change `activeId`, do that yourself in the handler (e.g. append + select a new tab). Known, accepted a11y tradeoff: like the `TabItem.actions` button, this leaves one non-`"tab"` child in the `role="tablist"` container (an `aria-required-children` deviation) — a real `<button>` still announces correctly to assistive tech regardless of its parent's role.

### `<Accordion>` — vertically-stacked collapsible panels

Compound component for FAQ-style content, settings sections, and any case where you have a list of headings with optional drill-down detail. Two modes: `single` (one open at a time) or `multiple` (any combination).

```tsx
import { Accordion } from '@eocrm/design-system';

// Single-open with collapsible (FAQ-style)
<Accordion type="single" collapsible defaultValue="faq-2">
  <Accordion.Item value="faq-1">
    <Accordion.Trigger>How do I reset my password?</Accordion.Trigger>
    <Accordion.Content>Visit Settings → Security → Reset.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="faq-2">
    <Accordion.Trigger>How do I export my data?</Accordion.Trigger>
    <Accordion.Content>Use the gear icon → Export → CSV.</Accordion.Content>
  </Accordion.Item>
</Accordion>

// Multiple — independent sections
<Accordion type="multiple" defaultValue={['account', 'notifications']}>
  <Accordion.Item value="account">...</Accordion.Item>
  <Accordion.Item value="notifications">...</Accordion.Item>
</Accordion>

// Disabled item
<Accordion.Item value="advanced" disabled>...</Accordion.Item>

// Controlled
<Accordion type="single" value={open} onValueChange={setOpen}>...</Accordion>
```

- **`type="single"`** + `collapsible={true}` — one item open at a time, click to close.
- **`type="multiple"`** — any combination.
- **`variant`** — `"bordered"` (default; outer border + radius + item dividers) or `"borderless"` (no chrome; for nesting inside Cards or as a quiet section divider).
- **`size`** — `"sm"` / `"md"` (default) / `"lg"` controls trigger font-size + padding (and content padding).
- **`gap`** — `"sm"` / `"md"` / `"lg"` separates items into **collapsible cards** (each gets its own border + radius; the joined container chrome is dropped). Omit for the default joined look.
- **`indicatorSide`** — `"right"` (default) or `"left"` to put the chevron before the title.
- **`<Accordion.Trigger actions={…}>`** — a controls slot at the **right of the header**, rendered OUTSIDE the toggle button so its buttons/menus are clickable without toggling the section (and don't pollute the heading's accessible name). Keep it to a few small controls.
- **`actionsWhenClosed`** — `"show"` (default) keeps `actions` always visible; `"hide"` fades them out (and drops them from focus order) while the item is collapsed — for dense sidebars of collapsed cards.
- **Smooth animation** via CSS `grid-template-rows: 0fr → 1fr`. No JS measurement.
- **Heading wrapping** — Trigger is wrapped in `<h3>` by default per WAI-ARIA APG. Override via `headerLevel` on Item.
- **Keyboard**: ArrowDown/Up cycles between triggers, Home/End jumps to ends, Space/Enter toggles. Disabled items are skipped.

#### When NOT to use

- ❌ Mutually-exclusive view switchers → `<Tabs>` (tabs imply parallel content; accordions imply hierarchy).
- ❌ A simple show/hide toggle for a single section → use a `<Button>` + conditional render.
- ❌ Step-by-step wizard flows → a dedicated Stepper (not shipped).

#### Anti-patterns

- ❌ Nesting `<Accordion.Trigger>` inside a heading the consumer also renders manually. Trigger ALREADY wraps itself in a heading.
- ❌ Setting `aria-expanded` manually on the Trigger via `{...props}`. The component owns the ARIA contract.
- ❌ Using `headerLevel="h1"`. There should only be one `<h1>` per page; Accordion lives below it.

### `<Breadcrumb>` — navigation trail

Compound (Breadcrumb.Item) navigation breadcrumb. Last child is auto-marked as the current page (`<span aria-current="page">`); non-last items are muted Links. Default separator is a ChevronRight icon.

```tsx
import { Breadcrumb, Link } from '@eocrm/design-system';
import { Link as RouterLink } from 'react-router-dom';

<Breadcrumb>
  <Breadcrumb.Item as={RouterLink} to="/mockups">Mockups</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/mockups/contacts">Contacts</Breadcrumb.Item>
  <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>      {/* auto-current */}
</Breadcrumb>

// Custom separator
<Breadcrumb separator={<Slash size={12} />}>
  <Breadcrumb.Item as={RouterLink} to="/a">A</Breadcrumb.Item>
  <Breadcrumb.Item>B</Breadcrumb.Item>
</Breadcrumb>
```

- **Compound API** — wrap each crumb in `<Breadcrumb.Item>`.
- **Auto-current** — last child gets `aria-current="page"` and renders as `<span>`. Override with explicit `current` prop.
- **Item is polymorphic** — same `as` pattern as Link.
- **Default separator** is `<ChevronRight size={14} />`. Override via the `separator` prop.
- **`<nav aria-label="Breadcrumb">` wrapper** — semantic landmark, AT-friendly.

#### When NOT to use

- ❌ Horizontal nav of equal-importance siblings → `<Tabs>`.
- ❌ Step-by-step progress → a dedicated Stepper (not shipped).
- ❌ Single-page apps with no parent hierarchy — omit Breadcrumb entirely.

#### Anti-patterns

- ❌ Making the current page clickable. Current items are non-link by design.
- ❌ Long trails (5+ levels) — wrap and become illegible.
- ❌ Building your own `<nav>` + chevron pattern. Use Breadcrumb.

### `<Rail>` — collapsible left-side navigation

Vertical nav anchored to one side of a page. Switches between a wide labelled mode (240px) and a narrow icon-only mode (56px) via a CSS width transition. Sections of items, parent groups with subitems, and a hover-popover that surfaces a collapsed group's subitems without expanding the rail.

```tsx
import { Rail } from '@eocrm/design-system';
import { NavLink } from 'react-router-dom';
import { Home, Users, Settings } from 'lucide-react';

<Rail defaultCollapsed={false} aria-label="Main navigation">
  <Rail.Header>
    <BrandLogo />
  </Rail.Header>

  <Rail.Section title="Main">
    <Rail.Item icon={<Home />} as={NavLink} to="/" end>
      Dashboard
    </Rail.Item>
    <Rail.Item icon={<Users />} as={NavLink} to="/contacts" badge="12">
      Contacts
    </Rail.Item>
  </Rail.Section>

  <Rail.Section title="Operations">
    <Rail.Group icon={<Settings />} label="Settings">
      <Rail.Item as={NavLink} to="/settings/general">
        General
      </Rail.Item>
      <Rail.Item as={NavLink} to="/settings/security">
        Security
      </Rail.Item>
    </Rail.Group>
  </Rail.Section>

  <Rail.Footer>
    <Rail.CollapseToggle />
  </Rail.Footer>
</Rail>;
```

- **Compound API** — `Rail.Header` / `Rail.Section` / `Rail.Item` / `Rail.Group` / `Rail.Spacer` / `Rail.Footer` / `Rail.CollapseToggle`.
- **`Rail.Header` brand area (default)** — a padded brand block with a header→nav divider out of the box: `--rail-header-padding` (default `var(--space-4)`) + `--rail-header-divider-width` (default `var(--border-width)`, color `--rail-border-color`). Matches the canonical rail brand with **no prop and no raw CSS**. For a bare header, override either token to `0`. _Migration:_ if you previously shimmed your own brand padding/divider on the header, remove it or it doubles.
- **Layout-owning primitive (Hard rule 4 exception)** — like `<Modal>`, `<Drawer>`, `<Page>`, the rail owns its own width and height because that IS its job. Place the rail inside whatever container shape your page needs (sticky aside, fixed sidebar, in-flow column).
- **Collapse state**: controlled (`collapsed` + `onCollapsedChange`) or uncontrolled (`defaultCollapsed`). The `<Rail.CollapseToggle>` button reads context and flips the state without prop drilling.
- **`collapseBelow`** (`'sm'` 480px / `'md'` 640px / `'lg'` 768px, unset by default) — forces the icon-only mode while the **viewport** is at or below that width. Below the threshold the rail is collapsed regardless of `collapsed` / `defaultCollapsed`; above it, the consumer's value governs again. It is a presentation override, not a user choice: **`onCollapsedChange` does not fire** on a breakpoint cross and no consumer state is written, so a persisted preference survives a narrow window untouched. `<Rail.CollapseToggle>` renders nothing while the override is active (it could not change anything). `useRail()` reports the EFFECTIVE `collapsed` plus `collapsedByViewport` for custom chrome that needs to tell the two apart. Same token scale as `<Grid collapseBelow>` / `<Split collapseBelow>` but a **different measurement basis** — those use container queries; the rail must use the viewport, because collapsing is what changes the rail's own width (a container query would be circular) and because collapsed drives React behavior (tooltips, group flyouts) CSS can't reach.
- ⚠️ **Make your shell's rail track follow the override.** It shrinks the rail but is invisible to the layout around it, so a shell sizing its rail column from its OWN `collapsed` state keeps a 240px track around a 56px rail — a dead gap on every screen. Key the track off the viewport (`@media (max-width: 768px) { .shell { grid-template-columns: 56px 1fr } }`) or off the rail itself (`.shell:has(nav[data-collapsed]) { grid-template-columns: 56px 1fr }`, no breakpoint duplication). Both work only because this basis is the viewport, not a container.
- **`Rail.Item` is polymorphic** — `as={NavLink}` (or any router primitive) sets `aria-current="page"` on the rendered anchor; Rail's CSS applies the active accent via `[aria-current="page"]` and `:has([aria-current="page"])` selectors. No router dependency in the library.
- **`Rail.Group`** — renders inline-expanding subitems when the rail is expanded, and a hover-popover (`right-start` placement, 80ms open delay, 200ms close grace) when collapsed — portaled to `document.body` at `--z-popover` and auto-elevating above Modal/Drawer like other floating surfaces. Auto-opens on mount when the group's own link or any subitem is the active route (one-shot, uncontrolled-only — a manual close sticks).
- **`Rail.Group` can be a link AND a toggle** — pass `as` (same polymorphic contract as `Rail.Item`) and the row splits into two hit-targets: icon + label navigate and carry `aria-current="page"` (so the row highlights like any item), while a separate chevron `<button>` owns `aria-expanded` + `aria-controls` with an `Expand <label>` / `Collapse <label>` accessible name. Keyboard order is link, then chevron. **Omitting `as` is byte-for-byte today's toggle-only shape** (one `<button>` spanning the row) — the feature is purely additive. Note the spread target moves with `as`: without it the remaining props land on the wrapping `<div>` (unchanged); with it they land on the rendered link, since that is what `to` / `end` / `replace` are for — **except `className` and `ref`, which stay on the wrapper `<div>` in both shapes**. Your `onPointerEnter` / `onPointerLeave` / `onFocus` / `onBlur` / `onClick` are _composed_ with the group's own handlers (yours runs first) rather than replacing them: those five open the collapsed-mode flyout, and overriding them would leave the subitems unreachable while the rail is collapsed. Pass **`end`** if you don't want the group counted as current on child routes — `to="/deals"` without it also matches `/deals/01K7…`, so opening one record auto-opens the saved-view list. **Collapsed, a linkable group has no chevron** — the single 56px target navigates on click and opens the flyout on hover/focus, and the flyout's header is a link to the same destination so the parent page stays reachable from inside the panel.

  ```tsx
  <Rail.Group as={NavLink} to="/deals" icon={<Handshake />} label="Deals">
    <Rail.Item as={NavLink} to="/deals?view=open">
      My open USD
    </Rail.Item>
  </Rail.Group>
  ```

- **`Rail.Spacer`** — `flex-grow: 1` filler that pushes trailing _sections_ (Settings, Help) to the bottom of the scrolling body. Not needed to pin the footer.
- **Scrolling** — everything before the first `Rail.Footer` renders in one scroll box; the Footer is extracted out of it and stays pinned on its own, no Spacer required. The box scrolls vertically only — the X axis is clipped, since the rail is fixed-width and labels are meant to clip as it collapses. **Collapsed, the scrollbar is hidden entirely** (`scrollbar-width: none`): a gutter is a quarter of the 56px rail's inner width and shifts every item pill off-center. Wheel/trackpad and scroll-into-view on Tab still scroll it; the bar returns when the rail expands.
- **i18n**: `rail.expand` / `rail.collapse` (toggle aria-label), `rail.navigation` (default `<nav>` aria-label), `rail.expandGroup` / `rail.collapseGroup` (prefix for a linkable group's chevron, interpolated with the group label).

#### When NOT to use

- ❌ Top-bar / horizontal nav — use a `<Cluster>` + `<Link>` row.
- ❌ A value picker (status, country) — use `<Select>`.
- ❌ A focus-locked dialog navigation — use `<Modal>` / `<Drawer>`.

#### Anti-patterns

- ❌ Forking width via inline style — rebind the `--rail-width-*` tokens in a parent stylesheet.
- ❌ Hand-rolling active-state styling. Set `aria-current="page"` on the rendered element (NavLink does this for you) and the CSS handles it.
- ❌ Multi-level group nesting (groups inside groups). v1 supports one level only.
- ❌ Adding a synthetic "All deals" first subitem so the parent list stays reachable — that's what `Rail.Group`'s `as` prop is for. Make the group itself the link.
- ❌ Putting an icon-less top-level item directly inside a section — when the rail collapses there's nothing visible. Items without icons belong inside a `<Rail.Group>`.

### `<TopBar>` — sticky application top bar

Horizontal app-chrome bar pinned to the top of the viewport. Compound API: `<TopBar.Start>` + `<TopBar.End>` for the two horizontal clusters, plus `<TopBar.Search>` (styled `<input type="search">` with a leading icon and an optional `<kbd>` hotkey hint) and `<TopBar.IconButton>` (icon-only ghost button with an optional notification-dot indicator).

```tsx
import { Avatar, TopBar } from '@eocrm/design-system';
import { Bell, Plus } from 'lucide-react';

<TopBar>
  <TopBar.Start>
    <TopBar.Search placeholder="Search contacts, deals…" hotkey="⌘K" />
  </TopBar.Start>
  <TopBar.End>
    <TopBar.IconButton aria-label="Create new">
      <Plus size={16} />
    </TopBar.IconButton>
    <TopBar.IconButton aria-label="Notifications, 3 unread" indicator>
      <Bell size={16} />
    </TopBar.IconButton>
    <Avatar name="Alex Rivera" size="sm" />
  </TopBar.End>
</TopBar>;
```

- **Compound API** — `TopBar.Start` / `TopBar.End` / `TopBar.Search` / `TopBar.IconButton`.
- **Layout-owning primitive (Hard rule 4 exception)** — like `<Modal>`, `<Drawer>`, `<Page>`, `<Rail>`, the bar owns its own height (56px), sticky positioning, padding, background, and bottom border because that IS its job as a top-bar chrome.
- **`as` prop** — `'header'` (default, carries the implicit `banner` landmark) or `'div'` (for nested toolbars where stacking two `<header>` landmarks would be wrong).
- **`<TopBar.Start>`** — flex-grows (`flex: 1`) so a sibling `<TopBar.End>` is pushed to the right edge with no spacer needed.
- **`<TopBar.End>`** — shrinks to its content. Use for trailing actions + avatar.
- **`<TopBar.Search>`** — a real `<input type="search">` (browsers expose `role="searchbox"`). `placeholder` is consumer-controlled. `aria-label` defaults to the placeholder, then to `t('topBar.search')`. The `hotkey` prop renders a trailing `<kbd>` hint — purely **visual**; binding ⌘K to focus is the consumer's responsibility. Spread `value` / `onChange` through normally — they reach the underlying input. The component sets `autoComplete="off"` plus `data-1p-ignore` / `data-lpignore` / `data-form-type="other"` so password managers and browser autofill skip it.
- **`<TopBar.IconButton>`** — wraps `<Button iconOnly variant="ghost" size="sm">` sized for the bar (32×32) plus an optional `indicator` boolean. The dot tone is `'danger'` by default; pick `'warning'` / `'info'` / `'accent'` for softer cues. **`aria-label` is required** — include count info there (`'Notifications, 3 unread'`); the dot itself is `aria-hidden`.
- **i18n**: `topBar.label` (default `<header>` aria-label), `topBar.search` (default `<input>` aria-label fallback).

#### When NOT to use

- ❌ Left-side navigation column — use `<Rail>`.
- ❌ Page-local heading + actions — use `<PageHeader>`, not a TopBar.
- ❌ Action toolbar attached to a specific section — use a `<Cluster>` inside that section; TopBar is for the application's top chrome.
- ❌ Command-palette experience — `<TopBar.Search>` is a plain text input. Compose `<Popover>` + `<OptionsPicker>` for typeahead / result lists.

#### Anti-patterns

- ❌ Wrapping the bar in another `position: sticky` container — the bar already sticks. Layered sticky parents stack at the wrong offset.
- ❌ Reaching for `<TopBar.IconButton>` outside the bar — it's a topbar-scoped size + indicator pattern. Use `<Button iconOnly variant="ghost">` for general icon buttons.
- ❌ Putting a `<Button variant="primary">` inside the bar — primary actions belong in the page body where they're discoverable; the topbar is for navigation, search, and global ambient actions only.
- ❌ Relying on the indicator dot to communicate count to assistive tech — the dot is decorative (`aria-hidden`); put the count in the `aria-label` instead.

### `<DropdownMenu>` — action menus from a trigger

```tsx
<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onSelect={edit}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={duplicate} shortcut="⌘D">
      Duplicate
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onSelect={remove} tone="danger">
      Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>
```

- Compound API: `<DropdownMenu>` is the provider; `<Trigger>` clones its single child to inject ARIA + handlers; `<Content>` portals to `document.body` and positions itself with Floating UI; `<Item>` renders a `menuitem`; `<Separator>` renders a divider.
- Trigger child must accept a ref via `forwardRef`. `<Button>` does.
- `<Item>` props: `onSelect` (required), `disabled`, `tone` (`'default'` | `'danger'`), `icon`, `shortcut`, `closeOnSelect` (default `true`; set to `false` when wrapping the Item in a `<Popover.Trigger>` or `<ConfirmationPopover>` — otherwise the menu close would unmount the popover before it can render).
- `<Content>` props: `side` (`'top'` | `'bottom'`, default `'bottom'`), `align` (`'start'` | `'center'` | `'end'`, default `'start'`), `sideOffset` (default `4`), `minWidth`.
- Keyboard: Enter/Space/ArrowDown on trigger opens with first item active; ArrowUp opens with last; Arrow/Home/End navigate skipping disabled and separators; Enter/Space activates; Escape closes and returns focus to trigger; Tab closes and returns focus to trigger (then continues normal traversal); typeahead jumps to first matching label (500ms debounce).
- Opens with a short scale-fade from the trigger side (140 ms `ease-out`). Closes instantly by design — menu close should feel like "get out of the way", not "play a transition". Respects `prefers-reduced-motion: reduce`.
- For value selection (pick a status, country, etc.), use `<Select>` (not yet shipped) — DropdownMenu is for actions, not form values.
- **Overlay host (like Popover).** A `DropdownMenu` content panel is also an overlay host: a `Popover` / `ConfirmationPopover` / `Select` / date-time popover (`DatePicker` / `DateRangePicker` / `TimeField`) opened from a `DropdownMenu.Item` auto-elevates to `--z-overlay-floating` (1190) so it floats above the menu (and above any Popover the menu itself lives in). Normal submenus are unaffected — they inherit the root trigger's overlay state.

#### v2 — submenus, checkboxes, radios, groups

```tsx
<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Filters</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Status</DropdownMenu.Label>
      <DropdownMenu.CheckboxItem checked={active} onCheckedChange={setActive}>
        Active
      </DropdownMenu.CheckboxItem>
      <DropdownMenu.CheckboxItem checked={pending} onCheckedChange={setPending}>
        Pending
      </DropdownMenu.CheckboxItem>
    </DropdownMenu.Group>

    <DropdownMenu.Separator />

    <DropdownMenu.Group>
      <DropdownMenu.Label>Sort by</DropdownMenu.Label>
      <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
        <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Group>

    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        <DropdownMenu.Item onSelect={exportCsv}>Export CSV</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={exportJson}>Export JSON</DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  </DropdownMenu.Content>
</DropdownMenu>
```

- `<CheckboxItem>` — `role="menuitemcheckbox"`, `aria-checked`. Default `closeOnSelect={false}` (multi-select friendly). Pass `closeOnSelect` to override. Checked items render an info-tinted row + 2px left accent (no glyph by default).
- `<RadioGroup>` + `<RadioItem>` — `role="radiogroup"` / `role="menuitemradio"`. Default `closeOnSelect={true}` (radio = the selection IS the action). Selected item gets the same info-tinted-row treatment as checked CheckboxItem.
- **Leading `icon` on `CheckboxItem` / `RadioItem`** (parity with `<Item icon>`) — pass a per-row glyph via the `icon` prop, **not** inlined into `children`. Typeahead derives its match string from the string children, so an inlined leading icon leaves the JSX whitespace `" "` as the first string child and kills first-letter type-to-select; the `icon` prop keeps the typeahead label the pure string. Mark the glyph `aria-hidden`. `icon={<Moon size={14} aria-hidden />}`.
- `<Group>` + `<Label>` — wrap a section. Group is `role="group"` with `aria-labelledby` to the Label. Label outside Group still renders, no aria wiring.
- `<Sub>` + `<SubTrigger>` + `<SubContent>` — nested menu. SubTrigger registers in the parent menu; SubContent is its own portaled panel. Opens on click, hover (100ms delay), Enter, or ArrowRight. Closes on ArrowLeft (level-only), Escape (level-only), click-outside (all levels), or selecting an item with `closeOnSelect=true` (all levels — cascading close).
- `<ItemIndicator>` — optional slot child of CheckboxItem/RadioItem that adds a custom indicator glyph alongside the tinted-row treatment. Omit entirely when the row tint is sufficient (the common case). Detection is shallow: must be a direct child.
- Per WAI-ARIA, mixing CheckboxItem and RadioItem in the same RadioGroup is invalid; CheckboxItems live outside RadioGroup.

### `<Tooltip>` — small floating label on hover / keyboard focus

```tsx
<Tooltip content="Save the record (⌘S)">
  <Button onClick={save}>Save</Button>
</Tooltip>

<Tooltip content="Filter">
  <Button variant="ghost" aria-label="Filter">⏷</Button>
</Tooltip>

<Tooltip content={<>Save&nbsp;<kbd>⌘S</kbd></>}>
  <Button>Save</Button>
</Tooltip>
```

- Wrapper API: `<Tooltip content="…">` cloneElement's its single child to inject the ref, listeners (`pointerenter` / `pointerleave` / `focus` / `blur`), and `aria-describedby`. Child must accept a ref — `<Button>` qualifies, as does a raw `<button>`.
- Trigger MUST already have its own accessible name (visible text or `aria-label`). Tooltip is _supplementary description_ via `aria-describedby` — never the label.
- `content` prop: `ReactNode`. If `null` / `undefined` / `''`, the trigger renders as-is with no listeners and no aria. Useful for conditional UIs.
- `side` (`'top'` default) / `align` (`'center'` default) / `sideOffset` (default `6`) — Floating UI auto-flips on collision.
- `delay` — ms before hover opens. Default `400`. Keyboard focus is always immediate (a11y); close is always immediate.
- `open` / `onOpenChange` / `defaultOpen` — controlled mode, same shape as DropdownMenu.
- Dismissal: `pointerleave`, `blur`, document `pointerdown`, `Escape`. Tooltip never owns focus. On `Escape` (WCAG 1.4.13) the tooltip registers as a floating surface, so inside a `Modal`/`Drawer` the dismiss press closes only the tooltip — the host survives; the next `Escape` closes the host.
- Touch devices: no tap-to-open. Tooltips are progressive enhancement for pointer + keyboard users; rely on the trigger's accessible name on touch.
- Opens with a short scale-fade (140 ms) from the trigger side. Closes instantly. Respects `prefers-reduced-motion: reduce`.
- Z-layer `--z-tooltip: 1300` is above modal and toast, so tooltips inside any host UI remain visible.

### `<Popover>` — non-modal floating panel for interactive content

```tsx
<Popover>
  <Popover.Trigger>
    <Button variant="secondary">Filters</Button>
  </Popover.Trigger>
  <Popover.Content>
    <Stack gap="sm">
      <Popover.Heading>Filter results</Popover.Heading>
      {/* …form controls… */}
      <Cluster justify="end" gap="sm">
        <Popover.Close>
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
        </Popover.Close>
        <Popover.Close>
          <Button size="sm" onClick={apply}>
            Apply
          </Button>
        </Popover.Close>
      </Cluster>
    </Stack>
  </Popover.Content>
</Popover>
```

- Compound API: `<Popover>` is the provider; `<Popover.Trigger>` clones its single child to inject ARIA + click; `<Popover.Content>` portals to `document.body` and positions via Floating UI; `<Popover.Heading>` (optional) wires `aria-labelledby`; `<Popover.Close>` clones its child to inject a close-onClick.
- `<Popover.Anchor>` positions Content against its child by injecting ONLY the floating ref — no `onClick`, no keyboard handler, and no `aria-haspopup`/`aria-expanded`/`aria-controls`. Use it (instead of `Popover.Trigger`) for a CONTROLLED popover whose anchor already owns its own toggle + ARIA — e.g. an interactive `FilterChip` whose body `<button>` self-manages `aria-haspopup`/`aria-expanded` via `onActivate`/`expanded`; wrapping it in `Popover.Trigger` would redundantly stamp that ARIA onto the chip's `role="group"` root, whereas `Popover.Anchor` leaves the ARIA solely on the body button.
- Trigger child must accept a ref (`forwardRef`). `<Button>` does.
- **Non-modal**: focus moves to the panel on open; Tab traverses INTO content, then OUT to the page behind. Click-outside or Escape dismisses. Page is NOT inert.
- `<Popover.Content>` props: `side` (`'top'` | `'right'` | `'bottom'` | `'left'`, default `'bottom'`), `align` (default `'center'`), `sideOffset` (default `10`), `minWidth`, `maxWidth` (overrides the default 360px cap — pass a px number, a CSS length, `'fit-content'`, or `'none'` for wide content like calendars/tables).
- `<Popover.Heading>` props: `as` (`'h2'` – `'h6'`, default `'h3'`).
- Opens with a short scale-fade from the trigger side (140ms). Closes instantly. Respects `prefers-reduced-motion: reduce`.
- **From a DropdownMenu item.** Wrap a `<DropdownMenu.Item closeOnSelect={false}>` as the `<Popover.Trigger>` child — the Item itself becomes the trigger, so the full highlighted row opens the popover. `closeOnSelect={false}` keeps the menu open while the popover is shown.
- Z-layer `--z-popover: 1050` — above dropdown, below modal/toast/tooltip.
- **Overlay host for nested floating surfaces.** A `Popover.Content` (and a `DropdownMenu` content panel) acts as an overlay host: any floating surface (`DropdownMenu` / `Popover` / `ConfirmationPopover` / `Select` / `DatePicker` / `DateRangePicker` / `TimeField` / the `Rail.Group` flyout) whose trigger sits inside it auto-elevates to `--z-overlay-floating` (1190), so a kebab menu, nested popover, or confirm dialog opened from within a Popover panel stacks ABOVE the panel instead of rendering behind it. No prop needed — it keys off the existing `[data-popover-content]` / `[data-dropdown-menu-content]` markers, plus `[data-in-overlay]` itself (elevation is transitive: a surface nested inside an elevated surface elevates too). The Popover also won't dismiss itself when you interact with such a nested surface (its content portals to `document.body`, so a click inside it would otherwise read as "outside") — so a kebab menu item or its confirm dialog stays usable without collapsing the host.
- **Escape is innermost-first across nested surfaces (#280).** When one floating surface is open inside another — a `Select` listbox inside a `Popover`, a `ConfirmationPopover` opened from a `DropdownMenu` item, etc. — the first `Escape` closes only the **innermost** surface; the outer one (and any host `Modal`/`Drawer`) survives that press. Each press peels exactly one layer. Surfaces coordinate via the shared overlay registry (`isTopFloating`) — the most-recently-opened is innermost — so no per-pair wiring is needed.
- For passive hover/focus hints → `<Tooltip>`. For lists of actions → `<DropdownMenu>`. For focus-locked dialogs → `<Modal>`.

### `<ToastViewport>` + `toast` — transient notifications

Imperative singleton + one portal. Fire from anywhere; no provider, no hook.

```tsx
import { ToastViewport, toast } from '@eocrm/design-system';

// Mount once at app root
<ToastViewport position="bottom-right" />;

// Fire from anywhere
toast.success('Saved');
toast.error('Request failed', { description: err.message });
toast.success('Item deleted', { action: { label: 'Undo', onClick: restore } });

// Async sugar
toast.promise(api.upload(file), {
  loading: 'Uploading…',
  success: (r) => `Uploaded ${r.name}`,
  error: (e) => `Failed: ${e.message}`,
});

// Update in place
const id = toast.loading('Saving…');
await api.save();
toast.success('Saved', { id });
```

- **One viewport.** Mount exactly one `<ToastViewport>` at the app root. A second one logs a dev-warning and renders null.
- **Five tones.** `info`, `success`, `warning`, `error`, `loading`. `error` is `role="alert"` (assertive); the rest are `role="status"` (polite).
- **Auto-dismiss defaults to 4000ms.** Per-call `duration` (ms or `'persistent'`). `loading` defaults to `'persistent'`.
- **Pause on hover / focus / hidden tab.** Hovering the toast or tabbing into its action pauses the timer; document `visibilitychange` to `hidden` pauses all timers globally.
- **maxVisible: 3 default.** Toasts beyond render as peek-collapsed cards behind the visible stack; hovering the stack fans them out. `expand: true` keeps the stack always fanned.
- **All 6 positions supported** via `<ToastViewport position="…">`. Per-call `position` override exists as an escape hatch but a single global position is the recommended UX.

#### When NOT to use

- ❌ For form validation feedback under the field. That's inline error text, not a toast.
- ❌ For destructive confirmations. Use `<ConfirmationPopover>` or `<Modal>` — the user needs an explicit yes/no decision, not a transient banner.
- ❌ For long-form messages. Toasts are 1–2 lines. If you need more, link to a page from the description.
- ❌ As a substitute for in-page progress UI. A toast can announce "Upload started" but the persistent progress bar belongs in the page.

### `<Alert>` — persistent in-flow notification

Tone-driven banner for messages that need to stay visible while the user reads the page (subscription warnings, save failures, "update available" notices). Complements `<Toast>` (transient).

```tsx
import { Alert } from '@eocrm/design-system';

// Basic
<Alert tone="info" title="Synced 5 minutes ago" />
<Alert tone="warning">Your storage is at 85% capacity.</Alert>

// With actions
<Alert tone="warning" title="Update available" actions={<Button size="sm">Reload</Button>}>
  A new version is ready. Reload to apply.
</Alert>

// Dismissible (controlled by consumer)
const [show, setShow] = useState(true);
{show && (
  <Alert tone="success" onDismiss={() => setShow(false)}>
    Changes saved.
  </Alert>
)}
```

- **Four tones** (`info` / `success` / `warning` / `error`). Default icon + accent stripe per tone.
- **`role="alert"`** only for `error` (assertive, interrupts SR). Others use `role="status"` (polite).
- **Persistent** — no auto-dismiss. Use Toast for transient messages.
- **Controlled dismiss** — `onDismiss` callback fires on × click; consumer hides via conditional render.
- **`icon={null}`** suppresses the icon entirely; any ReactNode overrides the default.

#### When NOT to use

- ❌ Transient confirmations → `<Toast>` / `toast.success(...)`.
- ❌ Empty-state placeholders ("No deals yet") → `<EmptyState>`.
- ❌ Form-field validation messages → inline error text + `aria-describedby`.
- ❌ Destructive confirmations needing yes/no → `<ConfirmationPopover>` or `<Modal>`.

#### Anti-patterns

- ❌ Auto-dismissing the Alert with a `setTimeout` — that's what Toast is for.
- ❌ Using `tone="error"` for non-critical warnings. Reserve `error` for genuine failures.
- ❌ Multiple stacked Alerts above a page — pick one (most urgent tone) or compose into the page layout with explicit hierarchy.

### `<ConfirmationPopover>` — opinionated "Are you sure?" preset

```tsx
<ConfirmationPopover
  title="Delete record?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={async () => {
    await api.deleteRecord(id);
  }}
>
  <Button variant="danger">Delete</Button>
</ConfirmationPopover>
```

- Built on top of `<Popover>`. Declarative: `title` / `description` / `confirmLabel` / `cancelLabel` / `variant` / `onConfirm` / `onCancel`.
- `variant`: `'default'` (Confirm is primary) | `'danger'` (Confirm is danger).
- **Initial focus on Cancel** for both variants — keyboard Enter never accidentally confirms. Tab once to Confirm.
- **`initialFocusRef`** (`RefObject<HTMLElement | null>`) overrides the Cancel default: directs initial focus into the `description` content instead — e.g. an `<Input>` rendered there for a rename flow. The component focuses `initialFocusRef.current` after the panel mounts (mirrors `<Modal>`'s `initialFocusRef`). Tip: add `onFocus={(e) => e.currentTarget.select()}` to a text input so its contents are selected on open and the user can type a replacement immediately.
- **Async-aware** `onConfirm`. May return a Promise. While pending, both buttons disable, Confirm shows a spinner, and Escape / click-outside are blocked.
- **Failure mode**: on reject, popover stays open and buttons re-enable. Consumer surfaces the error externally — ConfirmationPopover does NOT render inline errors.
- Anchors above the trigger by default (`side="top"`).
- **From a DropdownMenu item (kebab Delete pattern).** Wrap a `<DropdownMenu.Item closeOnSelect={false}>` as the trigger — clicking anywhere on the row opens the confirmation. The menu stays open until the user dismisses it (Escape or click outside). To close the menu after the action resolves, drive `DropdownMenu`'s `open` state externally and call `setMenuOpen(false)` inside `onConfirm`.

### `<Modal>` — focus-locked dialog

```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Edit contact</Button>

<Modal open={open} onOpenChange={setOpen} size="md">
  <Modal.Header>Edit contact</Modal.Header>
  <Modal.Body>
    <Stack gap="md">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
    </Stack>
  </Modal.Body>
  <Modal.Footer>
    <Modal.Close><Button variant="secondary">Cancel</Button></Modal.Close>
    <Button onClick={save}>Save</Button>
  </Modal.Footer>
</Modal>
```

- **Controlled-only.** Pass `open` + `onOpenChange` always. There is no `<Modal.Trigger>` — wire your own button(s).
- **Three sizes:** `sm` (400px), `md` (560px, default), `lg` (800px). Below 640px the modal goes fullscreen.
- **Overlay variant:** `overlay="solid"` (default, dark dim) or `overlay="blur"` (frosted-glass effect — light tint + `backdrop-filter: blur(4px)`). Avoid stacking three blurred modals — extra compositor cost per layer.
- **`<Modal.Header>` auto-wires `aria-labelledby`.** Pass `closeButton={false}` to hide the built-in × button (e.g. forced-step modals). The Header's children become the dialog title.
- **`<Modal.Body>` scrolls** when content overflows. `padding="none"` for edge-to-edge children (e.g. a tabs strip).
- **`<Modal.Footer>` defaults to right-aligned actions.** Use `align="space-between"` to split a danger action away from save/cancel.
- **`<Modal.Close>`** wraps a clickable child and fires `onOpenChange(false)` on click. Chains with the child's existing `onClick`.
- **Forced step:** combine `disableEscapeClose`, `dismissOnOverlayClick={false}`, omit `<Modal.Close>`, and pass `<Modal.Header closeButton={false}>` to lock the user into the modal until they resolve it programmatically.
- **Stacked modals.** Default `stackMode="overlay"`: the parent stays visible underneath and the inner overlay paints transparent so the parent's dim shows through (one effective dim layer for the stack). Use `stackMode="replace"` to hide the parent via `display: none` (React state preserved) — best for forced steps where the parent context is irrelevant. Escape still closes only the topmost — and yields to any open floating surface first (Select/Popover/menu/date-time popover: the first press closes the surface, the next closes the modal); body scroll stays locked across the whole stack.
- **Initial focus:** pass `initialFocusRef` to focus a specific element (e.g. the first input). Otherwise the dialog container receives focus and the focus trap takes over.

**Anti-patterns:**

- ❌ Rendering a Modal as a child of another component that itself uses `position: fixed` — the portal escapes that container anyway, so the fixed positioning is dead code. Just render `<Modal>` at any level; it portals to `document.body`.
- ❌ Calling `onOpenChange={() => {}}` AND providing `<Modal.Close>` — the Close button calls `onOpenChange(false)` which then no-ops. Use `disableEscapeClose + dismissOnOverlayClick={false}` + omit Close for forced steps.
- ❌ Mutating an `initialFocusRef.current` value after open — Modal reads the ref when the modal opens AND whenever it becomes the top of the stack again (e.g., after a nested modal closes). Don't rely on a specific number of reads; instead, ensure the ref points at a stable element while the modal is open.
- ❌ Using `<Modal>` for popovers or non-blocking notifications. Use `<Popover>`, `<DropdownMenu>`, or wait for `<Toast>`.

**See also:** `<Drawer>` for edge-anchored variant.

### `<Lightbox>` — full-screen image & document gallery overlay

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

- Each `LightboxItem` is `{ src, alt, kind?, caption?, thumbnail? }` — `alt` is required.
- `items` accept `kind: 'pdf'` (or a `.pdf` src) → rendered in an `<iframe>` with a download action; mixed image+PDF galleries supported. A PDF without a `thumbnail` shows a document-icon placeholder in the strip; unsafe (non-http(s)) doc srcs show a "Preview unavailable" message.
- Single item → chevrons, counter, and strip auto-hide. Empty `items` → renders nothing.
- Reuses the DS overlay machinery (focus-trap, scroll-lock, Esc — yielding to open floating surfaces first like Modal/Drawer, stacking above modals).

### `<Drawer>` — edge-anchored slide-in panel

```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Show filters</Button>

<Drawer open={open} onOpenChange={setOpen} side="right" size="md">
  <Drawer.Header>Filters</Drawer.Header>
  <Drawer.Body>
    <Stack gap="md">
      <Input label="Name" value={...} onChange={...} />
    </Stack>
  </Drawer.Body>
  <Drawer.Footer>
    <Drawer.Close><Button variant="secondary">Cancel</Button></Drawer.Close>
    <Button onClick={apply}>Apply</Button>
  </Drawer.Footer>
</Drawer>
```

- **Controlled-only.** `open` + `onOpenChange` always.
- **Four sides:** `left`, `right` (default), `top`, `bottom`. Each slides in from its edge.
- **Three sizes:** `sm` (320px), `md` (440px, default), `lg` (640px). Capped to `viewport - 32px` on narrow viewports; always edge-anchored, never fullscreen.
- **Drag-to-close** on mobile: swipe the Header in the dismiss direction (right drawer → swipe right, bottom → swipe down, etc.). Threshold: 40% of drawer size or 0.5 px/ms velocity. Opt out with `dragToClose={false}`.
- **Overlay variants:** `overlay="solid"` (default) or `overlay="blur"` (frosted-glass with `backdrop-filter: blur(4px)`).
- **Stacks with Modal.** Both share one overlay registry — a Drawer can open from inside a Modal (and vice versa). Escape closes the topmost regardless of type — after yielding to any open floating surface (innermost-first: the first press closes the surface, the next closes the host); body scroll lock is shared.
- **Forced step:** combine `disableEscapeClose + dismissOnOverlayClick={false} + dragToClose={false}` + `<Drawer.Header closeButton={false}>` + omit `<Drawer.Close>`.

**Anti-patterns:**

- ❌ Same-side stacked drawers as a navigation pattern. They visually overlap — use route changes instead.
- ❌ Drag from inside `<Drawer.Body>` does not close the drawer. Only Header is draggable (so Body scroll works correctly).
- ❌ For center-anchored dialogs, use `<Modal>` not Drawer.

**See also:** `<Modal>` for center-anchored variant.

### `<Select>` — value picker (single, multi, searchable, async, creatable)

```tsx
// Form field — single:
<Select
  options={statuses}
  value={status}
  onChange={(v) => setStatus(v as Status)}
  placeholder="Pick a status"
/>

// Table filter — multi, summary:
<Select
  multiple
  triggerDisplay="summary"
  searchable
  options={owners}
  value={selectedOwners}
  onChange={(v) => setSelectedOwners(v as string[])}
  placeholder="Filter by owner"
/>

// Tag input — multi, chips, creatable:
<Select
  multiple
  searchable
  creatable
  options={existingTags}
  value={tags}
  onChange={(v) => setTags(v as string[])}
  onCreate={api.tags.create}
  placeholder="Add tags…"
/>

// Async with custom row render:
<Select
  searchable
  loadOptions={async (q, signal) => {
    const users = await api.searchUsers(q, { signal });
    return users.map((u) => ({ value: u.id, label: u.name, data: u }));
  }}
  renderOption={(opt) => (
    <Cluster gap="sm">
      <Avatar name={opt.label} src={opt.data?.avatarUrl} size="sm" />
      <span>{opt.label}</span>
    </Cluster>
  )}
  value={assigneeId}
  onChange={(id) => setAssigneeId(id as string)}
/>
```

- One generalist; the mode matrix is `multiple` × `triggerDisplay: 'chips' | 'summary'` × `searchable`. See the JSDoc on `<Select>` for the matrix and anti-patterns.
- `triggerDisplay` defaults to `'chips'` when `multiple` is set. Use `'summary'` for table-filter UIs where chips would crowd the toolbar.
- **Async**: pass `loadOptions(query, signal)`. Debounce (250ms default, configurable via `searchDebounceMs`) and `AbortSignal` cancellation are built-in. Do NOT debounce externally.
- **Tag input pattern** = `multiple + searchable + creatable + triggerDisplay='chips'`. There is no separate `<Tags>` component.
- **Form integration**: pass `name` (and `required`/`form` if needed). Hidden inputs render so `new FormData(form)` works. Multi mode renders one hidden input per selected value; `FormData.getAll(name)` returns the array.
- **`clearable`** is opt-in (default `false`) — pass it to show the ✕ clear button once there's a value. Always suppressed when `disabled`/`readOnly`.
- **`onChange` signature** is `(value, option | options | null)` — the second arg is the matched option(s), saving you a lookup.
- **Render escape hatches**: `renderOption`, `renderValue`, `renderTag`, `renderEmpty`, `renderLoading`, `renderError`. Use when defaults don't suffice; default rendering is always token-correct.
- For **action menus** (Edit/Delete/Duplicate buttons), use `<DropdownMenu>` — Select is for value selection, not actions.
- For **free-form text**, use `<Input>`. Select always picks from a (possibly async) set.
- Don't reach for `triggerDisplay='summary'` for tag input — chips communicate the active filter set at a glance.
- `creatable` requires `searchable` (throws in dev). Passing both `options` and `loadOptions` is also flagged (loadOptions wins).

### `<OptionsPicker>` — filter picker (multi/single, grouped, searchable)

**Use for filter UX, not form fields.** A compound picker that opens a Popover
with a search input and grouped/flat checkbox (multi) or radio (single) options.
Multi mode buffers a draft until Apply; single mode commits per click.

```tsx
<OptionsPicker selected={events} onApply={setEvents}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">
      Events <ChevronDown size={14} />
    </Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content
    label="Filter events"
    groups={catalogGroups} // OR `options={flatOptions}` — XOR
  />
</OptionsPicker>
```

`mode="single"` for single-select: `selected: string | null`, `onApply(value | null)`, no Apply/Cancel footer.

Don't use for form selects (use `<Select>`), action menus (use `<DropdownMenu>`),
or single boolean toggles (use `<Checkbox>` or `<Switch>`).

### `<EmojiPicker>` — searchable emoji grid (reactions + input)

**Use to let the user pick an emoji** — a reaction chip, an inline insert into a
message/comment. Searchable, category-sectioned, keyboard-navigable 8-column grid
over a **curated common set** (not the full ~1900-emoji Unicode catalog;
skin-tone / ZWJ variants are out). It's the chooser only — calls
`onSelect(emoji: string)` on click or Enter/Space; it has no notion of which
emoji are already chosen or their counts. The bare picker is a surface — pair it
with a `Popover` (or use `EmojiPickerPopover`).

```tsx
// Inside a Popover you control (e.g. an "add reaction" button on a comment):
<Popover>
  <Popover.Trigger>
    <Button iconOnly variant="ghost" aria-label="Add reaction">
      <Smile size={16} />
    </Button>
  </Popover.Trigger>
  <Popover.Content>
    <EmojiPicker onSelect={(emoji) => addReaction(emoji)} />
  </Popover.Content>
</Popover>

// Batteries-included wrapper — owns the Popover, closes on select:
<EmojiPickerPopover
  trigger={<Button variant="secondary" size="sm">Add reaction</Button>}
  onSelect={(emoji) => appendToDraft(emoji)}
/>
```

`EmojiPickerPopover` takes `trigger` + `onSelect`, plus the standard
controlled-open contract (`open` / `onOpenChange` / `defaultOpen`).

`recent?: string[]` (on both) pins a "Recently used" section at the top (shown only
while not searching). The consumer owns persistence — keep the list (e.g.
localStorage), update it in `onSelect` (move-to-front + de-dupe + cap), pass it back.

**When NOT to use:** a small fixed reaction set (👍 ❤️ 🎉) → render a `Cluster`
of `Button`s; a searchable grid is overkill for 3-6 choices. Also not for inline
`:smile`-style autocomplete (the editor's suggestion engine owns that) or for
rendering existing reaction counts (the consumer builds that display).

### `<EmptyState>` — "nothing here" container

```tsx
<EmptyState
  icon={<Inbox size={32} />}
  title="No contacts yet"
  description="Add your first contact to get started."
  actions={<Button>Add contact</Button>}
/>
```

- Four slots: `icon` (optional ReactNode), `title` (required ReactNode), `description` (optional), `actions` (optional). Stacked vertically.
- `title` renders as a semantic heading — default `<h3>`. Override via `headingLevel: 1–6` (clamped) when the empty state lives at a different heading depth.
- Three sizes — `sm` (inline / popover empties), `md` (card / section default), `lg` (hero / full-page).
- `align`: `'center'` (default) / `'start'` for tight-column use.
- Use `<Skeleton>` for **loading** states — EmptyState implies "nothing here," not "data on its way."
- No `variant="error"` — error treatments need different a11y (live regions, retry actions). Use a future `<Alert>` or render a danger-tinted EmptyState with your own error message.
- No automatic `aria-hidden` on the icon — consumer's icon may be semantic (e.g., a country-flag icon in a "No results for this region" state). If the icon is purely decorative, the consumer should pass `aria-hidden`.
- The wrapper `<section>` only becomes a screen-reader landmark when it has an accessible name — pass `aria-label` (or `aria-labelledby`) when the empty state should be navigable as a region (typically when it IS the page's primary content with `headingLevel={1 | 2}`).

### `<ErrorState>` — page-level status / result screen

```tsx
// 404 — neutral
<ErrorState
  icon={<Compass size={48} aria-hidden="true" />}
  title="Page not found"
  description="The page you're looking for doesn't exist or has been moved."
  actions={<Button>Go to homepage</Button>}
/>

// Error-boundary fallback — danger tone → role="alert"
<ErrorState
  tone="danger"
  icon={<TriangleAlert size={48} aria-hidden="true" />}
  title="Something went wrong"
  actions={<Button>Try again</Button>}
  extra={<Text size="sm" tone="muted">Error ID: a1b2-c3d4</Text>}
/>
```

- Page-level sibling of `<EmptyState>` — the component EmptyState's docs point to for "page-level 404 / 500" and danger-tinted error states. Use `<EmptyState>` for "nothing here" inside a surface; use `<Alert tone="error">` for an in-flow banner.
- Slots: `icon`, `title` (required, semantic heading), `description`, `actions`, and `extra` (below the actions — error ID, status link).
- `tone`: `'neutral'` (default — 404; muted icon) / `'danger'` (error; red icon + `role="alert"` on the wrapper so a boundary fallback announces on mount, overridable via `role`).
- `size`: `sm` / `md` / `lg` (**default** — full-page hero). `align`: `'center'` (default) / `'start'`.
- `headingLevel` defaults to `1` (the page h1); lower it when nested. Values outside 1–6 clamp to 1.
- `tone="danger"` makes the wrapper `role="alert"` (announces the whole subtree assertively on mount — ideal for an error-boundary fallback). For a _standalone_ error page, pass `role={undefined}` so it isn't read as a wall of text on load. Override via `role`.
- For `tone="neutral"`, the `<section>` is not a screen-reader landmark unless it has an accessible name — pass `aria-label` / `aria-labelledby` when it IS the page's primary region (typical for a full-page 404).
- No automatic `aria-hidden` on the icon — pass `aria-hidden="true"` for a decorative icon. No i18n — all copy is consumer-supplied.

### `<IconTile>` — palette-colored icon frame

```tsx
<IconTile color="blue" icon={<Zap size={16} />} />
<IconTile color="amber" shape="circle" icon={<MailPlus size={14} />} />
<IconTile color="green" label="Verified" icon={<Check size={16} />} />
```

- A small decorative tile framing one icon, tinted by a **Palette** `color` (one of the 30 categorical colors; default `'slate'`). For a person use `<Avatar>`; for text/status use `<Badge>`.
- `icon` (required ReactNode — you size it). `size`: `sm` 24 / `md` 32 (default) / `lg` 40 px (sizes the tile, not the icon). `shape`: `square` (default) / `circle`.
- Color is categorical (visual identity), **not** semantic — use `<Badge tone>` for status.
- A11y: decorative by default (`aria-hidden`); pass `label` to make it `role="img"` + `aria-label` when the icon is the only indicator.

### `<Progress>` — linear progress bar

```tsx
<Progress value={45} />                            // 45% determinate
<Progress value={67} label />                      // shows "67%" on the right
<Progress value={85} tone="warning" label />       // amber fill (state coding)
<Progress />                                       // value omitted = indeterminate slide
<Progress value={3} max={10} label={`3 of 10`} />  // custom label slot
```

- `value?: number` — omit for indeterminate. NaN, Infinity, and `max <= 0` also fall back to indeterminate (defensive guard for file-upload race conditions where `bytes_uploaded / total_bytes` produces NaN before the total is known). Visual fill is clamped to [0%, 100%]; ARIA reports the raw value for SR debug visibility.
- `max?: number` — default `100`. Use `max={1}` for fraction values, `max={10}` for count-style "3 of 10" semantics.
- `size`: `sm` (4px) / `md` (8px, default) / `lg` (12px) — track height.
- `tone`: `default | success | warning | danger`. Applies to determinate only; indeterminate is always accent (state-color semantics don't apply to an unknown total).
- `label`: `false | true | ReactNode`. `true` shows `{n}%` (auto-suppressed when indeterminate); ReactNode renders in both modes (`label="Loading…"` is the canonical "indeterminate + text" pattern).
- `role="progressbar"` is locked — `Omit<HTMLAttributes, 'role'>` prevents the consumer from overriding it.
- Indeterminate `aria-valuetext` falls back to consumer-passed `aria-label`, then to `"Loading…"`.

### `<CircularProgress>` — circular progress / spinner

```tsx
<CircularProgress value={45} />                    // donut, 32px default
<CircularProgress value={75} label />              // centered "75%"
<CircularProgress />                               // indeterminate spinner (the "Loader" use case)
<CircularProgress size="sm" />                     // 16px inline spinner next to a button
<CircularProgress tone="success" value={100} />    // green full circle
```

- Same prop vocabulary as `<Progress>` — `value?`, `max?`, `size`, `tone`, `label`.
- Same NaN/Infinity/max<=0 indeterminate fallback as `<Progress>`.
- `size`: `sm` (16px / 2px stroke) / `md` (32px / 3px stroke, default) / `lg` (56px / 4px stroke).
- Built as inline `<svg viewBox="0 0 36 36">` with two `<circle>` elements (track + fill). Determinate arc is driven by `stroke-dashoffset`; indeterminate is a CSS `rotate` animation on a partial arc.
- Centered `label` auto-suppressed at `size="sm"` (no room for text) AND when `label=true` on indeterminate. ReactNode labels still suppress at `size="sm"` regardless.
- `prefers-reduced-motion` disables the spin animation and shows a static accent ring.

### Progress hard rule

- ❌ Hand-rolled `<div style={{ width: '${n}%', background: '#xxx' }}>` progress bars — use `<Progress value={n}>`.
- ❌ Hand-rolled spinning `<svg>` per page (every Saving-state, every loader). Use `<CircularProgress />` indeterminate.
- ❌ `<Progress tone="success" value={100}>` or `<Progress tone="success" />` to "celebrate" completion. Tones communicate STATE during progress (warning at 85%, danger at 95%), not success-on-done. A finished bar is just a finished bar — leave the default tone.
- ❌ `<CircularProgress value={0}>` to render an empty circle for "not started yet." `value={0}` is determinate (0% done). The intent is usually indeterminate — omit `value` entirely.

### `<Skeleton>` — loading placeholder

```tsx
<Skeleton width={120} />                                    // text line
<Skeleton variant="circular" width={32} />                  // avatar
<Skeleton variant="rectangular" width="100%" height={120} /> // image
```

- Three variants: `text` (default, inline, `height=1em`), `circular` (avatar / icon, square when only one dim set), `rectangular` (image / card / button, block).
- `width` / `height` flow to inline style — `number` becomes `px`, `string` passes through (`'60%'`, `'12rem'`).
- `animation`: `'pulse'` (default, opacity cycle) / `'none'` (static).
- Pulse is **automatically suppressed** when the user has `prefers-reduced-motion: reduce`.
- `aria-hidden='true'` by default — Skeleton is decorative. Communicate "loading" from a parent live region (e.g., `aria-busy='true'` on the section being filled).
- Composes — for a list-row placeholder, render `<Skeleton variant='circular' />` + 2–3 text skeletons + a button-shaped rectangular in a Cluster.
- Use `<EmptyState>` for "nothing here yet" — Skeleton implies "loading," not "empty."

### `<Image>` — image with loading + error states

```tsx
<Image src={url} alt="Quarterly revenue chart" aspectRatio="16 / 9" />
```

Robust `<img>`: `Skeleton` while loading, fade-in on load, compact `ImageOff` error
placeholder with a retry button on failure.

- `src` / `alt` — required (`alt=""` for decorative).
- `objectFit`: `cover` (default) | `contain` | `fill` | `none` | `scale-down`.
- `aspectRatio`: number (`1.5`) or string (`'16 / 9'`) — reserves the box, no layout shift.
- `size`: `xs` (20) | `sm` (24) | `md` (32) | `lg` (40 px) — fixed **square** box from the `--size-*` scale instead of `width:100%` (dense table-cell thumbnails; won't squish in a flex row). Omit for responsive. Overrides `aspectRatio`.
- `radius`: `none` | `sm` | `md` (default) | `lg` | `full`.
- `fallback` — custom node shown on error instead of the default placeholder.
- `loading` defaults to `'lazy'`; `ref` → the `<img>`; `className`/`style` → the wrapper box.

**When NOT to use:** circular avatars → `<Avatar>`; crop/zoom UI → `<ImageCrop>`; CSS
backgrounds → `background-image`; icons → lucide / inline SVG.

**Interactive (flush click target):** set `interactive` (or just `onClick`) to render the image inside a chromeless `<button>` (no padding/border/background; DS focus ring on `:focus-visible`) — a thumbnail that opens a preview/lightbox on click/Enter/Space. `ariaLabel` names the trigger (defaults to `alt`). The broken-image error state is non-interactive (its retry control takes over); `ref` still forwards to the `<img>`.

```tsx
<Image
  src={att.url}
  alt={att.filename}
  size="lg"
  objectFit="cover"
  onClick={() => openPreview(att)}
  ariaLabel={`Preview ${att.filename}`}
/>
```

### `<MediaTile>` — media tile with revealed overlay bars

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

### `<Table>` — tabular data primitive

```tsx
<Table>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Name</Table.HeaderCell>
      <Table.HeaderCell align="end">Amount</Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {rows.map((r) => (
      <Table.Row key={r.id}>
        <Table.Cell>{r.name}</Table.Cell>
        <Table.Cell align="end">{r.amount}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

- Compound subcomponents: `Table`, `Table.Caption`, `Table.Header`, `Table.Body`, `Table.Footer`, `Table.Row`, `Table.HeaderCell`, `Table.Cell`. Renders native `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>` / `<tfoot>` / `<caption>` — no ARIA-on-divs.
- Visual modifiers on root: `density` (`'comfortable'` (default, 32px row) / `'dense'` (24px)), `hover` (default off — opt in for clickable / selectable row lists), `striped`, `bordered` (full-grid borders; default off — Atlassian-minimal style is just row dividers + header underline), `stickyHeader`, `scroll` (default `true` — wraps in `overflow-x: auto`).
- `<Table.Row selected>` paints a tinted bg + `aria-selected="true"`. Selection state itself is the consumer's job.
- `<Table.HeaderCell sortDirection>` is a visual hook: renders an up / down / unsorted chevron + sets `aria-sort`. Wire `onClick` to your own sort state. `<DataTable>` (not yet shipped) will compose this seam.
- `<Table.Cell align>` / `<Table.HeaderCell align>`: `'start' | 'center' | 'end'` (CSS logical, RTL-friendly). Right-aligned headers auto-flip the sort chevron to the start side.
- `<Table.Cell truncate>` ellipses overflow text on one line. Requires a constrained cell width (`style={{ maxWidth }}` or `<col>`).
- **`colSpan` / `rowSpan`** flow through to the native `<th>` / `<td>` via spread. Use for multi-row grouped headers (`rowSpan` on a corner cell + `colSpan` on group cells over a second `<Table.Row>`), category-grouped body rows (`rowSpan` on a leftmost cell), and footer total rows (`<Table.Cell colSpan={n}>Total</Table.Cell>`). Use `<Table.HeaderCell scope="row">` (instead of `<Table.Cell>`) for the leftmost cell when it labels its row to AT.
- The native HTML `align` attribute on `<th>` / `<td>` is shadowed by the component-level `align` prop (logical) — `Omit<…, 'align'>` on both `*Props`.
- **Use `<DataTable>` instead** when you need sorting / filtering / pagination state. Table is the paint primitive; DataTable will be the opinionated wrapper.

### `<DataTable>` — server-driven data table with column features

```tsx
const instance = useDataTable<Deal>({
  data,
  columns,
  getRowId: (r) => r.id,
  enableRowSelection: true,
  sort,
  onSortChange: setSort,
});

<Cluster>
  <ColumnVisibilityTrigger instance={instance} />
</Cluster>
<DataTable instance={instance} aria-label="Deals" />
```

- Config-driven via `columns: ColumnDef<T>[]`. Each column has a stable `id` used as the key for all per-column state.
- All state pieces (column order/sizing/visibility/pinning, row selection/expansion, sort) follow the Radix controlled/uncontrolled pattern: `value` + `onValueChange`, OR `defaultValue` only, OR neither.
- Server-driven sort/search/pagination. DataTable does NOT transform data — `data` must be the server's pre-sorted, pre-paginated slice. `onSortChange` is your trigger to refetch.
- `enableRowSelection: true` adds a leading checkbox column with select-all (indeterminate when partial). `toggleAllOnPage` ignores `pinnedRows`.
- Drag-to-reorder is keyboard-accessible (Tab to grip → Space to pick up → ←/→ to move → Space/Enter to drop → Esc to cancel). The grip is hover-revealed on desktop.
- Resize via the right-edge handle. Keyboard: focused header label, `←`/`→` for −/+8px; Shift+`←`/`→` for ±32px.
- `ColumnVisibilityTrigger` is the only built-in companion. For column pinning UI (Phase 2 ships state, no built-in UI), wire your own using `instance.pinColumn(id, side)`.
- **Phase 2 ships pinning rendering.** `columnPinning` now applies sticky CSS with cumulative offsets and an inside-edge shadow; `pinnedRows` renders in a separate `<tbody>` above the main body. The selection auto-column is auto-left-pinned at offset 0. Pinned columns are LOCKED in place — no drag grip, can't be reordered. Their sort still works. Declare initial pinning either on the hook (`defaultColumnPinning: { left: ['name'], right: ['actions'] }`) or directly on each column (`pin: 'left' | 'right'`); the hook prop wins when both are set. **Phase 3 ships expandable rows.** Pass `renderExpandedRow: (row) => ReactNode` to add a per-row chevron auto-column at the left edge. Clicking the chevron toggles a detail row beneath the main row, spanning all columns. ARIA-wired with `aria-expanded` + `aria-controls`. The chevron auto-column is sticky-left like the selection cell; when both are enabled, selection is first and expand is second. DataTable is now feature-complete per the original spec.
- **Cell content is single-line + ellipsized by default.** DataTable's internal table uses `table-layout: fixed` so column widths from `ColumnDef.size` (or runtime `columnSizing`) are authoritative, and every cell gets `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`. Wide content truncates with `…` at the column boundary; the column does NOT expand to fit. If you need multi-line cells, render `<Table>` directly — DataTable is opinionated here so pinning offsets stay pixel-correct.
- **`dragWholeColumn`** (default `true`): while a column is dragged to reorder, its body cells travel with its header and displaced columns shift their cells too, so the header row and body never disagree mid-drag. Offsets ride a CSS custom property on the table element, so pointer movement never re-renders the body. Set `false` for the cheaper preview where only the header cell moves. Pinned columns never move either way.
- **A column drag commits wherever the preview parked it** — however far the pointer roams, including over a pinned column or clear off the table (#383). There is no "outside" to release into: the column is clamped to the unpinned band, so the preview is always showing a real slot and the drop honors it. This deliberately differs from `Kanban`, where releasing outside the columns cancels (#387) — there the pointer can genuinely aim somewhere else. **Escape is the only cancel.** The `dragWholeColumn={false}` opt-out is the exception: its preview is dnd-kit's own and RETRACTS (the header snaps home) when no unpinned slot is under the column, so a release there is discarded — matching what that preview shows.

**Anti-patterns:**

- ❌ Mutating `columns` array identity on every render. `useDataTable` captures `defaultColumnOrder` from `columns` once at mount — later identity changes don't trigger a re-derive of the default order. Use a stable reference (`useMemo` or module-level).
- ❌ Client-sorting `data` AND passing `sort` controlled. Pick one — server is the canonical source. Spinning both means rows reorder twice and ghost-rows appear during fetches.
- ❌ Rolling your own column visibility UI when `ColumnVisibilityTrigger` does the job. The built-in handles the "last column" guard for you.
- ❌ Using `<Table>` directly when you want any of: ordering, sizing, visibility, selection, sort indicator wiring. Compose `<DataTable>` instead — the primitive `<Table>` is for static read-only views.
- ❌ Putting interactive controls in `renderExpandedRow` that need to participate in row selection or row click. The detail row is its own `<tr>`, not part of the main row — `onRowClick` doesn't fire from inside it (by design), and `rowSelection` only tracks main-row checkboxes.
- ⚠ Pinned rows (passed via `pinnedRows`) ALSO render a chevron when `renderExpandedRow` is set — they're expandable just like main-body rows. Decide whether your starred/anchored rows should reveal detail; if not, omit `renderExpandedRow` or filter `expandedRows` state in the consumer to ignore pinned-row ids.

### `<Pagination>` — numbered nav with windowing

```tsx
const [page, setPage] = useState(1);
<Pagination currentPage={page} pageCount={20} onPageChange={setPage} />;
```

- Controlled-only — consumer owns `currentPage`. No internal state.
- Sibling windowing — `siblingCount` (default `1`) controls how many pages on each side of current. Boundary fixed at 1 (first + last always shown). Slot count stays constant once ellipses kick in (`siblingCount * 2 + 5`) — the row's width doesn't jump as the user clicks.
- Current page is rendered as a disabled `<button>` with `aria-current="page"` (the W3C ARIA APG pattern for "current item, not actionable").
- Sizes: `'sm'` (24px) / `'md'` (32px, default) / `'lg'` (40px) — tracks the Button / Input scale so Pagination sits cleanly next to a `<Button>` in a Cluster.
- Out-of-range `currentPage` / `pageCount` clamp at render time (defensive — same precedent as `<EmptyState>`'s `clampHeading`).
- **Not bundled**: page-size selector, count caption ("Showing 11–20 of 240"). Compose those with `<Select>` and text — keeps Pagination focused on navigation. `<DataTable>` (coming) owns its own footer.
- For streams without a total → use `<CursorPagination>`.
- For "load more" → use `<Button>` directly (`<Button onClick={loadMore} loading={isLoading}>Load more</Button>`).
- `paginationRange(currentPage, pageCount, siblingCount)` is exported as a pure utility for advanced consumers that want to compute the same item list themselves (e.g., to render a custom layout with the same windowing).

### `<CursorPagination>` — prev / next for streams without total

```tsx
<CursorPagination hasPrevious={hasPrev} hasNext={hasNext} onPrevious={loadPrev} onNext={loadNext} />
```

- Two-button prev / next nav for keyset-paginated streams (activity feeds, infinite scroll, cursor-based APIs). Controlled — consumer owns the cursor + `has-prev` / `has-next` flags.
- Buttons render as native `<button disabled>` when `hasPrevious` / `hasNext` is false — no layout shift; consumer doesn't have to conditionally hide them.
- `previousLabel` / `nextLabel` accept `ReactNode` — override for reverse-chronological feeds (`'Newer'` / `'Older'`).
- Shares the `<Pagination>` size scale (`sm` / `md` / `lg`).
- Use `<Pagination>` (numbered) when you have a known total page count. CursorPagination is for streams.

### `<LocaleProvider>` + `useLocale` — locale Context

```tsx
<LocaleProvider locale="ru-RU">
  <App />
</LocaleProvider>;

const locale = useLocale(); // 'ru-RU', or navigator.language fallback
```

- `LocaleProvider` exposes a BCP-47 locale string to descendants. Any locale-aware component (Calendar primitives today; future Input formatters, currency widgets) reads via `useLocale()`.
- No `<LocaleProvider>` mounted? `useLocale()` falls back to `navigator.language` (or `'en-US'` in SSR / Node).
- Stateless. To switch locale at runtime, re-render the Provider with a new `locale` prop. Nested Providers override outer ones.

### `<Calendar>` — month / week / day / agenda views

```tsx
const [cursor, setCursor] = useState(new Date());
const [view, setView] = useState<CalendarView>('month');
<Calendar
  value={cursor}
  onChange={setCursor}
  view={view}
  onViewChange={setView}
  events={events}
  onEventClick={(e) => openDetail(e)}
/>;
```

- Four views: `'month'` (continuous event bars across the grid), `'week'` (7 columns × hour rows + all-day band), `'day'` (single column × hour rows), `'agenda'` (chronological list of the cursor's current week, grouped by day with empty days hidden).
- Events are `{ id, title, startsAt, endsAt?, tone?, allDay? }`. Multi-day events render as continuous bars in both the month grid and the week/day all-day band.
- Tones: `neutral` (default) / `accent` / `success` / `warning` / `danger`. `allDay: true` renders as a tone-filled band (no time prefix).
- Controlled cursor via `value` / `onChange`, or uncontrolled via `defaultValue`. Controlled view via `view` / `onViewChange`, or uncontrolled via `defaultView`.
- `hourRange` (default `[7, 19]`) sets the visible hour window in week/day views. Hours outside the range are not rendered. `hourRowHeight` (default 48) is the pixel height per hour row.
- Overlapping timed events in week/day views render as a Google-Calendar-style cascade: each lane is offset to the right by a small constant step but every block extends to the column's right edge, with later lanes overlaying earlier ones via `z-index`. Hovering or keyboard-focusing a block lifts it to full width on top of all neighbours. A horizontal "now" line marks the current time in today's column.
- Locale-aware via `useLocale()`; override with `locale` prop. UI strings (`today`, `viewMonth`, etc.) are the consumer's responsibility via `labels`.
- `maxLanesPerWeek` (default 3) caps event lanes per week in the month view. Events beyond the cap collapse into a `+N more` chip; click fires `onDayClick(date)`.
- Read-mostly: `onDayClick` and `onEventClick` callbacks only. `onDayClick` fires across all views — month-cell click, "+N more" chip, keyboard activation (Enter/Space) on a focused cell, and (in week/day views) clicks on the empty hour-grid space of a day column. No built-in popover or modal — wire your own detail UI.
- ARIA: month view is `role="grid" aria-readonly="true"`; arrow keys move focus, PageUp/PageDown navigates months, Enter/Space calls `onDayClick`. Week/day views are also `role="grid" aria-readonly="true"` with `role="row"` + `role="columnheader"` headers and standard sequential tab order for event blocks. Agenda view exposes the visible week as `role="list"` with each day group as a `role="listitem"` and the day label as an `<h3>` heading inside — screen readers announce the date grouping before reading each event row. **Known v3 gap:** in week/day views, `onDayClick` on empty hour-grid space is **mouse-only** (no keyboard equivalent). Consumers needing keyboard activation should drive their detail UI through the focusable event chips via `onEventClick`.

### `<DatePicker>` — single-date input + popover

```tsx
const [value, setValue] = useState<Date | null>(null);
<DatePicker value={value} onChange={setValue} min={new Date()} />;
```

- Single-date selection (date-only by default; opt into date+time with `granularity="minute"`). Range → `<DateRangePicker>`. Year-picker — out of scope for v1.
- Looks like an `<Input>`. Click the input or press ArrowDown to open the popover. The 📅 button toggles, the ✕ button clears.
- Typed input parses on blur / Enter using the active locale: en-US `M/D/YYYY`, ru-RU `D.M.YYYY`, ja-JP `Y/M/D`. ISO `YYYY-MM-DD` is always accepted as a paste fallback. Unparseable / out-of-range / disabled input reverts to the last committed value.
- `min` / `max` (inclusive, day-granular) gate both the grid and typed input. `isDateDisabled(date) => boolean` is per-cell + per-parsed-input.
- `clearable` (default `true`) shows the ✕ button when a value is set. `name` renders a hidden mirror `<input type="hidden">` with the ISO date so native `<form>` submission works.
- `invalid` toggles the red border + `aria-invalid="true"`. Pair with a visible error and `aria-describedby`.
- Sizes: `sm` / `md` (default) / `lg`. Same scale as `<Input>`; affects the trigger row only — the popover month grid stays fixed.
- Locale-aware via `useLocale()`; override with `locale` prop. UI strings (previousMonth / nextMonth / openCalendar / clear) translate via `datePicker.*` keys — override with `<I18nProvider overrides={{ datePicker: { ... } }}>`.
- ARIA: typed input has `aria-haspopup="dialog"` + `aria-expanded`. Popover wrapper is `role="dialog"` (labelled by `aria-label={t('datePicker.openCalendar')}`); the grid inside is `role="grid"` with `role="gridcell"` buttons that carry `aria-selected` / `aria-disabled` as appropriate.
- Keyboard inside the grid: ←→↑↓ move focus by 1 day, Home/End to start/end of week, PageUp/PageDown step a month, Enter/Space selects, Escape closes and returns focus to the input. Tab leaves the grid.
- **Granularity.** Pass `granularity="minute"` to add a `<TimeField>` below the calendar grid; the trigger text becomes `MM/DD/YYYY HH:mm` (24h locales) or `MM/DD/YYYY h:mm AM/PM` (12h locales) and the hidden form mirror emits ISO local datetime (`2026-05-28T14:30`). Defaults to `'day'` (backward compat — date-only). Picking a different date re-uses the existing time-of-day, so the grid feels like it "just changes the date"; picking from `null` defaults to `00:00`. The `<TimeField>` accepts free text (parsed on blur / Enter via `parseTime` — both 24h and AM/PM shapes) AND a chevron-toggled popover with hour + minute (+ AM/PM in 12h mode) lists, plus a "Now" footer button. `timeStep` (default `15`, in minutes) controls the minute-list row count AND rounds typed input in the time field on commit; set `timeStep={1}` to disable rounding. The trigger text-input parses exactly as typed — `timeStep` does not round trigger input. `hourCycle` (default `'auto'`) forwards to the embedded TimeField and controls the trigger text — `'12'` / `'24'` force a cycle, `'auto'` derives from locale (en-US → 12h, ru-RU → 24h).

### `<DateRangePicker>` — date-range input + two-month popover

```tsx
const [range, setRange] = useState<DateRange | null>(null);
<DateRangePicker value={range} onChange={setRange} min={new Date()} />;
```

- Date-range selection (date-only by default; opt into date+time on each side with `granularity="minute"`). Single-date → `<DatePicker>`. Multi-date / preset ranges (Today, Last 7 days) — out of scope for v1.
- Looks like an `<Input>`. Click the input or press ArrowDown to open; the popover shows two months side-by-side. The 📅 button toggles, the ✕ button clears the whole range.
- Selection flow: first click sets the start; hover (or keyboard-focus) another cell to preview the range; second click commits and closes. If the second pick is earlier than the start, the range is auto-swapped to `[earlier, later]`. A third click in a reopened popover restarts selection.
- Typed input parses on blur / Enter using the active locale. Accepts `—` (em dash), `–` (en dash), `-` (hyphen with spaces), or `to` (case-insensitive word) as the separator. ISO `YYYY-MM-DD` works for each half too. Out-of-order typed input is auto-swapped. Anything unparseable / out-of-range / disabled reverts to the last committed value.
- `min` / `max` (inclusive) + `isDateDisabled(date) => boolean` gate both the popover grid AND typed-input parsing.
- `clearable` (default `true`) shows the ✕ when a range is set. `nameStart` / `nameEnd` render two hidden mirror `<input>`s with ISO dates so native `<form>` submission works (post both keys, or just one — caller's choice).
- `invalid` toggles the red border + `aria-invalid="true"`. Pair with a visible error and `aria-describedby`.
- Sizes: `sm` / `md` (default) / `lg`. Same scale as `<DatePicker>`; affects the trigger row only — the two-month popover grid stays fixed.
- ARIA: typed input has `aria-haspopup="dialog"` + `aria-expanded`. Popover wrapper is `role="dialog"` (labelled by `aria-label={t('datePicker.openCalendar')}`); each grid inside is `role="grid"` with `gridcell` buttons. The range-start and range-end cells (and the live hover end during selection) carry `aria-selected="true"`.
- Keyboard inside a grid: ←→↑↓ move focus by 1 day, Home/End to start/end of week, PageUp/PageDown step a month, Enter/Space drives the same first-click → second-click flow, Escape closes and returns focus to the input. With selection-start set, the focused cell acts as the hover end so the preview range follows arrow keys.
- Reuses `<DatePickerGrid>` via `selectionMode='range'` + `rangeStart`/`rangeEnd`/`hoverDate`/`onHoverDate` + `chevrons={false}`. The two grids share the same cursor; the picker renders its own prev/next chevrons outside them.
- **Granularity.** Pass `granularity="minute"` to add dual `<TimeField>`s (start + end) below the two-month grid; the trigger text becomes `MM/DD/YYYY HH:mm — MM/DD/YYYY HH:mm` (24h locales) or `MM/DD/YYYY h:mm AM/PM — MM/DD/YYYY h:mm AM/PM` (12h locales) and the hidden form mirrors emit ISO local datetime. Defaults to `'day'` (backward compat). The start/end time inputs are shown and editable in the popover even before a range is picked — defaulting to `00:00` start / `23:59` end. Times set in this empty state are applied when the range is committed (no need to seed a placeholder range), and existing times are preserved across subsequent date picks. Same-day ranges silently clamp end-time to ≥ start-time on every commit; different-day ranges are not clamped. `timeStep` (default `15`, in minutes) applies to BOTH TimeFields, controlling each minute-list row count AND rounding typed input in the time fields on commit; set `timeStep={1}` to disable rounding. The trigger text-input parses exactly as typed — `timeStep` does not round trigger input. `hourCycle` (default `'auto'`) forwards to both embedded TimeFields and controls the trigger text — `'12'` / `'24'` force a cycle, `'auto'` derives from locale.

### `<InlineDatePicker>` — single-date calendar in flow

```tsx
const [date, setDate] = useState<Date | null>(null);
<InlineDatePicker value={date} onChange={setDate} min={new Date()} />;
```

- Same month-grid surface as `<DatePicker>` but always rendered in flow — no input, no popover, no portal. Use when the calendar should be visible at all times (sidebar pickers, schedule editors, quick-filter panels).
- Cursor anchors to `value ?? new Date()` on mount and stays sticky after user navigation. Programmatic `value` changes do NOT re-anchor — consumers own scroll-into-view via `ref` if they want it.
- `min` / `max` / `isDateDisabled` gate cell clicks just like the popover variant.
- `name` renders a hidden `<input type="hidden">` mirror with the ISO date so native `<form>` submission works.
- `disabled` mutes the entire grid (chevrons disabled, cells get `tabIndex=-1`, clicks no-op).
- `forwardRef` points at the outer wrapper `<div>` (no input to forward to).
- ARIA: same `role="grid"` + `role="gridcell"` cells from `DatePickerGrid`. No dialog role — the picker is in flow.
- **Granularity.** Pass `granularity="minute"` to render a `<TimeField>` below the grid (always visible — there's no popover to gate it on); the hidden form mirror emits ISO local datetime. Defaults to `'day'`. Time is preserved across date re-picks; the field is disabled until a date is set. Same trigger-text contract is not applicable (no trigger). `timeStep` (default `15`, in minutes) controls the TimeField's minute-list row count AND rounds typed input in the time field on commit; set `timeStep={1}` to disable rounding. `hourCycle` (default `'auto'`) forwards to the embedded TimeField — `'12'` / `'24'` force a cycle, `'auto'` derives from locale.

### `<InlineDateRangePicker>` — date-range calendar in flow

```tsx
const [range, setRange] = useState<DateRange | null>(null);
<InlineDateRangePicker value={range} onChange={setRange} />;
```

- Two-month calendar grid (side-by-side) embedded directly in the page. Same click-1/click-2/restart selection machine, hover preview, auto-swap on out-of-order picks, and keyboard cross-grid navigation as `<DateRangePicker>` — without the input + popover.
- External prev/next chevrons in the header shift both grids by ±1 month at once.
- Sticky cursor (anchors to `value?.start ?? new Date()` on mount; stays where the user navigated).
- `min` / `max` / `isDateDisabled` gate both boundaries.
- `nameStart` / `nameEnd` render independent hidden form mirrors (post both, only one, or neither — caller's choice).
- `disabled` mutes everything; ref forwards to the outer wrapper.
- Use when the consumer wants the calendar permanently visible. For a compact form field with the same selection model, use `<DateRangePicker>`. Don't render inside containers narrower than ~32rem — the two grids need side-by-side room.
- **Granularity.** Pass `granularity="minute"` to render dual `<TimeField>`s (start + end) below the two-month grid; the hidden form mirrors emit ISO local datetime. Defaults to `'day'`. The start/end time inputs are shown and editable below the grid even before a range is picked — defaulting to `00:00` start / `23:59` end. Times set in this empty state are applied when the range is committed (no need to seed a placeholder range), and existing times are preserved across subsequent date picks. Same-day end-time silently clamps to ≥ start-time on every commit; different-day ranges are not clamped. `timeStep` (default `15`, in minutes) applies to BOTH TimeFields, controlling each minute-list row count AND rounding typed input in the time fields on commit; set `timeStep={1}` to disable rounding. `hourCycle` (default `'auto'`) forwards to both embedded TimeFields — `'12'` / `'24'` force a cycle, `'auto'` derives from locale.

### `<TimeField>` — standalone time-of-day input

```tsx
import { TimeField, type TimeValue } from '@eocrm/design-system';
const [time, setTime] = useState<TimeValue | null>({ hours: 9, minutes: 0 });
<TimeField value={time} onChange={setTime} aria-label="Start time" />;
```

```tsx
// Forced 24-hour cycle, 30-minute step, no Now button.
<TimeField
  value={time}
  onChange={setTime}
  hourCycle="24"
  step={30}
  hideNowButton
  aria-label="Departure time"
/>
```

```tsx
// Controlled inside a custom widget — the boundary conversion the picker
// family uses internally.
<TimeField
  value={value ? { hours: value.getHours(), minutes: value.getMinutes() } : null}
  onChange={(t) => setValue(combineDateAndTime(value, t.hours, t.minutes))}
  step={15}
  aria-label="Meeting time"
  disabled={value == null}
/>
```

- Bare text input + chevron toggle that opens a popover with hour / minute (and AM/PM in 12h mode) listbox columns plus a "Now" footer button. The wrapper IS the public element; the input has no border of its own — the wrapper renders the same chrome as `<Input>`.
- Used internally by `<DatePicker>` / `<DateRangePicker>` / `<InlineDatePicker>` / `<InlineDateRangePicker>` when `granularity="minute"`; public for consumers who need a time input without a date.
- **Props (canonical):**
  - `value: TimeValue | null` — `{ hours: 0-23, minutes: 0-59 }` (internal storage is always 24-hour). `null` disables the field — the pickers use this to gate time selection on a date being chosen first.
  - `onChange: (value: TimeValue) => void` — fires on typed-input commit (blur / Enter), popover row click, AM/PM column click, or Now-button click.
  - `step?: number` — minutes step. Default `15`. Controls the minute-column row count (15 → 4 rows: 00/15/30/45) AND rounds typed input on commit. Set `1` to disable rounding.
  - `hourCycle?: '12' | '24' | 'auto'` — default `'auto'` (derived from locale via `Intl.DateTimeFormat`). en-US → 12h with AM/PM column; ru-RU → 24h with 00–23 hours.
  - `locale?: string` — override for `hourCycle='auto'` detection + text formatting; defaults to `useLocale()`.
  - `hideNowButton?: boolean` — default `false`. Hide the footer "Now" quick-pick button.
  - `'aria-label': string` — **required**. TimeField is a primitive with no implicit default.
  - `disabled?: boolean` — disables the input + popover trigger.
  - `id?: string` — stable id for the input so an external `<label htmlFor>` can target it.
- Typed input is lenient regardless of cycle — both `"14:30"` (24h) and `"2:30 PM"` / `"230pm"` (AM/PM) parse in either mode. Internal storage stays 24-hour.
- Keyboard inside the popover (WAI-ARIA APG listbox pattern with roving tabIndex per column):
  - `ArrowDown` on the input opens the popover and focuses the current hour row.
  - `ArrowUp` / `ArrowDown` move within the focused column (no wrap).
  - `ArrowLeft` / `ArrowRight` switch columns (Hours ↔ Minutes ↔ AM/PM in 12h mode).
  - `Home` / `End` jump to first / last row in the focused column.
  - `Enter` / `Space` commit the focused row.
  - `Escape` closes and returns focus to the input.
  - Tab from the last row reaches the Now button (it's outside the roving set, in natural Tab order).
- Now button reads `new Date()`, applies `roundTimeToStep(step)`, fires `onChange`, and leaves the popover open so the user can fine-tune.
- Re-exports of the underlying utils are available for consumers building their own time UI on top of TimeField: `resolveHourCycle`, `getLocaleHourCycle`, `roundTimeToStep`, types `TimeValue` / `HourCycle`.
- **When NOT to use.** For datetime (date + time-of-day), use `<DatePicker>` / `<DateRangePicker>` / `<InlineDatePicker>` / `<InlineDateRangePicker>` with `granularity="minute"` — those wire the boundary `Date ↔ TimeValue` conversion plus the hidden form mirror for you. For elapsed-duration inputs (e.g. "3h 15m" meeting length), TimeField is wrong semantics — it clamps to 23:59 and parses AM/PM; use a numeric input pair. Time zones are out of scope — the value contract is wall-clock.

### Calendar primitives — `useMonth`, `useWeek`, `useDay`, `useAgenda`

```tsx
const grid = useMonth(cursorDate);
// → { year, month, monthLabel, weekdayLabels, weeks }

const week = useWeek(cursorDate);
// → { weekLabel, days, weekdayLabels }

const { day, dayLabel, dayShortLabel } = useDay(date);

const { days, rangeLabel } = useAgenda(rangeStart, rangeEnd);
```

- Headless. These hooks return data shapes — no rendering. The Calendar UI components (Month/Week/Day/Agenda views) consume them.
- Each hook accepts an optional `options.locale` to override the Context value. `useMonth`, `useWeek`, and `useAgenda` accept `options.weekStartsOn` to override the locale-derived first day (used by `useAgenda` to compute the locale-aware column index for each `Day.weekday`).
- `Day.key` is `'YYYY-MM-DD'` in local time — safe React key, comparison handle, and event-lookup index.
- Pure date math + `Intl` formatters live alongside as utility exports: `addDays`, `startOfWeek`, `formatMonth`, `getFirstDayOfWeek`, etc. Use them if you need to derive labels or do date math outside a component.

### `useBelowBreakpoint` — viewport breakpoint hook

```tsx
import { useBelowBreakpoint } from '@eocrm/design-system';

const isOverlay = useBelowBreakpoint('lg'); // true at ≤768px viewport width
```

- Lives in `src/hooks/`, imported straight from the package root. `useBelowBreakpoint(breakpoint?: 'sm' | 'md' | 'lg'): boolean` — subscribes to `(max-width: …px)` on the **viewport** (`matchMedia`: `sm` 480 / `md` 640 / `lg` 768) and returns whether it currently matches. `breakpoint` is optional — omit it (or pass `undefined`) and the hook always returns `false`.
- Returns `false` on the server, and stays `false` until hydration corrects it — only relevant if you server-render this. In a client-only render (no SSR — the CRM's case) the value is correct from the first render.
- Viewport, not container — use it only where a container query would be circular, i.e. where the thing being measured is what the collapse changes: `<Rail>`'s own width (internal use) and `<AppLayout>`'s overlay-sidebar trigger (`sidebarOverlayBelow` — gate your `topBar` hamburger on this so it shows only while the overlay is active). For content that re-templates inside a box of stable width, use a `collapseBelow` prop (`<Grid>` / `<Split>` / `<Sortable>` / `<DashboardCanvas>`) instead — those use container queries in CSS and need no hook.

---

## Tokens (the only "values" you write)

All available as CSS custom properties after you import `global.scss`:

| Family          | Tokens                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neutral colors  | `--color-bg`, `--color-bg-subtle`, `--color-bg-muted`, `--color-bg-sunken`, `--color-border`, `--color-border-strong`, `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`, `--color-fg-disabled` |
| Accent colors   | `--color-accent`, `--color-accent-hover`, `--color-accent-pressed`, `--color-accent-fg`, `--color-accent-subtle-bg`                                                                                 |
| Semantic colors | `--color-danger`, `--color-danger-hover`, `--color-danger-fg`, `--color-bg-danger-subtle`, `--color-success`, `--color-success-hover`, `--color-success-fg`, `--color-warning`, `--color-info`      |
| Badge palette   | `--badge-{bg,fg}-{neutral,info,success,warning,danger,purple}` (was `--color-badge-<tone>-{bg,fg}`, kept as deprecated aliases)                                                                     |
| Avatar palette  | `--color-avatar-fg`, `--color-avatar-1` through `--color-avatar-6`                                                                                                                                  |
| Spacing         | `--space-0` `--space-1` (4) `--space-2` (8) `--space-3` (12) `--space-4` (16) `--space-5` (20) `--space-6` (24) `--space-8` (32) `--space-10` (40) `--space-12` (48) `--space-16` (64)              |
| Radii           | `--radius-sm` (3) / `--radius-md` (4) / `--radius-lg` (8) / `--radius-full`                                                                                                                         |
| Font sizes      | `--font-size-xs/sm/md/lg/xl/2xl/3xl`, `--font-size-code` (0.92em for inline mono)                                                                                                                   |
| Font weights    | `--font-weight-regular/medium/semibold/bold`                                                                                                                                                        |
| Line heights    | `--line-height-tight` / `--line-height-normal` / `--line-height-none` (1)                                                                                                                           |
| Control sizes   | `--size-sm/md/lg` (heights), `--size-badge` (20), `--size-badge-sm` (16), `--size-chip` (18), `--size-dropdown-min-width` (160), `--size-popover-min-width` (220), `--size-dropdown-indicator` (16) |
| Borders         | `--border-width` (1) / `--border-width-emphasis` (2) / `--border-width-strong` (3)                                                                                                                  |
| Letter spacing  | `--letter-spacing-caps` (0.03em)                                                                                                                                                                    |
| Shadows         | `--shadow-sm` / `--shadow-md` / `--shadow-lg`                                                                                                                                                       |
| Focus rings     | `--ring-accent` / `--ring-danger` / `--ring-success` / `--ring-width`                                                                                                                               |
| Motion          | `--transition-fast` (100ms) / `--transition-base` (140ms)                                                                                                                                           |
| Layer (z-index) | `--z-app-chrome` / `--z-dropdown` / `--z-popover` / `--z-flowcanvas-maximized` / `--z-modal` / `--z-overlay-floating` / `--z-toast` / `--z-tooltip`                                                 |

---

## Theming via component tokens

Every component ships a `Component.tokens.scss` file alongside its `.module.scss`, defining `--<component>-<part>-<state>` CSS custom properties at `:root`. The `.module.scss` references those tokens instead of the global primitives. This lets consumers re-theme one component without affecting others.

**Pattern:**

- Token name: `--<component>-<part>[-<state>]`. Component is kebab-cased (`--data-table-*`, `--dropdown-menu-*`, `--page-header-*`). Part is the surface (`bg` / `fg` / `border-color` / `radius` / `padding-x` / `height` / `ring` / etc.). State is appended when there's a state variant (`hover` / `active` / `focus` / `disabled` / `checked` / `selected` / `invalid`).
- Defaults: every component token defaults to the same primitive the SCSS used before this layer existed. Overriding the token re-themes the component without touching the primitive.

**Override globally (every Button in the app turns red):**

```css
:root {
  --button-bg: red;
  --button-bg-hover: darkred;
}
```

**Override per-scope (only Buttons inside this region turn red):**

```css
.danger-zone {
  --button-bg: red;
  --button-bg-hover: darkred;
}
```

```tsx
<div className="danger-zone">
  <Button>Delete</Button>
</div>
```

**Override per-instance (one Button, inline):**

```tsx
<Button style={{ '--button-bg': 'red' } as React.CSSProperties}>Delete</Button>
```

The authoritative list of tokens per component lives in that component's `<Name>.tokens.scss` file. Read it to see what's available.

**Deprecated:** `--color-badge-<tone>-bg/-fg` tokens are aliased to the new `--badge-bg-<tone>` / `--badge-fg-<tone>` tokens. They still work but will be removed in a future major version.

---

## Anti-patterns to never generate

| Don't write                                                                           | Write instead                                                                                                                      |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `color: #ffffff` in any SCSS                                                          | `color: var(--color-bg)` (or the right semantic token)                                                                             |
| `border: 1px solid var(--color-border)`                                               | `border: var(--border-width) solid var(--color-border)`                                                                            |
| `opacity: 0.5`                                                                        | `opacity: var(--opacity-disabled)` (or use the `disabled` attribute)                                                               |
| `<button onClick={...}>Save</button>`                                                 | `<Button onClick={...}>Save</Button>`                                                                                              |
| `<input value={...} onChange={...} />`                                                | `<Input value={...} onChange={...} />`                                                                                             |
| `<Card><Card>...</Card></Card>`                                                       | Use spacing or a divider inside one card                                                                                           |
| `<Button style={{ marginLeft: 'auto' }}>`                                             | `<Cluster justify="between">` or `<Cluster justify="end">`                                                                         |
| Two `<Button variant="primary">` in the same section                                  | One primary, others `secondary`                                                                                                    |
| `<Button variant="success">Save</Button>` rendered on initial mount                   | `success` is transient — start as `primary`, flip to `success` for ~1.5s after the action resolves, flip back                      |
| `<Avatar name="" />`                                                                  | `name` is required and is the accessible label                                                                                     |
| `import { Button } from '@eocrm/design-system/src/components/Button'`                 | `import { Button } from '@eocrm/design-system'`                                                                                    |
| `<Badge onClick={...}>`                                                               | Badges are non-interactive — use a `Button`                                                                                        |
| 3-digit hex (`#fff`) anywhere                                                         | Always 6-digit (`#ffffff`)                                                                                                         |
| `margin` on or around design-system components in your SCSS                           | Wrap in `<Stack>` / `<Cluster>` or set spacing on the parent's flex/grid                                                           |
| `<DropdownMenu.Item disabled>--- Section ---</DropdownMenu.Item>` as a section header | Use `<DropdownMenu.Separator />` between groups                                                                                    |
| `<DropdownMenu.RadioItem>` outside `<DropdownMenu.RadioGroup>`                        | Always wrap radio items in a RadioGroup; otherwise the value/onValueChange contract is broken                                      |
| `<DropdownMenu.ItemIndicator>` nested deeper than direct child                        | Detection is shallow; nest it directly under CheckboxItem/RadioItem                                                                |
| Submenus 3+ levels deep                                                               | Discouraged — UX gets confusing fast; refactor to a different IA                                                                   |
| `<Tooltip><Button disabled>…</Button></Tooltip>`                                      | `disabled` buttons don't fire pointer/focus events; render with `aria-disabled="true"` + intercept the click, or wrap in `<span>`. |
| Putting essential info _only_ in a tooltip                                            | Make it visible in copy or in the trigger's `aria-label`. Touch users will never see the tooltip.                                  |
| `<Tooltip content="">…</Tooltip>` expecting a no-op listener attach                   | Empty content **is** a no-op — listeners and aria are skipped entirely. That's by design.                                          |
| `<Popover.Trigger><Button disabled>…</Button></Popover.Trigger>`                      | `disabled` buttons don't fire click; render with `aria-disabled="true"` + intercept the click, or wrap in `<span>`.                |
| `<Popover.Content>` with no `<Popover.Close>` AND non-obvious outside-click dismissal | Keyboard / screen-reader users get no clear close affordance. Add a `<Popover.Close>` close button.                                |
| `<ConfirmationPopover>` with `onConfirm` that never settles                           | v1 has no timeout — popover stays in pending state forever. Add a timeout/abort inside your `onConfirm` if relevant.               |

---

## TypeScript

Every prop, variant type, and component has JSDoc. Hover the import in your editor (`Cmd/Ctrl+hover` on the name) to see contracts inline. If you're not seeing JSDoc tooltips:

- Confirm `moduleResolution: "bundler"` (or `"node16"`) in your `tsconfig.json`.
- Confirm your IDE's TS server is running.
- The package's `types` field points at `./src/index.ts` — source distribution means the consumer's bundler compiles `.tsx`. Vite, Next.js, Webpack 5+ all support this; older configurations may need `transpilePackages: ['@eocrm/design-system']` (Next.js) or equivalent.

---

## Full reference

- **Per-component contracts**: JSDoc on each component (`Cmd/Ctrl+hover` in your editor). Includes `@example` blocks, `@remarks When NOT to use`, `@remarks Anti-patterns`.
- **Installation, bundler notes, publishing/deploy ops**: [README.md](./README.md).
