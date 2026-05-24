import { useEffect, useRef, useState } from 'react';
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup any in-flight interval when the component unmounts so leftover
  // ticks don't try to setState on an unmounted demo (the StrictMode +
  // hot-reload combo otherwise produces noisy console warnings).
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const startUpload = () => {
    if (files.length === 0) return;
    // Defensive: clear any prior interval before starting a new one.
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const id = files[0].id;
    setFiles((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'uploading' as const, progress: 0 } : e)),
    );
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 10);
        setFiles((prev) =>
          prev.map((e) => (e.id === id ? { ...e, progress: next } : e)),
        );
        if (next === 100) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
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
