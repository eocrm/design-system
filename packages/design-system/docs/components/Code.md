# `<Code>` — inline `<code>` chip

```tsx
<Text>Use <Code>npm install</Code> to add deps.</Text>
<Code tone="danger">--no-verify</Code>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `tone` | `CodeTone` | no | — | Color tone for the code text. The chip background stays the same; only the text color changes. - `default` — `--color-fg` - `muted` — `--color-fg-muted` - `accent` — `--color-accent` - `danger` — `--color-danger` |
| `children` | `ReactNode` | yes | — | Code content. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- **Inline only.** Block code with syntax highlighting belongs in the playground's `CodeBlock` (Prism), not the library.

- The chip background is intentionally `--color-bg-muted` so it subordinates to body text.

#### When NOT to use

- ❌ Block-level code with multiple lines or syntax highlighting.
- ❌ Action triggers that LOOK like code (`<Button variant="ghost">`).
- ❌ A substitute for `<kbd>` (keyboard input rendering; not yet shipped).

#### Anti-patterns

- ❌ `<Code>multi-line\nblock</Code>`: Code is inline only; the chip background doesn't extend across newlines. Use the playground's `CodeBlock`, or `<pre><Code>...</Code></pre>` for a static block inside the library.
- ❌ `<Code style={{ background: '#xxx' }}>`: a different background is a token-vocabulary conversation.
- ❌ Wrapping a `<Button>` or `<Link>` in `<Code>` to style it code-like. Code is for content semantics (it IS code), not visual styling.
