# `<CodeBlock>` — highlighted, copyable code sample

```tsx
<CodeBlock language="json" code={'{ "id": 42 }'} />;

// Persist the choice: ONE shared state for every block of the group (see below).
const [lang, setLang] = usePersistedSample('api-lang');

<CodeBlock samples={samples} activeSampleId={lang} onSampleChange={setLang} />;
```

```tsx
// Call once at page/layout level and pass the same pair to every block.
function usePersistedSample(storageKey: string) {
  const [id, setId] = useState<string>();
  // Client-only read in an effect so server and client render the same first frame.
  useEffect(() => {
    try {
      setId(localStorage.getItem(storageKey) ?? undefined);
    } catch {} // storage blocked
  }, [storageKey]);
  const set = (next: string) => {
    setId(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {} // storage blocked
  };
  return [id, set] as const;
}
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | no | Single-sample mode: the source. Ignored when `samples` is set. |
| `language` | `(string & {}) \| CodeBlockLanguage` | no | Single-sample mode: grammar for highlighting — `'json'`, `'bash'`, `'javascript'`, `'typescript'` or `'python'` (aliases `sh`, `shell`, `js`, `ts`, `py`). Anything else renders as plain text. |
| `title` | `string` | no | Header label in single-sample mode. Defaults to a one-item `samples` entry's `label`, else the language name (`JSON`, `Bash`…), else "Plain text". Also names the body (single-sample) or the sample tabs (multi-sample). |
| `samples` | `readonly CodeBlockSample[]` | no | Multi-sample mode: 2+ samples render as tabs. Wins over `code`/`language`. |
| `activeSampleId` | `string` | no | Controlled active sample id. Wins over `syncKey` and the user's own pick. |
| `defaultSampleId` | `string` | no | Initial sample id when uncontrolled and nothing is synced. Defaults to the first sample. |
| `onSampleChange` | `((id: string) => void)` | no | Called with the new id when the user picks a tab in THIS block (not when a synced block changes it). |
| `syncKey` | `string` | no | Blocks sharing a `syncKey` switch together: picking `py` in one selects `py` in every block with the same key that has a `py` sample. In-memory, per page load; for uncontrolled blocks (controlled blocks sharing one state don't need it). |
| `highlightLines` | `CodeBlockHighlightLines` | no | Lines to emphasise (visual only — explain the emphasis in prose). |
| `maxHeight` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | no | Caps the body height; the body scrolls inside it (it is always a focusable, named region). `xs` 200px · `sm` 320px · `md` 448px · `lg` 640px · `xl` 800px. Default: no cap. |
| `defaultWrap` | `boolean` | no | Initial state of the wrap-lines toggle. Default `false` (long lines scroll horizontally). |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **Languages:** `json`, `bash`, `javascript`, `typescript`, `python` (aliases `sh`, `shell`, `js`, `ts`, `py`). Unknown languages render as plain text.
- **Header label** is `title`, then the label of a one-item `samples` array, then the language name, then "Plain text".
- **Accessibility:** the code body is always keyboard-focusable. Single mode is a `role="group"` named by the header label (`title`, else the one-item sample label, else the language name, else "Plain text"); multi mode is a tabpanel labelled by its tab, and `title` names the tablist.
- **`highlightLines` is visual only.** Explain the emphasis in the surrounding prose.
- **`syncKey` is in-memory** (per page load) and is for UNCONTROLLED blocks. The library never touches storage. To persist, own the choice as ONE piece of state shared by every block of the group (the `usePersistedSample` hook above, called once at page/layout level, or React context) and give every block `activeSampleId={lang}` + `onSampleChange={setLang}`. Controlled blocks don't need `syncKey`: the shared state keeps them in step. Do NOT give each block its own `useState` plus `syncKey`: the controlled `activeSampleId` wins over `syncKey`, so return visits would leave blocks out of sync. `defaultSampleId` is only the static initial choice.
- **Sample ids** are used in DOM ids: don't put spaces in them.
- **Active sample precedence:** controlled `activeSampleId`, then `syncKey`, then the user's own pick, then `defaultSampleId`, then the first sample. An `activeSampleId` that matches no sample id falls through to the next rule.
- Renders identically on the server (SSR-safe).

#### When NOT to use

- ❌ Inline code inside a sentence: use `Code`.
- ❌ Editable code: use `LiquidEditor` / `RichTextEditor`.
- ❌ A language outside the list above and you expect colours: it renders as plain text.
