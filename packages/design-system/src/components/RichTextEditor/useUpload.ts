// useUpload.ts — drives the attachment upload lifecycle for RichTextEditor. Owns
// the in-flight File map (for retry), inserts spinner blocks, runs onUpload in
// parallel, and settles each block by id. Editor I/O is injected so the hook is
// unit-testable without a DOM editor.
import { useCallback, useRef } from 'react';
import type { RichDoc, Point } from '../RichText/engine/model';
import { insertAttachmentBlock, updateAttachmentBlock } from '../RichText/engine/attachment';

/** What a consumer's upload handler must resolve with. */
export interface UploadResult {
  /** Where the uploaded file now lives. Required. */
  url: string;
  /** Display name; defaults to the File's name. */
  name?: string;
  /** MIME type; defaults to the File's type. Decides image-preview vs file-chip. */
  mime?: string;
  /** Natural pixel dimensions — help lay out image previews. */
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
}

export function useUpload({ config, getValue, applyInsert, applySettle, getCaret }: UseUploadArgs) {
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
          (res) => {
            filesRef.current.delete(id);
            applySettle(
              updateAttachmentBlock(getValue(), id, {
                status: 'ready',
                src: res.url,
                name: res.name ?? file.name,
                mime: res.mime ?? file.type,
                width: res.width,
                height: res.height,
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
    [config, getValue, applySettle, setInflight],
  );

  const uploadFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      // Insert all spinner blocks first (in order), then kick off uploads.
      let doc = getValue();
      let caret = getCaret();
      const ids: string[] = [];
      for (const file of files) {
        const r = insertAttachmentBlock(doc, caret, {
          name: file.name,
          mime: file.type,
          status: 'uploading',
        });
        doc = r.doc;
        caret = r.selection.anchor; // next insert goes after the trailing paragraph
        // the attachment block is the one immediately before the caret's block
        const caretIdx = doc.blocks.findIndex((b) => b.id === caret.blockId);
        const attId = doc.blocks[caretIdx - 1].id;
        ids.push(attId);
        filesRef.current.set(attId, file);
      }
      applyInsert(doc);
      files.forEach((file, i) => runUpload(ids[i], file));
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
      applySettle({ blocks: blocks.length ? blocks : doc.blocks });
    },
    [getValue, applySettle],
  );

  return { uploadFiles, retry, remove, accept: config.accept };
}
