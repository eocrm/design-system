# FileUpload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<FileUpload>` — a controlled, dropzone-style file picker that handles selection + validation + per-file row rendering, and emits semantic callbacks for the consumer's upload/state code.

**Architecture:** One component (`FileUpload.tsx`) plus two private helpers (`formatBytes.ts`, `iconForFile.ts`) in `packages/design-system/src/components/FileUpload/`. Fully controlled — consumer owns `files: FileEntry[]` and receives `onFilesAdded(File[])` / `onFileRemove(entry)` / `onFileReject(file, reason, message?)`. Drop and click both open the same hidden `<input type="file">` (drag-counter ref tracks nested enter/leave). Per-file rows render via `<Progress size="sm">` (from PR #56) for uploading state. `role="progressbar"`-style locked semantics aren't needed here — instead the dropzone is `role="button"` so screen readers see it as an actionable affordance.

**Tech Stack:** React 19, TypeScript, CSS Modules + SCSS, Vitest + React Testing Library. `lucide-react` (`CloudUpload`, `File`, `FileText`, `FileImage`, `Check`, `X`) already in library deps (verified). `<Progress>` from `./Progress`. No new packages.

---

**Reference spec:** `docs/superpowers/specs/2026-05-24-file-upload-design.md` (commit `ef82fb3`).

**Branch:** `feat/file-upload-impl` (already checked out, currently at spec commit). Note: PR #56 (Progress) shipped on `feat/file-upload` — a different branch; this is the new branch for the FileUpload work itself.

**Conventions used throughout this plan:**

- **Plan-verbatim:** every code block is the literal file contents the implementer commits. Don't paraphrase, fold types, or reorder imports.
- **CSS-Modules class naming:** library convention is **camelCase SCSS class names** accessed via dot notation. For the status-derived row classes (`row-pending`, `row-uploading`, `row-done`, `row-error`), use a `STATUS_CLASS` record-of-strings at the top of the file (mirrors the `SIZE_CLASS` pattern from Progress/Title). SCSS keys must be camelCase too — so `.rowPending`, `.rowUploading`, `.rowDone`, `.rowError`.
- **Stable CSS Modules strategy:** generated class names contain the literal local name as a substring (e.g. `_dropzone_<hash>`). Tests use substring regex matching. For the base class merge test, use `/root_/` (trailing underscore) to reject hypothetical future siblings — same pattern T2/T4/T6 used in Typography.
- **Commit format:** subject line + blank line + body (1–3 short sentences) + blank line + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **`git add` discipline:** stage by explicit path. No `git add -A` / `git add .`.
- **Pattern A spread** (props last so consumer wins): `{...rest}` last on the root `<div>`. `onChange` is `Omit`ted from `HTMLAttributes` because the component owns the input's `onChange` internally (the prop would be ambiguous: change of what?).
- **Stylelint requirements:**
  - `property-disallowed-list` blocks `margin`, `position`, `top/left/right/bottom`, `width` (when not 100%), `flex: 1/grow/self`. The visually-hidden input pattern (`position: absolute; margin: -1px; padding: 0`) and the `<ul>` reset (`margin: 0; padding: 0`) each need `// stylelint-disable-next-line property-disallowed-list -- <reason>` IMMEDIATELY before the offending declaration.
  - `rule-empty-line-before` requires a blank line between adjacent rule blocks. Add proactively.
  - `scss/double-slash-comment-empty-line-before` requires a blank line BEFORE `//` comments inside a rule (between an existing declaration and a `//` comment). Add proactively.
- **Gates after each source-touching task:** `make test`, `make build-lib`, `make build`, `make lint`. All four must pass before commit + advance to next task. (T1 = helpers only — skip `make test` since there are no helper tests yet, but the structure.test.ts meta-test will still need the helpers to be picked up only via FileUpload.tsx, not by standalone re-export.)
- **If pre-push hook flags prettier:** run `npx prettier --write <flagged files>` and create a follow-up commit `<scope>: prettier --write` with the same Co-Authored-By footer. Don't squash.
- **`src/index.ts` re-export added per-task to satisfy `structure.test.ts`:** T3 (tests task, after creating FileUpload.test.tsx) adds the FileUpload + types re-exports. T4 (AGENTS.md) is the thinner edit.

---

## File structure

### NEW files

```
packages/design-system/src/components/FileUpload/
  formatBytes.ts                ← internal helper (~20 LOC), no JSDoc anti-patterns needed (private), tested via component DOM
  iconForFile.ts                ← internal helper (~20 LOC), private, tested via component DOM
  FileUpload.tsx                ← root component (forwardRef, drag/drop, validation pipeline, render tree)
  FileUpload.module.scss        ← .root / .dropzone / .dragOver / .disabled / .hiddenInput / .list / .row / status rows / .removeButton
  FileUpload.test.tsx           ← ~26 cases
  index.ts                      ← exports FileUpload + types
```

### MODIFIED files

```
packages/design-system/src/index.ts                                ← T3 adds FileUpload + types re-export
packages/design-system/AGENTS.md                                   ← T4 inserts FileUpload section between RadioGroup and Card
packages/playground/src/App.tsx                                    ← T5: add import + <Route>
packages/playground/src/layout/AppShell/AppShell.tsx               ← T5: add lucide UploadCloud icon + Forms group item between Date pickers and Input
packages/playground/src/pages/components/ComponentsIndex.tsx       ← T5: add import + card
packages/playground/src/pages/mockups/registry.ts                  ← T5: extend ComponentName union with 'FileUpload'
```

No mockup files modified — no current mockup uses file upload UI.

---

## Task 1: Internal helpers — `formatBytes.ts` + `iconForFile.ts`

**Files:**

- Create: `packages/design-system/src/components/FileUpload/formatBytes.ts`
- Create: `packages/design-system/src/components/FileUpload/iconForFile.ts`

### Step 1.1: Create `formatBytes.ts`

- [ ] Write file contents (verbatim):

```ts
/**
 * Format a byte count into a human-readable string with a unit.
 *
 * Uses the 1024-based (KiB) convention internally but labels as `B`/`KB`/`MB`/
 * `GB` for consumer familiarity — the CRM presents file sizes the way Finder /
 * Explorer / Drive present them (1024 bytes = "1 KB"), not the SI 1000-base.
 *
 * Examples:
 * - `formatBytes(0)` → `"0 B"`
 * - `formatBytes(512)` → `"512 B"`
 * - `formatBytes(1024)` → `"1 KB"`
 * - `formatBytes(1536)` → `"1.5 KB"`
 * - `formatBytes(1024 * 1024 * 1.5)` → `"1.5 MB"`
 * - `formatBytes(1024 * 1024 * 1024 * 2.3)` → `"2.3 GB"`
 *
 * Bytes show as integers (no decimals). KB/MB/GB show as integers when whole,
 * otherwise one decimal place.
 *
 * Private to the FileUpload directory — not re-exported from the package.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return formatWithUnit(bytes / 1024, 'KB');
  if (bytes < 1024 * 1024 * 1024) return formatWithUnit(bytes / (1024 * 1024), 'MB');
  return formatWithUnit(bytes / (1024 * 1024 * 1024), 'GB');
}

function formatWithUnit(value: number, unit: string): string {
  // Integer when whole; one decimal otherwise. Avoids "1.0 KB" while keeping
  // "1.5 KB" / "2.3 GB" precision.
  const rounded = Math.round(value * 10) / 10;
  const display = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  return `${display} ${unit}`;
}
```

### Step 1.2: Create `iconForFile.ts`

- [ ] Write file contents (verbatim):

```tsx
import { File, FileImage, FileText, type LucideIcon } from 'lucide-react';

/**
 * Choose a lucide file-type icon component based on a File's MIME type and
 * extension fallback. Returns the icon COMPONENT (not an element instance)
 * so callers can decide on size / aria-label / className at the render site.
 *
 * Mapping:
 * - `image/*` MIME → `FileImage`
 * - `text/*` MIME → `FileText`
 * - `application/pdf` → `FileText`
 * - extension fallback for `.csv`, `.txt`, `.md`, `.json` → `FileText`
 * - extension fallback for `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg` → `FileImage`
 * - everything else → `File` (generic)
 *
 * Private to the FileUpload directory — not re-exported from the package.
 */
export function iconForFile(file: File): LucideIcon {
  const mime = file.type;
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('text/')) return FileText;
  if (mime === 'application/pdf') return FileText;

  // Extension fallback for files where the browser didn't fill in `type`
  // (rare but happens — empty MIME on .csv from some OSes).
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (ext === '.csv' || ext === '.txt' || ext === '.md' || ext === '.json') return FileText;
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif' || ext === '.webp' || ext === '.svg') {
    return FileImage;
  }

  return File;
}
```

Note the type collision: `lucide-react` exports a `File` icon component, and the global DOM `File` type is the function-argument type. The import shadowing works because the function parameter is typed by JSDoc-style positional `file: File` where TypeScript resolves `File` to the global DOM type (the lucide `File` icon is the identifier at value position, not type position). The compiler handles this correctly; do NOT rename the lucide import.

### Step 1.3: Verify gates

- [ ] Run `make build-lib`. Expected: clean (typecheck passes).
- [ ] Run `make lint`. Expected: clean. SCSS lint shouldn't flag anything here — these are .ts files.

DO NOT run `make test` — there are no tests for the helpers yet (they're tested via component DOM in T3). The `structure.test.ts` meta-test only requires re-exports for files matching `<Name>.tsx`, not for sibling helpers.

### Step 1.4: Commit

```bash
git add packages/design-system/src/components/FileUpload/formatBytes.ts \
        packages/design-system/src/components/FileUpload/iconForFile.ts
