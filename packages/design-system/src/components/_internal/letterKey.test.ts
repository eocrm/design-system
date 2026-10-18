import { isLetterKey } from './letterKey';

describe('isLetterKey', () => {
  it('matches a Latin key regardless of case', () => {
    expect(isLetterKey({ key: 'k', code: 'KeyK' }, 'k')).toBe(true);
    expect(isLetterKey({ key: 'K', code: 'KeyK' }, 'k')).toBe(true);
  });

  it('falls back to the physical key on a non-Latin layout', () => {
    expect(isLetterKey({ key: 'л', code: 'KeyK' }, 'k')).toBe(true);
    expect(isLetterKey({ key: 'Л', code: 'KeyK' }, 'k')).toBe(true);
    expect(isLetterKey({ key: 'я', code: 'KeyZ' }, 'k')).toBe(false);
  });

  it('does not fall back while Alt/AltGr is held (that is typing, not a shortcut)', () => {
    // Windows AltGr = Ctrl+Alt; Polish AltGr+Z types 'ż'.
    expect(isLetterKey({ key: 'ż', code: 'KeyZ', altKey: true }, 'z')).toBe(false);
    expect(isLetterKey({ key: 'ę', code: 'KeyE', altKey: true }, 'e')).toBe(false);
  });

  it('never falls back for ASCII punctuation or named keys on letter positions', () => {
    // Dvorak: physical KeyZ types ';', KeyE types '.'.
    expect(isLetterKey({ key: ';', code: 'KeyZ' }, 'z')).toBe(false);
    expect(isLetterKey({ key: '.', code: 'KeyE' }, 'e')).toBe(false);
    // macOS Option+E dead key.
    expect(isLetterKey({ key: 'Dead', code: 'KeyE', altKey: true }, 'e')).toBe(false);
  });

  it('trusts the produced Latin letter over the physical key on remapped layouts', () => {
    // AZERTY: the physical Q position produces 'a'.
    expect(isLetterKey({ key: 'a', code: 'KeyQ' }, 'a')).toBe(true);
    expect(isLetterKey({ key: 'a', code: 'KeyQ' }, 'q')).toBe(false);
  });
});
