import {
  forwardRef,
  useCallback,
  useRef,
  useEffect,
  useState,
  type DragEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { CloudUpload, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../Button';
import { Progress } from '../Progress';
import { useTranslation } from '../../i18n/useTranslation';
import { formatBytes } from './formatBytes';
import { iconForFile } from './iconForFile';
import styles from './FileUpload.module.scss';

/** Lifecycle status for a file in the controlled `files` array. */
export type FileUploadStatus = 'pending' | 'uploading' | 'done' | 'error';

/** Reason a file was rejected by built-in or custom validation. */
export type FileRejectReason = 'invalid-type' | 'too-large' | 'too-many' | 'duplicate' | 'custom';

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
   * Override the dropzone's main label. Default: the i18n value at
   * `fileUpload.dragHint`. Pass a ReactNode for richer content (e.g. with a
   * `<Code>` for accepted extensions).
   *
   * **A11y note:** when `dropzoneLabel` is a plain string, the component
   * uses it as `aria-label` on the dropzone. When it's a ReactNode, the
   * component falls back to the i18n value at `fileUpload.upload` and the
   * rich content is visible-only. To give screen readers the equivalent
   * text, pass `aria-label` via the spread (e.g. `aria-label="Upload CSV
   * or Excel files"`).
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
  const tokens = accept
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
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
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Batch announcement text. Derived from the controlled `files` array, and
  // deferred so region and text never mount together.
  const total = files.length;
  const settled = files.filter((f) => f.status === 'done' || f.status === 'error').length;
  const failed = files.filter((f) => f.status === 'error').length;
  const inFlight = total > 0 && settled < total;
  const [batchStatus, setBatchStatus] = useState('');
  // A settled batch is only announced if this component SAW it in flight.
  // Deriving it from `files` alone announced a batch that never happened: a
  // form opened on an entity with three existing attachments mounted already
  // settled, and the region went from '' to "Uploaded: 3 / 3" with nothing on
  // screen having changed. Hard rule 10 rules that out directly — gate the
  // region on what the user can SEE change, not on the raw prop.
  //
  // Tracked INSIDE the effect, not during render. Mutating a ref while
  // rendering breaks React's purity rule and a discarded concurrent render
  // would leave the flag set for a transfer the user never saw. In the effect
  // the ordering still works: the in-flight pass sets it, and the pass that
  // observes the batch settled reads what that earlier pass wrote.
  //
  // The IDS seen in flight, not a boolean. A boolean was reset only when the
  // list emptied, so a controlled parent swapping one already-settled `files`
  // array for another — switching entities on a shared instance after any
  // upload — carried it across and announced the new entity's pre-existing
  // attachments. That is the same defect this guard exists to close, surviving
  // on the prop-change path. Announcing requires the batch on screen to be one
  // this component actually watched.
  const seenInFlight = useRef<Set<string>>(new Set());
  const ids = files.map((f) => f.id).join('\u0000');
  useEffect(() => {
    if (total === 0) {
      seenInFlight.current = new Set();
      setBatchStatus('');
      return;
    }
    if (inFlight) for (const f of files) seenInFlight.current.add(f.id);
    const watched = files.some((f) => seenInFlight.current.has(f.id));
    setBatchStatus(
      inFlight
        ? t('fileUpload.batchUploading', { done: settled, total })
        : watched
          ? t('fileUpload.batchSettled', { done: total - failed, total, failed })
          : '',
    );
    // `ids` rather than `files`: a controlled parent commonly passes a new
    // array identity for the same batch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFlight, settled, total, failed, ids, t]);

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
      {/* ONE region for the whole batch. Per-row regions were the obvious
          shape and the wrong one: twelve files resolving inside two seconds is
          twelve announcements. Rendered unconditionally with its text deferred
          so a FileUpload that mounts mid-transfer still announces — see
          CLAUDE.md Hard rule 10 and #502. */}
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {batchStatus}
      </span>
      {showDropzone && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={ariaLabelledBy}
          aria-label={typeof dropzoneLabel === 'string' ? dropzoneLabel : t('fileUpload.upload')}
          aria-describedby={ariaDescribedBy}
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
          <span className={styles.dropzoneLabel}>{dropzoneLabel ?? t('fileUpload.dragHint')}</span>
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
                <span className={styles.rowStatus}>
                  {entry.status === 'uploading' && (
                    <Progress
                      size="sm"
                      value={entry.progress}
                      aria-label={t('fileUpload.uploadingAriaLabel', { name: entry.file.name })}
                    />
                  )}
                  {entry.status === 'error' && entry.error && (
                    <span className={styles.rowErrorMsg}>{entry.error}</span>
                  )}
                  {entry.status === 'done' && (
                    <Check
                      className={styles.rowDoneIcon}
                      size={16}
                      role="img"
                      aria-label={t('fileUpload.done')}
                    />
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  onClick={() => onFileRemove(entry)}
                  disabled={disabled}
                  // A failed row's message is plain text in a non-focusable
                  // <li>, so a user tabbing here later learned nothing about
                  // it. Fold the failure into the one name they DO reach.
                  aria-label={
                    entry.status === 'error'
                      ? t('fileUpload.removeFailedAriaLabel', { name: entry.file.name })
                      : t('fileUpload.removeAriaLabel', { name: entry.file.name })
                  }
                >
                  <X size={16} aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
