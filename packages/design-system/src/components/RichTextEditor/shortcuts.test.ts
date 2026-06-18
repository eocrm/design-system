import { shortcutMark } from './shortcuts';

const key = (
  k: string,
  mod: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }> = {},
) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  ...mod,
});

describe('shortcutMark', () => {
  it('maps each modifier combo to its mark', () => {
    expect(shortcutMark(key('b', { metaKey: true }))).toEqual({ type: 'bold' });
    expect(shortcutMark(key('i', { ctrlKey: true }))).toEqual({ type: 'italic' });
    expect(shortcutMark(key('u', { metaKey: true }))).toEqual({ type: 'underline' });
    expect(shortcutMark(key('x', { metaKey: true, shiftKey: true }))).toEqual({ type: 'strike' });
  });

  it('uppercase key still matches', () => {
    expect(shortcutMark(key('B', { metaKey: true }))).toEqual({ type: 'bold' });
  });

  it('returns null without a modifier', () => {
    expect(shortcutMark(key('b'))).toBeNull();
  });

  it('returns null for ⌘B+Shift and non-shortcut keys', () => {
    expect(shortcutMark(key('b', { metaKey: true, shiftKey: true }))).toBeNull();
    expect(shortcutMark(key('a', { metaKey: true }))).toBeNull();
  });
});
