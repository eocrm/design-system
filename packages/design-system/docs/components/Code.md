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

- `tone`: `default | muted | accent | danger` (only the text color changes; chip background stays the same).
- **Inline only.** Block code with syntax highlighting belongs in the playground's `CodeBlock` (Prism), not the library.
