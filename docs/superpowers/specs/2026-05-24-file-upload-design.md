# FileUpload — design spec

**Date:** 2026-05-24
**Branch:** `feat/file-upload-impl`
**Scope:** Add `<FileUpload>` to `@eocrm/design-system` — a controlled, dropzone-style file picker that handles selection + validation + per-file row rendering, and emits semantic callbacks for the consumer's upload/state code.

## Goal

Stop CRM pages from hand-rolling drag-and-drop dropzones, file-row lists, and validation logic. Today no consumer of the library can attach a file without writing all of that themselves. The component delivers a token-correct dropzone UI + a complete validation surface + a controlled file-row list that consumers feed back upload status into via `<Progress>` (which just shipped in PR #56).

## Why now

- Progress + CircularProgress just merged. The per-file row's "uploading" indicator is the canonical first consumer of `<Progress size="sm">`.
- CRM has real upcoming needs: contact CSV import, deal-attachment uploads, profile-image picker. All three need the same primitive shape.
- The library has no file-input primitive at all. Every new page currently invents its own.

## Non-goals (v1)

- **No XHR / fetch / upload network logic.** Pure UI shell. Consumer owns the network code, abort, retries, presigned URLs, multi-part, Tus, etc.
- **No `<UploadQueue>` / hook helper.** Defer until a real second consumer shows up — premature abstraction.
- **No image thumbnails.** Generic file icons only. Adding thumbnails brings `FileReader` / `createObjectURL` lifecycle complexity; defer.
- **No paste-from-clipboard support.** Drag + click only.
- **No directory upload (`webkitdirectory`).** Single + multi file selection only.
- **No `<Kbd>` shortcut hints.** YAGNI.
- **No render-prop API** (`getInputProps` / `getRootProps`). FileUpload owns its DOM. Consumers wanting full custom control compose `<Card>` + raw `<input>` themselves.
- **No "compact" / "inline" variant.** Dropzone-only. The library already exposes `<Button>` + native `<input>` if a consumer wants a bare picker button.
- **No global drag overlay** ("drop anywhere on the page"). Only the dropzone surface accepts drops.
- **No "drop here to replace" UX for single mode.** In single mode, the dropzone hides once a file is present; user clicks the X to remove and re-add. Replacing in place would conflict with the controlled-state model.
- **No uncontrolled / "minimal usage" mode.** Always controlled — consumer always passes `files` + `onFilesAdded` + `onFileRemove`. Simpler API surface; matches the pure-UI-shell architecture.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- `lucide-react` for the dropzone icon (`CloudUpload`), per-row file-type icons (`File`, `FileText`, `FileImage`), the done check (`Check`), and the remove button (`X`). Already declared as a peer dependency in `packages/design-system/package.json` and used by Accordion / DataTable / Modal / Alert / Breadcrumb — no new dependency needed.
- `<Progress>` (just shipped) for per-file row uploading bars
- `<Button>` for the "Browse" button inside the dropzone (text-link styled)
- Existing tokens: `--color-accent`, `--color-accent-bg-subtle`, `--color-border`, `--color-bg-muted`, `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`, `--color-danger`, `--color-success`, `--color-bg`, `--space-2`, `--space-3`, `--space-4`, `--radius-md`, `--font-size-sm`, `--font-size-md`, `--font-weight-medium`, `--transition-base`.

No new tokens needed.

### File layout

```
packages/design-system/src/components/FileUpload/
  FileUpload.tsx                ← root component (forwardRef, drop/click handlers, validation, dispatch)
  FileUpload.module.scss        ← dropzone + file-row + drag-over + disabled
  FileUpload.test.tsx           ← ~25 cases
  formatBytes.ts                ← internal helper: bytes → "1.2 MB"
  iconForFile.ts                ← internal helper: file.type/name → lucide icon component
  index.ts                      ← exports FileUpload + types

packages/design-system/src/index.ts                                ← MODIFY: re-exports
packages/design-system/AGENTS.md                                   ← MODIFY: add FileUpload section under Forms

packages/playground/src/pages/components/FileUploadDemo.tsx        ← NEW
packages/playground/src/App.tsx                                    ← MODIFY: add route
packages/playground/src/layout/AppShell/AppShell.tsx               ← MODIFY: add to "Forms" group
packages/playground/src/pages/components/ComponentsIndex.tsx       ← MODIFY: add card
packages/playground/src/pages/mockups/registry.ts                  ← MODIFY: extend ComponentName union
```

The two helper files (`formatBytes`, `iconForFile`) are small (~15 LOC each) and stay private to the FileUpload directory. Not re-exported from `index.ts`.

### Composition example

```tsx
function ContactImport() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  return (
    <FileUpload
      files={files}
      multiple
      accept=".csv,application/vnd.ms-excel"
      maxSize={5 * 1024 * 1024}
      maxFiles={3}
      onFilesAdded={(added) => {
        const entries = added.map((f) => ({
          id: crypto.randomUUID(),
          file: f,
          status: 'pending' as const,
        }));
        setFiles((prev) => [...prev, ...entries]);
        entries.forEach((e) => uploadAndTrack(e, setFiles));
      }}
      onFileRemove={(entry) => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
      onFileReject={(file, reason) => toast.error(`${file.name}: ${reason}`)}
    />
  );
}

// Consumer's upload function progresses the entry through statuses:
async function uploadAndTrack(entry, setFiles) {
  setFiles((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: 'uploading', progress: 0 } : e)));
  try {
    await uploadToS3(entry.file, (pct) => {
      setFiles((prev) => prev.map((e) => (e.id === entry.id ? { ...e, progress: pct } : e)));
    });
    setFiles((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: 'done', progress: 100 } : e)));
  } catch (err) {
    setFiles((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, status: 'error', error: err.message } : e)),
    );
  }
}
```

## Public API

### Types

```ts
import type { HTMLAttributes, ReactNode } from 'react';

/** Lifecycle status for a file in the controlled `files` array. */
export type FileUploadStatus = 'pending' | 'uploading' | 'done' | 'error';

/** Reason a file was rejected by built-in or custom validation. */
export type FileRejectReason =
  | 'invalid-type' // didn't match `accept`
  | 'too-large' // exceeded `maxSize`
  | 'too-many' // would exceed `maxFiles`
  | 'duplicate' // matched an existing entry by name+size
  | 'custom'; // `validator` returned a non-null string

/** One entry in the controlled file list. */
export interface FileEntry {
  /**
   * Stable ID for React keys and consumer bookkeeping. Consumer assigns
   * (typically `crypto.randomUUID()` when handling `onFilesAdded`).
   * File objects don't have stable identity in JS, so this is required.
   */
  id: string;
  /** The underlying browser File. */
  file: File;
  /** Lifecycle status. Drives the per-row rendering. */
  status: FileUploadStatus;
  /**
   * 0–100. Only meaningful when status='uploading' (renders via `<Progress>`).
   * Ignored otherwise. Omitting it during upload renders the row with an
   * indeterminate `<Progress>` (no value).
   */
  progress?: number;
  /** Error message rendered when status='error'. */
  error?: string;
}

export interface FileUploadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Controlled file list. The component renders this; consumer owns the state. */
  files: FileEntry[];
  /**
   * Called when the user drops or picks new files AND those files pass
   * validation. The component does NOT mutate state — consumer is responsible
   * for adding the returned `File[]` to `files` (typically wrapped in
   * `FileEntry` shape with new IDs).
   */
  onFilesAdded: (files: File[]) => void;
  /** Called when the user clicks the X on a file row. Consumer removes from `files`. */
  onFileRemove: (entry: FileEntry) => void;
  /**
   * Called when a file fails validation. `reason` is one of `FileRejectReason`;
   * `message` is the custom message from `validator` (only present when
   * reason='custom'). Use for toasts or inline error rendering.
   */
  onFileReject?: (file: File, reason: FileRejectReason, message?: string) => void;
  /**
   * Allow multi-file selection. Default `false`. In single mode (default),
   * `files` should have at most 1 entry; the dropzone hides once a file is
   * present and re-appears after removal.
   */
  multiple?: boolean;
  /**
   * Accepted file types — MIME types and/or extensions, comma-separated.
   * Forwarded to the native `<input accept>` attribute AND used for the
   * built-in `invalid-type` validation. Default: no filter.
   *
   * Examples:
   * - `accept="image/*"` — any image
   * - `accept=".csv,application/vnd.ms-excel"` — CSV or Excel
   * - `accept="application/pdf,image/png,image/jpeg"` — explicit MIME list
   */
  accept?: string;
  /**
   * Per-file size cap in bytes. Default: no limit.
   * Files exceeding this fire `onFileReject` with reason `'too-large'`.
   */
  maxSize?: number;
  /**
   * Total file count cap. Only meaningful when `multiple=true`. Counts existing
   * entries in `files` PLUS new files being added. Default: no limit.
   * Excess files fire `onFileReject` with reason `'too-many'`.
   */
  maxFiles?: number;
  /**
   * Custom validation hook. Return `null` for valid; return a string error
   * message for invalid (fires `onFileReject` with reason='custom', message=
   * the returned string). Runs LAST in the validation chain (after type,
   * size, count, duplicate checks).
   */
  validator?: (file: File) => string | null;
  /**
   * Disable the entire component. Dropzone shows muted, drag/click handlers
   * are no-ops, remove buttons disabled. Default `false`.
   */
  disabled?: boolean;
  /**
   * Override the dropzone's main label. Default: "Drag files here, or click
   * to browse". Pass a ReactNode for richer content (e.g. with a `<Code>`
   * for accepted extensions).
   */
  dropzoneLabel?: ReactNode;
  /**
   * Override the dropzone icon. Default: lucide `CloudUpload` at 32px.
   * Pass an SVG ReactNode or another icon component instance.
   */
  dropzoneIcon?: ReactNode;
  /**
   * Optional secondary line under the main label, typically describing
   * accepted formats / size limits. Renders muted at `--font-size-sm`.
   * Default: undefined (no secondary text).
   */
  dropzoneHint?: ReactNode;
}
```

### Render shape

```tsx
<div ref={ref} className={clsx(styles.root, disabled && styles.disabled, className)} {...rest}>
  {showDropzone && (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={typeof dropzoneLabel === 'string' ? dropzoneLabel : 'Upload files'}
      aria-disabled={disabled || undefined}
      className={clsx(styles.dropzone, isDragOver && styles.dragOver)}
      onDragEnter={…}
      onDragOver={…}
      onDragLeave={…}
      onDrop={…}
      onClick={openPicker}
      onKeyDown={handleKey}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        onChange={onInputChange}
        className={styles.hiddenInput}
        tabIndex={-1}
        aria-hidden
      />
      <span className={styles.dropzoneIcon}>{dropzoneIcon ?? <CloudUpload size={32} />}</span>
      <span className={styles.dropzoneLabel}>
        {dropzoneLabel ?? <>Drag files here, or <span className={styles.browseLink}>click to browse</span></>}
      </span>
      {dropzoneHint && <span className={styles.dropzoneHint}>{dropzoneHint}</span>}
    </div>
  )}
  {files.length > 0 && (
    <ul className={styles.list}>
      {files.map((entry) => (
        <li key={entry.id} className={clsx(styles.row, styles[`row-${entry.status}`])}>
          <span className={styles.rowIcon}>{iconForFile(entry.file)}</span>
          <span className={styles.rowName} title={entry.file.name}>{entry.file.name}</span>
          <span className={styles.rowMeta}>{formatBytes(entry.file.size)}</span>
          {entry.status === 'uploading' && (
            <Progress
              size="sm"
              value={entry.progress}
              aria-label={`Uploading ${entry.file.name}`}
            />
          )}
          {entry.status === 'error' && entry.error && (
            <span className={styles.rowError}>{entry.error}</span>
          )}
          {entry.status === 'done' && <Check className={styles.rowDone} size={16} aria-label="Done" />}
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => onFileRemove(entry)}
            disabled={disabled}
            aria-label={`Remove ${entry.file.name}`}
          >
            <X size={16} />
          </button>
        </li>
      ))}
    </ul>
  )}
</div>
```

Where `showDropzone = multiple || files.length === 0`.

### Validation pipeline

When the user drops or picks N files, the component processes them in order:

1. **Type check** — if `accept` is set, compare `file.type` against the accept list (MIME or extension match). Rejected → `onFileReject(file, 'invalid-type')`.
2. **Size check** — if `maxSize` is set, compare `file.size`. Rejected → `onFileReject(file, 'too-large')`.
3. **Count check** — if `multiple` is set AND `maxFiles` is set, count `files.length + (accepted so far)`. If exceeded → `onFileReject(file, 'too-many')`. (Note: in single mode, `maxFiles` is ignored; the dropzone allows at most 1 entry at a time.)
4. **Duplicate check** — compare `file.name + file.size` against existing entries in `files`. Rejected → `onFileReject(file, 'duplicate')`.
5. **Custom validator** — call `validator(file)` if provided. If it returns a string → `onFileReject(file, 'custom', message)`.

Only files that pass ALL five checks are batched into a single `onFilesAdded(files: File[])` call.

In **single mode** (`multiple=false`): the count check uses an implicit cap of 1. If the user drops N > 1 files in a single drop, the first valid file is accepted; subsequent files fire `onFileReject(file, 'too-many')`. This matches the validation pipeline running per-file in order. The dropzone is hidden once `files.length === 1` so the user can't drop again until they remove the existing file.

## Styling — `FileUpload.module.scss`

```scss
.root {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-fg-muted);
  cursor: pointer;
  transition:
    border-color var(--transition-base),
    background var(--transition-base);

  &:hover,
  &:focus-visible {
    border-color: var(--color-accent);
    color: var(--color-fg);
    outline: none;
  }
}

.dragOver {
  border-color: var(--color-accent);
  border-style: solid;
  background: var(--color-accent-bg-subtle);
  color: var(--color-fg);
}

.dropzoneIcon {
  color: var(--color-fg-subtle);
}

.dropzoneLabel {
  font-size: var(--font-size-md);
  text-align: center;
}

.browseLink {
  color: var(--color-accent);
  font-weight: var(--font-weight-medium);
  text-decoration: underline;
}

.dropzoneHint {
  font-size: var(--font-size-sm);
  color: var(--color-fg-subtle);
  text-align: center;
}

.hiddenInput {
  // Visually hidden but kept in the DOM so the dropzone click can trigger it.
  // stylelint-disable-next-line property-disallowed-list -- component-internal positioning to hide the native input
  position: absolute;
  width: 1px;
  height: 1px;
  // stylelint-disable-next-line property-disallowed-list -- visually-hidden pattern
  padding: 0;
  // stylelint-disable-next-line property-disallowed-list -- visually-hidden pattern
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  // stylelint-disable-next-line property-disallowed-list -- native <ul> margin reset
  margin: 0;
  // stylelint-disable-next-line property-disallowed-list -- native <ul> padding reset
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}

.rowIcon {
  display: flex;
  color: var(--color-fg-subtle);
}

.rowName {
  font-size: var(--font-size-md);
  color: var(--color-fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.rowMeta {
  font-size: var(--font-size-sm);
  color: var(--color-fg-subtle);
  font-variant-numeric: tabular-nums;
}

.rowError {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}

.rowDone {
  color: var(--color-success);
}

// row-error variant tints the row's border
.row-error {
  border-color: var(--color-danger);
}

.removeButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-fg-subtle);
  cursor: pointer;
  transition: background var(--transition-base);

  &:hover:not(:disabled),
  &:focus-visible {
    background: var(--color-bg-muted);
    color: var(--color-fg);
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.disabled .dropzone {
  cursor: not-allowed;
  opacity: 0.6;
  pointer-events: none;
}
```

**Rule 4 check:**

- `.root width: 100%` — intrinsic, not layout-at-boundary. Same pattern as `<Progress>`. OK.
- `.removeButton width/height: 24px` — internal child sizing for the X icon-button. OK.
- `.hiddenInput position: absolute + margin: -1px + padding: 0` — visually-hidden pattern (component-internal). All with `// stylelint-disable-next-line property-disallowed-list` inline disables.
- `.list margin: 0; padding: 0` — native `<ul>` reset (component-internal). Inline disables.
- `.row grid-template-columns: auto 1fr auto auto` — internal grid layout. OK.
- No `margin` at the boundary. No `top/left/right/bottom` except for the hidden-input visually-hidden pattern.

**A11y check:**

- Dropzone `role="button"` + `tabIndex={0}` + Enter/Space key handler — keyboard equivalents for the click path.
- Native hidden `<input type="file">` is the actual picker; the dropzone click triggers `inputRef.current?.click()`. Screen readers see the dropzone as a button.
- `aria-label` on dropzone defaults to the label text; consumer can override via the prop or via spread.
- File rows are `<li>` inside `<ul>` — SR announces "list with N items".
- Remove button has `aria-label="Remove {filename}"`. Disabled state communicated via `disabled` attribute.
- `Progress` inside an uploading row carries its own `role="progressbar"` and `aria-label`.

## ARIA + behavior reference

| Concern                  | Behavior                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dropzone role**        | `role="button"` on the outer dropzone div. `tabIndex=0` when not disabled, `-1` when disabled.                                                                           |
| **Hidden input**         | `<input type="file" tabIndex={-1} aria-hidden>` — focus management goes through the dropzone, not the input.                                                             |
| **Keyboard activation**  | Enter and Space on the focused dropzone call `inputRef.current?.click()`.                                                                                                |
| **Drag-over feedback**   | `.dragOver` class adds solid accent border + accent-tinted bg. Internal state only — no consumer props for drag-over.                                                    |
| **Drag dispatch counter** | Use a ref-tracked depth counter to handle nested drag events (dragenter/dragleave fire on children too). Increment on enter, decrement on leave, dragOver=true while >0. |
| **File-row semantic**    | `<ul>` of `<li>`. Screen readers announce "list with N items".                                                                                                          |
| **Remove button**        | `aria-label="Remove {filename}"`. Native `<button type="button">`. Disabled when `disabled=true` (whole component).                                                       |
| **Validation feedback**  | NO inline error rendering at the dropzone level. Consumer hears about rejections via `onFileReject` and decides where to render (toast, inline, etc.).                  |
| **Per-row error**        | When `entry.status === 'error'`, the row's `error` text renders in the row in danger color, AND the row's border is danger color.                                       |
| **Progress integration** | When `entry.status === 'uploading'`, `<Progress size="sm" value={entry.progress}>` renders. Omitting `progress` shows indeterminate.                                    |
| **Single mode**          | `multiple=false` → dropzone hides when `files.length > 0`. New picks/drops still validate against the existing entry (duplicate check fires).                            |

## Testing

`FileUpload.test.tsx` (~25 cases):

1. Renders the dropzone with default label
2. Hides the dropzone in single mode once `files.length === 1`
3. Keeps dropzone visible in multi mode regardless of `files.length`
4. Renders one `<li>` per file with the file name + formatted size
5. Renders a `<Progress>` inside the row when `status='uploading'`
6. Renders the error message when `status='error'`
7. Renders the done check icon when `status='done'`
8. Clicking the remove X fires `onFileRemove(entry)` with the right entry
9. Dropping a single valid file fires `onFilesAdded([file])`
10. Dropping multiple files in multi mode fires `onFilesAdded([f1, f2, f3])`
11. Dropping a file with disallowed type fires `onFileReject(file, 'invalid-type')` and NOT `onFilesAdded`
12. Dropping a file exceeding `maxSize` fires `onFileReject(file, 'too-large')`
13. Dropping a file that would exceed `maxFiles` fires `onFileReject(file, 'too-many')`
14. Dropping a duplicate (same name+size as existing entry) fires `onFileReject(file, 'duplicate')`
15. Custom validator returning a string fires `onFileReject(file, 'custom', message)`
16. Custom validator returning null lets the file through
17. Multiple files where some pass and some fail: passing ones in one `onFilesAdded` call; failing ones each in their own `onFileReject` call
18. Single mode + 3 files dropped in one drop: `onFilesAdded` fires once with `[file1]`; `onFileReject` fires twice with reason='too-many' for the remaining two
19. `disabled` makes the dropzone non-interactive (drop and click both no-op)
20. `disabled` disables remove buttons
21. Enter / Space on focused dropzone triggers the hidden input click
22. ARIA: dropzone has `role="button"`, `aria-label`, `aria-disabled` when disabled
23. ARIA: each row's remove button has `aria-label="Remove {filename}"`
24. `formatBytes` rendering: a 1024-byte file renders `'1 KB'` in the row meta; a 1.5 MB file renders `'1.5 MB'`. Tested via the rendered DOM (helper is private to the directory, not exported, not tested directly).
25. `iconForFile` rendering: image/png → FileImage SVG; text/csv → FileText SVG; application/pdf → FileText SVG; unknown MIME → File SVG. Tested via the rendered DOM.

## Demo additions

`FileUploadDemo.tsx` (~6 examples):

1. **Basic single** — `<FileUpload>` with no props except controlled state. Drop or click to add ONE file, X to remove.
2. **Multiple with limits** — `multiple maxFiles={5} maxSize={10*1024*1024} accept=".pdf,image/*"`. Shows hint text under the label.
3. **Status walkthrough** — interactive: a "Start upload" button that walks the file from pending → uploading (with progress slider) → done. Shows all 4 row states.
4. **Error state** — a row with `status='error'` and an error message; the row's border is danger color.
5. **Disabled** — the dropzone shows grayed; X buttons disabled.
6. **Custom validator** — reject files with names containing "test" via a `validator` prop. Shows the `onFileReject` callback firing.

## AGENTS.md update

Add a `<FileUpload>` section in `packages/design-system/AGENTS.md` placed AFTER the `<RadioGroup>` section (line 363) and BEFORE the `<Card>` section (line 382). RadioGroup ends the form-input cluster (Input → Textarea → PasswordInput → PasswordStrengthMeter → Checkbox → Switch → Radio → RadioGroup → **FileUpload**) and Card starts the layout/container cluster.

Section contents:

- API table (props: files, onFilesAdded, onFileRemove, onFileReject, multiple, accept, maxSize, maxFiles, validator, disabled, dropzoneLabel, dropzoneIcon, dropzoneHint).
- The `FileEntry` and `FileRejectReason` type tables.
- A canonical snippet showing the full controlled state machine (the `ContactImport` example above).
- "Hard rule" callout:
  - ❌ Hand-rolling a `<input type="file">` + dashed-border div per page. Use `<FileUpload>`.
  - ❌ Wiring upload progress with a custom bar — use the `progress` field on `FileEntry`, which renders via `<Progress>` automatically.
  - ❌ Storing the file list in the component (it doesn't have internal state). Always pass `files` + the two callbacks.
  - ❌ Setting `multiple=true` and showing only one file slot. The component decides dropzone visibility from `multiple` + `files.length`.

## Self-imposed constraints / decisions baked in

- **Fully controlled, no uncontrolled mode.** Matches react-table, controlled inputs, and the component's pure-UI-shell architecture.
- **No imperative API.** No refs that expose `clear()`, `openPicker()`, etc. Consumers wanting "open the picker programmatically" use the standard `inputRef.current?.click()` pattern via their own ref on a button.
- **`maxFiles` is multi-mode only.** In single mode the component caps at 1 internally; passing `maxFiles` in single mode is silently ignored (TS doesn't enforce — runtime documentation).
- **No "drop indicator" arrow or chevron** during drag-over. The border color + bg tint is the only feedback.
- **Default dropzone height isn't fixed.** The component grows to fit its content (icon + label + hint). Consumers wanting a specific height pass `style={{ minHeight: 200 }}` on the root — escape hatch, not a prop.
- **`accept` is forwarded raw to `<input>` AND parsed for validation.** A consumer passing `accept="image/*,.pdf"` gets both browser-side filtering (the file picker hides non-matching files) and JS-side rejection (if a user drags a non-matching file, it's still validated and rejected).
- **`formatBytes` uses 1024 (KiB convention)** but labels as KB / MB / GB for consumer familiarity. Documented in the helper's JSDoc.
- **The Progress component is imported AS-IS.** No wrapping. The row passes `size="sm"` so the bar is 4px tall — matches the row's tight vertical rhythm.

## Hard Rule 8

Standard cycle: gates green, fresh-context reviewer, fix Critical + Important, repeat until clean.

## Open questions

None — all design-space questions from the brainstorm were resolved during the API draft. The pre-implementation open questions in the brainstorm output (maxSize enforcement, rejection retry, removable-during-upload) are answered in the spec body above.
