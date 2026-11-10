// @vitest-environment jsdom
import { readPx } from './readPx';

function withVar(value: string) {
  const el = document.createElement('div');
  el.style.setProperty('--len', value);
  document.body.append(el);
  return el;
}

describe('readPx', () => {
  it('reads px', () => {
    expect(readPx(withVar('12px'), '--len', 3)).toBe(12);
  });

  it('converts rem against the root font size (DS-60)', () => {
    document.documentElement.style.fontSize = '16px';
    expect(readPx(withVar('1.5rem'), '--len', 3)).toBe(24);
    document.documentElement.style.fontSize = '';
  });

  it.each(['', 'calc(1px + 1rem)', '2em', '-4px'])('falls back for %j', (value) => {
    expect(readPx(withVar(value), '--len', 3)).toBe(3);
  });

  it('falls back without an element', () => {
    expect(readPx(null, '--len', 3)).toBe(3);
  });
});