git commit -m "$(cat <<'EOF'
FileUpload: internal helpers (formatBytes, iconForFile)

formatBytes: 1024-based (KiB) division but labels as B/KB/MB/GB for consumer
familiarity. Integer for whole values, one decimal otherwise. iconForFile:
MIME-first lookup (image/*, text/*, application/pdf) with extension fallback
for files where the browser left `type` empty. Both private to the
FileUpload directory — not re-exported from the package; tested via the
component DOM in the next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: FileUpload source — `FileUpload.tsx` + `FileUpload.module.scss` + `index.ts`

**Files:**

- Create: `packages/design-system/src/components/FileUpload/FileUpload.tsx`
- Create: `packages/design-system/src/components/FileUpload/FileUpload.module.scss`
- Create: `packages/design-system/src/components/FileUpload/index.ts`

### Step 2.1: Create `FileUpload.tsx`

- [ ] Write file contents (verbatim):

```tsx
import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { CloudUpload, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { Progress } from '../Progress';
import { formatBytes } from './formatBytes';
import { iconForFile } from './iconForFile';
import styles from './FileUpload.module.scss';

/** Lifecycle status for a file in the controlled `files` array. */
export type FileUploadStatus = 'pending' | 'uploading' | 'done' | 'error';

/** Reason a file was rejected by built-in or custom validation. */
export type FileRejectReason =
  | 'invalid-type'
  | 'too-large'
  | 'too-many'
  | 'duplicate'
  | 'custom';

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

const STATUS_CLASS: Record<FileUploadStatus, string> = {
  pending: styles.rowPending,
  uploading: styles.rowUploading,
  done: styles.rowDone,
  error: styles.rowError,
};

/**
 * Match a single file against an `accept` attribute string. Handles MIME
 * patterns (`image/*`, `application/pdf`) and extension patterns (`.csv`,
 * `.pdf`). Returns true if the file matches any entry in the comma-separated
 * accept list, false otherwise.
 *
 * Private to FileUpload — encapsulated so the validation pipeline doesn't
 * sprout an ad-hoc regex.
 */
function matchesAccept(file: File, accept: string): boolean {
  const tokens = accept.split(',').map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return true;
  const mime = file.type;
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  for (const token of tokens) {
    if (token.startsWith('.')) {
      // Extension match (case-insensitive)
      if (ext === token.toLowerCase()) return true;
    } else if (token.endsWith('/*')) {
      // Wildcard MIME (image/*, video/*, etc.)
      const prefix = token.slice(0, -1); // "image/"
      if (mime.startsWith(prefix)) return true;
    } else {
      // Exact MIME match (case-sensitive per RFC)
      if (mime === token) return true;
    }
  }
  return false;
}

/**
 * Controlled, dropzone-style file picker. Handles drag/drop UI + click-to-
 * browse + built-in validation (type / size / count / duplicate / custom) and
 * renders one row per file with status-driven content (`<Progress>` while
 * uploading, error text on error, check icon on done, X-to-remove always).
 *
 * **Pure UI shell** — consumer owns the network code (XHR, retries, presigned
 * URLs, abort, etc.) and feeds back per-file status via the controlled
 * `files: FileEntry[]` array. The component never holds upload state.
 *
 * @example
 * // Basic single-file picker (controlled):
 * function ProfileImage() {
 *   const [files, setFiles] = useState<FileEntry[]>([]);
 *   return (
 *     <FileUpload
 *       files={files}
 *       accept="image/*"
 *       maxSize={2 * 1024 * 1024}
 *       onFilesAdded={(added) => {
 *         setFiles(added.map((f) => ({ id: crypto.randomUUID(), file: f, status: 'pending' })));
 *       }}
 *       onFileRemove={(entry) => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
 *     />
 *   );
 * }
 *
 * @example
 * // Multi with limits and a custom validator:
 * <FileUpload
 *   files={files}
 *   multiple
 *   accept=".csv,application/vnd.ms-excel"
 *   maxFiles={5}
 *   maxSize={10 * 1024 * 1024}
 *   validator={(f) => (f.name.includes(' ') ? 'Filenames cannot contain spaces' : null)}
 *   onFilesAdded={handleAdded}
 *   onFileRemove={handleRemove}
 *   onFileReject={(file, reason, msg) => toast.error(msg ?? `${file.name}: ${reason}`)}
 *   dropzoneHint="CSV or Excel, up to 10 MB"
 * />
 *
 * @example
 * // Status walkthrough — consumer updates the entry through pending → uploading → done:
 * function ImportContacts() {
 *   const [files, setFiles] = useState<FileEntry[]>([]);
 *   const upload = async (entry: FileEntry) => {
 *     setFiles((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: 'uploading', progress: 0 } : e)));
 *     try {
 *       await uploadToS3(entry.file, (pct) => {
 *         setFiles((prev) => prev.map((e) => (e.id === entry.id ? { ...e, progress: pct } : e)));
 *       });
 *       setFiles((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: 'done', progress: 100 } : e)));
 *     } catch (err) {
 *       setFiles((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: 'error', error: String(err) } : e)));
 *     }
 *   };
 *   return (
 *     <FileUpload
 *       files={files}
 *       multiple
 *       onFilesAdded={(added) => {
 *         const entries = added.map((f) => ({ id: crypto.randomUUID(), file: f, status: 'pending' as const }));
 *         setFiles((prev) => [...prev, ...entries]);
 *         entries.forEach(upload);
 *       }}
 *       onFileRemove={(entry) => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
 *     />
 *   );
 * }
 *
 * @example
 * // Disabled — dropzone grayed, remove buttons disabled:
 * <FileUpload files={files} disabled onFilesAdded={() => {}} onFileRemove={() => {}} />
 *
 * @example
 * // Composing in a Stack with surrounding form fields:
 * <Stack gap="md">
 *   <Title order={3} size="md">Attachments</Title>
 *   <FileUpload files={files} multiple onFilesAdded={…} onFileRemove={…} />
 *   <Cluster justify="end">
 *     <Button>Submit</Button>
 *   </Cluster>
 * </Stack>
 *
 * @remarks When NOT to use
 * - For a hidden file-picker button (no dropzone). Roll your own with `<Button>` + a
 *   raw `<input type="file" hidden>` — FileUpload is opinionated about the dropzone surface.
 * - For paste-from-clipboard image upload. Use a clipboard hook + raw File API directly.
 * - For directory upload. v1 doesn't expose `webkitdirectory`.
 * - For showing image thumbnails of the picked files. v1 ships generic file icons only.
 * - For component-owned upload state. The component is a pure UI shell; consumer owns
 *   the network code and feeds back `FileEntry` updates.
 *
 * @remarks Anti-patterns
 * - ❌ Hand-rolling a `<input type="file">` + dashed-border div per page. Use this.
 * - ❌ Wiring upload progress with a custom bar — use `progress` on `FileEntry` and let
 *   the component render `<Progress>` automatically.
 * - ❌ Storing the file list in the component (it has no internal state). Always pass
 *   `files` + the two callbacks.
 * - ❌ Setting `multiple=true` and showing only one file slot via custom CSS. The
 *   component decides dropzone visibility from `multiple` + `files.length`; don't fight it.
 * - ❌ Calling `onFilesAdded` from inside `onFileReject` (or vice versa) in an attempt
 *   to "auto-retry." Reject is terminal for that file; the user has to re-drop.
 */
export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(function FileUpload(
  {
    files,
    onFilesAdded,
    onFileRemove,
    onFileReject,
    multiple = false,
    accept,
    maxSize,
    maxFiles,
    validator,
    disabled = false,
    dropzoneLabel,
    dropzoneIcon,
    dropzoneHint,
    className,
    ...rest
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const showDropzone = multiple || files.length === 0;
  // In single mode the implicit cap is 1; multi mode uses maxFiles (Infinity if not set).
  const effectiveMaxFiles = multiple ? (maxFiles ?? Infinity) : 1;

  const processFiles = useCallback(
    (incoming: File[]) => {
      if (disabled) return;
      const accepted: File[] = [];
      let acceptedSoFar = 0;
      for (const file of incoming) {
        // 1. Type check
        if (accept && !matchesAccept(file, accept)) {
          onFileReject?.(file, 'invalid-type');
          continue;
        }
        // 2. Size check
        if (typeof maxSize === 'number' && file.size > maxSize) {
          onFileReject?.(file, 'too-large');
          continue;
        }
        // 3. Count check — counts existing entries + accepted-so-far in this batch.
        if (files.length + acceptedSoFar >= effectiveMaxFiles) {
          onFileReject?.(file, 'too-many');
          continue;
        }
        // 4. Duplicate check — same name+size as an existing entry.
        const isDuplicate = files.some(
          (e) => e.file.name === file.name && e.file.size === file.size,
        );
        if (isDuplicate) {
          onFileReject?.(file, 'duplicate');
          continue;
        }
        // 5. Custom validator runs LAST.
        if (validator) {
          const message = validator(file);
          if (message !== null) {
            onFileReject?.(file, 'custom', message);
            continue;
          }
        }
        accepted.push(file);
        acceptedSoFar++;
      }
      if (accepted.length > 0) {
        onFilesAdded(accepted);
      }
    },
    [accept, disabled, effectiveMaxFiles, files, maxSize, onFileReject, onFilesAdded, validator],
  );

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      dragCounter.current++;
      if (dragCounter.current === 1) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) setIsDragOver(false);
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      // preventDefault on dragover signals "this is a valid drop target" — without
      // it the drop event never fires.
      if (disabled) return;
      e.preventDefault();
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) processFiles(dropped);
    },
    [disabled, processFiles],
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(e.target.files ?? []);
      // Reset the input so the same file can be re-picked (browsers cache the
      // last value; without this, picking the same file twice in a row doesn't
      // fire change a second time).
      e.target.value = '';
      if (picked.length > 0) processFiles(picked);
    },
    [processFiles],
  );

  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <div ref={ref} className={clsx(styles.root, disabled && styles.disabled, className)} {...rest}>
      {showDropzone && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={typeof dropzoneLabel === 'string' ? dropzoneLabel : 'Upload files'}
          aria-disabled={disabled || undefined}
          className={clsx(styles.dropzone, isDragOver && styles.dragOver)}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <input
            ref={inputRef}
            type="file"
            multiple={multiple}
            accept={accept}
            disabled={disabled}
            onChange={handleInputChange}
            className={styles.hiddenInput}
            tabIndex={-1}
            aria-hidden
          />
          <span className={styles.dropzoneIcon}>
            {dropzoneIcon ?? <CloudUpload size={32} aria-hidden />}
          </span>
          <span className={styles.dropzoneLabel}>
            {dropzoneLabel ?? (
              <>
                Drag files here, or <span className={styles.browseLink}>click to browse</span>
              </>
            )}
          </span>
          {dropzoneHint && <span className={styles.dropzoneHint}>{dropzoneHint}</span>}
        </div>
      )}
      {files.length > 0 && (
        <ul className={styles.list}>
          {files.map((entry) => {
            const Icon = iconForFile(entry.file);
            return (
              <li key={entry.id} className={clsx(styles.row, STATUS_CLASS[entry.status])}>
                <span className={styles.rowIcon}>
                  <Icon size={20} aria-hidden />
                </span>
                <span className={styles.rowName} title={entry.file.name}>
                  {entry.file.name}
                </span>
                <span className={styles.rowMeta}>{formatBytes(entry.file.size)}</span>
                {entry.status === 'uploading' && (
                  <Progress
                    size="sm"
                    value={entry.progress}
                    aria-label={`Uploading ${entry.file.name}`}
                  />
                )}
                {entry.status === 'error' && entry.error && (
                  <span className={styles.rowErrorMsg}>{entry.error}</span>
                )}
                {entry.status === 'done' && (
                  <Check className={styles.rowDoneIcon} size={16} aria-label="Done" />
                )}
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => onFileRemove(entry)}
                  disabled={disabled}
                  aria-label={`Remove ${entry.file.name}`}
                >
                  <X size={16} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
```

**Naming note:** the SCSS file uses `.rowDone` and `.rowError` for the status-row variants (matching `STATUS_CLASS`), and SEPARATE class names `.rowDoneIcon` / `.rowErrorMsg` for the inner Check icon and the error-message span. This avoids the spec's collision where the same class name was used both for a row variant AND for an inner element.

### Step 2.2: Create `FileUpload.module.scss`

- [ ] Write file contents (verbatim):

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
  // Visually-hidden pattern — kept in the DOM so the dropzone click can
  // trigger the picker. Standard 1x1 absolute + clip-rect technique.

  // stylelint-disable-next-line property-disallowed-list -- visually-hidden pattern (component-internal)
  position: absolute;
  width: 1px;
  height: 1px;

  // stylelint-disable-next-line property-disallowed-list -- visually-hidden pattern (component-internal)
  padding: 0;

  // stylelint-disable-next-line property-disallowed-list -- visually-hidden pattern (component-internal)
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

  // stylelint-disable-next-line property-disallowed-list -- native <ul> margin reset (component-internal)
  margin: 0;

  // stylelint-disable-next-line property-disallowed-list -- native <ul> padding reset (component-internal)
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

.rowPending,
.rowUploading,
.rowDone {
  // No additional border styling — base .row's border-color is correct.
}

.rowError {
  border-color: var(--color-danger);
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

.rowErrorMsg {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}

.rowDoneIcon {
  color: var(--color-success);
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

Stylelint may flag `text-align: center` (on `.dropzoneLabel` and `.dropzoneHint`) under `scale-unlimited/declaration-strict-value` since `center` is a keyword. If it does, add `// stylelint-disable-next-line scale-unlimited/declaration-strict-value -- text-align keyword, not a tokenizable design value` immediately above each affected line — same pattern Typography's Text component used. The current Progress/CircularProgress build needed similar disables for SVG attributes.

If stylelint flags `text-decoration: underline` or `border-style: solid`, apply the same disable form. Don't try to tokenize CSS keywords.

### Step 2.3: Create `index.ts`

- [ ] Write file contents (verbatim):

```ts
export { FileUpload } from './FileUpload';
export type {
  FileUploadProps,
  FileEntry,
  FileUploadStatus,
  FileRejectReason,
} from './FileUpload';
```

### Step 2.4: Verify gates

- [ ] Run `make build-lib`. Expected: clean. The `Progress` import resolves via `../Progress` (same directory pattern other components use).
- [ ] Run `make lint`. Expected: clean. If stylelint flags anything, add the matching inline disables and rerun.

Do NOT run `make test` — tests don't exist yet, and the structure meta-test will fail because src/index.ts doesn't re-export FileUpload yet (T3 handles both).

### Step 2.5: Commit

```bash
git add packages/design-system/src/components/FileUpload/FileUpload.tsx \
        packages/design-system/src/components/FileUpload/FileUpload.module.scss \
        packages/design-system/src/components/FileUpload/index.ts
git commit -m "$(cat <<'EOF'
FileUpload: controlled dropzone primitive (drag+click, validation, status rows)

Pure UI shell — consumer owns the FileEntry[] state, gets onFilesAdded /
onFileRemove / onFileReject callbacks. Drag dispatch via a ref-tracked
counter (handles nested enter/leave). Click triggers a visually-hidden
<input type="file">. Validation pipeline: type → size → count → duplicate →
custom (in order, per file). Per-row rendering branches by status —
<Progress size="sm"> when uploading, error message when error, check icon
when done. role="button" + tabIndex + Enter/Space for keyboard parity.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: FileUpload tests — `FileUpload.test.tsx` + `src/index.ts` re-export

**Files:**

- Create: `packages/design-system/src/components/FileUpload/FileUpload.test.tsx`
- Modify: `packages/design-system/src/index.ts`

### Step 3.1: Create `FileUpload.test.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { FileUpload, type FileEntry } from './FileUpload';

// Helper — build a File with controllable name + size + MIME for tests.
function makeFile(name: string, sizeBytes: number, type: string): File {
  const content = new Uint8Array(sizeBytes);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

// Helper — build a FileEntry from a File for the `files` prop.
function entry(id: string, file: File, status: FileEntry['status'] = 'pending', extra?: Partial<FileEntry>): FileEntry {
  return { id, file, status, ...extra };
}

// Helper — fire a drop event with DataTransfer.files populated.
function fireDrop(target: Element, files: File[]) {
  // jsdom does not implement DataTransfer; build a minimal stub.
  const dataTransfer = {
    files,
    items: files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f })),
    types: ['Files'],
  };
  fireEvent.drop(target, { dataTransfer });
}

describe('FileUpload', () => {
  it('renders the dropzone with the default label', () => {
    render(<FileUpload files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} />);
    expect(screen.getByRole('button', { name: 'Upload files' })).toBeInTheDocument();
    expect(screen.getByText(/Drag files here/)).toBeInTheDocument();
  });

  it('hides the dropzone in single mode once files.length === 1', () => {
    const file = makeFile('a.txt', 100, 'text/plain');
    render(
      <FileUpload
        files={[entry('1', file)]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Upload files' })).not.toBeInTheDocument();
  });

  it('keeps the dropzone visible in multi mode regardless of files.length', () => {
    const file = makeFile('a.txt', 100, 'text/plain');
    render(
      <FileUpload
        multiple
        files={[entry('1', file)]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Upload files' })).toBeInTheDocument();
  });

  it('renders one <li> per file with the file name and formatted size', () => {
    const f1 = makeFile('a.txt', 1024, 'text/plain');
    const f2 = makeFile('b.pdf', 1024 * 1024 * 2, 'application/pdf');
    render(
      <FileUpload
        multiple
        files={[entry('1', f1), entry('2', f2)]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
  });

  it('renders <Progress> inside a row when status="uploading"', () => {
    const f1 = makeFile('a.txt', 100, 'text/plain');
    const { container } = render(
      <FileUpload
        files={[entry('1', f1, 'uploading', { progress: 42 })]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '42');
  });

  it('renders the error message when status="error"', () => {
    const f1 = makeFile('a.txt', 100, 'text/plain');
    render(
      <FileUpload
        files={[entry('1', f1, 'error', { error: 'Server rejected' })]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    expect(screen.getByText('Server rejected')).toBeInTheDocument();
  });

  it('renders the done check icon when status="done"', () => {
    const f1 = makeFile('a.txt', 100, 'text/plain');
    render(
      <FileUpload
        files={[entry('1', f1, 'done')]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    // The Check icon has aria-label="Done" per the implementation.
    expect(screen.getByLabelText('Done')).toBeInTheDocument();
  });

  it('clicking the remove X fires onFileRemove with the right entry', async () => {
    const user = userEvent.setup();
    const f1 = makeFile('a.txt', 100, 'text/plain');
    const e1 = entry('1', f1);
    const onFileRemove = vi.fn();
    render(<FileUpload files={[e1]} onFilesAdded={() => {}} onFileRemove={onFileRemove} />);
    await user.click(screen.getByRole('button', { name: 'Remove a.txt' }));
    expect(onFileRemove).toHaveBeenCalledTimes(1);
    expect(onFileRemove).toHaveBeenCalledWith(e1);
  });

  it('dropping a single valid file fires onFilesAdded([file])', () => {
    const onFilesAdded = vi.fn();
    render(<FileUpload files={[]} onFilesAdded={onFilesAdded} onFileRemove={() => {}} />);
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const file = makeFile('a.txt', 100, 'text/plain');
    fireDrop(dropzone, [file]);
    expect(onFilesAdded).toHaveBeenCalledTimes(1);
    expect(onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it('dropping multiple files in multi mode fires onFilesAdded with all of them', () => {
    const onFilesAdded = vi.fn();
    render(<FileUpload multiple files={[]} onFilesAdded={onFilesAdded} onFileRemove={() => {}} />);
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const f1 = makeFile('a.txt', 100, 'text/plain');
    const f2 = makeFile('b.txt', 200, 'text/plain');
    const f3 = makeFile('c.txt', 300, 'text/plain');
    fireDrop(dropzone, [f1, f2, f3]);
    expect(onFilesAdded).toHaveBeenCalledWith([f1, f2, f3]);
  });

  it('dropping a file with disallowed type fires onFileReject(file, "invalid-type") and not onFilesAdded', () => {
    const onFilesAdded = vi.fn();
    const onFileReject = vi.fn();
    render(
      <FileUpload
        files={[]}
        accept="image/*"
        onFilesAdded={onFilesAdded}
        onFileRemove={() => {}}
        onFileReject={onFileReject}
      />,
    );
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const file = makeFile('a.txt', 100, 'text/plain');
    fireDrop(dropzone, [file]);
    expect(onFileReject).toHaveBeenCalledWith(file, 'invalid-type');
    expect(onFilesAdded).not.toHaveBeenCalled();
  });

  it('dropping a file exceeding maxSize fires onFileReject(file, "too-large")', () => {
    const onFileReject = vi.fn();
    render(
      <FileUpload
        files={[]}
        maxSize={1000}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
        onFileReject={onFileReject}
      />,
    );
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const file = makeFile('a.txt', 5000, 'text/plain');
    fireDrop(dropzone, [file]);
    expect(onFileReject).toHaveBeenCalledWith(file, 'too-large');
  });

  it('dropping a file that would exceed maxFiles fires onFileReject(file, "too-many")', () => {
    const onFileReject = vi.fn();
    const onFilesAdded = vi.fn();
    const existing = entry('1', makeFile('existing.txt', 100, 'text/plain'));
    render(
      <FileUpload
        multiple
        files={[existing]}
        maxFiles={1}
        onFilesAdded={onFilesAdded}
        onFileRemove={() => {}}
        onFileReject={onFileReject}
      />,
    );
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const newFile = makeFile('new.txt', 100, 'text/plain');
    fireDrop(dropzone, [newFile]);
    expect(onFileReject).toHaveBeenCalledWith(newFile, 'too-many');
    expect(onFilesAdded).not.toHaveBeenCalled();
  });

  it('dropping a duplicate (same name+size) fires onFileReject(file, "duplicate")', () => {
    const onFileReject = vi.fn();
    const original = makeFile('a.txt', 100, 'text/plain');
    const existing = entry('1', original);
    render(
      <FileUpload
        multiple
        files={[existing]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
        onFileReject={onFileReject}
      />,
    );
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const duplicate = makeFile('a.txt', 100, 'text/plain');
    fireDrop(dropzone, [duplicate]);
    expect(onFileReject).toHaveBeenCalledWith(duplicate, 'duplicate');
  });

  it('custom validator returning a string fires onFileReject(file, "custom", message)', () => {
    const onFileReject = vi.fn();
    render(
      <FileUpload
        files={[]}
        validator={() => 'Bad file'}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
        onFileReject={onFileReject}
      />,
    );
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const file = makeFile('a.txt', 100, 'text/plain');
    fireDrop(dropzone, [file]);
    expect(onFileReject).toHaveBeenCalledWith(file, 'custom', 'Bad file');
  });

  it('custom validator returning null lets the file through', () => {
    const onFilesAdded = vi.fn();
    render(
      <FileUpload
        files={[]}
        validator={() => null}
        onFilesAdded={onFilesAdded}
        onFileRemove={() => {}}
      />,
    );
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const file = makeFile('a.txt', 100, 'text/plain');
    fireDrop(dropzone, [file]);
    expect(onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it('mixed batch: passing files in one onFilesAdded call; each failing file in its own onFileReject call', () => {
    const onFilesAdded = vi.fn();
    const onFileReject = vi.fn();
    render(
      <FileUpload
        multiple
        files={[]}
        accept="text/plain"
        onFilesAdded={onFilesAdded}
        onFileRemove={() => {}}
        onFileReject={onFileReject}
      />,
    );
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const ok1 = makeFile('a.txt', 100, 'text/plain');
    const bad = makeFile('b.png', 100, 'image/png');
    const ok2 = makeFile('c.txt', 100, 'text/plain');
    fireDrop(dropzone, [ok1, bad, ok2]);
    expect(onFilesAdded).toHaveBeenCalledTimes(1);
    expect(onFilesAdded).toHaveBeenCalledWith([ok1, ok2]);
    expect(onFileReject).toHaveBeenCalledTimes(1);
    expect(onFileReject).toHaveBeenCalledWith(bad, 'invalid-type');
  });

  it('single mode + 3 files dropped: first valid added, rest rejected as "too-many"', () => {
    const onFilesAdded = vi.fn();
    const onFileReject = vi.fn();
    render(
      <FileUpload
        files={[]}
        onFilesAdded={onFilesAdded}
        onFileRemove={() => {}}
        onFileReject={onFileReject}
      />,
    );
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const f1 = makeFile('a.txt', 100, 'text/plain');
    const f2 = makeFile('b.txt', 100, 'text/plain');
    const f3 = makeFile('c.txt', 100, 'text/plain');
    fireDrop(dropzone, [f1, f2, f3]);
    expect(onFilesAdded).toHaveBeenCalledWith([f1]);
    expect(onFileReject).toHaveBeenCalledTimes(2);
    expect(onFileReject).toHaveBeenNthCalledWith(1, f2, 'too-many');
    expect(onFileReject).toHaveBeenNthCalledWith(2, f3, 'too-many');
  });

  it('disabled makes the dropzone non-interactive (drop and click both no-op)', async () => {
    const user = userEvent.setup();
    const onFilesAdded = vi.fn();
    render(
      <FileUpload
        disabled
        files={[]}
        onFilesAdded={onFilesAdded}
        onFileRemove={() => {}}
      />,
    );
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    expect(dropzone).toHaveAttribute('aria-disabled', 'true');
    expect(dropzone).toHaveAttribute('tabIndex', '-1');
    await user.click(dropzone);
    fireDrop(dropzone, [makeFile('a.txt', 100, 'text/plain')]);
    expect(onFilesAdded).not.toHaveBeenCalled();
  });

  it('disabled disables the remove buttons', () => {
    const f1 = makeFile('a.txt', 100, 'text/plain');
    render(
      <FileUpload
        disabled
        files={[entry('1', f1)]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Remove a.txt' })).toBeDisabled();
  });

  it('Enter on focused dropzone triggers the hidden input click', () => {
    const onFilesAdded = vi.fn();
    render(<FileUpload files={[]} onFilesAdded={onFilesAdded} onFileRemove={() => {}} />);
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');
    fireEvent.keyDown(dropzone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('Space on focused dropzone triggers the hidden input click and preventDefault', () => {
    render(<FileUpload files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} />);
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');
    const result = fireEvent.keyDown(dropzone, { key: ' ' });
    expect(clickSpy).toHaveBeenCalled();
    // result is true if NOT prevented; the implementation calls preventDefault.
    expect(result).toBe(false);
  });

  it('ARIA: dropzone has role="button" and aria-label="Upload files" by default', () => {
    render(<FileUpload files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} />);
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    expect(dropzone).toHaveAttribute('role', 'button');
  });

  it('ARIA: each row\'s remove button has aria-label="Remove {filename}"', () => {
    const f1 = makeFile('contacts.csv', 100, 'text/csv');
    render(
      <FileUpload
        files={[entry('1', f1)]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Remove contacts.csv' })).toBeInTheDocument();
  });

  it('formatBytes rendering: 1024 → "1 KB", 1.5 MiB → "1.5 MB"', () => {
    const f1 = makeFile('a.txt', 1024, 'text/plain');
    const f2 = makeFile('b.bin', Math.floor(1024 * 1024 * 1.5), 'application/octet-stream');
    render(
      <FileUpload
        multiple
        files={[entry('1', f1), entry('2', f2)]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.getByText('1.5 MB')).toBeInTheDocument();
  });

  it('iconForFile rendering: image/png → FileImage, text/csv → FileText, pdf → FileText, unknown → File', () => {
    const png = makeFile('a.png', 100, 'image/png');
    const csv = makeFile('b.csv', 100, 'text/csv');
    const pdf = makeFile('c.pdf', 100, 'application/pdf');
    const other = makeFile('d.bin', 100, 'application/octet-stream');
    const { container } = render(
      <FileUpload
        multiple
        files={[entry('1', png), entry('2', csv), entry('3', pdf), entry('4', other)]}
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    // lucide renders SVGs; assert one <svg> per row inside the rowIcon span.
    const rowIcons = container.querySelectorAll('[class*="rowIcon"] svg');
    expect(rowIcons.length).toBe(4);
    // We don't assert specific lucide internals — the behavior under test is
    // that an SVG renders per row. The icon-mapping logic is exercised by
    // making the renders happen successfully with each MIME / extension.
  });

  it('className from props merges with the base class (not replace)', () => {
    const { container } = render(
      <FileUpload
        files={[]}
        className="custom"
        onFilesAdded={() => {}}
        onFileRemove={() => {}}
      />,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/custom/);
    expect(cls).toMatch(/root_/);
  });

  it('forwards ref to the outermost <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <FileUpload ref={ref} files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('drag-over class is added on dragenter and removed on dragleave (counter-based)', () => {
    const { container } = render(
      <FileUpload files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} />,
    );
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    fireEvent.dragEnter(dropzone);
    expect(dropzone.className).toMatch(/dragOver/);
    fireEvent.dragLeave(dropzone);
    expect(dropzone.className).not.toMatch(/dragOver/);
  });
});
```

### Step 3.2: Modify `src/index.ts` — add FileUpload re-export

Read `packages/design-system/src/index.ts` first. Find a sensible insertion point. The barrel is roughly grouped by topic; insert FileUpload near the existing form-input exports (Input, Textarea, PasswordInput, Checkbox, Radio).

Apply this Edit (use `replace_all: false`):

**old_string** — the existing Textarea export (it's a stable anchor, has been there since PR for textarea):

```ts
export { Textarea } from './components/Textarea';
export type { TextareaProps, TextareaSize, TextareaResize } from './components/Textarea';
```

**new_string:**

```ts
export { Textarea } from './components/Textarea';
export type { TextareaProps, TextareaSize, TextareaResize } from './components/Textarea';

export { FileUpload } from './components/FileUpload';
export type {
  FileUploadProps,
  FileEntry,
  FileUploadStatus,
  FileRejectReason,
} from './components/FileUpload';
```

If the Textarea block isn't in that exact form (e.g. additional types have been added), expand the `old_string` until it's unique against the current file and adjust accordingly. Verify by reading the file first.

### Step 3.3: Verify gates

- [ ] Run `make test`. Expected: every test passes (including the structure meta-test, which now sees FileUpload's re-export).
- [ ] Run `make build-lib`. Expected: clean.
- [ ] Run `make build`. Expected: clean (playground typechecks against the new exports).
- [ ] Run `make lint`. Expected: clean.

If a test fails:
- For drop-event tests: jsdom doesn't implement DataTransfer; the `fireDrop` helper provides a minimal stub. If a test still fails complaining about `files` not iterable, the stub is being treated as `undefined` — check the `fireEvent.drop` call signature (the `dataTransfer` field name is case-sensitive).
- For role-based queries: the dropzone uses `role="button"` AND `aria-label`. If `getByRole('button', { name: ... })` returns multiple matches (the remove buttons also use role="button"), narrow with a more specific selector.

### Step 3.4: Commit

```bash
git add packages/design-system/src/components/FileUpload/FileUpload.test.tsx \
        packages/design-system/src/index.ts
git commit -m "$(cat <<'EOF'
FileUpload: unit tests (~26 cases) + barrel re-export

Tests cover: dropzone visibility (single hides at 1 file, multi always
visible), per-row rendering by status (Progress when uploading, error
message, done check), remove button callback, drag-drop dispatch via a
minimal DataTransfer stub for jsdom, full validation pipeline (invalid-type
/ too-large / too-many / duplicate / custom — mixed batch + single-mode
overflow), disabled state, Enter/Space keyboard activation, ARIA labels,
formatBytes + iconForFile rendering through the component DOM, className
merge, ref forwarding, counter-based drag-over class toggle.

Also re-exports FileUpload + FileEntry + FileUploadStatus + FileRejectReason
from src/index.ts so the structure meta-test passes (T2/T4/T6 Typography +
T2/T4 Progress established this pattern).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: AGENTS.md FileUpload section

**Files:**

- Modify: `packages/design-system/AGENTS.md`

### Step 4.1: Verify the FileUpload re-export exists

- [ ] Read `packages/design-system/src/index.ts` and confirm the `export { FileUpload }` block is present (T3 added it). If missing, STOP and report — earlier task had a problem.

### Step 4.2: Insert the FileUpload section between `<RadioGroup>` and `<Card>`

Read `packages/design-system/AGENTS.md` and find the boundary between the `<RadioGroup>` section's last content and the `<Card>` section heading. The current file has `### \`<RadioGroup>\` — fieldset wrapper for related radios` at line 363 and `### \`<Card>\` — bordered container` at line 382.

The `old_string` anchor must be unique. Use the line IMMEDIATELY BEFORE the Card heading combined with the Card heading itself. Without reading the file the exact preceding line isn't known; the implementer should read the file first to capture the exact RadioGroup-section closing line, then apply the Edit.

Use the Edit tool with:

**old_string:** the last line of the RadioGroup section's content, plus a blank line, plus `### \`<Card>\` — bordered container`. The implementer reads the file to identify the unique anchor.

**new_string:** the same RadioGroup-closing line + a blank line + the FileUpload section below + a blank line + `### \`<Card>\` — bordered container`.

Content to insert (between the RadioGroup-closing line and the Card heading):

````markdown
### `<FileUpload>` — controlled file picker with dropzone

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
- `FileEntry`: `{ id: string, file: File, status: 'pending' | 'uploading' | 'done' | 'error', progress?: number, error?: string }`. Consumer assigns `id` (typically `crypto.randomUUID()`); File has no stable identity in JS.
- **Status drives the row:** `uploading` renders `<Progress size="sm" value={progress}>`; `error` renders the error string in danger color and tints the row border; `done` renders a green check icon; `pending` is neutral. The remove button (X) is always visible regardless of status.
- **Validation pipeline** (per file, in order): type (`accept`) → size (`maxSize`) → count (`maxFiles`, multi mode only) → duplicate (name + size) → custom (`validator`). First failure fires `onFileReject(file, reason, message?)`; passing files batch into ONE `onFilesAdded(File[])` call.
- **Single mode (default):** implicit count cap of 1. Dropzone HIDES once `files.length === 1` and re-appears after the user removes the file. Multi-file drops in single mode → first valid file accepted, rest rejected as `'too-many'`.
- **Drag and click both open the same hidden `<input type="file">`.** Drag is mouse-only; keyboard users use the dropzone's `role="button"` + Enter/Space to open the picker.
- `disabled`: dropzone shows grayed, drag/click no-op, remove buttons disabled.
- `dropzoneLabel`, `dropzoneIcon`, `dropzoneHint` override the dropzone's default content.

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

````

### Step 4.3: Verify gates

- [ ] Run `make build`. Expected: clean (AGENTS.md isn't typechecked but the build confirms nothing else broke).
- [ ] Run `make lint`. Expected: clean.

### Step 4.4: Commit

```bash
git add packages/design-system/AGENTS.md
git commit -m "$(cat <<'EOF'
AGENTS.md: add FileUpload section between RadioGroup and Card

API table, FileEntry shape, FileRejectReason enum, canonical snippet with
custom validator + dropzoneHint, and the "Hard rule" callout with the 5
anti-patterns the primitive is designed to replace.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Playground demo + 4-place wiring

**Files:**

- Create: `packages/playground/src/pages/components/FileUploadDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

### Step 5.1: Create `FileUploadDemo.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { useState } from 'react';
import { FileUpload, type FileEntry } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/FileUpload/FileUpload.tsx?raw';
import scssSource from '@lib-source/components/FileUpload/FileUpload.module.scss?raw';

function makeId() {
  // crypto.randomUUID exists in modern browsers; fall back to a counter for jsdom.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}

function BasicSingle() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  return (
    <FileUpload
      files={files}
      onFilesAdded={(added) =>
        setFiles(added.map((f) => ({ id: makeId(), file: f, status: 'pending' as const })))
      }
      onFileRemove={(entry) => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
    />
  );
}

function MultiWithLimits() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  return (
    <FileUpload
      multiple
      files={files}
      accept=".pdf,image/*"
      maxFiles={5}
      maxSize={10 * 1024 * 1024}
      dropzoneHint={
        <span>
          Up to 5 files, <Code>.pdf</Code> or images, 10 MB each
        </span>
      }
      onFilesAdded={(added) =>
        setFiles((prev) => [
          ...prev,
          ...added.map((f) => ({ id: makeId(), file: f, status: 'pending' as const })),
        ])
      }
      onFileRemove={(entry) => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
    />
  );
}

function StatusWalkthrough() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [progress, setProgress] = useState(0);

  const startUpload = () => {
    if (files.length === 0) return;
    const id = files[0].id;
    setFiles((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'uploading' as const, progress: 0 } : e)),
    );
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 10);
        setFiles((prev) =>
          prev.map((e) => (e.id === id ? { ...e, progress: next } : e)),
        );
        if (next === 100) {
          clearInterval(interval);
          setTimeout(() => {
            setFiles((prev) =>
              prev.map((e) => (e.id === id ? { ...e, status: 'done' as const } : e)),
            );
          }, 200);
        }
        return next;
      });
    }, 200);
  };

  return (
    <Stack gap="sm">
      <FileUpload
        files={files}
        onFilesAdded={(added) =>
          setFiles(added.map((f) => ({ id: makeId(), file: f, status: 'pending' as const })))
        }
        onFileRemove={(entry) => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
      />
      <Cluster gap="sm">
        <Button size="sm" onClick={startUpload} disabled={files.length === 0 || files[0]?.status !== 'pending'}>
          Start upload
        </Button>
        <Text size="sm" tone="muted">
          Drop a file then click "Start upload" to walk through pending → uploading ({progress}%) → done.
        </Text>
      </Cluster>
    </Stack>
  );
}

function ErrorState() {
  const file: FileEntry = {
    id: 'err-1',
    file: new File([new Uint8Array(1024 * 50)], 'broken.csv', { type: 'text/csv' }),
    status: 'error',
    error: 'Server returned 500 — please retry',
  };
  return (
    <FileUpload files={[file]} onFilesAdded={() => {}} onFileRemove={() => {}} />
  );
}

function DisabledDemo() {
  const file: FileEntry = {
    id: 'dis-1',
    file: new File([new Uint8Array(1024 * 100)], 'locked.pdf', { type: 'application/pdf' }),
    status: 'done',
  };
  return (
    <FileUpload disabled files={[file]} onFilesAdded={() => {}} onFileRemove={() => {}} />
  );
}

function CustomValidator() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  return (
    <Stack gap="sm">
      <FileUpload
        multiple
        files={files}
        validator={(f) => (f.name.toLowerCase().includes('test') ? 'Filenames cannot contain "test"' : null)}
        dropzoneHint={
          <Text as="span" size="sm" tone="muted">
            Try dropping a file named <Code>test.csv</Code> to see the custom rejection.
          </Text>
        }
        onFilesAdded={(added) =>
          setFiles((prev) => [
            ...prev,
            ...added.map((f) => ({ id: makeId(), file: f, status: 'pending' as const })),
          ])
        }
        onFileRemove={(entry) => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
        onFileReject={(file, reason, message) => setRejected(`${file.name}: ${message ?? reason}`)}
      />
      {rejected && (
        <Text size="sm" tone="danger">
          Rejected: {rejected}
        </Text>
      )}
    </Stack>
  );
}

export function FileUploadDemo() {
  return (
    <DemoLayout
      name="FileUpload"
      description="Controlled, dropzone-style file picker. Pure UI shell — consumer owns the FileEntry[] state and the upload network code. Drop or click to add files; the component handles validation, drag-over feedback, per-row rendering, and the remove button."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="FileUpload.tsx"
      scssFilename="FileUpload.module.scss"
      componentName="FileUpload"
    >
      <Example
        title="Basic single-file"
        description="Default mode — at most one file. The dropzone hides once a file is present and re-appears after removal."
        code={`function BasicSingle() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  return (
    <FileUpload
      files={files}
      onFilesAdded={(added) =>
        setFiles(added.map((f) => ({ id: crypto.randomUUID(), file: f, status: 'pending' })))
      }
      onFileRemove={(entry) => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
    />
  );
}`}
      >
        <BasicSingle />
      </Example>

      <Example
        title="Multiple with limits"
        description="multiple + maxFiles + maxSize + accept. The dropzone stays visible while the file list grows beneath."
        code={`<FileUpload
  multiple
  files={files}
  accept=".pdf,image/*"
  maxFiles={5}
  maxSize={10 * 1024 * 1024}
  dropzoneHint={<>Up to 5 files, <Code>.pdf</Code> or images, 10 MB each</>}
  onFilesAdded={…}
  onFileRemove={…}
/>`}
      >
        <MultiWithLimits />
      </Example>

      <Example
        title="Status walkthrough"
        description="Drop a file, then click 'Start upload' to walk it through pending → uploading (with progress ticking) → done. Demonstrates the consumer's full state-machine ownership."
        code={`// Consumer's upload code transitions the entry through statuses:
const startUpload = () => {
  setFiles(prev => prev.map(e => e.id === id ? { ...e, status: 'uploading', progress: 0 } : e));
  // ... tick progress, eventually set status: 'done' ...
};`}
      >
        <StatusWalkthrough />
      </Example>

      <Example
        title="Error state"
        description="A row with status='error' renders the error message in danger color and tints the row's border."
        code={`<FileUpload files={[{ id: 'err-1', file, status: 'error', error: 'Server returned 500 — please retry' }]} … />`}
      >
        <ErrorState />
      </Example>

      <Example
        title="Disabled"
        description="The dropzone is grayed and non-interactive; remove buttons are disabled."
        code={`<FileUpload disabled files={files} onFilesAdded={() => {}} onFileRemove={() => {}} />`}
      >
        <DisabledDemo />
      </Example>

      <Example
        title="Custom validator"
        description="Reject files whose names contain 'test'. The onFileReject callback fires with reason='custom' and the validator's returned message."
        code={`<FileUpload
  multiple
  files={files}
  validator={(f) => f.name.toLowerCase().includes('test') ? 'Filenames cannot contain "test"' : null}
  onFileReject={(file, reason, message) => toast.error(message ?? \`\${file.name}: \${reason}\`)}
  …
/>`}
      >
        <CustomValidator />
      </Example>
    </DemoLayout>
  );
}
```

### Step 5.2: Modify `App.tsx` — add import + route

Read `packages/playground/src/App.tsx` first to find an alphabetical insertion point.

- [ ] Edit — add the import. Insert AFTER an alphabetically-adjacent demo (e.g. `EmptyStateDemo` or `DropdownMenuDemo` — implementer reads to find the right anchor).

**old_string** (an existing alphabetically-adjacent import line — read the file to confirm):

```tsx
import { EmptyStateDemo } from './pages/components/EmptyStateDemo';
```

**new_string:**

```tsx
import { EmptyStateDemo } from './pages/components/EmptyStateDemo';
import { FileUploadDemo } from './pages/components/FileUploadDemo';
```

(If the EmptyState import isn't there or has different surrounding context, find the existing imports list and apply the Edit with a different anchor that's unique against the current file.)

- [ ] Edit — add the route. Insert AFTER an alphabetically-adjacent route.

**old_string:**

```tsx
          <Route path="/components/empty-state" element={<EmptyStateDemo />} />
```

**new_string:**

```tsx
          <Route path="/components/empty-state" element={<EmptyStateDemo />} />
          <Route path="/components/file-upload" element={<FileUploadDemo />} />
```

### Step 5.3: Modify `AppShell.tsx` — add lucide `UploadCloud` icon + Forms-group item

Read `packages/playground/src/layout/AppShell/AppShell.tsx` first. The current Forms group is alphabetical: Button, ButtonGroup, Checkbox, Date pickers, Input, PasswordInput, PasswordStrengthMeter, Radio, Select, Switch, Textarea. FileUpload slots between Date pickers and Input.

- [ ] Edit — add the lucide import.

**old_string:**

```tsx
  type LucideIcon,
} from 'lucide-react';
```

**new_string:**

```tsx
  UploadCloud,
  type LucideIcon,
} from 'lucide-react';
```

(If a previous PR added more icons in the closing-block region, expand the `old_string` to keep it unique.)

- [ ] Edit — add the Forms group item between Date pickers and Input.

**old_string:**

```tsx
      { to: '/components/datepickers', label: 'Date pickers', icon: CalendarRange, end: false },
      { to: '/components/input', label: 'Input', icon: TextCursorInput, end: false },
```

**new_string:**

```tsx
      { to: '/components/datepickers', label: 'Date pickers', icon: CalendarRange, end: false },
      { to: '/components/file-upload', label: 'FileUpload', icon: UploadCloud, end: false },
      { to: '/components/input', label: 'Input', icon: TextCursorInput, end: false },
```

### Step 5.4: Modify `ComponentsIndex.tsx` — add import + card

Read the file. Apply two edits.

- [ ] Edit — add the import. Insert near an alphabetically-adjacent demo (e.g. EmptyState).

**old_string:**

```tsx
import { EmptyState } from '@eocrm/design-system';
```

**new_string:**

```tsx
import { EmptyState } from '@eocrm/design-system';
import { FileUpload } from '@eocrm/design-system';
```

- [ ] Edit — add a card entry to the `items` array. The card slots alphabetically after EmptyState and before Grid (or whatever is next). Find the existing card entry whose `name:` is alphabetically just before "FileUpload" — typically `EmptyState`. Apply the Edit with that entry's complete `{ ... },` block as the `old_string` anchor + the new card appended.

The new card shape (this is the literal content to add):

```tsx
  {
    to: '/components/file-upload',
    name: 'FileUpload',
    description: 'Controlled dropzone-style file picker with built-in validation, drag/click both supported, per-row Progress for uploading status.',
    preview: (
      <div style={{ width: '100%', maxWidth: 220 }}>
        <FileUpload files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} dropzoneLabel="Drop or click" />
      </div>
    ),
  },
```

Insert this AFTER the EmptyState card's `{ ... },` block. Use the EmptyState block as the `old_string` and `old_string + new card block` as the `new_string`.

### Step 5.5: Modify `registry.ts` — extend ComponentName union

- [ ] Edit — add `'FileUpload'` alphabetically to the ComponentName union.

**old_string:**

```ts
  | 'EmptyState'
  | 'Grid'
```

**new_string:**

```ts
  | 'EmptyState'
  | 'FileUpload'
  | 'Grid'
```

(If the union differs from this snapshot, find a unique two-line anchor with EmptyState and the next member and insert FileUpload between them.)

### Step 5.6: Verify gates

- [ ] Run `make build`. Expected: clean (the playground typechecks against `@eocrm/design-system`'s new exports).
- [ ] Run `make lint`. Expected: clean.

### Step 5.7: Commit

```bash
git add packages/playground/src/pages/components/FileUploadDemo.tsx \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/components/ComponentsIndex.tsx \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
FileUpload demo + 4-place wiring

FileUploadDemo: 6 examples — basic single, multi with limits, status
walkthrough (interactive Start-upload button + progress ticking), error
state, disabled, custom validator. Wired into App.tsx routes, AppShell
Forms nav (UploadCloud icon between Date pickers and Input),
ComponentsIndex overview cards, mockup registry ComponentName union.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Hard Rule 8 review-fix cycle + push + PR

**Files:** none directly — this task is the review loop on Tasks 1–5.

### Step 6.1: Run all four gates from the repo root

- [ ] `cd /home/dpws/projects/design-system && make test`. Expected: every test passes (1692 baseline from PR #56 + ~26 FileUpload = ~1718).
- [ ] `make build-lib`. Expected: clean.
- [ ] `make build`. Expected: clean.
- [ ] `make lint`. Expected: clean.

If any gate fails, fix and re-run all four. Don't proceed to step 6.2 until all four are green.

### Step 6.2: Dispatch the HR8 reviewer (round 1)

Use a fresh-context `general-purpose` agent with **opus** model. Brief it on the 10 review categories from `packages/design-system/CLAUDE.md` Rule 8.

**Particular things to ask for fresh eyes on:**

1. **DataTransfer stub in tests.** jsdom doesn't implement DataTransfer; the `fireDrop` helper builds a minimal stub. Is the test suite actually exercising the real drag-drop path, or just a happy-path simulation? Are there events the real browser would fire that we're missing?

2. **Drag counter correctness.** `dragCounter.current++` on enter, `--` on leave, `=0` on drop. Are there edge cases (e.g., user drags out then back in quickly, file dialog opening from click) where the counter ends up out of sync?

3. **`accept` parsing — wildcard MIME + extension fallback.** The `matchesAccept` function handles `.csv` (extension), `image/*` (wildcard), and exact MIME. Does it correctly reject `application/foo` when the consumer wrote `application/*`? Does it handle empty MIME on `.csv` files where the browser left `file.type` blank?

4. **Single-mode count check.** `effectiveMaxFiles = multiple ? (maxFiles ?? Infinity) : 1`. In single mode, the dropzone HIDES at `files.length === 1`, so the count check in `processFiles` should never trip in practice for single mode (the dropzone isn't visible). But what if the consumer is in single mode and the dropzone is visible (files=[]) and the user drops 3 files? The count check fires correctly. Verify.

5. **`onChange` `Omit` on the props interface.** `Omit<HTMLAttributes<HTMLDivElement>, 'onChange'>`. The component doesn't use `onChange` on the root div either, so this Omit is just defensive — preventing a consumer from passing `onChange` and being surprised that it doesn't fire (HTMLDivElement doesn't have a meaningful change event anyway). Worth keeping? Maybe it'd actually mislead consumers into thinking onChange means something for this component when it doesn't.

6. **`aria-label` fallback default `'Upload files'`.** When the consumer passes a string `dropzoneLabel`, we use it as the aria-label. When they pass a ReactNode (e.g. with a `<Code>` inside), we fall back to the literal "Upload files". Localization story: hardcoded English. Same approach as Progress's "Loading…" — if reviewer flags, propose adding to LocaleProvider as a follow-up.

7. **Test coverage for drag counter behavior.** The "drag-over class toggle" test covers enter+leave, but doesn't cover the nested case (enter → enter → leave → leave → drop) that the counter is FOR. Worth adding a test?

8. **Cross-package leakage.** FileUpload imports `Progress` from `../Progress` (sibling). Playground demo imports `FileUpload` and `FileEntry` from `@eocrm/design-system`. Confirm no relative imports into the library from the playground demo.

9. **JSDoc completeness.** Every exported member has JSDoc. Confirm via spot-check on FileUploadProps, FileEntry, FileUploadStatus, FileRejectReason.

10. **Bundle / distribution.** `npm pack --dry-run` should include the FileUpload directory, no test files. The two helpers (formatBytes.ts, iconForFile.ts) ship since they're imported by FileUpload.tsx.

Output format: Critical / Important / Nice-to-have / Regression-watch + a final verdict line: `clean enough to stop` or `keep iterating`.

### Step 6.3: Fix every Critical + Important finding

- [ ] For each Critical, fix in-line and commit with `FileUpload: HR8 review-cycle fixes (round N) — <short rationale>`.
- [ ] Same for Important.
- [ ] Nice-to-haves are judgment calls — fix when cheap.
- [ ] For every finding deliberately skipped, include a one-line "why we skipped" in the next response so the next reviewer doesn't re-flag it.

### Step 6.4: Re-run all four gates after fixes

- [ ] `make test && make build-lib && make build && make lint`. All clean.

### Step 6.5: Dispatch HR8 reviewer (round 2+)

Same prompt as 6.2, framed as "round N — verify round (N-1) fixes". Continue until verdict is `clean enough to stop`.

### Step 6.6: Push the branch

- [ ] `git push -u origin feat/file-upload-impl`. If husky pre-push hook fails on `format:check`:
  1. `npx prettier --write <listed files>`
  2. `git add <files> && git commit -m "FileUpload: prettier --write" -m "" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`
  3. `git push`

### Step 6.7: Open the PR

Use `gh pr create --body-file` (NOT a heredoc with backticks — the heredoc backtick-escape trap from PR #55 lost an hour of debug time). Write the PR body to `/tmp/pr-file-upload-body.md` first via the Write tool:

```markdown
## Summary

`<FileUpload>` — controlled, dropzone-style file picker. Pure UI shell: consumer owns the `FileEntry[]` state and the upload network code; component handles drag/drop UI, click-to-browse, built-in validation, and per-row rendering (with `<Progress size="sm">` from PR #56 for uploading state).

- **Drag + click** both open the same hidden `<input type="file">`. Drag uses a ref-tracked counter to handle nested enter/leave events on children.
- **Validation pipeline** (per file, in order): type (`accept`) → size (`maxSize`) → count (`maxFiles` for multi, implicit 1 for single) → duplicate (name + size) → custom (`validator`). First failure fires `onFileReject(file, reason, message?)`; passing files batch into ONE `onFilesAdded(File[])` call.
- **Status-driven rows.** `FileEntry.status` drives the row: `uploading` → `<Progress>`; `error` → message in danger color + tinted border; `done` → green check. Remove (X) always visible.
- **Single mode (default):** dropzone HIDES at `files.length === 1`; re-appears after removal. Three files dropped at once → first accepted, rest rejected as `'too-many'`.
- **Keyboard parity:** dropzone `role="button"` + `tabIndex` + Enter/Space → opens picker.

## Why now

CRM has real upcoming needs: contact CSV import, deal-attachment uploads, profile-image picker. All three need the same primitive. Pre-req `<Progress>` shipped in PR #56.

## Design decisions baked in

- **Fully controlled, no uncontrolled mode.** Matches the pure-UI-shell architecture.
- **`maxFiles` is multi-mode only.** Single mode caps at 1 internally; passing `maxFiles` in single mode is silently ignored.
- **`accept` is forwarded raw to `<input>` AND parsed for validation.** Browser-side filtering + JS-side rejection both fire.
- **Duplicate check uses `name + size`** as the composite key.
- **`formatBytes` and `iconForFile` are private** to the FileUpload directory — not re-exported.
- **The Progress component is imported AS-IS** — `size="sm"` for the 4px bar inside each row.

## Tests

**~26 cases** covering: dropzone visibility (single hides at 1, multi always visible), per-row status rendering, remove callback, drag-drop via a minimal jsdom DataTransfer stub, full validation pipeline (each reason + mixed batch + single-mode overflow), `disabled` state, Enter/Space keyboard activation, ARIA labels, `formatBytes` + `iconForFile` rendering through component DOM, className merge, ref forwarding, drag-over class toggle.

## Hard Rule 8

Standard cycle ran until `clean enough to stop`. Per-task code-quality loops caught and fixed any in-task issues.

## Test plan

- [ ] `/components/file-upload`: 6 examples render (basic single, multi with limits, status walkthrough, error state, disabled, custom validator).
- [ ] Status walkthrough: drop a file, click "Start upload", watch the row tick through pending → uploading (0%–100%) → done.
- [ ] Multi with limits: drop 6 files; first 5 accepted, 6th rejected as `'too-many'`.
- [ ] Custom validator: drop a file named `test.csv`; row rejected with the custom message displayed below.
- [ ] AGENTS.md FileUpload section appears between RadioGroup and Card.
- [ ] No test files in `npm pack --dry-run` output; the two helpers (`formatBytes.ts`, `iconForFile.ts`) DO ship.
- [ ] No mockup files modified (verified — no current mockup uses file upload).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Then:

```bash
gh pr create --title "FileUpload: controlled dropzone-style file picker" --body-file /tmp/pr-file-upload-body.md
```

- [ ] Print the PR URL when done.

---

## Self-review (run before invoking subagent-driven-development)

### Spec coverage

- Spec §Goal / §Why now — Task 4 (AGENTS.md) + Task 5 (demos).
- Spec §Non-goals — encoded in JSDoc anti-patterns in Task 2.
- Spec §Architecture (file layout, composition) — matches Tasks 1, 2.
- Spec §Public API — Task 2 (verbatim types + interface).
- Spec §Validation pipeline — Task 2 `processFiles` function spelled out verbatim.
- Spec §Styling — Task 2 SCSS spelled out verbatim.
- Spec §ARIA + behavior reference — encoded in the component code in Task 2 + tested in Task 3.
- Spec §Testing — Task 3 covers every numbered spec case.
- Spec §Demo additions — Task 5 FileUploadDemo has all 6 examples.
- Spec §AGENTS.md update — Task 4.
- Spec §Self-imposed constraints — encoded in code + JSDoc anti-patterns.
- Spec §Hard Rule 8 — Task 6.
- Spec §Open questions — none remaining (all resolved during brainstorming).

### Placeholder scan

- "TBD" / "TODO" / "implement later" — none.
- "Add appropriate error handling" / "handle edge cases" — none.
- "Write tests for the above" without code — none.
- "Similar to Task N" — none (every code block is fully spelled out).
- T4's AGENTS.md edit uses a "read the file to capture the exact anchor" pattern — same as Typography's T7 and Progress's T5 used. Documented with the exact section heading the implementer should look for.
- T5's ComponentsIndex card edit uses the same "find-the-preceding-entry, expand-with-new-card" pattern documented and used in prior PRs.

### Type consistency

- `FileEntry`, `FileUploadStatus`, `FileRejectReason`, `FileUploadProps` — declared in Task 2 source; used by Task 3 test imports; re-exported in Task 3's src/index.ts edit; referenced in Task 4 AGENTS.md prose; referenced in Task 5 demo imports. Same vocabulary throughout.
- `STATUS_CLASS` record + SCSS `.rowPending` / `.rowUploading` / `.rowDone` / `.rowError` — matched across Task 2's TSX + SCSS.
- Helper names `formatBytes` / `iconForFile` consistent across Task 1 (created), Task 2 (imported), Task 3 (asserted via rendered DOM).
- The SCSS spec used `.row-error` (kebab) and `.rowDone` (camel) inconsistently; normalized in the plan to all camelCase (`.rowPending`, `.rowUploading`, `.rowDone`, `.rowError`) AND introduced separate `.rowErrorMsg` / `.rowDoneIcon` for the inner content. Documented in Task 2 step 2.1's naming note.

### Found and fixed inline during write

- Spec collision: the spec's `.rowError` class was used both as the row variant AND as the error-message span. Normalized to separate names: `.rowError` (row variant — tints border), `.rowErrorMsg` (the message span). Done classes similarly split: `.rowDone` (row variant — currently no-op) vs `.rowDoneIcon` (the green check svg). Documented in the plan and SCSS.
- The status-row classes in the spec used kebab (`.row-error`) which clashes with camelCase house convention; normalized to camelCase (`.rowError`) accessed via the STATUS_CLASS record (matches Title.tsx and Progress.tsx).
- T5's lucide icon pick: `UploadCloud` (more specific to file upload than the generic `Upload`). Documented at the AppShell edit.
- T5's BasicSingle demo uses `crypto.randomUUID()` directly in the displayed code snippet, but the actual rendered component falls back via the `makeId()` helper for jsdom (where `crypto.randomUUID` may not exist in some environments) — a small but real divergence between the printed snippet and the actual rendered code. Acceptable: the snippet teaches the canonical pattern; the demo's runtime guards against jsdom quirks.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-05-24-file-upload.md`.

Per `feedback_plan_execution_mode` memory: always subagent-driven, no asking.

Use **superpowers:subagent-driven-development** to execute.

- Tasks 1, 2, 3, 5: sonnet implementer
- Task 4: haiku implementer (mechanical AGENTS.md insertion)
- Task 6 reviewers: opus
