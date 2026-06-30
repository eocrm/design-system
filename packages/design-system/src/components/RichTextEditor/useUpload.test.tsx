import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpload } from './useUpload';
import { docFromText } from '../RichText/engine/model';
import type { RichDoc } from '../RichText/engine/model';

function harness(
  onUpload: (f: File) => Promise<any>,
  onUploadingChange?: (b: boolean) => void,
  overrides?: Partial<Parameters<typeof useUpload>[0]>,
) {
  let doc: RichDoc = docFromText('hi');
  const getValue = () => doc;
  const apply = (d: RichDoc) => {
    doc = d;
  };
  const getCaret = () => ({ blockId: doc.blocks[0].id, offset: 0 });
  const { result } = renderHook(() =>
    useUpload({
      config: { onUpload, onUploadingChange },
      getValue,
      applyInsert: apply,
      applySettle: apply,
      getCaret,
      measureImage: async () => null,
      ...overrides,
    }),
  );
  return { result, getDoc: () => doc };
}

const file = (name: string, type = 'image/png') => new File(['x'], name, { type });

it('inserts a spinner block then swaps to ready on resolve', async () => {
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/p.png', mime: 'image/png' });
  const { result, getDoc } = harness(onUpload);
  act(() => {
    result.current.uploadFiles([file('p.png')]);
  });
  expect(getDoc().blocks.some((b) => b.type === 'attachment' && b.status === 'uploading')).toBe(
    true,
  );
  await waitFor(() => {
    expect(getDoc().blocks.some((b) => b.type === 'attachment' && b.status === 'ready')).toBe(true);
  });
  expect(onUpload).toHaveBeenCalledTimes(1);
});

it('marks error on reject and retry re-invokes onUpload', async () => {
  const onUpload = vi
    .fn()
    .mockRejectedValueOnce(new Error('nope'))
    .mockResolvedValueOnce({ url: 'http://u/p.png', mime: 'image/png' });
  const { result, getDoc } = harness(onUpload);
  act(() => {
    result.current.uploadFiles([file('p.png')]);
  });
  await waitFor(() => expect(getDoc().blocks.some((b) => b.status === 'error')).toBe(true));
  const errId = getDoc().blocks.find((b) => b.status === 'error')!.id;
  act(() => {
    result.current.retry(errId);
  });
  await waitFor(() => expect(getDoc().blocks.some((b) => b.status === 'ready')).toBe(true));
  expect(onUpload).toHaveBeenCalledTimes(2);
});

it('fires onUploadingChange(true) then (false) around a batch', async () => {
  const onUploadingChange = vi.fn();
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/p.png' });
  const { result } = harness(onUpload, onUploadingChange);
  act(() => {
    result.current.uploadFiles([file('a.png'), file('b.png')]);
  });
  expect(onUploadingChange).toHaveBeenCalledWith(true);
  await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(false));
  expect(onUpload).toHaveBeenCalledTimes(2);
  // Edge-triggered: fired exactly once each for the whole 2-file batch, not per-file.
  expect(onUploadingChange).toHaveBeenCalledTimes(2);
});

it('multi-file keeps file order', () => {
  const onUpload = vi.fn((f: File) =>
    Promise.resolve({ url: `http://u/${f.name}`, mime: 'image/png' }),
  );
  const { result, getDoc } = harness(onUpload);
  act(() => {
    result.current.uploadFiles([file('1.png'), file('2.png'), file('3.png')]);
  });
  const names = getDoc()
    .blocks.filter((b) => b.type === 'attachment')
    .map((b) => b.name);
  expect(names).toEqual(['1.png', '2.png', '3.png']);
});

it('remove deletes the attachment block', () => {
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/p.png' });
  const { result, getDoc } = harness(onUpload);
  act(() => {
    result.current.uploadFiles([file('p.png')]);
  });
  const id = getDoc().blocks.find((b) => b.type === 'attachment')!.id;
  act(() => {
    result.current.remove(id);
  });
  expect(getDoc().blocks.some((b) => b.id === id)).toBe(false);
});

