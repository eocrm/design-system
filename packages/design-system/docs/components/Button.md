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

// Icon-only square button (20×20 at xs, 32×32 at md); aria-label is the accessible name
<Button size="xs" variant="ghost" iconOnly aria-label="Remove">
  <X size={12} />
</Button>

// Destination that must look like a button: a real <a>; rel="noreferrer" belongs with target="_blank"
<Button as="a" href={idpConsoleUrl} target="_blank" rel="noreferrer" variant="secondary">
  Open identity console
</Button>

// Form footer
<Cluster justify="end" gap="sm">
  <Button variant="secondary">Cancel</Button>
  <Button type="submit">Save</Button>
</Cluster>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'danger-outline' \| 'success'` | no | Visual variant. - `primary` (default) — the section's main action. Use **one** per page section. - `secondary` — supporting actions like "Cancel", "Export", "Filter". - `ghost` — tertiary actions in dense UIs (toolbar buttons, row actions). - `danger` — destructive operations only (Delete, Revoke, Remove). Pair with a confirmation if irreversible. - `danger-outline` — a destructive action that must not dominate: surface fill, danger text and border. For a Remove repeated on every row, or a destructive action beside a primary one. Use filled `danger` for the confirm step itself. - `success` — **transient confirmation only**, not an initial state. Flip to `success` for ~1.5s after an action resolves (Save → "Saved!"), then flip back. Never render a button as `success` on mount — it has no action-intent meaning, only post-action feedback. See the `@example` below for the timer pattern. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | no | Control height (matches the shared `--size-*` scale used by Input and Avatar). - `xs` (20px) — icon-only or very dense inline actions (row controls, chip-adjacent buttons). Pass `aria-label` when icon-only. Below WCAG 2.5.5 Level AAA touch-target guidance; reserve for desktop-first surfaces. - `sm` (24px) — dense toolbars, tables, inline actions. - `md` (32px, default) — most contexts. - `lg` (40px) — marketing-style empty states or emphasized primary actions. |
| `iconOnly` | `boolean` | no | Render the button as a square icon-only target — `aspect-ratio` is forced to 1 so width tracks the size's `height` token (`xs` → 20×20, `sm` → 24×24, `md` → 32×32, `lg` → 40×40) and `padding` is tightened to a small inset (4px) so the icon has breathing room without changing the outer shape. **Always pass `aria-label`** when `iconOnly` is set, otherwise the button has no accessible name. Pass a single icon as `children`. Use for inline density (row controls, chip-adjacent actions, toolbar affordances). For an icon + short text label, leave `iconOnly` off — the button will lay out as a normal rectangle with the existing gap. |
| `selected` | `boolean` | no | Controlled persistent paint for an applied filter or toolbar value. Selected paint applies only to `secondary` and `ghost` Buttons; `primary`, `danger`, and `success` retain their intent paint. This prop is visual only and does not add toggle-button semantics. Pass native `aria-pressed` explicitly only when activating the Button itself toggles the selected state; menu and disclosure triggers keep their own semantics. The consumer owns the state. Not for transient success feedback or for mutually exclusive `<ButtonGroup>` choices. Defaults to `undefined` (not selected). |
| `as` | `ElementType` | no | Render a different element — the case that matters is `as="a"` with `href`, for a link that must LOOK like a button (an external console, a download, an IdP hand-off). The element named here is what actually renders, and its own attributes are typed: `href` is REQUIRED when `as="a"` (an anchor without one is neither focusable nor a link) and rejected otherwise; `target`/`rel`/`download` come through. Never navigate from `onClick`. Reach for `<Link>` first. `<Link>` is link-SHAPED navigation — inline text in a sentence, a table cell, a breadcrumb. `<Button as="a">` is for a destination that sits in a row of buttons and must carry their weight. Either way the element is a real anchor, so assistive tech announces a link and the browser gives middle-click, "open in new tab", and the status bar preview — none of which a `<button onClick={() => navigate()}>` has. `type="button"` is emitted only for a real `<button>`; an anchor never gets it. Everything else — variant, size, `iconOnly`, `selected`, the focus ring — is unchanged. Default: `'button'`. |
| …native | | | plus native attributes of the `as` element (default `<button>`) |

<!-- props:end -->

- Always renders `<button type="button">` unless you pass `type="submit"` — or unless you pass `as`. It won't submit ancestor forms by default.
- `aria-disabled="true"` keeps an unavailable action focusable (so keyboard users can discover it and its explanation) with the unavailable visual treatment, but does not set native `disabled` or prevent events: the consumer's handler must suppress activation while it is unavailable.
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

#### When NOT to use

- ❌ Navigation in running text, a table cell, or a breadcrumb → `<Link>`.
- ❌ Toggle state (on/off) → `Switch` or `Checkbox`, not a Button with internal state.
- ❌ Mutually exclusive choices → `<ButtonGroup>`, which supplies the group-level selection semantics.
- ❌ A clickable table row → make the row itself the interactive surface; don't nest a button.
- On touch-first surfaces prefer `size="sm"` or larger: `xs` (20px×~28px, or 20×20 with `iconOnly`) is below WCAG 2.5.5 Level AAA touch-target guidance (24×24); acceptable here because the CRM is desktop-first.

#### Anti-patterns

- ❌ Two `variant="primary"` Buttons in the same section. Pick one; others are `secondary`.
- ❌ `<Button style={{ marginLeft: 'auto' }}>` — wrap in `<Cluster justify="end">` (or `justify="between"` with a sibling) instead.
- ❌ Overriding padding/height via `className`. A different visual size is a missing variant: request it.
- ❌ `variant="ghost"` for the page's primary action. Users won't discover it.
- ❌ `<Button variant="success">Save</Button>` on initial mount. Start as `primary` and flip to `success` after the action resolves.
- ❌ `size="xs"` for the primary or most prominent action. `xs` is for inline density, not emphasis; reach for `md` or `lg`.
- ❌ `<Button iconOnly><X /></Button>` without `aria-label`: screen readers announce nothing.
- ❌ Assuming `selected` adds toggle semantics. It is paint only; pass `aria-pressed` explicitly when activating the Button toggles that state, and not on menu or disclosure triggers.
- ❌ Assuming `aria-disabled="true"` blocks activation. It preserves native focusability and pointer events; guard your handler.
- ❌ `<Button onClick={() => (window.location.href = url)}>` for navigation: it announces as a button, with no middle-click, no open-in-new-tab and no status-bar preview. Use `<Button as="a" href={url}>`.
- ❌ `<Button as="a">` with no `href`, for a click handler you wanted to look like a link. An anchor without one is neither focusable nor activatable; the type requires `href` whenever `as="a"`, so this does not compile.
