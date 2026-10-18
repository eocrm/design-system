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

  it('trusts the produced Latin letter over the physical key on remapped layouts', () => {
    // AZERTY: the physical Q position produces 'a'.
    expect(isLetterKey({ key: 'a', code: 'KeyQ' }, 'a')).toBe(true);
    expect(isLetterKey({ key: 'a', code: 'KeyQ' }, 'q')).toBe(false);
  });
});
