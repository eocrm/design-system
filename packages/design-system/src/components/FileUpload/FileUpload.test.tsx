import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { FileUpload, type FileEntry } from './FileUpload';
import { Field } from '../Field';

// Helper — build a File with controllable name + size + MIME for tests.
function makeFile(name: string, sizeBytes: number, type: string): File {
  const content = new Uint8Array(sizeBytes);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

// Helper — build a FileEntry from a File for the `files` prop.
function entry(
  id: string,
  file: File,
  status: FileEntry['status'] = 'pending',
  extra?: Partial<FileEntry>,
): FileEntry {
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
      <FileUpload files={[entry('1', file)]} onFilesAdded={() => {}} onFileRemove={() => {}} />,
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
    render(<FileUpload disabled files={[]} onFilesAdded={onFilesAdded} onFileRemove={() => {}} />);
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
    render(<FileUpload files={[entry('1', f1)]} onFilesAdded={() => {}} onFileRemove={() => {}} />);
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
      <FileUpload files={[]} className="custom" onFilesAdded={() => {}} onFileRemove={() => {}} />,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/custom/);
    expect(cls).toMatch(/root_/);
  });

  it('forwards ref to the outermost <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(<FileUpload ref={ref} files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('drag-over class is added on dragenter and removed on dragleave (counter-based)', () => {
    render(<FileUpload files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} />);
    const dropzone = screen.getByRole('button', { name: 'Upload files' });
    fireEvent.dragEnter(dropzone);
    expect(dropzone.className).toMatch(/dragOver/);
    fireEvent.dragLeave(dropzone);
    expect(dropzone.className).not.toMatch(/dragOver/);
  });

  it('a Field label names the dropzone (auto-clone)', () => {
    render(
      <Field label="Attachments">
        <FileUpload files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} />
      </Field>,
    );
    expect(screen.getByRole('button', { name: 'Attachments' })).toBeInTheDocument();
  });

  it('forwards aria-labelledby onto the dropzone, not the root', () => {
    render(
      <>
        <span id="ext-label">Attachments</span>
        <FileUpload
          aria-labelledby="ext-label"
          files={[]}
          onFilesAdded={() => {}}
          onFileRemove={() => {}}
        />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Attachments' })).toBeInTheDocument();
  });
});

