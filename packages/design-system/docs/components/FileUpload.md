# `<FileUpload>` — controlled file picker with dropzone

```tsx
<FileUpload
  files={files}                                  // controlled FileEntry[]
  onFilesAdded={(files) => /* wrap with id + status: 'pending' */}
  onFileRemove={(entry) => /* remove from state */}
  onFileReject={(file, reason) => toast.error(`${file.name}: ${reason}`)}
  multiple
  accept=".csv,application/vnd.ms-excel"
  maxSize={10 * 1024 * 1024}
  maxFiles={5}
  validator={(f) => f.name.includes(' ') ? 'No spaces in filenames' : null}
  dropzoneHint="CSV or Excel, up to 10 MB"
/>
```

- **Pure UI shell.** Consumer owns the `files: FileEntry[]` state and the network code. The component handles drag/drop + click + validation + per-row rendering ONLY.
- **Inside `<Field>` / `<SettingRow>`:** the wired `id` goes on the hidden `<input type="file">` (the only labelable element), so clicking the row's label opens the picker; `invalid` marks the dropzone `aria-invalid`; `required` only drives the row's visible marker (a hidden native `required` would block submit invisibly — your state owns the files).
- `FileEntry`: `{ id: string, file: File, status: 'pending' | 'uploading' | 'done' | 'error', progress?: number, error?: string }`. Consumer assigns `id` (typically `crypto.randomUUID()`); File has no stable identity in JS.
- **Status drives the row:** `uploading` renders `<Progress size="sm" value={progress}>`; `error` renders the error string in danger color and tints the row border; `done` renders a green check icon; `pending` is neutral. The remove button (X) is always visible regardless of status.
- **Validation pipeline** (per file, in order): type (`accept`) → size (`maxSize`) → count (`maxFiles`, multi mode only) → duplicate (name + size) → custom (`validator`). First failure fires `onFileReject(file, reason, message?)`; passing files batch into ONE `onFilesAdded(File[])` call.
- **Single mode (default):** implicit count cap of 1. Dropzone HIDES once `files.length === 1` and re-appears after the user removes the file. Multi-file drops in single mode → first valid file accepted, rest rejected as `'too-many'`.
- **Defensive guards.** `NaN`, `Infinity`, and `max <= 0` on the underlying `<Progress>` fall back to indeterminate — covers the file-upload race condition where `bytes_uploaded / total_bytes` produces NaN before the total is known.
- **Drag and click both open the same hidden `<input type="file">`.** Drag is mouse-only; keyboard users use the dropzone's `role="button"` + Enter/Space to open the picker.
- `disabled`: dropzone shows grayed, drag/click no-op, remove buttons disabled.
- `dropzoneLabel`, `dropzoneIcon`, `dropzoneHint` override the dropzone's default content. **A11y note:** when `dropzoneLabel` is a ReactNode (not a plain string), the component falls back to `aria-label="Upload files"` — pass `aria-label` via the spread for a screen-reader-equivalent description.

#### `FileRejectReason`

- `'invalid-type'` — didn't match `accept`
- `'too-large'` — exceeded `maxSize`
- `'too-many'` — would exceed `maxFiles` (or the implicit cap of 1 in single mode)
- `'duplicate'` — same name + size as an existing entry
- `'custom'` — `validator` returned a non-null string (message passed as 3rd arg to `onFileReject`)

#### Hard rule

- ❌ Hand-rolling a `<input type="file">` + dashed-border div per page. Use `<FileUpload>`.
- ❌ Wiring upload progress with a custom bar — use the `progress` field on `FileEntry`, which renders via `<Progress>` automatically.
- ❌ Storing the file list in the component (it has no internal state). Always pass `files` + the two callbacks.
- ❌ Setting `multiple=true` and showing only one file slot via custom CSS. The component decides dropzone visibility from `multiple` + `files.length`; don't fight it.
- ❌ Calling `onFilesAdded` from inside `onFileReject` (or vice versa) in an attempt to "auto-retry." Reject is terminal for that file; the user has to re-drop.
