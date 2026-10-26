import { getSynced, resolveActiveSample, setSynced, subscribeSynced } from './sampleSync';

describe('syncKey store', () => {
  it('notifies only the subscribers of the key that was set', () => {
    const onK = vi.fn();
    const onJ = vi.fn();
    const unsubK = subscribeSynced('k', onK);
    const unsubJ = subscribeSynced('j', onJ);

    setSynced('k', 'py');

    expect(getSynced('k')).toBe('py');
    expect(onK).toHaveBeenCalledTimes(1);
    expect(onJ).not.toHaveBeenCalled();

    unsubK();
    unsubJ();
  });

  it('stops notifying after unsubscribe', () => {
    const onChange = vi.fn();
    const unsub = subscribeSynced('k2', onChange);
    unsub();

    setSynced('k2', 'curl');

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('resolveActiveSample', () => {
  const ids = ['curl', 'py'];

  it('ignores a synced id that is not in ids and falls back', () => {
    expect(resolveActiveSample(ids, { synced: 'json', fallback: 'py' })).toBe('py');
  });

  it('prefers controlled over synced', () => {
    expect(resolveActiveSample(ids, { controlled: 'curl', synced: 'py' })).toBe('curl');
  });

  it('defaults to the first id', () => {
    expect(resolveActiveSample(ids, {})).toBe('curl');
  });
});