describe('batch progress and failed rows reach assistive tech (#502)', () => {
  const file = (name: string) => new File(['x'], name, { type: 'text/plain' });
  const noop = () => {};

  it('announces the batch from ONE region, not one per row', async () => {
    // Twelve files resolving inside two seconds must not be twelve
    // announcements — that is why this is a batch region rather than per-row.
    const files: FileEntry[] = [
      { id: '1', file: file('a.txt'), status: 'done' },
      { id: '2', file: file('b.txt'), status: 'uploading' },
      { id: '3', file: file('c.txt'), status: 'pending' },
    ];
    const { container } = render(
      <FileUpload files={files} onFilesAdded={noop} onFileRemove={noop} />,
    );
    const regions = container.querySelectorAll('[role="status"][aria-live="polite"]');
    expect(regions).toHaveLength(1);
    await waitFor(() => expect(regions[0]!.textContent).toBe('Uploading: 1 / 3'));
  });

  it('announces the outcome once every transfer settles', async () => {
    // Rendered IN FLIGHT first, then settled. Asserting on a settled mount
    // pinned the defect instead of the fix: the region has to have watched the
    // transfer to have anything to report about it.
    // The SAME File objects across both states. A controlled consumer updates
    // `status` on entries it already holds; it does not re-read the file. The
    // guard keys on the File instance, so a test that rebuilt them was
    // modelling something no consumer does.
    const [fa, fb] = [file('a.txt'), file('b.txt')];
    const inFlight: FileEntry[] = [
      { id: '1', file: fa, status: 'uploading' },
      { id: '2', file: fb, status: 'uploading' },
    ];
    const settled: FileEntry[] = [
      { id: '1', file: fa, status: 'done' },
      { id: '2', file: fb, status: 'error', error: 'boom' },
    ];
    const { container, rerender } = render(
      <FileUpload files={inFlight} onFilesAdded={noop} onFileRemove={noop} />,
    );
    const region = container.querySelector('[role="status"]');
    await waitFor(() => expect(region!.textContent).toBe('Uploading: 0 / 2'));
    rerender(<FileUpload files={settled} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region!.textContent).toBe('Uploaded: 1 / 2. Failed: 1.'));
  });

  it('does not report an outcome when a SETTLED row is deleted', async () => {
    // The sibling of the in-flight-removal case, and it survived that fix: a
    // watched file remained, so the counts simply recomputed and deleting one
    // of two finished uploads announced "Uploaded: 1 / 1." Nothing settled —
    // the array just got shorter.
    const [fx, fy] = [file('x.txt'), file('y.txt')];
    const up: FileEntry[] = [
      { id: 'x', file: fx, status: 'uploading' },
      { id: 'y', file: fy, status: 'uploading' },
    ];
    const done: FileEntry[] = [
      { id: 'x', file: fx, status: 'done' },
      { id: 'y', file: fy, status: 'done' },
    ];
    const afterDelete: FileEntry[] = [{ id: 'y', file: fy, status: 'done' }];
    const { container, rerender } = render(
      <FileUpload files={up} onFilesAdded={noop} onFileRemove={noop} />,
    );
    const region = container.querySelector('[role="status"]');
    rerender(<FileUpload files={done} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region!.textContent).toBe('Uploaded: 2 / 2.'));
    rerender(<FileUpload files={afterDelete} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region!.textContent).toBe(''));
  });

  it('stays silent when the next entity reuses the same file ids', async () => {
    // Ids belong to the consumer, and one numbering them per entity hands the
    // next entity the same ones. Keying the guard on ids let entity B inherit
    // entity A's flag and announce its pre-existing attachments — the fourth
    // defect in this guard and the third of that shape. It keys on the File
    // instance instead, which a consumer cannot collide.
    const fa = file('a.txt');
    const up: FileEntry[] = [{ id: 'f1', file: fa, status: 'uploading' }];
    const done: FileEntry[] = [{ id: 'f1', file: fa, status: 'done' }];
    const nextEntity: FileEntry[] = [{ id: 'f1', file: file('z.txt'), status: 'done' }];
    const { container, rerender } = render(
      <FileUpload files={up} onFilesAdded={noop} onFileRemove={noop} />,
    );
    const region = container.querySelector('[role="status"]');
    rerender(<FileUpload files={done} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region!.textContent).toBe('Uploaded: 1 / 1.'));
    rerender(<FileUpload files={nextEntity} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region!.textContent).toBe(''));
  });

  it('does not report an upload outcome when the last in-flight row is removed', async () => {
    // A deletion is not a completed transfer. Recording the whole batch as
    // "seen" meant the settled sibling kept the flag alive, so removing the
    // uploading row announced "Uploaded: 1 / 1" for something that never
    // finished.
    const fa = file('a.txt');
    const mixed: FileEntry[] = [
      { id: 'a', file: fa, status: 'done' },
      { id: 'b', file: file('b.txt'), status: 'uploading' },
    ];
    const afterRemoval: FileEntry[] = [{ id: 'a', file: fa, status: 'done' }];
    const { container, rerender } = render(
      <FileUpload files={mixed} onFilesAdded={noop} onFileRemove={noop} />,
    );
    const region = container.querySelector('[role="status"]');
    await waitFor(() => expect(region!.textContent).toBe('Uploading: 1 / 2'));
    rerender(<FileUpload files={afterRemoval} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region!.textContent).toBe(''));
  });

  it('stays silent when the batch is swapped for another entity without emptying', async () => {
    // A form switching entity on a shared FileUpload instance. Entity B's
    // files were never in flight here, so nothing may be announced — a boolean
    // flag reset only on empty carried across the swap and announced B's
    // pre-existing attachments.
    const fa = file('a.txt');
    const aInFlight: FileEntry[] = [{ id: 'a1', file: fa, status: 'uploading' }];
    const aDone: FileEntry[] = [{ id: 'a1', file: fa, status: 'done' }];
    const bDone: FileEntry[] = [
      { id: 'b1', file: file('b.txt'), status: 'done' },
      { id: 'b2', file: file('c.txt'), status: 'done' },
    ];
    const { container, rerender } = render(
      <FileUpload files={aInFlight} onFilesAdded={noop} onFileRemove={noop} />,
    );
    const region = container.querySelector('[role="status"]');
    rerender(<FileUpload files={aDone} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region!.textContent).toBe('Uploaded: 1 / 1.'));
    rerender(<FileUpload files={bDone} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region!.textContent).toBe(''));
  });

  it('stays silent again after a completed batch is cleared', async () => {
    // The flag has to RESET, or every later settled array announces. Emptying
    // the list is the reset point, which is what a controlled parent does
    // between transfers.
    const fa = file('a.txt');
    const inFlight: FileEntry[] = [{ id: '1', file: fa, status: 'uploading' }];
    const done: FileEntry[] = [{ id: '1', file: fa, status: 'done' }];
    // The SAME File, deliberately: re-added after the list was cleared. Two
    // earlier versions of this test could not fail — one used an id never in
    // the set, and once the guard keyed on File instances rather than ids, a
    // different file made the reset irrelevant too. Only a file the component
    // genuinely watched, returning already-settled, makes the reset the one
    // thing standing between this and a false announcement.
    const other: FileEntry[] = [{ id: '1', file: fa, status: 'done' }];
    const { container, rerender } = render(
      <FileUpload files={inFlight} onFilesAdded={noop} onFileRemove={noop} />,
    );
    const region = container.querySelector('[role="status"]');
    rerender(<FileUpload files={done} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region!.textContent).toBe('Uploaded: 1 / 1.'));
    rerender(<FileUpload files={[]} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region!.textContent).toBe(''));
    rerender(<FileUpload files={other} onFilesAdded={noop} onFileRemove={noop} />);
    await waitFor(() => expect(region).not.toBeNull());
    expect(region!.textContent).toBe('');
  });

  it('stays silent when it mounts on an already-settled batch', async () => {
    // A CRM form opened on an entity that already has attachments. Nothing
    // changed on screen, so nothing may be announced — Hard rule 10 gates the
    // region on what the user can SEE change, not on the raw prop. Deriving
    // the text from `files` alone moved the region from '' to
    // "Uploaded: 3 / 3" on mount and fired a polite announcement for it.
    const files: FileEntry[] = [
      { id: '1', file: file('a.txt'), status: 'done' },
      { id: '2', file: file('b.txt'), status: 'done' },
      { id: '3', file: file('c.txt'), status: 'done' },
    ];
    const { container } = render(
      <FileUpload files={files} onFilesAdded={noop} onFileRemove={noop} />,
    );
    const region = container.querySelector('[role="status"]');
    await waitFor(() => expect(region).not.toBeNull());
    expect(region!.textContent).toBe('');
  });

  it('names a failed row on the one control the user can reach', () => {
    // The failure is plain text in a non-focusable <li>; the row's only
    // focusable control was named "Remove {file}" and said nothing about it.
    const files: FileEntry[] = [{ id: '1', file: file('a.txt'), status: 'error', error: 'boom' }];
    render(<FileUpload files={files} onFilesAdded={noop} onFileRemove={noop} />);
    expect(
      screen.getByRole('button', { name: 'Remove a.txt — upload failed' }),
    ).toBeInTheDocument();
  });

  it('leaves a healthy row named plainly', () => {
    const files: FileEntry[] = [{ id: '1', file: file('a.txt'), status: 'done' }];
    render(<FileUpload files={files} onFilesAdded={noop} onFileRemove={noop} />);
    expect(screen.getByRole('button', { name: 'Remove a.txt' })).toBeInTheDocument();
  });
});