it('remove leaves one empty paragraph when the attachment was the only block', () => {
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/p.png' });
  // doc starts with one paragraph 'hi'; replace the whole doc with a lone attachment
  let doc: RichDoc = docFromText('hi');
  const getValue = () => doc;
  const apply = (d: RichDoc) => {
    doc = d;
  };
  const getCaret = () => ({ blockId: doc.blocks[0].id, offset: 0 });
  const { result } = renderHook(() =>
    useUpload({
      config: { onUpload },
      getValue,
      applyInsert: apply,
      applySettle: apply,
      getCaret,
      measureImage: async () => null,
    }),
  );
  act(() => {
    result.current.uploadFiles([file('p.png')]);
  });
  const attId = doc.blocks.find((b) => b.type === 'attachment')!.id;
  // collapse the doc to just the attachment, then remove it
  doc = { blocks: doc.blocks.filter((b) => b.id === attId) };
  act(() => {
    result.current.remove(attId);
  });
  expect(doc.blocks).toHaveLength(1);
  expect(doc.blocks[0].type).toBe('paragraph');
  expect(doc.blocks[0].id).not.toBe(attId);
});

it('retry on an unknown id is a no-op (does not call onUpload)', () => {
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/p.png' });
  const { result } = harness(onUpload);
  act(() => {
    result.current.retry('nope');
  });
  expect(onUpload).not.toHaveBeenCalled();
});

it('replace swaps a ready attachment in place, keeping align/alt', async () => {
  const onUpload = vi
    .fn()
    .mockResolvedValue({ url: 'http://u/new.png', mime: 'image/png', name: 'new.png' });
  let doc: RichDoc = {
    blocks: [
      {
        id: 'v',
        type: 'attachment',
        status: 'ready',
        src: 'http://u/old.png',
        mime: 'image/png',
        name: 'old.png',
        alt: 'My chart',
        align: 'center',
        width: 500,
        inlines: [],
      },
    ],
  };
  const getValue = () => doc;
  const apply = (d: RichDoc) => {
    doc = d;
  };
  const getCaret = () => ({ blockId: 'v', offset: 0 });
  const { result } = renderHook(() =>
    useUpload({
      config: { onUpload },
      getValue,
      applyInsert: apply,
      applySettle: apply,
      getCaret,
      measureImage: async () => null,
    }),
  );
  act(() => {
    result.current.replace('v', new File(['x'], 'new.png', { type: 'image/png' }));
  });
  // immediately: uploading + old width cleared, but align/alt preserved
  expect(doc.blocks[0].status).toBe('uploading');
  expect(doc.blocks[0]).not.toHaveProperty('width');
  expect(doc.blocks[0].align).toBe('center');
  expect(doc.blocks[0].alt).toBe('My chart');
  await waitFor(() => expect(doc.blocks[0].status).toBe('ready'));
  expect(doc.blocks[0].src).toBe('http://u/new.png');
  expect(doc.blocks[0].align).toBe('center'); // preserved through the swap
  expect(onUpload).toHaveBeenCalledTimes(1);
});

it('drops a settle whose block was already removed', async () => {
  let resolveUpload: (r: any) => void = () => {};
  const onUpload = vi.fn(
    () =>
      new Promise((res) => {
        resolveUpload = res;
      }),
  );
  const { result, getDoc } = harness(onUpload as any);
  act(() => {
    result.current.uploadFiles([file('p.png')]);
  });
  const id = getDoc().blocks.find((b) => b.type === 'attachment')!.id;
  act(() => {
    result.current.remove(id);
  }); // delete before upload resolves
  act(() => {
    resolveUpload({ url: 'http://u/p.png' });
  }); // settle for a gone block
  await waitFor(() => expect(onUpload).toHaveBeenCalled());
  // updateAttachmentBlock no-ops on a missing id → block stays gone, no crash
  expect(getDoc().blocks.some((b) => b.id === id)).toBe(false);
});

