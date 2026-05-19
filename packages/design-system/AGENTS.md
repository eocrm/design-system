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

```ts
// In your app root (e.g. main.tsx):
import '@eocrm/design-system/styles/global.scss';
```

That import wires up tokens, the modern reset, and base typography. Everything else flows from it.

---

## Components — TL;DR

Each component is fully JSDoc'd. Hover any usage in your editor for inline docs including `@example` blocks, `@remarks` "When NOT to use" and "Anti-patterns" sections. The summaries below are for orientation only — the **JSDoc is the contract**.

### `<Button>` — action triggers

```tsx
<Button onClick={save}>Save</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button variant="secondary" disabled>Cancel</Button>
```

- `variant`: `primary` (default — one per section) / `secondary` / `ghost` / `danger` / `success`
- `size`: `sm` / `md` (default) / `lg`
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

### `<Input>` — single-line text

```tsx
<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
<Input invalid value={email} aria-describedby="email-error" />
```

- All native `<input>` attributes pass through.
- `invalid` toggles the error visual + sets `aria-invalid="true"`. Pair with an error message and `aria-describedby`.
- Validation logic lives in your form layer (React Hook Form + Zod recommended), not in the component.

### `<Card>` — bordered container

```tsx
<Card padding="md">
  <Stack gap="md">...</Stack>
</Card>
```

- `padding`: `none` / `sm` / `md` (default) / `lg`
- **Never nest Card in Card.**
- Use `padding="none"` when the card contains a table or list that should bleed edge-to-edge.

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
```

- `gap`: same scale as Stack
- `justify`: `start` (default) / `center` / `end` / `between`
- `align`: `start` / `center` (default) / `end` / `baseline`
- `wrap`: `true` (default). Set `false` only for narrow table cells where overflow is preferable to wrapping.

### `<Avatar>` — profile circle

```tsx
<Avatar name="Alex Rivera" />
<Avatar name="Alex Rivera" src="https://example.com/alex.jpg" size="lg" />
```

- `name` (required) — alt/aria-label, initials source, and color seed. Same name → same color, always.
- `src` — image URL. Empty/whitespace = no image. Falls back to initials on load failure.
- `size`: `sm` (24) / `md` (32, default) / `lg` (40)
- Use `avatarColorIndex(name)` if you need to match an avatar's color elsewhere (e.g. a chart segment).

### `<Badge>` — status / category pill

```tsx
<Badge tone="success">Active</Badge>
<Badge tone="danger">Churned</Badge>
```

- `tone`: `neutral` (default) / `info` / `success` / `warning` / `danger` / `purple`
- **Non-interactive.** If it's clickable, use `<Button>` instead.
- Doesn't auto-add `role="status"`. Wrap in `aria-live` if a state change should be announced.

### `<Tabs>` — horizontal tab strip

```tsx
const [tab, setTab] = useState('overview');

<Tabs
  items={[
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity', count: 12 },
  ]}
  activeId={tab}
  onChange={setTab}
