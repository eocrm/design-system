# `<Code>` — inline `<code>` chip

```tsx
<Text>Use <Code>npm install</Code> to add deps.</Text>
<Code tone="danger">--no-verify</Code>
```

- `tone`: `default | muted | accent | danger` (only the text color changes; chip background stays the same).
- **Inline only.** Block code with syntax highlighting belongs in the playground's `CodeBlock` (Prism), not the library.
