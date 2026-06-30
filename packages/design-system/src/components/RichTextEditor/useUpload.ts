// useUpload.ts — drives the attachment upload lifecycle for RichTextEditor. Owns
// the in-flight File map (for retry), inserts spinner blocks, runs onUpload in
// parallel, and settles each block by id. Editor I/O is injected so the hook is
// unit-testable without a DOM editor.
import { useCallback, useRef } from 'react';
import type { RichDoc, Point } from '../RichText/engine/model';
import { emptyDoc } from '../RichText/engine/model';
import {
  insertAttachmentBlock,
  updateAttachmentBlock,
  clearAttachmentFields,
} from '../RichText/engine/attachment';
import { computeDisplaySize, measureImageFromFile, type NaturalSize } from './imageSize';

/** What a consumer's upload handler must resolve with. */
export interface UploadResult {
  /** Where the uploaded file now lives. Required. */
  url: string;
  /** Display name; defaults to the File's name. */
  name?: string;
  /** MIME type; defaults to the File's type. Decides image-preview vs file-chip. */
  mime?: string;
  /**
   * NATURAL pixel dimensions of the image (not the on-screen size). The editor
   * derives the initial display size from these — scaling by the device pixel
   * ratio and capping to the editor width — so a retina screenshot isn't inserted
   * at 2× its perceived size. Omit them and the editor measures the file itself.
   */
  width?: number;
  height?: number;
  /** Initial alt text. */
  alt?: string;
}

/** Consumer config for `RichTextEditor`'s `upload` prop. */
export interface UploadConfig {
  /** Upload one file; resolve with where it landed, reject to show an error. */
  onUpload: (file: File) => Promise<UploadResult>;
  /** Optional native file-picker filter, e.g. "image/*,.pdf". Convenience only —
   *  it does NOT enforce types (paste bypasses it); enforce in `onUpload`. */
  accept?: string;
  /** Fired with `true` while ≥1 upload is in flight, `false` when all settle. */
  onUploadingChange?: (uploading: boolean) => void;
}

interface UseUploadArgs {
  config: UploadConfig;
  getValue: () => RichDoc;
  /** Apply the synchronous spinner-block insert (records ONE undo step). */
  applyInsert: (doc: RichDoc) => void;
  /** Apply an async settle patch (resolve/error) WITHOUT a new undo step. */
  applySettle: (doc: RichDoc) => void;
  /** Current caret Point (where to insert). */
  getCaret: () => Point;
  /** Measure an image File's natural pixel size (injectable for tests). */
  measureImage?: (file: File) => Promise<NaturalSize | null>;
  /** Editor content width in CSS px — caps a pasted image's initial width. `0` = no cap. */
  getContentWidth?: () => number;
  /** Current device pixel ratio (injectable for tests). */
  getDevicePixelRatio?: () => number;
}

export function useUpload({
  config,
  getValue,
  applyInsert,
  applySettle,
  getCaret,
  measureImage = measureImageFromFile,
  getContentWidth = () => 0,
  getDevicePixelRatio = () => (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
}: UseUploadArgs) {
  const filesRef = useRef(new Map<string, File>()); // block id → File (for retry)
  const inflightRef = useRef(0);

  const setInflight = useCallback(
    (delta: number) => {
      const prev = inflightRef.current;
      inflightRef.current = Math.max(0, prev + delta);
      if (prev === 0 && inflightRef.current > 0) config.onUploadingChange?.(true);
      if (prev > 0 && inflightRef.current === 0) config.onUploadingChange?.(false);
    },
    [config],
  );

  const runUpload = useCallback(
    (id: string, file: File) => {
      setInflight(1);
      config
        .onUpload(file)
        .then(
          async (res) => {
            filesRef.current.delete(id);
            // Natural dims: prefer the consumer's reported size (documented as
            // natural px), else measure the File. Then lay out at perceived size
            // (÷DPR) capped to the editor width — so a retina screenshot doesn't
            // come in at 2× the size you saw.
            let naturalW = res.width;
            let naturalH = res.height;
            // Only a COMPLETE consumer pair short-circuits the measure; if either is
            // missing we measure and take the measured pair WHOLESALE, so a partial
            // (and possibly inconsistent) consumer value can't distort the aspect.
            // The measure is best-effort — a throwing injected measurer must not
            // strand the block mid-upload, so swallow and fall back to "unsized".
            if (naturalW == null || naturalH == null) {
              let measured = null;
              try {
                measured = await measureImage(file);
              } catch {
                measured = null;
              }
              naturalW = measured?.width ?? naturalW;
              naturalH = measured?.height ?? naturalH;
            }
            const display = computeDisplaySize(
              naturalW,
              naturalH,
              getDevicePixelRatio(),
              getContentWidth(),
            );
            applySettle(
              updateAttachmentBlock(getValue(), id, {
                status: 'ready',
                src: res.url,
                name: res.name ?? file.name,
                mime: res.mime ?? file.type,
                width: display?.width,
                height: display?.height,
                alt: res.alt,
              }),
            );
          },
          () => {
            applySettle(updateAttachmentBlock(getValue(), id, { status: 'error' }));
          },
        )
        .finally(() => setInflight(-1));
    },
    [
      config,
      getValue,
      applySettle,
      setInflight,
      measureImage,
      getContentWidth,
      getDevicePixelRatio,
    ],
  );

  const uploadFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      // Insert all spinner blocks first (in order), then kick off uploads.
      let doc = getValue();
      let caret = getCaret();
      const pending: { id: string; file: File }[] = [];
      for (const file of files) {
        const r = insertAttachmentBlock(doc, caret, {
          name: file.name,
          mime: file.type,
          status: 'uploading',
        });
        // Skip a file whose insert no-op'd (caret block not in the doc) rather
        // than crashing the whole batch on a stale/invalid caret.
        if (r.attachmentId === null) continue;
        doc = r.doc;
        caret = r.selection.anchor; // next insert goes after the trailing paragraph
        pending.push({ id: r.attachmentId, file });
        filesRef.current.set(r.attachmentId, file);
      }
      if (pending.length === 0) return;
      applyInsert(doc);
      pending.forEach(({ id, file }) => runUpload(id, file));
    },
    [getValue, getCaret, applyInsert, runUpload],
  );

  const retry = useCallback(
    (id: string) => {
      const file = filesRef.current.get(id);
      if (!file) return;
      applySettle(updateAttachmentBlock(getValue(), id, { status: 'uploading' }));
      runUpload(id, file);
    },
    [getValue, applySettle, runUpload],
  );

  const remove = useCallback(
    (id: string) => {
      filesRef.current.delete(id);
      const doc = getValue();
      const blocks = doc.blocks.filter((b) => b.id !== id);
      // If that emptied the doc, leave one empty paragraph (mirrors the engine's
      // removeBlockUnit) — never silently re-keep the block the user removed.
      applySettle(blocks.length ? { blocks } : emptyDoc());
    },
    [getValue, applySettle],
  );

  const replace = useCallback(
    (id: string, file: File) => {
      filesRef.current.set(id, file);
      // Keep align/alt; drop the old display size so the new file's natural size
      // applies. Then run the upload (settles src/name/mime via runUpload).
      let doc = updateAttachmentBlock(getValue(), id, { status: 'uploading' });
      doc = clearAttachmentFields(doc, id, ['width', 'height']);
      applySettle(doc);
      runUpload(id, file);
    },
    [getValue, applySettle, runUpload],
  );

  return { uploadFiles, retry, remove, replace, accept: config.accept };
}