/>;
{
  tab === 'overview' && <OverviewPanel />;
}
```

- `items: { id, label, count? }[]` — `id` must be unique.
- `activationMode`: `auto` (default — Arrow keys fire onChange) or `manual` (Arrow only focuses; Enter/Space activates). Use `manual` when panels lazy-load expensive content.
- `orientation`: `horizontal` (default) or `vertical`.
- `panelIdPrefix`: optional. When set, each tab gets `aria-controls="${prefix}-${itemId}-panel"`. Set this if you render the panels in the DOM and want assistive tech to follow the link.

---

## Tokens (the only "values" you write)

All available as CSS custom properties after you import `global.scss`:

| Family          | Tokens                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neutral colors  | `--color-bg`, `--color-bg-subtle`, `--color-bg-muted`, `--color-bg-sunken`, `--color-border`, `--color-border-strong`, `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`, `--color-fg-disabled` |
| Accent colors   | `--color-accent`, `--color-accent-hover`, `--color-accent-pressed`, `--color-accent-fg`, `--color-accent-subtle-bg`                                                                                 |
| Semantic colors | `--color-danger`, `--color-danger-hover`, `--color-danger-fg`, `--color-success`, `--color-success-hover`, `--color-success-fg`, `--color-warning`, `--color-info`                                  |
| Badge palette   | `--color-badge-{neutral,info,success,warning,danger,purple}-{bg,fg}`                                                                                                                                |
| Avatar palette  | `--color-avatar-fg`, `--color-avatar-1` through `--color-avatar-6`                                                                                                                                  |
| Spacing         | `--space-0` `--space-1` (4) `--space-2` (8) `--space-3` (12) `--space-4` (16) `--space-5` (20) `--space-6` (24) `--space-8` (32) `--space-10` (40) `--space-12` (48) `--space-16` (64)              |
| Radii           | `--radius-sm` (3) / `--radius-md` (4) / `--radius-lg` (8) / `--radius-full`                                                                                                                         |
| Font sizes      | `--font-size-xs/sm/md/lg/xl/2xl/3xl`, `--font-size-code` (0.92em for inline mono)                                                                                                                   |
| Font weights    | `--font-weight-regular/medium/semibold/bold`                                                                                                                                                        |
| Line heights    | `--line-height-tight` / `--line-height-normal` / `--line-height-none` (1)                                                                                                                           |
| Control sizes   | `--size-sm/md/lg` (heights), `--size-badge` (20), `--size-chip` (18)                                                                                                                                |
| Borders         | `--border-width` (1) / `--border-width-emphasis` (2) / `--border-width-strong` (3)                                                                                                                  |
| Letter spacing  | `--letter-spacing-caps` (0.03em)                                                                                                                                                                    |
| Shadows         | `--shadow-sm` / `--shadow-md` / `--shadow-lg`                                                                                                                                                       |
| Focus rings     | `--ring-accent` / `--ring-danger` / `--ring-success` / `--ring-width`                                                                                                                               |
| Motion          | `--transition-fast` (100ms) / `--transition-base` (140ms)                                                                                                                                           |
| Layer (z-index) | `--z-dropdown` / `--z-modal` / `--z-toast`                                                                                                                                                          |

---

## Anti-patterns to never generate

| Don't write                                                           | Write instead                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `color: #ffffff` in any SCSS                                          | `color: var(--color-bg)` (or the right semantic token)                                                        |
| `border: 1px solid var(--color-border)`                               | `border: var(--border-width) solid var(--color-border)`                                                       |
| `opacity: 0.5`                                                        | `opacity: var(--opacity-disabled)` (or use the `disabled` attribute)                                          |
| `<button onClick={...}>Save</button>`                                 | `<Button onClick={...}>Save</Button>`                                                                         |
| `<input value={...} onChange={...} />`                                | `<Input value={...} onChange={...} />`                                                                        |
| `<Card><Card>...</Card></Card>`                                       | Use spacing or a divider inside one card                                                                      |
| `<Button style={{ marginLeft: 'auto' }}>`                             | `<Cluster justify="between">` or `<Cluster justify="end">`                                                    |
| Two `<Button variant="primary">` in the same section                  | One primary, others `secondary`                                                                               |
| `<Button variant="success">Save</Button>` rendered on initial mount   | `success` is transient — start as `primary`, flip to `success` for ~1.5s after the action resolves, flip back |
| `<Avatar name="" />`                                                  | `name` is required and is the accessible label                                                                |
| `import { Button } from '@eocrm/design-system/src/components/Button'` | `import { Button } from '@eocrm/design-system'`                                                               |
| `<Badge onClick={...}>`                                               | Badges are non-interactive — use a `Button`                                                                   |
| 3-digit hex (`#fff`) anywhere                                         | Always 6-digit (`#ffffff`)                                                                                    |
| `margin` on or around design-system components in your SCSS           | Wrap in `<Stack>` / `<Cluster>` or set spacing on the parent's flex/grid                                      |

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
