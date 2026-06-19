import { getMentionContext } from './mentionContext';

describe('getMentionContext', () => {
  it('opens at the start of a block', () => {
    expect(getMentionContext('@al', 3, '@')).toEqual({ query: 'al', triggerOffset: 0 });
  });

  it('opens after whitespace', () => {
    expect(getMentionContext('hi @al', 6, '@')).toEqual({ query: 'al', triggerOffset: 3 });
  });

  it('returns an empty query right after the trigger', () => {
    expect(getMentionContext('hi @', 4, '@')).toEqual({ query: '', triggerOffset: 3 });
  });

  it('does NOT open mid-word (trigger preceded by a non-space)', () => {
    expect(getMentionContext('email@x', 7, '@')).toBeNull();
  });

  it('does NOT open when a space sits between the trigger and the caret', () => {
    expect(getMentionContext('@al bob', 7, '@')).toBeNull();
  });

  it('chooses the nearest valid trigger', () => {
    expect(getMentionContext('@a @bo', 6, '@')).toEqual({ query: 'bo', triggerOffset: 3 });
  });

  it('honors a custom trigger', () => {
    expect(getMentionContext('see #re', 7, '#')).toEqual({ query: 're', triggerOffset: 4 });
  });

  it('returns null when there is no trigger before the caret', () => {
    expect(getMentionContext('hello', 5, '@')).toBeNull();
  });
});
