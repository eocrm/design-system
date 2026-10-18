import { shortcutMark } from './shortcuts';

const key = (
  k: string,
  mod: Partial<{
    code: string;
    altKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
  }> = {},
) => ({
  key: k,
  code: /^[a-z]$/i.test(k) ? `Key${k.toUpperCase()}` : '',
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

  it('matches the physical key on a non-Latin layout (#654)', () => {
    expect(shortcutMark(key('и', { code: 'KeyB', ctrlKey: true }))).toEqual({ type: 'bold' });
    expect(shortcutMark(key('ч', { code: 'KeyX', ctrlKey: true, shiftKey: true }))).toEqual({
      type: 'strike',
    });
    // Polish AltGr+Shift+X types 'Ź' (AltGr = Ctrl+Alt on Windows) — not strike.
    expect(
      shortcutMark(key('Ź', { code: 'KeyX', ctrlKey: true, shiftKey: true, altKey: true })),
    ).toBeNull();
  });
});
