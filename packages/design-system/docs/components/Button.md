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

- `variant`: `primary` (default — one per section) / `secondary` / `ghost` / `danger` / `danger-outline` / `success`. `danger-outline` (#596) = surface fill + danger text/border, for a destructive action that must not dominate (a per-row Remove); keep filled `danger` for the confirm step.
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
