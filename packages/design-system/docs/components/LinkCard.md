# `<LinkCard>` — clickable, full-surface Card

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

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | no | Inner padding — same scale as `Card`. Defaults to `'md'`. |
| `tone` | `'accent' \| 'info' \| 'success' \| 'warning' \| 'danger'` | no | Optional left-edge tone stripe — same vocabulary as `Card`. |
| `children` | `ReactNode` | no |  |
| `as` | `ElementType` | no |  |
| …native | | | plus native attributes of the `as` element (default `<a>`) |

<!-- props:end -->

- A Card whose **whole surface** navigates/acts. Polymorphic like `<Link>` — `as` defaults to `<a>`; pass `as={RouterLink} to=…` for routes or `as="button"` for actions (the library has no router dep).
- Carries `Card`'s `padding` (default `md`) + `tone` stripe (reuses `--card-*` tokens), plus a hover lift (border + shadow) and a `:focus-visible` ring.
- Use `<Card>` for non-interactive grouping, `<Link>` for inline text, `<Button>` for form actions. **Don't nest** interactive controls inside it (invalid nested interactives).

**Anti-patterns:**

- ❌ Nesting interactive controls (`<Button>` / `<Link>`) inside a LinkCard — nested interactives are invalid + confusing.
- ❌ `<LinkCard href="#" onClick={…}>` — fake href breaks "open in new tab". Use `as="button"` for actions.
- ❌ `<LinkCard href="https://…" target="_blank">` without `rel="noopener noreferrer"` — security risk.

**A11y:** renders a real `<a>` / `<button>` / router link, so it has native semantics; the children supply the accessible name — keep the primary label first. `:focus-visible` provides the keyboard ring.
