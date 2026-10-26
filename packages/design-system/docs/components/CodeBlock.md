# `<CodeBlock>` — highlighted, copyable code sample

```tsx
<CodeBlock language="json" code={'{ "id": 42 }'} />;

<CodeBlock
  syncKey="api-lang"
  samples={[
    { id: 'curl', label: 'cURL', language: 'bash', code: 'curl https://api.example.com/v1/deals' },
    { id: 'py', label: 'Python', language: 'python', code: 'requests.get(url)' },
  ]}
  defaultSampleId={localStorage.getItem('api-lang') ?? undefined}
  onSampleChange={(id) => localStorage.setItem('api-lang', id)}
/>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | no | Single-sample mode: the source. Ignored when `samples` is set. |
| `language` | `(string & {}) \| CodeBlockLanguage` | no | Single-sample mode: grammar for highlighting — `'json'`, `'bash'`, `'javascript'`, `'typescript'` or `'python'` (aliases `sh`, `shell`, `js`, `ts`, `py`). Anything else renders as plain text. |
| `title` | `string` | no | Header label in single-sample mode. Defaults to a one-item `samples` entry's `label`, else the language name (`JSON`, `Bash`…), else "Plain text". Also names the single-sample body (default "Code"). |
| `samples` | `readonly CodeBlockSample[]` | no | Multi-sample mode: 2+ samples render as tabs. Wins over `code`/`language`. |
| `activeSampleId` | `string` | no | Controlled active sample id. Wins over `syncKey` and the user's own pick. |
| `defaultSampleId` | `string` | no | Initial sample id when uncontrolled and nothing is synced. Defaults to the first sample. |
| `onSampleChange` | `((id: string) => void)` | no | Called with the new id when the user picks a tab in THIS block (not when a synced block changes it). |
| `syncKey` | `string` | no | Blocks sharing a `syncKey` switch together: picking `py` in one selects `py` in every block with the same key that has a `py` sample. In-memory, per page load. |
| `highlightLines` | `CodeBlockHighlightLines` | no | Lines to emphasise (visual only — explain the emphasis in prose). |
| `maxHeight` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | no | Caps the body height; the body scrolls inside it (it is always a focusable, named region). `xs` 200px · `sm` 320px · `md` 448px · `lg` 640px · `xl` 800px. Default: no cap. |
| `defaultWrap` | `boolean` | no | Initial state of the wrap-lines toggle. Default `false` (long lines scroll horizontally). |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **Languages:** `json`, `bash`, `javascript`, `typescript`, `python` (aliases `sh`, `shell`, `js`, `ts`, `py`). Unknown languages render as plain text.
- **Header label** is `title`, then the label of a one-item `samples` array, then the language name, then "Plain text".
- **Accessibility:** the code body is always keyboard-focusable. Single mode is a `role="group"` named by `title` (fallback "Code"); multi mode is a tabpanel labelled by its tab.
- **`highlightLines` is visual only.** Explain the emphasis in the surrounding prose.
- **`syncKey` is in-memory** (per page load). The library never touches storage: persist the choice in the app via `defaultSampleId` + `onSampleChange`.
- **Active sample precedence:** controlled `activeSampleId`, then `syncKey`, then the user's own pick, then `defaultSampleId`, then the first sample. An `activeSampleId` that matches no sample id falls through to the next rule.
- Renders identically on the server (SSR-safe).

#### When NOT to use

- ❌ Inline code inside a sentence: use `Code`.
- ❌ Editable code: use `LiquidEditor` / `RichTextEditor`.
- ❌ A language outside the list above and you expect colours: it renders as plain text.
