import { store, generateId, EXIT_ANIMATION_MS, type ToastInput } from './store';

const baseInput = (overrides: Partial<ToastInput> = {}): ToastInput => ({
  id: 't1',
  tone: 'info',
  message: 'Hello',
  duration: 4000,
  position: 'bottom-right',
  dismissible: true,
  ...overrides,
});

describe('toast store', () => {
  beforeEach(() => {
    store._reset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with an empty toast list', () => {
    expect(store.getSnapshot().toasts).toEqual([]);
  });

  it('add() appends an entry and returns the id', () => {
    const id = store.add(baseInput({ id: 'a' }));
    expect(id).toBe('a');
    expect(store.getSnapshot().toasts).toHaveLength(1);
    expect(store.getSnapshot().toasts[0]).toMatchObject({
      id: 'a',
      tone: 'info',
      status: 'visible',
    });
  });

  it('add() preserves the message field', () => {
    store.add(baseInput({ id: 'a', message: 'Saved' }));
    expect(store.getSnapshot().toasts[0].message).toBe('Saved');
  });

  it('add() with an existing id delegates to update (no duplicate)', () => {
    store.add(baseInput({ id: 'a', tone: 'info' }));
    store.add(baseInput({ id: 'a', tone: 'success', message: 'Done' }));
    expect(store.getSnapshot().toasts).toHaveLength(1);
    expect(store.getSnapshot().toasts[0]).toMatchObject({
      tone: 'success',
      message: 'Done',
    });
  });

  it('update() mutates an existing entry', () => {
    store.add(baseInput({ id: 'a' }));
    store.update('a', { tone: 'success', message: 'Done' });
    expect(store.getSnapshot().toasts[0]).toMatchObject({
      tone: 'success',
      message: 'Done',
    });
  });

  it('update() is a no-op on unknown id', () => {
    store.add(baseInput({ id: 'a' }));
    store.update('nope', { tone: 'error' });
    expect(store.getSnapshot().toasts[0].tone).toBe('info');
  });

  it('dismiss(id) flips status to exiting, then removes after EXIT_ANIMATION_MS', () => {
    store.add(baseInput({ id: 'a' }));
    store.dismiss('a');
    expect(store.getSnapshot().toasts[0].status).toBe('exiting');
    vi.advanceTimersByTime(EXIT_ANIMATION_MS);
    expect(store.getSnapshot().toasts).toEqual([]);
  });

  it('dismiss(unknownId) is a no-op', () => {
    store.add(baseInput({ id: 'a' }));
    store.dismiss('nope');
    expect(store.getSnapshot().toasts).toHaveLength(1);
    expect(store.getSnapshot().toasts[0].status).toBe('visible');
  });

  it('dismiss() with no id marks all exiting then clears', () => {
    store.add(baseInput({ id: 'a' }));
    store.add(baseInput({ id: 'b' }));
    store.dismiss();
    expect(store.getSnapshot().toasts.every((t) => t.status === 'exiting')).toBe(true);
    vi.advanceTimersByTime(EXIT_ANIMATION_MS);
    expect(store.getSnapshot().toasts).toEqual([]);
  });

  it('subscribe() listener fires on add/update/dismiss', () => {
    const listener = vi.fn();
    store.subscribe(listener);
    store.add(baseInput({ id: 'a' }));
    store.update('a', { message: 'b' });
    store.dismiss('a');
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('subscribe() returns an unsubscribe function', () => {
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    unsub();
    store.add(baseInput({ id: 'a' }));
    expect(listener).not.toHaveBeenCalled();
  });

  it('generateId() returns unique ids across rapid calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(generateId());
    expect(ids.size).toBe(1000);
  });

  it('add() with no id field is allowed only if caller passes one; consumers use generateId()', () => {
    // The store doesn't auto-generate — that's the API layer's job.
    // This test documents the contract: id is required on ToastInput.
    const id = store.add(baseInput({ id: generateId() }));
    expect(id).toMatch(/^t/);
  });
});
