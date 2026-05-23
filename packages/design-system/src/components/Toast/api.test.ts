import { toast, _setViewportConfig } from './api';
import { store } from './store';

describe('toast api', () => {
  beforeEach(() => {
    store._reset();
    _setViewportConfig({ position: 'bottom-right', duration: 4000 });
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('toast() defaults to info tone', () => {
    toast('Hello');
    expect(store.getSnapshot().toasts[0]).toMatchObject({
      tone: 'info',
      message: 'Hello',
    });
  });

  it.each([
    ['info', 'info'],
    ['success', 'success'],
    ['warning', 'warning'],
    ['error', 'error'],
    ['loading', 'loading'],
  ] as const)('toast.%s writes tone=%s', (method, expectedTone) => {
    toast[method]('Hi');
    expect(store.getSnapshot().toasts[0].tone).toBe(expectedTone);
  });

  it('toast.loading defaults to duration: persistent', () => {
    toast.loading('Uploading');
    expect(store.getSnapshot().toasts[0].duration).toBe('persistent');
  });

  it('toast.success picks up viewport.duration default', () => {
    _setViewportConfig({ position: 'top-right', duration: 7000 });
    toast.success('Saved');
    expect(store.getSnapshot().toasts[0].duration).toBe(7000);
  });

  it('toast.success picks up viewport.position default', () => {
    _setViewportConfig({ position: 'top-center', duration: 4000 });
    toast.success('Saved');
    expect(store.getSnapshot().toasts[0].position).toBe('top-center');
  });

  it('per-call position overrides the viewport default', () => {
    toast.success('Saved', { position: 'top-left' });
    expect(store.getSnapshot().toasts[0].position).toBe('top-left');
  });

  it('per-call duration overrides the viewport default', () => {
    toast.success('Saved', { duration: 1000 });
    expect(store.getSnapshot().toasts[0].duration).toBe(1000);
  });

  it('dismissible defaults to true', () => {
    toast.success('Saved');
    expect(store.getSnapshot().toasts[0].dismissible).toBe(true);
  });

  it('dismissible: false is respected for non-persistent toasts', () => {
    toast.success('Saved', { dismissible: false });
    expect(store.getSnapshot().toasts[0].dismissible).toBe(false);
  });

  it('dismissible is FORCED true when duration: persistent', () => {
    toast.error('Boom', { duration: 'persistent', dismissible: false });
    expect(store.getSnapshot().toasts[0].dismissible).toBe(true);
  });

  it('toast.success returns the id (auto-generated)', () => {
    const id = toast.success('Saved');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('toast.update mutates a stored entry', () => {
    const id = toast.loading('Uploading');
    toast.update(id, { tone: 'success', message: 'Uploaded' });
    expect(store.getSnapshot().toasts[0]).toMatchObject({
      tone: 'success',
      message: 'Uploaded',
    });
  });

  it('toast.success with an existing id updates in place (no duplicate)', () => {
    const id = toast.loading('Uploading');
    toast.success('Uploaded', { id });
    expect(store.getSnapshot().toasts).toHaveLength(1);
    expect(store.getSnapshot().toasts[0]).toMatchObject({
      tone: 'success',
      message: 'Uploaded',
    });
  });

  it('toast.dismiss(id) flips status to exiting', () => {
    const id = toast.success('Saved');
    toast.dismiss(id);
    expect(store.getSnapshot().toasts[0].status).toBe('exiting');
  });

  it('toast.dismiss() with no id dismisses all', () => {
    toast.success('a');
    toast.success('b');
    toast.dismiss();
    expect(store.getSnapshot().toasts.every((t) => t.status === 'exiting')).toBe(true);
  });

  it('toast.promise: loading then success on resolve', async () => {
    const p = Promise.resolve({ name: 'file.pdf' });
    const wrapped = toast.promise(p, {
      loading: 'Uploading',
      success: (r) => `Uploaded ${r.name}`,
      error: 'Failed',
    });
    // After the first microtask flush, we should still be in loading.
    expect(store.getSnapshot().toasts[0].tone).toBe('loading');
    const value = await wrapped;
    expect(value).toEqual({ name: 'file.pdf' });
    expect(store.getSnapshot().toasts[0]).toMatchObject({
      tone: 'success',
      message: 'Uploaded file.pdf',
    });
  });

  it('toast.promise: loading then error on reject (and rethrows)', async () => {
    const err = new Error('500');
    const p = Promise.reject(err);
    const wrapped = toast.promise(p, {
      loading: 'Uploading',
      success: 'Uploaded',
      error: (e) => `Failed: ${(e as Error).message}`,
    });
    await expect(wrapped).rejects.toBe(err);
    expect(store.getSnapshot().toasts[0]).toMatchObject({
      tone: 'error',
      message: 'Failed: 500',
    });
  });
});