it('sizes an uploaded image to perceived size (÷DPR) capped to the editor width', async () => {
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/p.png', mime: 'image/png' });
  const { result, getDoc } = harness(onUpload, undefined, {
    measureImage: async () => ({ width: 1200, height: 800 }),
    getDevicePixelRatio: () => 2,
    getContentWidth: () => 700,
  });
  act(() => {
    result.current.uploadFiles([new File(['x'], 'p.png', { type: 'image/png' })]);
  });
  await waitFor(() => {
    const b = getDoc().blocks.find((bl) => bl.type === 'attachment' && bl.status === 'ready');
    expect(b?.width).toBe(600);
    expect(b?.height).toBe(400);
  });
});

it('treats a consumer-reported width/height as natural and transforms it (no measure call)', async () => {
  const measureImage = vi.fn();
  const onUpload = vi
    .fn()
    .mockResolvedValue({ url: 'http://u/p.png', mime: 'image/png', width: 1000, height: 500 });
  const { result, getDoc } = harness(onUpload, undefined, {
    measureImage,
    getDevicePixelRatio: () => 2,
    getContentWidth: () => 700,
  });
  act(() => {
    result.current.uploadFiles([new File(['x'], 'p.png', { type: 'image/png' })]);
  });
  await waitFor(() => {
    const b = getDoc().blocks.find((bl) => bl.type === 'attachment' && bl.status === 'ready');
    expect(b?.width).toBe(500);
    expect(b?.height).toBe(250);
  });
  expect(measureImage).not.toHaveBeenCalled();
});

it('leaves a block unsized when dimensions are unknown (measure → null)', async () => {
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/f.pdf', mime: 'application/pdf' });
  const { result, getDoc } = harness(onUpload, undefined, { measureImage: async () => null });
  act(() => {
    result.current.uploadFiles([new File(['x'], 'f.pdf', { type: 'application/pdf' })]);
  });
  await waitFor(() => {
    const b = getDoc().blocks.find((bl) => bl.type === 'attachment' && bl.status === 'ready');
    expect(b).toBeTruthy();
    expect(b?.width).toBeUndefined();
    expect(b?.height).toBeUndefined();
  });
});

it('uses the MEASURED pair wholesale when the consumer reports only one dimension', async () => {
  // Consumer gives only width (and a value that disagrees with the real file); the
  // measured pair must win so the aspect ratio isn't distorted by the mismatch.
  const onUpload = vi
    .fn()
    .mockResolvedValue({ url: 'http://u/p.png', mime: 'image/png', width: 999 });
  const { result, getDoc } = harness(onUpload, undefined, {
    measureImage: async () => ({ width: 1200, height: 800 }),
    getDevicePixelRatio: () => 2,
    getContentWidth: () => 0,
  });
  act(() => {
    result.current.uploadFiles([new File(['x'], 'p.png', { type: 'image/png' })]);
  });
  await waitFor(() => {
    const b = getDoc().blocks.find((bl) => bl.type === 'attachment' && bl.status === 'ready');
    expect(b?.width).toBe(600); // 1200/2 — from the measured pair, not the consumer's 999
    expect(b?.height).toBe(400); // aspect from the measured 1200×800
  });
});

it('still settles (unsized) when the measurer throws', async () => {
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/p.png', mime: 'image/png' });
  const { result, getDoc } = harness(onUpload, undefined, {
    measureImage: async () => {
      throw new Error('decode boom');
    },
  });
  act(() => {
    result.current.uploadFiles([new File(['x'], 'p.png', { type: 'image/png' })]);
  });
  await waitFor(() => {
    const b = getDoc().blocks.find((bl) => bl.type === 'attachment' && bl.status === 'ready');
    expect(b).toBeTruthy(); // not stranded in 'uploading'
    expect(b?.width).toBeUndefined();
  });
});
