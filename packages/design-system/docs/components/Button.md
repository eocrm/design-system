# `<Button>` — action triggers

```tsx
<Button onClick={save}>Save</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button variant="secondary" disabled>Cancel</Button>
<Button
  variant="secondary"
  size="sm"
  selected={ownerApplied}
  aria-pressed={ownerApplied}
  onClick={() => setOwnerApplied((value) => !value)}
>
  Owner: {ownerLabel}
</Button>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `variant` | `ButtonVariant` | no | — | Visual variant. - `primary` (default) — the section's main action. Use **one** per page section. - `secondary` — supporting actions like "Cancel", "Export", "Filter". - `ghost` — tertiary actions in dense UIs (toolbar buttons, row actions). - `danger` — destructive operations only (Delete, Revoke, Remove). Pair with a confirmation if irreversible. - `danger-outline` — a destructive action that must not dominate: surface fill, danger text and border. For a Remove repeated on every row, or a destructive action beside a primary one. Use filled `danger` for the confirm step itself. - `success` — **transient confirmation only**, not an initial state. Flip to `success` for ~1.5s after an action resolves (Save → "Saved!"), then flip back. Never render a button as `success` on mount — it has no action-intent meaning, only post-action feedback. See the `@example` below for the timer pattern. |
| `size` | `ButtonSize` | no | — | Control height (matches the shared `--size-*` scale used by Input and Avatar). - `xs` (20px) — icon-only or very dense inline actions (row controls, chip-adjacent buttons). Pass `aria-label` when icon-only. Below WCAG 2.5.5 Level AAA touch-target guidance; reserve for desktop-first surfaces. - `sm` (24px) — dense toolbars, tables, inline actions. - `md` (32px, default) — most contexts. - `lg` (40px) — marketing-style empty states or emphasized primary actions. |
| `iconOnly` | `boolean` | no | — | Render the button as a square icon-only target — `aspect-ratio` is forced to 1 so width tracks the size's `height` token (`xs` → 20×20, `sm` → 24×24, `md` → 32×32, `lg` → 40×40) and `padding` is tightened to a small inset (4px) so the icon has breathing room without changing the outer shape. **Always pass `aria-label`** when `iconOnly` is set, otherwise the button has no accessible name. Pass a single icon as `children`. Use for inline density (row controls, chip-adjacent actions, toolbar affordances). For an icon + short text label, leave `iconOnly` off — the button will lay out as a normal rectangle with the existing gap. |
| `selected` | `boolean` | no | — | Controlled persistent paint for an applied filter or toolbar value. Selected paint applies only to `secondary` and `ghost` Buttons; `primary`, `danger`, and `success` retain their intent paint. This prop is visual only and does not add toggle-button semantics. Pass native `aria-pressed` explicitly only when activating the Button itself toggles the selected state; menu and disclosure triggers keep their own semantics. The consumer owns the state. Defaults to `undefined` (not selected). |
| `as` | `ElementType` | no | 'button' | Render a different element — the case that matters is `as="a"` with `href`, for a link that must LOOK like a button (an external console, a download, an IdP hand-off). The element named here is what actually renders, and its own attributes are typed: `href` is REQUIRED when `as="a"` (an anchor without one is neither focusable nor a link) and rejected otherwise. Reach for `<Link>` first. `<Link>` is link-SHAPED navigation — inline text in a sentence, a table cell, a breadcrumb. `<Button as="a">` is for a destination that sits in a row of buttons and must carry their weight. Either way the element is a real anchor, so assistive tech announces a link and the browser gives middle-click, "open in new tab", and the status bar preview — none of which a `<button onClick={() => navigate()}>` has. `type="button"` is emitted only for a real `<button>`; an anchor never gets it. Everything else — variant, size, `iconOnly`, `selected`, the focus ring — is unchanged. |
| …native | | | | plus native attributes of the `as` element (default `<button>`) |

<!-- props:end -->

- `variant`: `primary` (default — one per section) / `secondary` / `ghost` / `danger` / `danger-outline` / `success`. `danger-outline` = surface fill + danger text/border, for a destructive action that must not dominate (a per-row Remove); keep filled `danger` for the confirm step.
- `size`: `xs` / `sm` / `md` (default) / `lg` — use `xs` for icon-only or dense inline actions; pass `aria-label` when icon-only.
- `iconOnly`: boolean. Renders a square icon-only button (`aspect-ratio: 1`, tight 4px padding). Width tracks the size's height token. **Always pair with `aria-label`** — there's no other accessible name.
- `selected`: controlled paint for a durable applied filter or independent toolbar value. It paints only `secondary` and `ghost` variants and adds no ARIA semantics. If activating the Button itself toggles that value, also pass the matching native `aria-pressed`; menu/disclosure triggers keep their existing semantics. Keep state in the consumer. Do not use it for transient success feedback or mutually exclusive `<ButtonGroup>` choices.
- Always renders `<button type="button">` unless you pass `type="submit"` — or unless you pass `as`.
- `as`: polymorphic element. `<Button as="a" href="…">` renders a REAL `<a>` — it navigates, announces as a link, supports middle-click and open-in-new-tab, and does not get `type="button"`. The element's own attributes are typed: `href` is REQUIRED with `as="a"` (an anchor without one is neither focusable nor a link) and rejected without it, and `target`/`rel`/`download` come through. Use it for a destination that must look like a button; use `<Link>` for link-shaped navigation in running text. Never navigate from `onClick`.
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
